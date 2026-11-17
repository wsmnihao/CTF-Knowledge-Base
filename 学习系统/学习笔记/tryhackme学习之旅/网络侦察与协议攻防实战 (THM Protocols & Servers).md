# 🌐 网络协议与服务器攻防实战 (THM Protocols & Servers 1 & 2)

## 🎯 核心心法
- **明文 = 裸奔**：所有未加密的协议（HTTP, FTP, POP3, IMAP, Telnet, SMTP）在网络上传输时，账号密码完全暴露，极易被嗅探或中间人篡改。
- **加密 = 铁壁**：TLS（HTTPS, POP3S, IMAPS）和 SSH 提供了机密性（防窃听）与完整性（防篡改）。
- **攻击链**：信息收集 (Banner) -> 手工交互测试 -> 嗅探/中间人截获 -> 暴力破解/字典攻击。

---

## 🔍 一、 基础协议与手工交互 (协议与服务器1 核心)
> 放弃自动化工具，用 `telnet` 或 `nc` 纯手工跟服务器对话，这是抓取指纹和理解协议最底层的方式。

| 协议 | 默认端口 | 传输方式 | 手工交互示例 / 核心指令 |
| :--- | :--- | :--- | :--- |
| **HTTP** | 80 | 明文 | `telnet <IP> 80`<br>`GET /flag.thm HTTP/1.1`<br>`Host: <IP>`<br>*(连按两次回车)* |
| **FTP** | 21 | 明文 | 登录：`USER 用户名` / `PASS 密码`<br>下载：`get 文件名` |
| **POP3** | 110 | 明文 | 登录：`USER frank` / `PASS 密码`<br>查状态：`STAT` (返回 0 0 表示没邮件)<br>读信：`RETR 1` |
| **IMAP** | 143 | 明文 | 标签 `a` 登录：`a LOGIN frank 密码`<br>列出邮箱：`b LIST "" "*"`<br>选中：`c SELECT INBOX`<br>读信：`d FETCH 1 BODY[]` |
| **SMTP** | 25 | 明文 | 发件交互：`HELO` / `MAIL FROM` / `RCPT TO` |
| **Telnet** | 23 | 明文 | 远程管理（已被 SSH 取代） |

---

## 🐚 二、 SSH 安全外壳与隧道 (协议与服务器2 核心)
> SSH 默认端口 **22**，是红队最常用的加密登录和内网穿透工具。

### 1. 认证机制

- **密码认证**：容易遭受暴力破解。
- **公钥认证（免密登录）**：私钥留本地（绝不外传），公钥放服务器 (`~/.ssh/authorized_keys`)。
```
  ssh-keygen -t ed25519 -C "备注"   # 生成密钥对
  ssh-copy-id mark@<IP>             # 将公钥推送到远程服务器
```
  
### 2. SSH 高阶穿透神技

- **非标端口**：`ssh -p 2222 mark@<IP>`
- **指定私钥**：`ssh -i ~/.ssh/id_rsa mark@<IP>`
- **单命令执行**：`ssh mark@<IP> "cat /etc/passwd"`
- **跳板机 (-J)**：`ssh -J 堡垒机IP mark@内网IP`
- **本地端口转发 (-L)**：`ssh -L 8080:localhost:80 mark@<IP>` (把远程 80 映射到本地 8080，看内网 Web)
- **动态代理 (-D)**：`ssh -D 9050 mark@<IP>` (开启 SOCKS5 代理，配合 proxychains 扫内网)

### 3. 安全文件传输

- **scp (基于 SSH)**：`scp mark@<IP>:/home/mark/book.txt .` （**注意**：先 `exit` 退出远程，在 Kali 本地运行命令拉取文件）。
- **sftp**：交互式文件传输，连接后可用 `get` / `put`。

---

## 🕵️ 三、 嗅探与中间人攻击 (MITM)

### 1. 嗅探抓包 (tcpdump)

- **命令**：`sudo tcpdump -i tun0 port 110 -A`
    - `-i tun0`：**核心避坑点**！使用 VPN 时，流量走虚拟网卡 `tun0`，而不是 `eth0`。
    - `-A`：以 ASCII 明文显示内容（抓密码必备）。
- **实战结果**：能直接抓到 `USER frank` 和 `PASS D2xc9CgD`。

### 2. 中间人攻击原理

- **ARP 欺骗**：冒充网关，截获局域网流量。
- **DNS 欺骗**：将受害者重定向到钓鱼网站。
- **流氓 Wi-Fi**：伪造同名热点。
- **工具**：`Bettercap` (现代主流)、`Ettercap`、`mitmproxy`。

### 3. 加密防御：TLS/SSL

- 握手过程协商出“会话密钥”，让嗅探者无法解密。
- **HTTPS = HTTP + TLS**。现代网站依赖 **HSTS** 和 **证书体系** 防止 SSL 剥离和中间人攻击。

---

## 💣 四、 密码攻击与 Hydra 实战

### 1. 攻击类型辨析 (重要概念)

- **字典攻击**：拿密码字典死磕**一个**账号（容易被封号）。
- **密码喷洒 (Password Spraying)**：拿**最弱的几个密码**，去试**成千上万个账号**（完美绕过账号锁定）。
- **凭据填充 (Credential Stuffing)**：利用其他网站泄露的真实账号密码，来撞库测试目标系统。

### 2. Hydra 实战 (IMAP 爆破)

- **命令**：`hydra -l lazie -P /usr/share/wordlists/rockyou.txt -f -t 4 <IP> imap`
    - `-l`：指定单个用户名。
    - `-P`：指定密码字典（`rockyou.txt`）。
    - `-f`：找到第一个正确密码就停止。
    - `-t 4`：限制并发线程为 4，防止服务器封 IP。
- **结果**：`lazie` 的密码被爆出为 `butterfly`（字典排在很靠前，20秒出结果）。

---

## 🛡️ 五、 安全防御机制总结

- **协议层面**：淘汰明文（Telnet/FTP/HTTP），全量升级为加密协议（SSH/FTPS/HTTPS）。
- **SSH 层面**：禁用密码登录，强制使用公钥认证；修改默认 22 端口；开启 Fail2ban。
- **密码层面**：强密码策略、账号锁定、速率限制 (Rate Limiting)、多因素认证 (MFA)

---

## 🎒 六、 常用默认端口速查表

- **21**：FTP (明文) / **990**：FTPS (加密)
- **22**：SSH (加密) / SFTP
- **23**：Telnet (明文，不安全)
- **25**：SMTP (发件) / **465**：SMTPS
- **80**：HTTP / **443**：HTTPS
- **110**：POP3 / **995**：POP3S
- **143**：IMAP / **993**：IMAPS
- **3306**：MySQL / **3389**：RDP (Windows)