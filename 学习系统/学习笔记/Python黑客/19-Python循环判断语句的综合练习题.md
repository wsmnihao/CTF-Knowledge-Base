### 第一组
#### 练习1：打印所有整数

>使用 `for` 循环打印 1 到 50 的所有整数（包括奇数和偶数）。

#### 练习2：只打印偶数

> 使用 `for` 循环打印 1 到 100 之间的所有**偶数**。

#### 练习3：只打印奇数

> 使用 `for` 循环打印 1 到 50 之间的所有**奇数**。

#### 练习4：倒序打印

> 使用 `for` 循环从 50 倒序打印到 1。

#### 练习5：while 累加求和

> 用 `while` 循环计算 1 到 100 的累加和。

### 第二组：条件 + 循环组合
#### 练习6：奇偶数分离
> 遍历 1 到 50，把所有奇数输出到一行，偶数输出到另一行。

#### 练习7：跳过 3 的倍数

> 用 `for` 循环打印 1 到 50，但当数字是 3 的倍数时，使用 `continue` 跳过不打印。

#### 练习8：找到第一个能被 7 整除的数

> 用 `while` 循环从 1 开始递增，找到第一个能被 7 整除的数，找到后用 `break` 退出。

### 第三组：经典应用场景
#### 练习9：猜数字游戏

> 程序随机生成一个 1-100 的数字，用户输入猜，猜大了提示“大了”，猜小了提示“小了”，猜中提示“猜对了！”并结束游戏。最多允许猜 5 次，猜错 5 次提示“游戏结束”。

#### 练习10：九九乘法表

> 用嵌套 `for` 循环打印九九乘法表。

#### 练习11：水仙花数

> 找出 100-999 之间的所有“水仙花数”（一个三位数，各位数字的立方和等于它本身，如 153 = 1³ + 5³ + 3³）。

### 第四组：稍难一点
#### 练习12：密码校验

>程序要求用户输入密码，密码必须满足：
>- 长度 ≥ 8 位
>- 包含至少一个大写字母
>- 包含至少一个小写字母
>- 包含至少一个数字
如果不符合，提示具体哪里不对，让用户重新输入，直到输入正确为止。

#### 练习13：删除列表中所有特定元素

> 给定一个列表 `nums = [1, 3, 5, 3, 7, 3, 9]`，用循环把所有 `3` 删除干净（不能用 `remove()` 只删一个那种方式）。

#### 练习14：打印菱形

> 用 `for` 循环打印一个 7 行的菱形。

### 第五组：综合挑战

> 打印前 20 个斐波那契数列（从 0, 1 开始，每个数是前两个数之和）。

#### 练习16：质数判断

> 输入一个数字，判断它是不是质数（只能被 1 和自身整除）。

#### 练习17：最大公约数（GCD）

> 输入两个数字，用辗转相除法求最大公约数。


---
### 答案整合
#### 第一组
##### 1.1打印所有整数
```python
for i in range(1, 51):
    print(i)
```

##### 1.2只打印偶数
```python
for i in range(1, 101):
    if i % 2 == 0:
        print(i)
```

##### 1.3只打印奇数
```python
for i in range(1, 51):
    if i % 2 == 1:
        print(i)
```

##### 1.4倒序打印
```python
for i in range(50, 0, -1):
    print(i)
```

##### 1.5while累加求和
```python
i = 1
sum_number = 0
while i <= 100:
    sum_number += i
    i += 1
print(f"1-100的和是：{sum_number}")
```

#### 第二组：条件+循环组合
##### 2.1奇偶数分离
```python
# 提示：可以用两个列表分别装奇数和偶数，最后再打印
odds = []
evens = []
for i in range(1, 51):
    if i % 2 == 1:
        odds.append(str(i))
    else:
        evens.append(str(i))
print("奇数：", " ".join(odds))
print("偶数：", " ".join(evens))
```

##### 2.2跳过7的倍数
```python
for i in range(1, 51):
    if i % 3 == 0:
        continue
    print(i)
```

##### 2.3找一个能被7整除的数
```python
i = 1
while True:
    if i % 7 == 0:
        print(f"第一个能被7整除的数是：{i}")
        break
    i += 1
```

#### 第三组：经典应用场景
##### 3.1猜数字游戏
```python
import random

target = random.randint(1, 100)
max_attempts = 5

for attempt in range(1, max_attempts + 1):
    guess = int(input(f"第{attempt}次猜（1-100）："))
    if guess == target:
        print("🎉 猜对了！")
        break
    elif guess > target:
        print("大了")
    else:
        print("小了")
else:
    print(f"游戏结束，正确答案是：{target}")
```

##### 3.2九九乘法表
```python
for i in range(1, 10):
    for j in range(1, i + 1):
        print(f"{j}×{i}={i*j}", end="\t")
    print()
```

##### 3.3水仙花数
```python
for num in range(100, 1000):
    a = num // 100        # 百位
    b = (num // 10) % 10  # 十位
    c = num % 10          # 个位
    if a**3 + b**3 + c**3 == num:
        print(num)
```

#### 第四组：稍微难一点
##### 4.1密码校验
```python
while True:
    pwd = input("请输入密码：")
    errors = []
    if len(pwd) < 8:
        errors.append("长度至少8位")
    if not any(c.isupper() for c in pwd):
        errors.append("至少包含一个大写字母")
    if not any(c.islower() for c in pwd):
        errors.append("至少包含一个小写字母")
    if not any(c.isdigit() for c in pwd):
        errors.append("至少包含一个数字")
    if errors:
        print("密码不符合要求：", "，".join(errors))
    else:
        print("✅ 密码设置成功！")
        break
```

##### 4.2删除列表中的所有特定元素
```python
nums = [1, 3, 5, 3, 7, 3, 9]
# 方法：从后往前删，或新建列表
result = []
for num in nums:
    if num != 3:
        result.append(num)
print(result)
```

##### 4.3打印菱形
```text
   *
  ***
 *****
*******
 *****
  ***
   *
```
```python
n = 7
mid = n // 2
for i in range(n):
    spaces = abs(mid - i)
    stars = n - 2 * spaces
    print(" " * spaces + "*" * stars)
```

#### 第五组：综合挑战
##### 5.1斐波那契数列
```python
a, b = 0, 1
for _ in range(20):
    print(a, end=" ")
    a, b = b, a + b
```

##### 5.2最大公约是数
```python
a = int(input("输入第一个数："))
b = int(input("输入第二个数："))
x, y = a, b
while y != 0:
    x, y = y, x % y
print(f"{a}和{b}的最大公约数是：{x}")
```