### while循环语句
![[Pasted image 20260724084414.png]]

hhhhhhhhh
![[Pasted image 20260724084634.png]]

![[Pasted image 20260724084653.png]]
1、while的条件需得到布尔类型，Ture表示继续循环，False表示循环结束
2、需要设置循环终止的条件，如i += 1配合i < 100 ，就能确保100次后停止，否则将无限循环
3、空格缩进和if判断一样，都需要设置

# 小练习
![[Pasted image 20260724085357.png]]

示例
```python
i = 1  
sum_number = 0  
while i <= 100:  
    sum_number += i  
    i += i + 1  
    print(f"当前累加值：{sum_number}")  
print(f"{sum_number}")
```

![[Pasted image 20260724090921.png]]

### while循环猜数字游戏
![[Pasted image 20260724091520.png]]

示例
```python
import random  
num = random.randint(1,100)  
count = 0  
  
flag = True  
while flag:  
    guess_num = int(input("请输入你的数字："))  
    count += 1  
    if guess_num == num:  
        print(f"猜中了，答案是{num}")  
        falg = False  
    else:  
        if guess_num > num:  
            print(f"你猜测的大了，继续")  
        else:  
            print(f"你猜测的小了，继续")  
  
  
print(f"你总共猜了{count}")
```
![[Pasted image 20260724103009.png]]

### while循环的嵌套使用
![[Pasted image 20260724103046.png]]

小案例
![[Pasted image 20260724103157.png]]

```python
i = 1  
# 外层循环
while i <= 100:  
    print(f"今天是{i}天，准备去表白。。。")  
    j = 1  
    while j < 10:  
        print(f"送给小美第{j}只玫瑰花")  
        j += 1  
    print(f"小美，我喜欢你")  
    i += 1  
print(f"坚持到第{i-1}天，表白成功")
```

![[Pasted image 20260724104154.png]]

### 九九乘法表while
**知识点补充**
![[Pasted image 20260724104327.png]]
**知识点补充-制表符\t**
![[Pasted image 20260724104706.png]]

#### 九九乘法表
![[Pasted image 20260724105009.png]]
示例
```python
i = 1  
while i <= 9:  
    j = 1  
    while j <= i:  
        print(f"{j}*{i}={i*j}", end="\t")  
        j += 1  
    print()  
    i += 1
```

![[Pasted image 20260724112312.png]]

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
  
money = 5000000  
name = input("请输入名称：")  
  
# 查询余额函数  
def  select_money():  
    print(f"---------------余额---------------")  
    print(f"{name},您好，您的余额是：{money}")  
    main()  
  
  
# 存款函数  
def save_money():  
    global money  
    sum_money = int(input("请输入您要存的钱："))  
    money += sum_money  
    print(f"---------------存款---------------")  
    print(f"{name},您好，您存款{sum_money}元成功\n{name},您好，您的余额剩余：{money}")  
    main()  
  
  
# 取款余额  
def get_money():  
    print(f"---------------取款---------------")  
    global money  
    sub_money = int(input("请输入您要取的钱："))  
    if sub_money > money:  
        print(f"余额不足")  
    else:  
        money -= sub_money  
        print(f"{name},您好，您取款{money}元成\n{name},您好，您的余额剩余：{money}")  
    main()  
  
  
  
  
# 主菜单函数  
def main():  
    global name  
    while True:  
        print(f"\n{name}，您好，欢迎来到黑马银行ATM")  
        print("查询余额 [输入1]")  
        print("存款     [输入2]")  
        print("取款     [输入3]")  
        print("退出     [输入4]")  
        check_num = input("请输入您的选择：")  
        if check_num == "1":  
            select_money()  
        elif check_num == "2":  
            save_money()  
        elif check_num == "3":  
            get_money()  
        elif check_num == "4":  
            print("退出成功，再见！")  
            break  
        else:  
            print("输入有误，请重新输入")  
main()
```
