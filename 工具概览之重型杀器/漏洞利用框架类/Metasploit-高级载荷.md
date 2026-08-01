### 简介

**1. 什么是 Meterpreter？**

- Meterpreter 是 Metasploit 框架中一种**高级内存负载（Payload）**。
- 它在目标系统**内存中运行**，不写入磁盘，规避传统杀毒软件的文件扫描。

**2. 隐蔽特性**

- **本地规避**：无 `.exe` 或 `.dll` 文件落地，`tasklist` 无法通过文件识别 Meterpreter。
- **网络规避**：通过 **TLS 加密** 通信，可以绕过多数 IDS/IPS 检测，像普通 HTTPS 流量。

**3. 与操作系统交互的例子**

- `getpid`：查看当前 Meterpreter 进程 PID（示例中为 1304，而此 PID 对应的是 `spoolsv.exe`）。
- `ps`：列出目标系统所有进程，显示 PID、进程名、架构和归属用户。

### Meterpreter Flavors（版本与种类）

**1. Payload 两大类**

- **Staged（分段式）**：先传一个小型的“阶段器”去请求剩余部分，体积小。
- **Stageless（直连/单阶段）**：一次性发送完整 Payload，体积大但连接快速。

**2. 查看所有 Meterpreter 版本**

- 命令：
```bash
msfvenom --list payloads | grep meterpreter
```
- 支持的平台包括：Android、iOS、Java、Linux、OSX、PHP、Python、Windows

**3. 选择版本的三个关键因素**

1. **目标操作系统**：Linux、Windows、Mac、Android？
2. **目标环境组件**：是否安装了 Python、PHP、Java 等？
3. **网络连接类型**：允许 TCP 反向？只能用 HTTPS？IPv6 是否支持？

**4. 漏洞利用时的默认 Payload**

- 很多 Exploit 模块自带默认 Meterpreter 负载（如 `ms17_010_eternalblue` 默认是 `windows/x64/meterpreter/reverse_tcp`）。
- 可以用 `show payloads` 查看该漏洞支持的所有负载。

### Meterpreter Commands（核心后渗透命令表）


| 命令                    | 作用说明                                         | 实战场景/注意事项                                                                             |
| --------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------- |
| **`help`**            | 列出当前 Meterpreter 版本支持的所有命令。                  | 在 `meterpreter >` 提示符下输入即可。不同版本命令不同，这是第一步。                                            |
| **`getuid`**          | 查看当前运行 Meterpreter 的用户身份。                    | 判断权限高低（例如看到 `NT AUTHORITY\SYSTEM` 代表已是最高系统权限）。                                        |
| **`ps`**              | 列出目标系统上所有正在运行的进程。                            | 用于寻找 `migrate`（迁移）的目标进程，或查找反病毒软件进程。                                                   |
| **`migrate <PID>`**   | 将 Meterpreter 会话迁移到指定 PID 的进程。               | **核心操作**：迁移到稳定进程（如 `explorer.exe`）可防止会话断开。**警告**：切勿从高权限（SYSTEM）迁移到低权限进程，否则会丢失权限且难以恢复。 |
| **`hashdump`**        | 导出 Windows SAM 数据库中的用户密码哈希（NTLM 格式）。         | 用于离线破解（`hashcat`/`john`）或“哈希传递”攻击。                                                    |
| **`search -f <文件名>`** | 在目标系统全盘搜索指定文件。                               | CTF 中快速定位 `flag.txt`；渗透中搜索 `.conf`、`.ini` 等配置文件。                                      |
| **`shell`**           | 从 Meterpreter 降级到目标系统的原生命令行（Windows 下是 CMD）。 | 适合执行系统级复杂命令。按 `exit` 或 `Ctrl+Z` 可返回 Meterpreter。                                      |


