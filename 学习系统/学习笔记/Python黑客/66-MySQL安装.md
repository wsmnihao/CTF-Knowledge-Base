### MySQL的介绍

- MySQL数据库管理系统由瑞典的**DataKonsultAB**公司研发，该公司被**Sun公司**收购，现在Sun公司又被**Oracle公司**收购，因此MySQL目前属于**Oracle旗下产品**。
- MySQL软件采用了**双授权政策**，分为**社区版**和**商业版**，由于其**体积小、速度快、总体拥有成本低**，一般开发都选择MySQL作为数据库。
- 大多数开发人员都会和MySQL打交道，可以说是开发人员**必须会使用**的一款数据库软件。


### MySQL的版本

针对不同的用户，MySQL分为两种不同的版本：

**免费：**
- ==**MySQL Community Server**==：社区版本，免费，但MySQL不提供官方技术支持。
- ==**MySQL Cluster**==：集群版，开源免费，可将几个MySQL Server封装成一个Server。

**收费：**

- ==**MySQL Enterprise Edition**==：商业版，收费版本，可试用30天，官方提供技术支持。
- ==**MySQL Cluster CGE**==：高级集群版，需付费。

### MySQL的安装

下载地址：
https://downloads.mysql.com/archives/listaller
![](./附件/66-MySQL安装-2026-08-07-11-23-12.png)

##### 官网下载

[https://www.mysql.com/cn/](https://www.mysql.com/cn/)

下载社区版：

注：社区版免费

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1749884536885-c0b202c7-2fc1-433a-85ba-c6249a5b8cf0.png)

选择Windows版本

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1749884644343-b849cb0f-aa99-433e-893d-0e787c708efe.png)

下载离线版本

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1749884683156-1a9b77b2-afd5-40d7-8796-8482f4e718af.png)

#### 安装

将下载好的文件双击打开，在弹出的窗口点击确定。

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1749885162725-40d9e1ab-3d32-4ef4-8443-1cc39623bb9a.png)

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1749885274485-a5ddf3fc-58d7-45c9-a820-37ca05a479b4.png)

server only：仅服务器

client only：仅客户端

full：安装关于MySQL所有组件和服务

custom：自定义安装！强烈推荐，不想c盘_**boom~~**_就用这个

小技巧：先点击”full“，点击“Next“，再点击”Back“，接着点击”custom“，点击”Next“，就可以看到所需的组件都已经提前添加进去了。

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1749885689951-5859fa7e-8a6e-4f81-b101-e54fc3536f9c.png)

点击右侧第一个，再点击下方的”advance“。

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1749885765275-2525776c-8ebe-4a17-9ccd-68965c910db8.png)

_**更改安装路径！！！**_

![|503x281](https://cdn.nlark.com/yuque/0/2025/png/57654064/1749885917659-ee5e7b3b-f9d1-48ba-ad2e-0b64793db743.png)

第一个为存放软件组件程序。

路径修改位置：

**D:\MySQL\MySQL Server 8.0**

第二为存放数据库文件。

路径修改位置：

**D:\MySQLData\MySQL\MySQL Server 8.0**

这些文件路径是自动生成的，只需要将“C:\”的位置改成其他的，我这里用的是D盘，尽量挑一个空间比较大的位置存放。

修改完成之后，点击OK，继续修改下面的。以此类推，下面这些是数据库组件及服务，只需要修改一个即可，文件存放位置跟_**第一个**_一样，只需要复制盘符的路径的路径即可。

例：

D:\MySQL\MySQL Workbench 8.0  
![|496x206](https://cdn.nlark.com/yuque/0/2025/png/57654064/1749886754892-f6a2ddb4-2c56-4306-917c-63eb8ae3534a.png)

D:\MySQL\MySQL Shell 8.0

![|538x215](https://cdn.nlark.com/yuque/0/2025/png/57654064/1749886817237-bdd44cd5-84d1-4328-b7f4-67a18f377c64.png)

D:\]MySQL\MySQL Router 8.0

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1749886879421-95c7cd43-caaf-4b24-af84-03f6d5f8c18b.png)

D:\MySQL\MySQL Documentation 8.0

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1749886920915-de549fb1-171b-441b-9378-335c2de240de.png)

D:\MySQL\Samples and Examples 8.0

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1749886962286-58d7caf9-3aed-4408-861d-da95d988ce18.png)

修改完点击“Next”，再点击execute，安装组件，稍等几分钟，之后点击“Next”,再点击“Next”。

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1749887047329-5b21f76c-9776-4a95-b078-c3b3314e5fa2.png)

这里用默认的即可，直接点击“Next”

port：3306

是数据库链接端口，后面用得到

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1749887464229-349c4378-1b01-4cba-8839-f4c1edb339ce.png)

使用推荐的密码设置，点击“Next”

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1749887594486-9ff6c162-0199-4b95-9b10-806112c1a119.png)

设置管理员密码。

密码可以设置简单一点，设置完成后点击“Next”

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1749887637792-a9945f2d-3dc2-4b94-8d82-be866600e608.png)

数据库服务名称（MySQL80）

直接点击“Next”，默认设置即可

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1749887708120-21df17a8-dd29-400e-a7fd-e2e872f8136a.png)

一直点击“Next”，到这个页面点击“execute”

检查组件是否安装完成。

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1749887782532-8b9662fa-eed5-492c-b798-ddc08677976b.png)

完成

点击”finish“，再点击“Next”，点击“finish”，点击“Next”

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1749887853908-2d75852d-bad3-44fc-bf40-72caf54d8909.png)

验证

到这个页面之后，输入刚才设置的管理员密码，点击“check”（检查）

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1749887965467-2362a2c6-b524-4ac1-aae4-d695f0597882.png)

验证通过后，点击“Next”，再点击“execute”通过验证。校准无误，再次点击“finish”或者“Next”

![|700x526](https://cdn.nlark.com/yuque/0/2025/png/57654064/1749888053150-e463e8ff-cccf-49d5-b6ca-2170bf6e1c1e.png)

收工完成

点击“finish”

![|700x529](https://cdn.nlark.com/yuque/0/2025/png/57654064/1749888174212-10057ea2-4f38-44c3-a25c-5df49bba4a5d.png)

弹出两个窗口则为安装完成。

#### 配置环境变量
![](./附件/66-MySQL安装-2026-08-07-11-34-59.png)
将MySQL的安装目录的bin文件夹的路径，复制进入即可。

![](./附件/66-MySQL安装-2026-08-07-11-36-16.png)


最后输入mysq -u root -p，输入密码就能进去了
![](./附件/66-MySQL安装-2026-08-07-11-37-01.png)