### 什么是变量
**==变量==：
	在程序运行时，能储存计算结果或能表示值得抽象概念。
简单得说，变量就是在程序运行时，记录数据用的。。。

变量得定义格式
![[Pasted image 20260721115721.png]]
示例
```python
# 定义一个变量，用来记录钱包余额
money = 100
# 通过print语句，输出变量记录的内容
print("钱包还有：",money)

# 买了一个订制棒棒糖，花费10元
money = money - 10
print("买了棒棒糖花费了10元，还剩：",money,"元")
```
图例
![[Pasted image 20260721120230.png]]

**小练习

求钱包余额
请在程序中，定义如下变量：
	钱包余额（变量名：money），初始余额50
请通过程序计算，在购买了：
	冰淇淋10元
	可乐5元
后钱包余额还剩多少元，请通过print语句按照下图所示，进行输出：
![[Pasted image 20260721120714.png]]

示例：
```python
# 定义变量  
money = 50  
ice_cream = 10  
cola = 5  
  
# 产出当前余额  
print("钱包当前余额：",money)  
  
# 花掉之后  
print("购买了冰淇淋，花费:",ice_cream,"元")  
print("购买了可乐，花费：",cola,"元")  
money = money - ice_cream - cola  
print("最终，钱包剩余：",money,"元")
```
![[Pasted image 20260721121551.png]]