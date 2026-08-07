### 字符串格式化之一
在学习途中，我们发现，这个拼接字符串也不好用
1. 变量过多，拼接起来实在是太麻烦了
	`print("我叫：" + name + "我住在：" + address + "我的电话是：" ,tel)`
2. 字符串无法和数字或其他类型完成拼接

解决这个问题的方法是：==字符串格式化！！！==

其中的，==%s==
- % 表示：我要占位，占位符
- s标识：将变量变成字符串放入占位的地方
![[Pasted image 20260722084440.png]]


如果是数字类型呢？也是可以用此方法的
例如：
```python
class_num = 57
avg_salary = 16781
message = "python大数据学习，就在北京%s期，毕业平均工资：%s" % (class_num,avg_salary)
print(message)
```
![[Pasted image 20260722085017.png]]

==数字类型需要存入里面的话，需要是数据类型转换之后才可以存入字符串里面==
但是！！！依旧用方法可以原封不动的放进去，如下

常见的如下是三类
![[Pasted image 20260722090224.png]]

如下示例
```python
name = "小团雀"  
set_up_year = 2001  
stock_price = 19.88  
message = "我是%s，我成立于%d,我今天的股价是%f" % (name,set_up_year,stock_price)  
print(message)
```
![[Pasted image 20260722090558.png]]

### 字符串格式化之二
目前的%符号占位有点老旧了，是旧写法，这里有一个更优雅的，更方便的方法，也是更加推荐的写法，并且不限数据类型，不用做精度控制！！！太优雅啦

**f-string语法：
==f"内容{变量名}"的格式来快速格式化==

如下所示
```python
name = "小团雀"  
set_up_year = 2001  
stock_price = 19.88  
# message = "我是%s，我成立于%d,我今天的股价是%f" % (name,set_up_year,stock_price)  
# print(message)  
print(f"我是{name},我出生于{set_up_year},我今天的股价是{stock_price}")
```

![[Pasted image 20260722092814.png]]
### 字符串格式化的精准控制
从上图得知，float的值是19.9900000什么的，需要进行更精确的精度控制了
我们可以使用辅助符号”m，n“来控制数据的宽度和精度
- m，控制宽度，要求是数字（很少使用），设置的宽度小于数字自身，不生效
- n，控制小数点精度，要求是数字，会进行小数的四舍五入

示例：
```python
num1 = 11  
num2 = 11.345  
print("数字11宽度限制为5，结果是：%5d" % num1)  
print("数字11宽度限制为1，结果是：%1d" % num1)  
print("数字11.345宽度限制为7，小数精度为2，结果是：%7.2f" % num2)  
print("数字11.345宽度不限制，小数精度为2，结果是：%.2f" % num2)
```

![[Pasted image 20260722092000.png]]

### 对表达式的格式化
*什么是表达式？

刚刚的学习，都是基于变量的，接下来学习的是表达式！
表达式：一条具有明确执行结果代码的语句
如：
1 + 1、5 * 2就是表达式，因为有具体的执行结果，都是一个数字
又或者常见的变量定义：
name = '张三' age = 11 + 11

示例
```python
print("1 * 1的结果是：%d" % (1  * 1))  
print(f"1 * 2的结果是：{1 * 2}")  
print("字符串在python中的类型名是：%s" % type('字符串'))
```


![[Pasted image 20260722093520.png]]


### 练习
![[Pasted image 20260722093906.png]]

示例：
```python
name = "传智播客"  
stock_price = 19.99  
stock_code = "003032"  
stock_price_daily_growth_factor = 1.2  
growth_days = 7  
days_stock_price = stock_price * stock_price_daily_growth_factor ** growth_days  
print(f"公司：{name}，股票代码：{stock_code},当前股价：{stock_price}")  
print("每日增长系数是：%f 经过%d 的增长之后，股价达到了%.2f" % (stock_price_daily_growth_factor,growth_days,days_stock_price))

```

![[Pasted image 20260722100145.png]]