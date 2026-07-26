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