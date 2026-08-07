### 函数

**函数：
是组织好的，可重复使用的，用来实现特定功能的代码块 ![[Pasted image 20260725095341.png]]

小案例
接下来，让我们实际的体验一下函数的使用

不使用内置函数len()，完成字符串长度的计算 

示例：
```python
str1 = "itheima"  
str2 = "itcast"  
str3 = "python"  
  
# 定义一个计数的变狼  
count = 0  
for i in str1:  
    count += 1  
print(f"字符串{str1}的长度是{count}")  
  
count = 0  
for i in str2:  
    count += 1  
print(f"字符串{str2}的长度是{count}")  
  
count = 0  
for i in str3:  
    count += 1  
print(f"字符串{str3}的长度是{count}")

```

![[Pasted image 20260725100019.png]]

上面的变成感觉太low了，好多重复的，这时候，函数的作用就出来了，下了一个自定义的用来计算字符串的函数，太优雅了~
![[Pasted image 20260725101010.png]]

示例
```python
def my_len(data):  
    count = 0  
    for i in data:  
        count += 1  
    print(f"字符串{data}的长度是{count}")  
my_len(str1)  
my_len(str2)  
my_len(str3)
```

![[Pasted image 20260725100835.png]]


嘻嘻，函数真的好好用欸
![[Pasted image 20260725101054.png]]

### 函数的基础定义语法

**函数的定义语法**

![](./附件/20-Python函数初体验-2026-07-27-15-41-53.png)
#### 小练习
![](./附件/20-Python函数初体验-2026-07-27-15-43-35.png)

示例
```python
# 欢迎语  
def welcomc_language():  
    print(f"欢迎来到黑马程序员！\n请出示您的健康吗以及72小时核算证明")   
  
welcomc_language()
```

![](./附件/20-Python函数初体验-2026-07-27-15-49-20.png)
### 函数的传入参数

**函数的传入方式**
![](./附件/20-Python函数初体验-2026-07-27-15-55-54.png)

**传参定义

![](./附件/20-Python函数初体验-2026-07-27-15-56-46.png)

**小练习

```python
def add(x,y,z):  
    rersult = x + y + z  
    print(f"{x} + {y} + {z}的计算结果是：{rersult}")  
  
add(3,4,5)
```

**解析**
![](./附件/20-Python函数初体验-2026-07-27-16-00-41.png)

**传入参数的数量是不受限制的：
- 可以i不使用参数。
- 也可以仅使用任意N个参数


#### 小练习


![](./附件/20-Python函数初体验-2026-07-27-16-03-24.png)

示例
```python
# 核算检测，温度小于37.5C  
def check_tmp(tmp_num):  
    print(f"欢迎来到黑马程序员！请出示您的健康码以及72小时核算证明，并配合测量体温！\n")  
    tmp_num = float(tmp_num)  
    if tmp_num <= 37.5:  
        print(f"提问测量中，您的体温是：{tmp_num}度，体温正常请进！")  
    else:  
        print(f"体温测量中，您的体温是：{tmp_num}度，需要隔离！")  
user_input = input("亲输入您的体温")  
check_tmp(user_input)
```

![](./附件/20-Python函数初体验-2026-07-27-16-29-55.png)

### 函数的返回值
#### 函数的返回值return

**什么是函数的返回子**

生活中的返回值
![](./附件/20-Python函数初体验-2026-07-27-16-31-11.png)

程序中的返回值：
![](./附件/20-Python函数初体验-2026-07-27-16-36-33.png)

**语法使用**

![](./附件/20-Python函数初体验-2026-07-27-16-37-06.png)

**小练习
```python
def add(x,y):  
    result = x + y  
    return result  
  
# 函数的返回值  
r = add(1,3)  
print(r)
```

#### 函数的返回值None

**None类型
![](./附件/20-Python函数初体验-2026-07-27-16-42-22.png)


**小练习
```python
 # 无return语句的函数返回值  
def sya_hei1():  
    print(f"你好呀")  
  
result = sya_hei1()  
print(f"无返回值函数，返回的内容是：{result}")  
print(f"无返回值函数，返回的内容类型是：{type(result)}")  
  
# 主动返回None的函数  
def sya_hei2():  
    print(f"你好呀")  
    return None  
  
result = sya_hei2()  
print(f"无返回值函数，返回的内容是：{result}")  
print(f"无返回值函数，返回的内容类型是：{type(result)}")
```

**None类型得应用场景**

![](./附件/20-Python函数初体验-2026-07-27-16-56-12.png)

**小练习**

```python
def check_age(age):  
    if age > 18:  
        return "SUCCESS"  
    else:  
        return None  
  
result = check_age(16)  
if not result:  
    print(f"未成年，不可以进去")  
  
# 用于声明无处使内容得变量  
name = None
```

### 函数得说明文档

**函数得说明文档**
![](./附件/20-Python函数初体验-2026-07-27-17-08-46.png)

**小练习**
```python
def add(x,y):  
    """  
    add 函数可以接受2个参数，进行两数相加得功能  
    :param x: 形参x表示相加的其中一个数字  
    :param y: 形参y表示相加得另一个数字  
    :return :返回值是两束相加得结果  
    """  
    result = x + y  
    print(f"两数相加得结果是：{result}")  
    return result  
  
add(5,6)
```

![](./附件/20-Python函数初体验-2026-07-27-17-36-27.png)


### 函数得嵌套调用


**什么是函数得嵌套调用呢**

![](./附件/20-Python函数初体验-2026-07-27-17-37-43.png) 

```python
# 定义函数func_b  
def func_b():  
    print(f"---2---")  
  
# 定义函数func_a，并在内部调用func_b  
def func_a():  
    print(f"---1---")  
  
    func_b()  
  
    print(f"---3---")  
  
# 调用函数fun_a  
func_a()
```

![](./附件/20-Python函数初体验-2026-07-27-17-42-31.png)

### 变量再函数中的作用域

**局部变量**
![](./附件/20-Python函数初体验-2026-07-27-17-50-24.png)

**小练习**
```python
# 局部变量
def testA():
	num = 100
	print(num)
testA()           # 正常执行
print(num)        # 会报错，显示未定义的变量


# 全局变量，输出正常
num = 100
def testA():
	print(num)
testA()
print(num)  
```


**全局变量 **

![](./附件/20-Python函数初体验-2026-07-27-17-58-37.png) 


**小练习**
```python
# 在函数内修改全局变量，不加global的话，num在函数里面只是一个局部变量，加上个在之后就变成了全局
num = 100  
  
def test_a():  
    print(f"test_a:{num}")  
  
def test_b():  
    num = 500  
    print(f"test_b:{num}")  
  
test_a()  
test_b()  
print(num)
```
![](./附件/20-Python函数初体验-2026-07-27-18-25-23.png)


#### 练习

效果展示
![](./附件/20-Python函数初体验-2026-07-27-18-26-46.png)

*要求
![](./附件/20-Python函数初体验-2026-07-27-18-28-01.png)

示例

```python
# 定义一个全局变量：money，用来记录银行卡余额（默认5000000）  
# 定义一个全局变量：name，用来记录用客户姓名（启动程序时上输入）  
# 定义如下哈桉树：  
# 1、查询余额函数  
# 2、存款函数  
# 3、取款函数  
# 4、主菜单你函数  
"""  
要求：  
程序启动时要求输入客户姓名  
查询余额、存款、取款后都会返回主菜单  
存款、取款后、都应显示一下当前余额  
客户选择退出或输入错误，程序会退出，否则一直运行  
"""  
  
# money = 5000000  
# name = input("请输入名称：")  
#  
#  
# # 查询余额函数  
# def select_money():  
#     print(f"---------------余额---------------")  
#     print(f"{name},您好，您的余额是：{money}")  
#     main()  
#  
#  
# # 存款函数  
# def save_money():  
#     global money  
#     sum_money = int(input("请输入您要存的钱："))  
#     money += sum_money  
#     print(f"---------------存款---------------")  
#     print(f"{name},您好，您存款{sum_money}元成功\n{name},您好，您的余额剩余：{money}")  
#     main()  
#  
#  
# # 取款余额  
# def get_money():  
#     print(f"---------------取款---------------")  
#     global money  
#     sub_money = int(input("请输入您要取的钱："))  
#     if sub_money > money:  
#         print(f"余额不足")  
#     else:  
#         money -= sub_money  
#         print(f"{name},您好，您取款{money}元成\n{name},您好，您的余额剩余：{money}")  
#     main()  
#  
#  
# # 主菜单函数  
# def main():  
#     global name  
#     while True:  
#         print(f"\n{name}，您好，欢迎来到黑马银行ATM")  
#         print("查询余额 [输入1]")  
#         print("存款     [输入2]")  
#         print("取款     [输入3]")  
#         print("退出     [输入4]")  
#         check_num = int(input("请输入您的选择："))  
#         if check_num == "1":  
#             select_money()  
#         elif check_num == "2":  
#             save_money()  
#         elif check_num == "3":  
#             get_money()  
#         elif check_num == "4":  
#             print("退出成功，再见！")  
#             break  
#         else:  
#             print("输入有误，请重新输入")  
#  
#  
# main()  
  
# b站黑马讲课老师带着写的  
# 定义全局变量  
money = 5000000  
name = None  
  
# 要求客户输入姓名  
name = input("请输入您的姓名")  
  
# 定义查询函数  
def query(show_header):  
    if show_header:  
        print(f"---------------查询----------------")  
    print(f"{name}，您好，您的余额剩余：{money}")  
  
# 定义存库按函数  
def saving(num):  
    global money  
    money += num  
    print(f"---------------存款---------------")  
    print(f"{name},您好，您存款：{num}元成功")  
  
    # 调用query函数，查询余额  
    query(False)  
  
# 定义取款函数  
def get_moeny(num):  
    global money  
    money -= num  
    print(f"---------------取款---------------")  
    print(f"{name},您好，您取款{num}元成功。")  
  
    # 调用query函数  
    query(False)  
  
# 定义主菜单  
def main():  
    print(f"---------------主菜单---------------")  
    print(f"查询余额:\t\t[输入1]")  
    print(f"存款:\t\t[输入2]")  
    print(f"取款:\t\t[输入3]")  
    print(f"退出:\t\t[输入4]")  
    return input("请输入您的选择：")  
  
while True:  
    keyboard_input = main()  
    if keyboard_input == "1":  
        query(True)  
        continue  
    elif keyboard_input == "2":  
        num = int(input("您要存多少钱？请输入："))  
        saving(num)  
        continue  
    elif keyboard_input == "3":  
        get_moeny(num)  
        continue  
    else:  
        print(f"程序退出！")  
        break  
  
  
main()

```