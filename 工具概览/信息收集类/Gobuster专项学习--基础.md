### Gobuster概览

Gobuster 是一款用 **Go 语言** 编写的**暴力枚举工具**，用于发现 Web 服务器上的隐藏资源。
**核心功能**：
- 目录/文件枚举
- DNS 子域名枚举
- 虚拟主机枚举
- AWS S3 / Google Cloud 存储桶枚举
**攻击阶段**：侦察阶段（信息收集）
#### 核心概念

| 概念       | 说明                    |
| -------- | --------------------- |
| **枚举**   | 列出所有可用资源（无论是否可访问）     |
| **暴力破解** | 尝试所有可能性，直到找到匹配项       |
| **字典**   | Gobuster 使用的密码/路径列表文件 |
#### 帮助命令
```bash
gobuster --help
```
#### 可用命令模式

| 命令    | 用途                 |
| ----- | ------------------ |
| dir   | 目录/文件枚举（最常用）       |
| dns   | DNS 子域名枚举          |
| vhost | 虚拟主机枚举             |
| s3    | AWS S3 存储桶枚举       |
| gcs   | Google Cloud 存储桶枚举 |
| fuzz  | 模糊测试模式             |
| tftp  | tftp               |
#### 常用全局参数

| 短参数 | 长参数           | 说明      | 默认值     |
| --- | ------------- | ------- | ------- |
| -t  | --threads     | 线程数     | 10      |
| -w  | --wordlist    | 字典路径    | 无（必须指定） |
| -o  | --output      | 保存结果到文件 | 标准输出    |
| -v  | --verbose     | 显示详细信息  | 关闭      |
| -q  | --quiet       | 不显示横幅   | 关闭      |
| -z  | --no-progress | 不显示进度   | 关闭      |
| 无   | --delay       | 请求间隔时间  | 0       |
| 无   | --debug       | 调试模式    | 关闭      |
#### 示例命令
```bash
gobuster dir -u "http://example.thm/" -w /usr/share/wordlists/dirb/small.txt -t 64
```
### 使用：目录和文件枚举

在渗透测试时，Gobuster可以用来文件枚举和目录爆破，网站和一些网页 应用会遵照目录结构特定惯例，很容易就能进行列表暴力破解。

#### 命令概览

| 短命令 | 长命令                      | 描述                            |
| --- | ------------------------ | ----------------------------- |
| -c  | --cookies                | 携带 Cookie 发送请求（如会话 ID）        |
| -x  | --extensions             | 指定要扫描的文件扩展名，如 `.php,.js,.txt` |
| -H  | --headers                | 携带自定义 HTTP 头                  |
| -k  | --no-tls-validation      | 跳过 TLS/SSL 证书验证（适用于自签名证书）     |
| -n  | --no-status              | 不显示状态码，保持输出简洁                 |
| -P  | --password               | 配合 `--username` 用于基础认证        |
| -s  | --status-codes           | 只显示指定的状态码（如 `-s 200,302`）     |
| -b  | --status-codes-blacklist | 排除指定的状态码（覆盖 `-s`）             |
| -U  | --username               | 配合 `--password` 用于基础认证        |
| -r  | --followredirect         | 跟随 HTTP 重定向（301/302）          |
**注**：`-U` 和 `-P` 需要同时使用才能生效。
#### 实战命令示例

##### 基础目录扫描

```bash
gobuster dir -u "http://example.thm" -w /usr/share/wordlists/dirb/common.txt -t 50
```
##### 指定扩展名（找 php 和 js 文件）

```bash
gobuster dir -u "http://example.thm" -w /usr/share/wordlists/dirb/common.txt -x php,js -t 50
```

##### 跳过 TLS 验证（自签名证书）

```bash
gobuster dir -u "https://example.thm" -w /usr/share/wordlists/dirb/common.txt -k -t 50
```

##### 只显示 200 状态码

```bash
gobuster dir -u "http://example.thm" -w /usr/share/wordlists/dirb/common.txt -s 200 -t 50
```

##### 携带 Cookie 扫描（需要登录）

```bash
gobuster dir -u "http://example.thm" -w /usr/share/wordlists/dirb/common.txt -c "sessionid=abc123" -t 50
```

###  Gobuster DNS 模式：子域枚举

#### 什么是DNS模式？

`dns` 模式允许 Gobuster 暴力破解**子域名**。在渗透测试中，检查目标顶级域名的子域名非常重要——某个漏洞可能在主站被修复了，但在子域名上依然存在。

**基础语法：**
```bash
gobuster dns -d example.thm -w /path/to/wordlist
```

| 参数                  | 说明               |
| ------------------- | ---------------- |
| `-d` / `--domain`   | 指定要枚举的域名（**必须**） |
| `-w` / `--wordlist` | 指定字典路径（**必须**）   |
#### 常用参数

| 短参数 | 长参数          | 说明                         |
| --- | ------------ | -------------------------- |
| -c  | --show-cname | 显示 CNAME 记录（不能与 `-i` 同时使用） |
| -i  | --show-ips   | 显示子域名解析的 IP 地址             |
| -r  | --resolver   | 配置自定义 DNS 服务器              |
| -d  | --domain     | 配置要枚举的域名                   |
实战示例
```bash
gobuster dns -d example.thm -w /usr/share/wordlists/SecLists/Discovery/DNS/subdomains-top1million-5000.txt
```
#### 关键点

|要点|说明|
|---|---|
|**必须指定域名**|`-d` 参数不可省略|
|**必须指定字典**|`-w` 参数不可省略|
|**字典选择**|`SecLists/Discovery/DNS/` 目录下有专门的 DNS 字典|
|**与 dir 模式的区别**|`dir` 扫目录/文件，`dns` 扫子域名|
|**递归枚举**|Gobuster 不递归，发现子域名后需要单独枚举该子域名|
### Vhost枚举：虚拟机枚举

#### 什么是 vhost 模式？

`vhost` 模式允许 Gobuster 对**虚拟主机**进行暴力破解。虚拟主机是**同一台机器上的不同网站**，它们看起来像子域名，但本质不同：

| 对比项      | vhost（虚拟主机）                  | dns（子域名）        |
| -------- | ---------------------------- | --------------- |
| **本质**   | 基于 IP，运行在同一服务器上              | DNS 中设置的解析记录    |
| **扫描方式** | 向目标 IP 发 HTTP 请求，修改 `Host` 头 | 向 DNS 服务器发起域名查询 |
| **依赖**   | 不需要 DNS 解析                   | 需要 DNS 解析正常     |
| **适用场景** | 目标 DNS 环境不完整时                | DNS 环境完整时       |
**基础语法：**
```bash
gobuster vhost -u "http://example.thm" -w /path/to/wordlist
```
常用参数

| 短参数                | 长参数                 | 说明                                      |
| ------------------ | ------------------- | --------------------------------------- |
| `-u`               | `--url`             | 指定基础 URL（目标 IP 或域名）                     |
| `-w`               | `--wordlist`        | 指定字典路径                                  |
| `--domain`         | —                   | 指定域名（拼接到字典词后）                           |
| `--append-domain`  | —                   | 把字典词拼接到域名前（如 `www` → `www.example.thm`） |
| `--exclude-length` | —                   | 排除指定长度的响应（过滤 404 假阳性）                   |
| `-m`               | `--method`          | 指定 HTTP 方法（GET/POST）                    |
| `-r`               | `--follow-redirect` | 跟随 HTTP 重定向                             |

实战命令：
```bash
gobuster vhost -u "http://10.49.180.253" --domain offensivetools.thm -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt --append-domain --exclude-length 250-320 -t 50
```
#### 为什么必须加 `--exclude-length`？

不加这个参数，你会看到大量 404 假阳性：
```text
Found: Orion.example.thm Status: 404 [Size: 279]
Found: pm.example.thm Status: 404 [Size: 276]
Found: alabama.example.thm Status: 404 [Size: 288]
```
这些 404 页面的长度都在 **250-320** 之间。加了 `--exclude-length 250-320` 后，Gobuster 会自动过滤掉这些假阳性，只显示**真正存在的 200 页面**。
#### Gobuster 发送的请求结构

```bash
GET / HTTP/1.1
Host: www.example.thm
User-Agent: gobuster/3.6
```
`Host` 头被拆分为三部分：

| 部分       | 示例         | 配置方式            |
| -------- | ---------- | --------------- |
| **子域名**  | `www`      | 由字典中的词填充        |
| **二级域名** | `.example` | 由 `--domain` 指定 |
| **顶级域名** | `.thm`     | 由 `--domain` 指定 |
#### 注意事项

| 注意点                                       | 说明                                               |
| ----------------------------------------- | ------------------------------------------------ |
| **`--domain` 和 `--append-domain` 需要配合使用** | 单独用 `--domain` 不会拼接，单独用 `--append-domain` 不会指定域名 |
| **不加 `--exclude-length` 会有大量假阳性**         | 404 页面长度相似，必须过滤                                  |
| **vhost 不依赖 DNS 解析**                      | 直接向 IP 发请求，改 `Host` 头，是 DNS 环境不完整时的最佳方案          |
| **只关注 200 状态码**                           | 200 表示虚拟主机真实存在，404 表示不存在                         |