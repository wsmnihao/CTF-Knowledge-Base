### for循环

![[Pasted image 20260724112832.png]]

for循环语句
![[Pasted image 20260724113205.png]]
![[Pasted image 20260724113301.png]]

示例
```python
name = "zhangsan"
for i in name:
	print(i)
```

![[Pasted image 20260724113630.png]]

可以看出，for循环是将字符串的内容：==依次取出==，所以，for循环也被称之为：==遍历循环==

**注意点

![[Pasted image 20260724113703.png]]
### 案例-数一数有几个a
![[Pasted image 20260724113828.png]]
示例
```python
name = "itheima is a brand of itcast"  
sum = 0  
  
for i in name:  
    if i == ("a"):  
        sum += 1  
print(f"{name}这里面有{sum}个a")
```

![[Pasted image 20260724114700.png]]

### range语句
![[Pasted image 20260724115129.png]]

for循环语句，本质上是遍历：序列类型
尽管出字符串外，其他的序列类型目前没有学习到，但是不妨碍我们通过学习range语句，获得一个简单的数字序列。

==语法1：==
- **range(num)**
	获取一个从0开始，到num结束的数字序列（不含num本身）
	如range（5）取得的数据是：[0，1，2，3，4]
==语法2：==
- **range(num1,num2)**
	获得一个从num1开始，到num2结束的数字序列，（不含num2本身）
	如，range（5，10）取得的数据是：[5，6，7，8，9]

==语法3：==
- **range(num1,num2,step)**
	获得ige从num1开始，到num2结束的数字序列（不含num2本身）
	数字之间的步长，以step为准(step默认为1)
	如，range(5,10,2)取得的数据：[5，7，9]

示例
```python
# range语法1  
for i in range(10):  
    print(i)  
  
# range语法2  
for i in range(1,10):  
    print(i)  
  
# range语法3  
for i in range(5,20,5):  
    print(i)  
  
for i in range(10):  
    print(f"我喜欢你")
```

### 练习
![[Pasted image 20260724143142.png]]

示例
```python
# 小练习，有几个偶数  
num = 100  
x = 0  
for i in range(1,num):  
    if i % 2 == 0:  
        x += 1  
print(f"1到100内（不包含100），有{x}个偶数")
```

![[Pasted image 20260724144648.png]]

### for循环临时变量作用域
![[Pasted image 20260724144816.png]]


### for循环的嵌套使用
循环嵌套
![[Pasted image 20260724145425.png]]

**课题小练习
```python
# 给小美送花  
i = 1  
for i in range(1,101):  
    print(f"今天是向小美表白的第{i}天，坚持！")  
    for j in range(1,11):  
        print(f"这是给小美送的第{j}个玫瑰花")  
    print(f"小美，我喜欢你，这是向你表白的第{i}天")  
print(f"表白第{i}天，成功")
```
![[Pasted image 20260724150124.png]]


### 练习
![[Pasted image 20260724150416.png]]

示例
	哎，感觉我废废的。。。
```python
for i in range(1,10):  
    for x in range(1,i+1):  
        print(f"{i}*{x}={i * x}\t",end='')  
    print()
```
![[Pasted image 20260724152832.png]]