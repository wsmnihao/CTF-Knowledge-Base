### commit提交
如图所示代码，经过执行是**无法**将数据插入到数据表 `student` 中的。
这是为什么呢？
**pymysql** 在执行数据插入或其它产生数据更改的SQL语句时，默认是需要提交更改的，即，需要通过代码“确认”这种更改行为。
通过 **链接对象 `.commit()`** 即可确认此行为。

```Python
from pymysql import Connection

# 构建到MySQL数据库的链接
conn = Connection(
    host = "localhost",   # 主机名（IP）
    port = 3306,          # 端口
    user = "root",        # 账户
    password ="123456"   # 密码
)

# 获取游标对象
cursor = conn.cursor()

# 选择数据库
conn.select_db("world")

# 执行SQL（非查询：插入数据）
cursor.execute("insert into student values(10001, '周杰伦', 31, '男')")

# 关闭链接
conn.close()
```

执行成功，但是数据库里面没有东西，这里执行成功只是再pymysql的内存里面创建了，还得要去手动提交一次。
commit()方法

如果不想手动commit确认，可以在构建链接对象的时候，设置自动commit的属性

```Python
# 通过commit方法提交  
conn = Connection(
	host = "localhost",
	port = 3306,
	user = "用户名",
	password = "密码",
	autocommit = Ture
)
```

### 总结

![](./附件/73-Python操作MySQL数据插入-2026-08-07-18-39-27.png)