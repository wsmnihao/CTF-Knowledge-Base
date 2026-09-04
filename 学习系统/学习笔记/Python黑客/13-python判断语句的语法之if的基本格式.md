### if判断语句
![[Pasted image 20260723084119.png]]

![[Pasted image 20260723084307.png]]



示例

```python
age = 20  
if age >= 20:  
    print("我已经成年了！")  
    print("即将步入大学生活")  
else:  
    print("继续努力，冲击月考")  
print("准备迎接高考！")
```

### if常见用法

**常规数值比较**

```Python
age = 20  
if age >= 20:  
    print("我已经成年了！")  
    print("即将步入大学生活")  
else:  
    print("继续努力，冲击月考")  
print("准备迎接高考！")
```

**检查多个条件**‘and’

and用法里面，必须左右两边都通过判断之后，才显示True，不通过任何一侧的一个，会返回False
```Python
age01 = 22  
age02 = 18  
if age01 >= 21 and age02 >= 21:  
    print(True)  
else:  
    print(False)

# 也可以这样写
if (age01 >= 21) and (age02 >= 21):  
    print(True)  
else:  
    print(False)
```

**使用or检查多个条件**

or用法里面，只要有任意一个通过判断即返回既定信息，都不通过会返回else的信息。
```Python
if age01 >= 21 or age02 >= 21:  
    print("你过关")  
else:  
    print("听不清楚！")
```

**检查特定字符是否在列表中**

```Python
list_if = ['apple','space','cyto','hello']  
if 'apple' in list_if:  
    print("存在字符！！")  
else:  
    print("未找到字符！")
```

**检查特定的值是否不在列表中**
检查某个值是否在某个列表中
```Python
banned_users = ['li','zhang','wang','wu']  
user = 'wu'  
if user not in banned_users:  
    print("存在！")  
else:  
    print("不存在")
```


**检查某个值是否为True或False**

```Python
list_not = False  
if not list_not:  
    print("假的")  
age = 10  
if not age >= 18:  
    print("成年了，恭喜")  
else:  
    print("未成年！！")
```

![[Pasted image 20260723085005.png]]

### 小练习
![[Pasted image 20260723085049.png]]

示例
**这个不建议用
```python
  
print(f"欢迎来到黑马儿童游乐场，儿童免费，承认收费。")  
age = int(input("请输入你的年龄："))  
  
if age >= 18:  
    print(f"您已成年，游玩需要补票10元。")  
    print(f"祝您游玩愉快！")  
print(f"您是未成年，不用买票。祝您游玩愉快")
```

![[Pasted image 20260723090307.png]]


### if-else组合！！！
![[Pasted image 20260723091029.png]]

![[Pasted image 20260723091206.png]]

示例：
```python
# 示例  
age = int(input("请输入你的年龄："))  
if age >= 18:  
    print(f"您成年了，现需要买票")  
else:  
    print(f"您未成年，可以免费游玩")
```
![[Pasted image 20260723091619.png]]

### 小练习
![[Pasted image 20260723091710.png]]

示例
```python
# 示例  
print(f"欢迎来到模拟宇宙")  
height = int(input("请输入你的身高（cm）："))  
  
if height >= 120:  
    print(f"您的身高超出120cm，游玩需要购票10元")  
    print(f"祝您游玩愉快")  
else:  
    print(f"您的身高为超出120cm，可以免费游玩。")  
    print(f"祝您游玩愉快")
```

![[Pasted image 20260723092255.png]]


### if-elif-else使用
在某些场景下，判断条件不止一个，可能有多个，这种需求python能实现吗？
有的兄弟，有的！！

if elif else语句可以实现 
![[Pasted image 20260723111307.png]]

参考
![[Pasted image 20260723111618.png]]
示例
```python
height = int(input("请输入你的身高（cm）："))  
vip_level = int(input("请输入你的VIP等级（1~5）："))  
day_payl = int(input("请入如今天的日期（号）："))  
  
if height < 120:  
    print(f"身高小于120cm，可以免费游玩")  
elif vip_level >= 3:  
    print(f"VIP级别大于等于3，可以免费游玩")  
elif day_payl == 1:  
    print(f"今天是{day_payl}号，可以游玩")  
else:  
    print(f"Sorry~~~所有条件都不满足，需要买票10元")  
print(f"祝您游玩愉快")
```

![[Pasted image 20260723113624.png]]

同时，也可以这样写
示例
```python
if int(input("请输入你的身高（cm）：")) < 120:  
    print(f"身高小于120cm，可以免费")  
elif int(input("输入你的VIP等级（1~5）：")) > 3:  
    print(f"你的VIP级别大于3，可以免费")  
elif int(input("请告诉我今天的日期：")) == 1:  
    print(f"今天算是1号，可以免费")  
else:  
    print(f"Sorry~~~条件都不满足，需要买票")
```

![[Pasted image 20260723113813.png]]

**我还是喜欢第一种写法。。。

### 练习
![[Pasted image 20260723114743.png]]

示例：
```python
# 猜数字练习  
conjecture = 101  
  
if int(input("请输入第一个数字：")) == conjecture:  
    print(f"恭喜，猜对啦")  
elif int(input("不对，再猜一次：")) == conjecture:  
    print(f"恭喜，猜对啦")  
elif int(input("不对，再猜最后一次：")) == conjecture:  
    print(f"恭喜，猜对啦")  
else:  
    print(f"Sorry，全部猜错啦，我想的是{conjecture}")
```

![[Pasted image 20260723120021.png]]