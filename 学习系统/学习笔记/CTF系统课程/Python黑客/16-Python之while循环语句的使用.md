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
