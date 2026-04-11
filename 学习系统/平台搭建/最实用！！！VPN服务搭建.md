# **前言**
前置条件：
	云服务器自费，个人推荐阿里云的新人专享68/年的2核2G的轻量通用型，满足基本需求
	云服务器ECS节点选择国外的，我用的是美国硅谷的
	SSH远程链接工具，我推荐XTerminal或者电脑自带的power shell
	自己 本地的电脑所需的软件是WireGuard

---

# 一、服务器配置端（阿里云ECS）
## 1.安装WireGuard
```bash
# 更新软件包
sudo apt update

# 安装WireGuard
sudo apt install wireguard resolvconf -y

# 验证安装
wg --version
```
## 2.生成服务器密钥对
```bash
# 创建配置目录
sudo mkdir -p /etc/wireguard
cd /etc/wireguard

# 生成服务器私钥和公钥
sudo wg genkey | sudo tee server_privatekey | sudo wg pubkey | sudo tee server_publickey

# 查看服务器公钥（客户端配置时需要）
sudo cat server_publickey
```
## 3.开启IP转发
```bash
# 永久开启IP转发
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf

# 立即生效
sudo sysctl -p
```
## 4.配置防火墙（UFW）
```bash
# 确认你的公网网卡名称（阿里云轻量一般是eth0）
ip route | grep default

# 放行WireGuard端口
sudo ufw allow 51820/udp

# 放行SSH端口（防止断开）
sudo ufw allow 22/tcp

# 启用UFW
sudo ufw enable

# 查看防火墙状态
	sudo ufw status
```
## 5.创建服务器配置文件
```bash
sudo nano /etc/wireguard/wg0.conf
```
配置文件内容：
```bash
[Interface]
# 服务器私钥（替换为你的server_privatekey内容）
PrivateKey = 你的服务器私钥
# VPN内部IP地址
Address = 10.0.0.1/24
# 监听端口
ListenPort = 51820

# NAT和转发规则（eth0是公网网卡，用ip route确认）
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

SaveConfig = false

[Peer]
# 客户端公钥（由客户端生成后提供）
PublicKey = 你的客户端公钥
# 允许客户端使用的IP
AllowedIPs = 10.0.0.2/32
```
## 6.启动WireGuard服务
```bash
# 手动启动
sudo wg-quick up wg0

# 设置开机自启
sudo systemctl enable wg-quick@wg0

# 查看状态
sudo wg show

# 常用命令
sudo wg-quick down wg0  # 停止
sudo systemctl restart wg-quick@wg0  # 重启
```
# 二、Windows客户端配置
## 1.下载安装WireGuard
下载链接：[https://www.wireguard.com/install/](https://www.wireguard.com/install/)
下载Windows版本的
## 2.创建新隧道并生成密钥对
- 打开WireGuard
	
- 点击 **Add Tunnel** → **Add empty tunnel**
	
- 系统自动生成密钥对
	
-  **复制客户端公钥**（发给服务器）
## 3.完整客户端配置
```bash
[Interface]
# 客户端私钥（保持自动生成的那个）
PrivateKey = 你的客户端私钥
# 客户端VPN IP地址（与服务器AllowedIPs对应）
Address = 10.0.0.2/24
# DNS服务器（防止DNS泄露）
DNS = 8.8.8.8, 1.1.1.1

[Peer]
# 服务器公钥（从服务器获取）
PublicKey = 你的服务器公钥
# 服务器公网IP + 端口
Endpoint = 你的ECS公网IP:51820
# 所有流量通过VPN（0.0.0.0/0）
AllowedIPs = 0.0.0.0/0
# 保持连接活跃（防止NAT超时）
PersistentKeepalive = 25
```
## 4.连接VPN
- 点击 **Save** 保存
    
- 点击 **Activate** 连接
    
- 状态显示 **Active** 表示成功
# 三、阿里云安全组/防火墙配置
### 登录阿里云控制台

- 进入ECS/轻量应用服务器控制台
    
- 找到你的实例 → 进入详情页
    
- 点击 **安全组** 或 **防火墙** 选项卡
### 必须添加的入方向规则


| 规则优先级 | 规则方向 | 协议类型   | 端口范围  | 授权对象/源IP地址  | 描述                                                  |
| ----- | ---- | ------ | ----- | ----------- | --------------------------------------------------- |
| 1（最高） | 入方向  | UDP    | 51820 | 0.0.0.0/0   | **核心规则**：放行WireGuard连接端口，允许你的客户端建立VPN连接             |
| 2     | 入方向  | 全部ICMP |       | 10.0.0.0/24 | **排错规则**：允许VPN内部使用Ping测试连通性（如从服务器ping 10.0.0.2）     |
| 3     | 入方向  | 全部TCP  |       | 10.0.0.0/24 | **必要规则**：允许VPN内部所有TCP通信（如HTTP、SSH等）                 |
| 4     | 入方向  | 全部UDP  |       | 10.0.0.0/24 | **必要规则**：允许VPN内部所有UDP通信（如DNS查询等）                    |
| 5     | 入方向  | TCP    | 22/22 | 0.0.0.0/24  | **安全加固**：限制SSH登录来源，防止暴力破解。如果IP不固定，可暂放0.0.0.0/0，但需谨慎 |

在客户端添加默认网关
```bash
route add 47.254.36.147 mask 255.255.255.255 192.168.1.1 metric 1
```