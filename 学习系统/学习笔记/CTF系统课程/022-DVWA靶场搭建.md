# DVWA靶场搭建

# 下载所需工具：

1、DVWA

2、phpstudy

链接：

[https://github.com/digininja/DVWA?tab=readme-ov-file](https://github.com/digininja/DVWA?tab=readme-ov-file)

DVWA靶场地址

注：如果浏览器无法访问，就挂加速器（文后有加速器下载地址）

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759142607103-2d8f4ce7-6a3f-497a-827c-9124565d17e2.png)

等下载完成之后解压。

* * *
PHPstuday程序下载

[https://www.xp.cn/phpstudy#phpstudy](https://www.xp.cn/phpstudy#phpstudy)

8.1版本的下载

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759142670265-5bf9b51c-845f-41d6-a05c-2bb77f54535d.png)

* * *

# 配置

1、安装phpstudy软件，记得修改安装位置，安装步骤省略。

2、将解压好的DVWA文件复制一份，找到phpstudy软件，右键打开文件所在位置，进入** _WWW_** 文件夹，将粘贴的DVWA文件复制到里面，把复制的那一份改名为“ _**DVWA**_ ”。

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759142926552-3fdd4df9-b82c-42fe-84aa-4eb2e58b27c0.png)

3、打开phpstudy软件，将MySQL5.7和Nginx1.15.11两个打开。

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759143071304-63713932-9e94-41cd-a976-c9383b16e027.png)

注：如果MySQL打开失败或者占用其数据库的端口，又或者点了但是又变红了。打开cmd窗口（win+r），或者搜索运行，以管理员身份运行，输入：
    
    
	有些同学电脑上没有安装MySQL或者SQLservers的软件服务，就不需要做下面的。
    net stop myslq80   #有的同学数据库安装的是8.1版本的，就用这个
    net stop myslq57   #有的同学数据库安装的是5.7版本的，就用这个
    #注：有些时候二次或多次安装，未卸载干净，服务名称会不一样，win+s搜素服务，找到mysql开头的名称就是要找的东西
    如果上述两条命令不对或者执行不成功，就检查一下服务的名称是否正确，参照#注

图例：

cmd窗口

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759143496648-c2624a0d-b6b1-4842-ba92-c6d216e16563.png)

phpstudy

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759143614580-2f2f0454-4c26-43f8-a97d-c0c46effcad7.png)

之后在phpstudy打开这个了。如果输入命令无误，就用管理员权限打开cmd窗口再试。

4、浏览器

打开浏览器，输入**127.0.0.1/DVWA**

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759143742353-b1604f85-11aa-46c7-bfb0-9863792ba100.png)

如果显示这个，不要慌~~~则正常能访问到本地靶场环境，还需要修改配置文件，才能进入到正常的靶场环境里面，如下所示：

打开phpstudy的位置，步骤跟上面的一样。

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759144092038-4c34b544-8637-41d8-b990-050c6d982535.png)

将里面的config.inc.dist复制一下，做备份。将其中的一个改成config.inc.php即可。

最后在浏览器刷新或者输入127.0.0.1/DVWA，就能上去了

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759144283494-db2a4c5d-02e7-4481-b284-b2947e4dc827.png)

5、修改config.inc.php配置文件：

右键用记事本打开

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759144746838-00867f19-b43f-4742-831e-8226c4abc152.png)

将这两个小方框里的账号和密码都修改一下，都改成123456，不用默认的root。

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759288573793-4d9e28db-a6ff-4a79-96d9-5122b97234a3.png)

修改这个文件的时候，打开PHP study，顺便把这个也改成123456，与配置文件统一，不然上不去

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759288631515-47812aef-3700-4c05-b203-467c92415e22.png)

6、登录

修改完文件，记得保存，然后再刷新一下浏览器

**默认账号为：admin**

**默认密码为：password**

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759145096252-a8eeb234-5185-4505-8282-720daa39f229.png)

7、修改难度（最高难度为不可能，调个最低的low。本来就很水平就很low，再不练习，真的就很low了）

登录进去，将难度修改为low即可

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759145375235-9ead6a09-6663-44c7-8351-5dc6710163ce.png)

单独等级分为：

low 低级/垃圾/容易 

medium 中级/简单

high 高级/困难

impossible 不可能

附一张翻译过后的网页，涵盖了大部分web安全的题目，觉得简单就上难度，头铁那就选个**不可能** （贴近现实难度）玩玩，降降温

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759145713757-10c1aab2-8a0c-4a4f-a277-c3da2c83a960.png)

再附一个链接！！！！！！！！

[https://steampp.net/](https://steampp.net/)

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759145818822-4d948799-a48d-4fba-82ec-d87fef2da9d1.png)

下载完点安装就行，路径不用管，别学着学着用这个去挂steam玩游戏去了！！！打开往下滑找到GitHub和公共CDN,勾选，点击一键加速，软件可以叉掉（他会在后台默认运行），然后就可以去访问GitHub网站了。

---
*迁移自语雀文档，原始ID: qd8gwbzxm83mrunz*