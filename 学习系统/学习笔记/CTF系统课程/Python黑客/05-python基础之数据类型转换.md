### 为什么要转换类型？

数据类型之间，在特定的场景下，是可以相互转换的，如字符串转数字，数字转字符串等。

### 常见的转换语句

| 语句（函数）   | 说明         |
| -------- | ---------- |
| int(x)   | 将x转换为一个整数  |
| floag(x) | 将x转换为一个浮点数 |
| str(x)   | 将对象x转换为字符串 |
**注意：

	这三个语句，都是带有结果的（返回值），可以直接用print输出，或用变量存储结果只

示例：
```python
# 将数字11转换成字符串  
from tomlkit import float_  
  
num_str = str(11)  
print(type(num_str),num_str)  
  
# 将浮点型转换成字符型  
float_str = str(11.333)  
print(type(float_str),float_str)  
  
# 将字符串转换为数字,仅仅只是数字，只能是数字  
str_int = int("11")  
print(type(str_int),str_int)  
  
# 整数转小数，正常  
int_float = float(11)  
print(type(int_float),int_float)  
  
# 小数转整数，会丢失精度  
float_int = int(11.031)  
print(type(float_int),float_int)
```

![[Pasted image 20260721162833.png]]