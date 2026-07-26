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
