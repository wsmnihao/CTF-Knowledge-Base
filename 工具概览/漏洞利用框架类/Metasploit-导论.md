### 工具定义

Metasploit 是当前业界使用最广泛的漏洞利用/渗透测试框架，能够覆盖从**信息收集**到**后渗透**的全流程攻击生命周期。

**两大版本对比**

- **Metasploit Pro（商业版）**：具备自动化管理和图形化界面（GUI），适合大规模团队和企业级安全评估。
- **Metasploit Framework（开源版）**：纯命令行（CLI）操作。此版本预装在 Kali Linux 和 THM AttackBox 中，**本模块主要学习此版本**。

 **核心组成部分**

- **主界面**：`msfconsole` —— Metasploit 的核心命令行交互入口。
- **模块（Modules）**：组成框架的基础积木，包括漏洞利用模块（Exploits）、扫描器、攻击载荷（Payloads）等。
- **独立工具（Tools）**：框架自带的辅助工具，最常用的是 **`msfvenom`**（用于生成各类格式的 Payload）。
- _注：Pattern_create 和 pattern_offset 用于漏洞开发中的偏移量计算，通常归为高级开发用途，本基础模块暂不涉及_。

### MSF工具主要组成部分

#### 漏洞利用三要素（金三角）

1. **Vulnerability (漏洞)**：目标系统上的设计缺陷、编码错误或逻辑漏洞。
2. **Exploit (利用程序)**：一段利用漏洞实现特定目的代码。
3. **Payload (攻击载荷)**：漏洞被利用后，在目标系统上**实际执行的代码**（如建立反弹 Shell、添加用户、运行计算器等）。

#### Metasploit 六大核心模块分类

- **Auxiliary (辅助模块)**：扫描器、爬虫、Fuzzing 测试等，通常用于信息收集阶段。
- **Encoders (编码器)**：对攻击载荷进行编码，尝试绕过**基于特征码**的杀毒软件（AV）检测（注意：现代 AV 检测机制更复杂，编码器成功率有限）。
- **Evasion (规避模块)**：专门为绕过杀毒软件（如 Windows Defender）和 EDR 而设计的攻击手段。
- **Exploits (利用模块)**：按目标操作系统分类的漏洞利用代码集合。
- **NOPs (空指令)**：在内存栈中填充无意义指令（如 x86 架构下的 `0x90`），常用于缓冲溢出攻击中保持载荷大小对齐。
- **Payloads (攻击载荷)**：目标系统上实际执行的代码。

####  Payload 的分类

 **Singles (单阶段/内联)**：
    - **特点**：自包含，**不需要分两步下载**，一次性发送全部代码。
    - **命名特征**：名称中带有 **`_`** 符号。
    - _举例_：`generic/shell_reverse_tcp`（单阶段反弹 Shell）。
- **Staged (分阶段)**：
    
    - **特点**：载荷被分为“小步”发送。先上传一个很小的 **Stager (分阶段器)** 建立通道，然后再下载体积庞大的 **Stage (阶段)** 执行。优点是方便传输大体积载荷。
    - **命名特征**：名称中带有 **`/`** 符号。
    - _举例_：`windows/x64/shell/reverse_tcp`（前段是 stager，`shell` 是最终执行的目标）。


### msfconsol工具使用

####  msfconsole 命令行核心技巧

1. **基础兼容性**：在 `msfconsole` 里面可以直接执行大部分 Linux 命令（如 `ls`, `ping`, `clear`）。但不能用重定向符号（如 `>` 保存输出）。
2. **Tab 键自动补全**：`msfconsole` 支持强大的 Tab 补全。例如输入 `he` 按 Tab 会自动补全为 `help`，输入模块路径时也能按 Tab 自动检索。
3. **上下文（Context）管理**：`msfconsole` 是**上下文敏感**的。
    - 当你 `use` 了一个模块后，所有设置的参数（如 `RHOSTS`）**只针对当前模块生效**。
    - 如果你切换到另一个模块，原来的参数会丢失（除非通过 `setg` 设置为全局变量）。
4. **退出当前模块**：使用 `back` 命令可以退出当前的模块上下文，回到主 `msf6 >` 状态。

####  模块信息查看与搜索

1. **`show options`**：查看当前模块所需的配置参数（这是最常用的命令）。
    - 漏洞利用模块通常需要设置 `RHOSTS`（目标 IP）和 `RPORT`（目标端口）。
    - 后渗透模块（Post）通常需要设置 `SESSION`（已有连接）。
2. **`show payloads`**：列出当前选中的漏洞利用模块（Exploit）所**兼容**的所有攻击载荷（Payload）。这是选 Payload 的关键命令。
3. **`info [模块名]`**：查看模块的详细信息，包括作者、漏洞描述、参考链接（CVE）、漏洞评级等。
4. **`search [关键字]`**：在 Metasploit 数据库中进行检索。
    - 支持搜索 CVE 编号（如 `search cve:2017`）、漏洞名（`search eternalblue`）、应用名（`search apache`）。
    - 支持**高级过滤**：例如 `search type:auxiliary telnet`（只查找辅助模块中关于 telnet 的）。
    - 搜索结果带有排名（Rank），排名越高代表该漏洞利用相对越稳定（`excellent` > `great` > `average` > `manual`）。


### 实战！！！

### msfconsole 五大状态提示符（看一眼就知道自己在哪）

在操作 MSF 时，看左边提示符非常重要：

1. `root@ip:~#`：**Linux 终端**。不能运行 `msf` 命令。
2. `msf6 >`：**msfconsole 主界面**。无上下文，不能直接设置模块参数。
3. `msf6 exploit(...) >`：**模块上下文界面**。可以设置 `RHOSTS`、`LHOST` 等。
4. `meterpreter >`：**Meterpreter 会话界面**。已拿到目标高级 Shell，可用 `help` 查看专属命令。
5. `C:\Windows\system32>`：**目标系统普通 Shell**。已拿到目标 Windows/Linux 命令行。


####  参数设置核心三件套（必背）

- **`set 参数名 值`**：设置当前模块的参数（如 `set RHOSTS 10.10.x.x`）。
- **`setg 参数名 值`**：设置**全局参数**。切换不同模块时，该参数值会自动保留，不用重复设置（如 `setg LHOST 攻击机IP`）。
- **`unset 参数名`** / **`unset all`**：清空参数值。可用 `unset all` 一次性清空当前模块的所有参数。

**常用参数对照表：**

| 参数名     | 全称          | 作用                                                            |
| ------- | ----------- | ------------------------------------------------------------- |
| RHOST   | Remote Host | **目标靶机 IP**（支持单 IP、CIDR段 `10.10.10.0/24`、或者 `file:/path.txt`） |
| RPORT   | Remote Port | 目标靶机上漏洞服务运行的**端口**（如 80, 445, 8080）                           |
| LHOST   | Local Host  | **攻击机（你当前的 Kali）的 IP**                                        |
| PAYLOAD | Payload     | 指定的攻击载荷                                                       |
| SESSION | Session     | 已建立的会话 ID，常用于后渗透模块（如 `set SESSION 1`）                         |
 
 **避坑小贴士：关于 LHOST 和 LPORT**
- **LHOST 怎么填？** 在 THM/HTB 等靶场中，通常会自动分配 VPN IP（如 `10.10.x.x`）。在 Kali 终端输入 `ip a` 或 `ifconfig`，找到 `tun0` 网卡对应的 IP 就是你的 `LHOST`。
- **LPORT 被占用了怎么办？** 如果运行 `exploit` 时报错提示端口被占用，**不要死磕 4444**。直接改为其他高位端口，例如：`set LPORT 5555` 或 `set LPORT 8888`，然后重新运行即可。
####  运行与搜索命令

- **`search [关键字]`**：全局搜索漏洞模块（如 `search ms17-010`）。
- **`info [模块路径]`**：查看模块详细信息（作者、CVE 编号、描述、漏洞评级）。
- **`show options`**：**非常核心的命令**，显示当前模块需要填写的所有参数。
- **`show payloads`**：列出当前漏洞利用模块**兼容**的所有载荷。
- **`exploit` (或 `run`)**：开始执行攻击。
    - `exploit -z`：攻击成功后，自动把获得的 Session 放入后台，不进入交互界面。

#### 会话（Session）管理（拿 Shell 后必知）

攻击成功后，目标会回连，你需要管理这些连接：

1. **`sessions`**：列出当前所有活跃的会话及编号。
2. **`sessions -i [编号]`**：与指定的会话编号进行交互（如 `sessions -i 1` 进入目标 Shell）。
3. **`background` (或 `Ctrl+Z`)**：在交互界面内，将此会话放入后台，返回到 `msf6 >` 主界面。
4. **`sessions -k [编号]`**：杀掉指定的会话。

 **拿到 Meterpreter 后第一步做什么？**

当你成功执行 `exploit` 看到 `meterpreter >` 提示符时，说明你已经进入目标系统的高级交互界面。建议立刻运行以下三个命令探查敌情：

1. `getuid` —— 查看当前拿到的用户权限（如果能显示 `NT AUTHORITY\SYSTEM`，说明已经是最高管理员权限）。
2. `sysinfo` —— 查看目标主机的操作系统版本和架构（是 Windows 7 还是 Server，32位还是 64位）。
3. `shell` —— **进阶操作**：输入此命令并回车，你会切换进目标系统原生的 CMD 命令行（如 `C:\Windows\system32>`），此时你可以直接执行 `whoami`、`dir` 等系统命令。输入 `exit` 可退回 `meterpreter >`。

#### 实战操作顺序模板

每次打一个靶机，你的标准操作流程如下：

1. 进入 msfconsole：`msfconsole`
2. 搜索漏洞：`search 漏洞名/端口`
3. 进入模块：`use 模块编号或路径`
4. 看需要什么参数：`show options`
5. 设置目标和攻击机：  
    `set RHOSTS 靶机IP`  
    `set LHOST 攻击机IP`  
    `set LPORT 4444`
6. 开始攻击：`exploit`
7. 如果成功了，看后台会话：`sessions -l`
8. 进入会话：`sessions -i 1`


