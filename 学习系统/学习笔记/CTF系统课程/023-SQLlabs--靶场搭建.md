# SQLlabs--靶场搭建

# _前置条件：_

PHP study程序

如果搭建了DVWA靶场的，就不用管了，没安装的就返回上一个文档安装（100%都安装了已经）

这个靶场环境专门** _针对Web安全的SQL注入_** 方向的设计，其实学网安这个都得学...

此处为语雀内容卡片，点击链接查看：<https://www.yuque.com/yanbai-vjpvg/bg7pgo/qd8gwbzxm83mrunz>

1、下载

SQL靶场说明书的链接（上不去记得挂watt的加速器）：

[https://github.com/lcamry/sqli-labs](https://github.com/lcamry/sqli-labs)

# SQL靶场链接：

[https://github.com/Audi-1/sqli-labs](https://github.com/Audi-1/sqli-labs)

  
SQL在线靶场（建议装上面的离线的）：

[https://sqli-labs.bachang.org/](https://sqli-labs.bachang.org/)

下载步骤跟dvwa的相似，进入网站点击code，下面有个download zip，就是下载，如果之前下载了SQL说明书的，就把名字稍微改一下，或者不下说明书也可以的。

2、解压

将sql-labs靶场解压到WWW目录下，并将名字改成sqli-labs

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759284420427-f9dfe43b-50b5-46b7-a158-1ffad9a1a6a8.png)

3、配置

进入到sqli-labs的子目录sql-connections文件夹下，打开db-creds.inc文件，进行修改。用记事本打开就行。

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759284559507-6a886010-0ac5-4fa9-8389-31e319a1549c.png)

修改如下：

打开PHP study程序，点击数据库，将db-creds.inc文件里面的信息修改成跟PHP study的账密一致即可。记得保存！！！

记得顺带把数据库的默认密码改了，我这里改的是123456。

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759286975802-ea6087e5-36e8-4071-bfe1-4e1367ff231e.png)

4、创建网站

点击网站，创建网站

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759285399802-cb712669-a3ff-40d4-a1dc-a95696029a54.png)

5、配置网站

域名建议写成 _**sqli-labs**_

端口默认用http（端口号为80），端口号写成8081，8888，8989，8181，8080（这个端口号可能被其他软件占用了），不能写小，有些协议是被特定软件使用，比如3306（数据库），3389（远程桌面），80（http），443（https，日常浏览的网站协议在使用）

http（端口号为80）超文本传输协议

https（端口号为443）的则是超文本安全传输协议（安全性高）

php版本改成5.3.29nts的，不然会上不去，没有这个版本就点更多版本，点击下载就行。

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759286756096-115e35ff-690a-4914-a7f4-daf5ff180ba5.png)

尝试打开网站

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759285967092-1085dfec-b9cd-4677-82d7-17ad21e99b69.png)

进入网站

进入之后是这个样子的

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759285990162-2c1869d4-d7f5-41e6-9c85-f1014c8f2578.png)

6、初始化sqli-labs网站

点击被红色框起来的东西

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759286668677-3473d985-80b4-4fe9-9deb-a8a8e09f7b0f.png)

进入之后，这是重新初始化成功的界面

完成！！！

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759286631533-18d7446e-f7b1-4a9b-b46f-ecc07249ee4c.png)

---
*迁移自语雀文档，原始ID: bdrgvsc5fw7vxoqg*