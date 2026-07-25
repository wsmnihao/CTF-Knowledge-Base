### continue用法
![[Pasted image 20260724153334.png]]

示例
```python
# continue语法的使用
for i in range(10):
	print(f"语法1)
	continue
		print(f"语法2)   # 会跳出取，不执行语句2的
```

### break用法
![[Pasted image 20260725084024.png]]

示例
```python
for i in range(1,101):  
    print(f"语句1")  
    break  
    print(f"语句2")  
  
print(f"语句3")
```

**break在循环中的使用
![[Pasted image 20260725084502.png]]



示例
```python
for i in range(1,101):  
    print(f"语句1")  
    for x in range(1,101):  
        print(f"语句2")  
        break  
        print(f"语句3")  
    print(f"语句4")
```

### 循环综合练习
![[Pasted image 20260725084744.png]]

示例
```python
# balance  
balance = 10000  
import random  
  
for i in range(1,21):  
    num = random.randint(1,10)  
    if num < 5:  
        print(f"员工{i}，绩效分{num},绩效分低于5，不发工资")  
        continue  
  
    if balance >= 1000:  
        balance -= 1000  
        print(f"向员工{i}发工资1000元，当前余额{balance}")  
    else:  
        print(f"工资发完了，当前余额{balance}，等下个月发吧")  
        break
```

![[Pasted image 20260725094840.png]]