### 1、VPN(Virtual Private Network)
虚拟专有网络
虚拟专网
### 2、引入
	VPN可以实现在不安全的网络上，安全的传输数据，好像专网！
	VPN只是一个技术，使用PKI技术，来保证数据的安全三要素
### 3、安全三要素：
**1）机密性**
**2）完整性**
**3）身份验证**
### 4、加密技术：
	1）对称加密：加密与解密使用相同的密钥
	密钥是通信双方协商生成，生成过程是明文通信！
	密钥容易泄露！
	对称加密算法：==DES、3DES、AES==
	
	2）非对称加密算法：使用公钥加密数据
	公私钥成对生成，互为加解密关系！
	公私钥不能互相推算！
	双方交换公钥
	使用对方的公钥加密实现机密性
	使用自己的私钥进行自己的私钥进行签名，实现身份验证
	常见算法：==RSA、DH==
### 5、完整性算法/hash值算法：
	==MD5==
	==SHA(sha-1，sha-256，sha-512)==
### 6、VPN的类型：
**1）远程访问VPN（Remote Access VPN）**
		一般用在个人到安全连接企业内部！
		一般出差员工/在家办公，安全连接内网时使用！
		一般公司部署VPN服务器，员工在外拨号连接VPN即可！
常见RA-VPN协议：
==PPTP VPN、L2TP VPN、SSTP VPN、EZVPN/easyVPN、SSL VPN==
**2）点到点VPN**
	一般用在企业对企业安全连接！
	一般需要在两个企业总出口设备之间建立VPN通道！
	常见的点到点VPN：==IPsecVPN==

### 7、IPsecVPN：
1）属于点到点VPN，可以在两家企业之间建立VPN隧道！
2）VPN隧道优点：
	安全性！
	合并俩家企业内网！
3）VPN隧道技术：
	1）传输模式：
		只加密上层数据，不加密私有IP包头，速度快
	2）隧道模式（大部分常用这个）;
		加密整个私有IP包，包括IP包头，更安全，速度慢
4）VPN隧道技术：
		重新封装技术+加密认证技术
5）IPsecVPN分为2大阶段：
	第一阶段：管理连接
	目的：通信双方设备通过非对称加密算法加密对称加密算法所使用的对称密钥！
	命令：
```bash
	conf t
	crypto isakmp policy 1   %% 传输集/策略集 %%
	encryption des/3des/aes
	hash md5/sha
	group 1/2/5
	authentication pre-share
	lifetime 秒       （默认86400秒）
	exit
	crypto isakmp key 预共享密钥 address 对方的公网IP地址
```


第二阶段：数据连接
	目的：通过对称加密算法加密实际所要传输的私网数据！
```
	%% 定义VPN触发流量 %%
	access-list 100 permit ip 192.168.0.0 0.0.255.255 172.16.0.0 0.0.255.255
	
	%% 定义加密方式 %%
	crypto ipsectransform-set 传输模式名 esp/sh-des/3des/aes esp/sh-md5/sha-hmac
```
	ESP：支持加密及认证（身份验证+完整性）
	AH：只支持认证（身份验证+完整性）


