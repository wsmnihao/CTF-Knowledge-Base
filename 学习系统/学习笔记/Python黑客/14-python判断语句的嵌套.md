### 判断语句的嵌套
![[Pasted image 20260723120411.png]]

之前学习的是一层if语句，接下来我们要学习if之间的嵌套用法
![[Pasted image 20260723120623.png]]


示例：
```python
if int(input("你的身高是多少：")) > 120:  
    print(f"身高超出限制，不可以免费")  
    print(f"但是，如果VIP级别大于3，可以免费")  
  
    if int(input("你的VIP级别是多少：")) > 3:  
        print(f"恭喜你，VIP级别达标，可以免费")  
    else:  
        print(f"Sorry，你需要买票，10元！！！")  
else:  
    print(f"欢迎小朋友免费狱友玩")
```


![[Pasted image 20260723121303.png]]

但是！！！我更推荐第二个，代码简洁清晰，易维护，如下
示例
```python
height = int(input("请输入你的身高（cm）："))  
vip_level = int(input("你的VIP级别是多少（1~5）："))  
  
if height > 120:  
    print(f"抱歉哦，你的身高超出限制")  
    if vip_level > 3:  
        print(f"但是！你的VIP级别达标！！！可以游玩")  
    else:  
        print(f"你的VIP级别不够，不可以游玩")  
else:  
    print(f"你可以爽玩")
```

![[Pasted image 20260723185427.png]]


**拓展
![[Pasted image 20260723185518.png]]

示例
```python
# 要求：  
# 公司要发礼物，条件是：  
# 1、必须是大于等于18岁小于30岁的成年人  
# 2、同时入职时间需满足大于两年，或者级别大于3才可领取  
from Python.day3.if嵌套 import vip_level  
  
age = int(input("请输入你的年龄（岁）："))  
day_year = int(input("请输入你的入职工龄（年）："))  
vip_level = int(input("请输入你的VIP等级（1~5）:"))  
  
if age >= 18:  
    print(f"你是成年人，进行下一次判断")  
    if age < 30:  
        print(f"年龄达标，继续下一个判断")  
        if day_year > 2 or vip_level > 3:  
            print(f"入职满两年且达成任意一个条件约束，可以领取！！！")  
else:  
    print(f"Sorry，都不符合")
```

![[Pasted image 20260723191937.png]]

或者用这个也行，但是不推荐
```python
age = 20  
day_year = 3  
vip_level = 1  
if age >= 18:  
    print(f"你是成粘人，继续")  
    if age < 30:  
        print(f"你的年龄达标，继续")  
        if day_year > 2:  
            print(f"恭喜，你的年龄和工龄都达标，可以领取")  
        elif vip_level > 3:  
            print(f"恭喜，你的年龄和VIP级别达标，可以领取")  
        else:  
            print(f"抱歉，两者都不符合，不能领取")  
    else:  
        print(f"抱歉，你的年龄太大了，不=去辞职吧")  
else:  
    print(f"Sorry,综上所述，都不满足，不可以领取")
```
