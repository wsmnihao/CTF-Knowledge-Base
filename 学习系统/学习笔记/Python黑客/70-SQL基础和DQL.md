### 基础查询

在SQL中，通过`SELECT`关键字开头的SQL语句，来进行数据的查询。

基础语法：
```MySQL
SELECT 字段列表|* FROM 表
```

演示：
```MySQL
DROP TABLE IF EXISTS student;
CREATE TABLE student(
    id INT,
    name VARCHAR(20),
    age INT
);

INSERT INTO student VALUES(10001, '周杰轮', 31), (10002, '王力鸿', 33), (10003, '林俊节', 35), (10004, '张学油', 36), (10005, '刘德滑', 30);

-- 查询id和name两个列
SELECT id, name FROM student;

-- 查询全部列
SELECT id, name, age FROM student;

-- 查询全部列，快捷写法
SELECT * FROM student;
```

### 基础查询-过滤 

查询也可以带有指定条件，语法如下：
```MySQL
SELECT 字段列表 | * FROM 表 WHERE 条件判断
```

条件判断：
```text
列 操作符 值

# 操作符：
= < > <= >= !=等等
```
操作符：
```text
id = 5
id < 3
id >= 6
id != 5
```


演示：
```MySQL
-- 查询id和name两个列，年龄小于33岁
SELECT id, name FROM student WHERE age < 33;

-- 查询全部列，id等于10003
SELECT id, name, age FROM student WHERE id = 10003;
```