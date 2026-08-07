
题目如下：
![[Pasted image 20260723192030.png]]

题解
```python
# 终极猜数字u游戏  
import random  
num = random.randint(1,10)  
  
guess_number = int(input("第一次请输入数字："))  
# 第一次嵌套
if guess_number == num:  
    print(f"恭喜，第一次就猜猜中了！")  
else:  
    if guess_number > num:  
        print(f"猜大了，继续")  
    else:  
        print(f"猜小了，继续")  
    guess_number = int(input("第二次输入："))
    # 第二次欠嵌套  
    if guess_number == num:  
        print(f"恭喜，第二次猜对啦")  
    else:  
        if guess_number > num:  
            print(f"猜大了，继续")  
        else:  
            print(f"猜小了，继续")  
        guess_number = int(input("第三次输入："))  
        # 第三次嵌套
        if guess_number == num:  
            print(f"恭喜，第三次猜对啦")  
        else:  
            if guess_number > num:  
                print(f"猜大了，游戏结束")  
            else:  
                print(f"猜小了，游戏结束")

```

![[Pasted image 20260724084153.png]]