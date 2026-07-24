### input语句（函数）
之前学习过的print语句（函数）可以完成将内容（字面量，变量等）输出到屏幕上。
在python中，与之对应的还有一个input语句，用来获取键盘输入。
- 数据输出：==print==
- 数据输入：==input==
使用上也非常简单：
- 使用input()语句可以从键盘上获取输入
- 使用一个变量接收(存储)input语句获取的数据即可 

示例：
```python
print("告诉我你是谁？")  
name = input()  
print("我知道了，你是%s" % name)  
  
# 输入数字类型  
num = int(input("请输入你的银行卡密码："))  
print(num)  
print("你的银行卡密码类型是：",type(num))

```

![[Pasted image 20260722101657.png]]

### 小练习
![[Pasted image 20260722101941.png]]

示例
```python
user_name = input("请输入您的姓名")  
user_type = input("请输入您的账户类型")  
print(f"您好！{user_name},您是尊贵的：{user_type}用户，欢迎您的光临~")
```

![[Pasted image 20260722102657.png]]

