# pikachu靶场搭建

靶场下载链接：

[https://github.com/zhuifengshaonianhanlu/pikachu](https://github.com/zhuifengshaonianhanlu/pikachu)

# 1\. 下载

## 1.1. 解压

解压到 www目录下并改名为pikachu

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759969126284-db909ad1-a558-4f2f-b9b4-bed8b7c337d6.png)

  

## 1.2. 部署PHP study

将pikachu文件夹inc下面的config.inc.php修改一下，账号和密码修改成PHP study上的一致即可，记得保存。不知道密码的可以在phpstudy里面的数据库查看。

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759972244749-f9a701c1-dfe2-456a-ade6-c2c3710e78a7.png)

## 1.3. 添加网站

改域名和端口，端口不要冲突，根目录就是在pikachu的文件夹下。php版本不做要求

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759972389602-9e2833d4-d48c-48a4-a71b-8ce1333770cc.png)

## 1.4. 尝试启动

已经可以访问了，但是仍有报错，这是还没配置数据库信息。接着去修改配置信息

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759981955683-7c54a251-b0be-4ef7-a833-ac69ee63547d.png)

## 1.5. 添加数据库

打开PHP study，在数据库一栏所添加的信息：

数据库名称| 用户名| 密码  
---|---|---  
pikachu| pikachu| 123456  
pkxss| xss| 12345  
  
图例：  
pikachu

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759999186956-0ae6f2fd-4a41-4b8c-8dc0-f5d2c03daa96.png)

xss

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759999237169-4027b6ee-b9f6-4e88-8e8f-7225ed112136.png)

## 1.6. 修改配置文件

### 1.6.1. 修改主站信息

修改主网站的 config 文件，在 pikachu 主目录下的 inc 文件夹里面，

将第 10 行的 root 改成 pikachu，11 行的密码也改一下。这是给主网站配置数据库信息，改完记得保存

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759999788441-13f7208d-03ff-4f8a-9652-fe69e53d8137.png)

### 1.6.2. 修改XSS平台信息

同上，将第10行的root改成xss，11行改成123456，记得保存。这是修改xss的信息。

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1760000077887-85dc864e-5aef-4adb-b7eb-c4e91c061977.png)

## 1.7. 验证

### 1.7.1. 打开服务

Apache和Nginx开任意一个就行，MySQL是必须要开的。

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1760000205969-de218c43-0503-4c0f-b5db-b77d72cf62e6.png)

### 1.7.2. 登录

127.0.0.1:8090或者[http://pikachu:8090/](http://pikachu:8090/)

登录成功

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1760000340068-548a0b6b-f41b-426c-8c13-76916eee3b22.png)

地址/install.php

这是初始化之后的界面，如果各位不放心的话，可以手动键入初始化文件，将其重置之后使用。

点击安装/初始化，有红色信息显示，就ok了，点击点击这里，就跳转到第一页信息。

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1760000571492-8770ca41-62f8-4695-b59d-07a9fb70f5e6.png)

完成！！！去练题去吧

---
*迁移自语雀文档，原始ID: dribp6gm30kch5z0*