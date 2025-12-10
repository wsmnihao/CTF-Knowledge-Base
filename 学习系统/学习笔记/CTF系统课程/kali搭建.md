# kali搭建

### kali系统安装

步骤：

这是我自己写的博客文章，看这个就行，都差不多。

记得kali系统的密码强度要高一点，记不住就写个登录信息的文档放在文件夹里面，我这个笔记是为了做实验，学习用的，现在是上实战，得要把安全性提起来。

2025版本的kali系统会有新的变化，界面变成了蓝色的

我的账户设置：

用户名：kali

密码：Kali2025

[https://blog.csdn.net/wsm231103/article/details/141998564?fromshare=blogdetail&sharetype=blogdetail&sharerId=141998564&sharerefer=PC&sharesource=wsm231103&sharefrom=from_link](https://blog.csdn.net/wsm231103/article/details/141998564?fromshare=blogdetail&sharetype=blogdetail&sharerId=141998564&sharerefer=PC&sharesource=wsm231103&sharefrom=from_link)

### 基本配置

#### 系统更新

在kali系统设置，VMware里面，后面做完SSH连接之后就可以用xterminal了
    
    
    # 更新软件源和系统
    sudo apt update
    sudo apt upgrade -y
    
    # 安装基础工具
    sudo apt install -y git curl wget vim tmux screen htop nethogs nmon tree python3 python3-pip

更新软件源和系统

等待一会，稍微有点长。。。

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1763218642739-44abb920-c902-4853-80b8-e0c1c7c4e5e7.png)

选择是

这是在升级SQL的版本，后续出来的都顺带选择是

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1763218867716-a9d742c3-8c3e-4764-9b2a-16a234624142.png)

安装基础工具

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1763219094098-95225e77-8f01-47a9-8480-bf72a44da19b.png)

### 创建专业目录结构

其实也可以不用做，看自己的选择来
    
    
    # 创建红队武器库目录
    mkdir -p ~/armory/
    mkdir -p ~/armory/recon/
    mkdir -p ~/armory/exploitation/
    
    # 验证创建
    tree ~/armory -L 2

建立目录结构

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1763219193888-90605aec-f8ed-4a62-9d64-74f826820597.png)

### 配置SSH服务
    
    
    # 确保SSH服务运行
    sudo systemctl enable ssh						#开启SSH服务
    sudo systemctl start ssh						#SSH服务开机自启动
    
    # 检查SSH状态
    sudo systemctl status ssh

配置SSH服务

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1763219321783-a3c5e7a2-2b1f-425a-84da-6a1ba45a7014.png)

### 配置SSH文件

备份and进入配置文件
    
    
    # 1. 备份原配置
    sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
    
    # 2. 编辑SSH配置
    sudo nano /etc/ssh/sshd_config
    

修改ssh文件内容
    
    
    #	确保在文件里面把这些都修改了，去掉#的注释！！！
    Port 22
    PubkeyAuthentication yes
    AuthorizedKeysFile .ssh/authorized_keys .ssh/authorized_keys2
    PasswordAuthentication yes

Port 22

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1763259999298-d43de53b-889f-4b06-8885-543049fcc15e.png)

PubkeyAuthentication yes

AuthorizedKeysFile .ssh/authorized_keys .ssh/authorized_keys2

PasswordAuthentication yes

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1763260208615-03f52996-9dae-45aa-9692-8ec2ea5987fe.png)

重启服务
    
    
    # 重启SSH服务使配置生效
    sudo systemctl restart ssh
    sudo systemctl status ssh

图例：

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1763260330890-c4a14e6a-885e-4db2-a84e-3d846839bdf7.png)

  

#### 配置SSH密钥对

在堡垒机系统里面运行
    
    
    # 1. 生成SSH密钥对
    ssh-keygen -t rsa -b 4096 -f ~/.ssh/bastion_key -N ""
    

这个密钥对很重要！！

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1763260617528-31c3a0d6-075c-4109-9598-b07867c36d6c.png)

#### 验证配置
    
    
    # 检查权限是否正确
    ls -la ~/.ssh/

展示

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1763260631577-1525aea6-ab90-46ce-9d30-ae31cee28d0e.png)

### 创建授权文件

在kali系统里面
    
    
    # 1. 创建.ssh目录
    mkdir -p ~/.ssh
    
    # 2. 设置目录权限为 700
    chmod 700 ~/.ssh
    # 这意味着：只有所有者(kali用户)有读、写、执行权限
    
    
    
    # 查看权限
    ls -la ~/.ssh
    
    # 创建authorized_keys文件并添加堡垒机公钥
    cat > ~/.ssh/authorized_keys << 'EOF'
    ssh-rsa <里面复制你的堡垒机的ssh密钥对>
    EOF
    
    #	例如，这是我的堡垒机的ssh密钥对，复制过来，粘贴到里面就行，可以先复制到文档里面，再写进去，之后在kali系统里面粘贴就行，这是一个命令哈，不要记错了
    
    cat > ~/.ssh/authorized_keys << 'EOF'
    ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCIgWZchX33Y4CM+s5cssyLdL8JRW1WPFpA0xeF1oUsQz5cI30fV7ivr1WNLNfOL8R9xV1FHYBnoT0U5tCoXHIaicPjqh7sTylzoTWqB5iQuFj6gq/kXwCM1vGiGDvUkpP3c4VH0lZFsCqEgedzAFTaZHVxOXlxySu2xLC02L6KPD9d+MNQLT0ZZ+ZI+Sc+b5pBS5wac86gftlOk0nn6SvvOs7x/QWbNxpheHDZLB4bGQNyN2aGey4UX2gOWTAiEawXnb+4tS4APn17+uSVUBBkg+04xQdrLTOzp9UoPIjFh+xYvx7jAQ1gEljAZNV6vYxdRZQEiZTMjIgWVLLMUTB26LBjHfG31Pj8Vl/H25z2CeBor9KMgZZbrgOKVCmxmgmiZO4Syz8pjMzE46DKQv79MhO8XDVk5rxAaDwuLFeWsVREKlyPoUQnI/NwWnW2nCcUPl1nUMiRjX68ftciSFFXPO1iurO7wyf8tJVAkQZGjhWl1Ut5ihSUw8z2pbeLWmoRHThhBcGOzJJpSyRa3AHUsaPwwi/XcsXJ3ufqV7cyQq6Uu60vxAZyxOYWr+k56S8vJraHFdWTUogH3HIJVMqps7F25Kah3or5I6zYBKbNAFmcoHLUgvBH6+NtaStJkJMng1AXaW53d/HUwOeWazuj0qK0Nw8/NoeReS/asT7emQ== audit@bastion-host
    EOF
    
    # 3. 设置authorized_keys文件权限为 600 
    chmod 600 ~/.ssh/authorized_keys
    # 这意味着：只有所有者(kali用户)有读、写权限
    

#### 创建.ssh目录

还有个权限600和700，没有显示就再试一下子

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1763262529325-0c297d68-c3af-43b2-9823-f69d79115b2d.png)

创建authorized_keys文件并添加堡垒机公钥

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1763261872329-105a4f3d-c7f1-413e-ad60-6785f0c890ab.png)

#### 堡垒机配置SSH连接文件
    
    
    # 编辑SSH配置
    vim ~/.ssh/config
    
    #	配置堡垒机的ssh连接文件，这个IP地址是kali系统的，不知道的取kali查一下
    cat > ~/.ssh/config << 'EOF'
    Host kali
        HostName 192.168.10.109
        User kali
        Port 22
        IdentityFile ~/.ssh/bastion_key
        IdentitiesOnly yes
        ServerAliveInterval 60
    EOF
    

在堡垒机（红队指挥中心）

保存退出。

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1763263287535-df2858b8-19e1-4d1d-802a-76215aa3fa6f.png)

#### 设置权限
    
    
    #	加个权限
    chmod 600 ~/.ssh/config
    
    #	查看权限
    ls -la ~/.ssh/

示例：

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1763263515587-2f1a6f8e-f460-4cde-8c58-c4d8c447e79f.png)

### 测试连接
    
    
    # 从堡垒机测试连接到Kali，测试详细连接过程，会有一堆长长的信息，kali是我的用户名，按照自己的来就行
    ssh -vvv kali
    
    #	测试简单连接
    ssh kali

#### 测试连接

##### 详细数据连接

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1763263947776-6ceb9c0c-603c-443a-bdd9-171514a21cc8.png)

##### 测试简洁连接

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1763263980846-694b32b0-e868-4217-bde4-6106388fe897.png)

  

### kali换源

#### 备份文件
    
    
    sudo cp /etc/apt/sources.list /etc/apt/sources.list.backup

如下：

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1763264365757-5e98348e-f5c3-4b00-b34c-5a66edc750c7.png)

#### 编辑换源
    
    
    #	编辑文件
    sudo vim /etc/apt/sources.list
    
    
    #	如下是一些镜像地址，我推荐用第一个或者第二个，比较稳定，我这里用的是阿里的
    # 阿里云Kali源
    deb https://mirrors.aliyun.com/kali kali-rolling main non-free contrib
    deb-src https://mirrors.aliyun.com/kali kali-rolling main non-free contrib
    
    # 清华Kali源
    deb https://mirrors.tuna.tsinghua.edu.cn/kali kali-rolling main contrib non-free
    deb-src https://mirrors.tuna.tsinghua.edu.cn/kali kali-rolling main contrib non-free
    
    # 中科大Kali源
    deb https://mirrors.ustc.edu.cn/kali kali-rolling main non-free contrib
    deb-src https://mirrors.ustc.edu.cn/kali kali-rolling main non-free contrib
    
    

如下：

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1763264714668-fe331628-6a71-47b9-9028-8c809fe3b835.png)

#### 安装更新软件
    
    
    # 更新软件源
    sudo apt update
    
    # 测试下载速度，其实就是更新...
    sudo apt upgrade -y

检查更新软件源

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1763265030005-657f9965-7448-4567-9899-ef6f0549305b.png)

更新软件...

前面已经做好了。  
![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1763265070967-2112f3ef-f168-4e35-8f63-d1adc9bd6f5d.png)

### 完毕！！！

---
### 可选（中文输入法安装）
#### 安装必要的依赖和框架
```bash
# 1. 更新系统
sudo apt update && sudo apt upgrade -y

# 2. 安装Fcitx框架和谷歌拼音（最稳定）
sudo apt install fcitx fcitx-config-gtk fcitx-googlepinyin -y

# 3. 安装中文语言包和字体-谷歌
sudo apt install fonts-wqy-zenhei fonts-wqy-microhei locales -y

# 3.1检查谷歌相关的是否安装成功
dpkg -l | grep fcitx-googlepinyin
# 应该看到：ii  fcitx-googlepinyin  ...  表示已安装
```
#### 启动与检查fcitx服务
```bash
# 强制重启Fcitx服务（确保以当前用户运行）
pkill -9 fcitx
fcitx -d &

# 等待2秒，然后检查状态
sleep 2
fcitx-remote


# 我的是环境变量没配置，做的如下操作
# 1. 手动设置环境变量（立即生效）
export XMODIFIERS=@im=fcitx
export GTK_IM_MODULE=fcitx
export QT_IM_MODULE=fcitx

# 2. 确保它们永久生效（添加到shell配置）
echo 'export XMODIFIERS=@im=fcitx' >> ~/.bashrc
echo 'export GTK_IM_MODULE=fcitx' >> ~/.bashrc
echo 'export QT_IM_MODULE=fcitx' >> ~/.bashrc

# 3. 重新启动Fcitx，让新变量生效
pkill -9 fcitx
fcitx -d &
sleep 2
```
#### 配置环境变量和输入法
```bash
# 8. 设置环境变量（添加到~/.bashrc）
echo 'export GTK_IM_MODULE=fcitx' >> ~/.bashrc
echo 'export QT_IM_MODULE=fcitx' >> ~/.bashrc
echo 'export XMODIFIERS=@im=fcitx' >> ~/.bashrc

# 9. 使环境变量生效
source ~/.bashrc

# 10. 重启Fcitx服务
fcitx-autostart

# 重启
reboot
```

*迁移自语雀文档，原始ID: pyiy8fyd8ien2str*
