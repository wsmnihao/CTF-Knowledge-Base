### 结果排序

可以对查询的结果，使用`ORDER BY`关键字，指定某个列进行排序，语法：
```MySQL
SELECT 列 | 聚合函数 | * FROM 表
WHERE ...
GROUP BY ...
ORDER BY ... [ASC | DESC]
```

**演示**：
```MySQL
DROP TABLE IF EXISTS student;
CREATE TABLE student(
    id INT,
    name VARCHAR(20),
    age INT,
    gender VARCHAR(10)
);

INSERT INTO student VALUES(10001, '周杰轮', 31, '男'), (10002, '王力鸿', 33, '男'), (10003, '蔡依琳', 35, '女'), (10004, '林志灵', 36, '女'), (10005, '刘德清', 30, '男');

-- 按年龄降序排序结果
SELECT * FROM student ORDER BY age DESC;

-- 按ID升序排序结果
SELECT * FROM student WHERE age > 31 ORDER BY id;
```

**说明：**
	ASC——升序（默认，可省略）
	DESC——降序

### 结果分页限制

同样，可以使用`LIMIT`关键字，对查询结果进行数量限制或分页显示，语法：
```MySQL
SELECT 列 | 聚合函数 | * FROM 表
WHERE ...
GROUP BY ...
ORDER BY ... [ASC | DESC]
LIMIT n[, m]
```

**说明：**

| 写法         | 含义                  |
| ---------- | ------------------- |
| LIMIT n    | 只返回前 n 条记录          |
| LIMIT n, m | 跳过 n 条，返回接下来的 m 条记录 |
