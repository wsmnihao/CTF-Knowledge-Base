### 什么是模块

Python**模块**（Module），是一个Python文件，以.py结尾，模块能定义函数，模块里也能包含可执行的代码。

**模块的作用：**
==python中有很多各种不同的模块==，每一个模块都可以帮助我们快速的实现一些功能，比如实现和时间相关的功能就可以使用time模块。我们可以认为一个模块就是一个工具包，每一个工具包中都具有各种不同的工具供我们使用进而实现各种不同的功能。

### 模块的导入方式

模块在使用前需要先导入，导入的语法如下：
```python
[from 模块名] import [模块 | 类 | 变量 | 函数 | *] [as 别名] 
```

常用的组合形式如下：
import 模块民
from 模块民 import 类、变量、方法等
from 模块名 import *
import 模块名 as 别名
from 模块名 import 功能名 as 别名

### import模块名

##### 基本语法

```python
import 模块名
import 模块名1，模块名2
模块名.功能名
```

案例：导入time模块

```python
# 导入时间模块
import time

print("开始")
# 让程序睡眠1秒（阻塞）
time.sleep(1)
print("结束")
```

### from 模块名 import功能名
#### 基本语法

```python
from 模块名 import 功能名
功能名()
```

案例：导入time模块中的sleep方法

```python
# 导入时间模块中的sleep方法
from time import sleep

print("开始")
# 让出程序睡眠1秒
sleep(1)
print("结束")
```

### as定义别名

#### 基本语法

```Python
# 模块定义别名
import 模块民 as 别名

# 功能定义别名
from 模块名 import 功能 as 别名
```


案例：
```python
# 模块名
import time as tt

tt.sleep(2)
print("hello")
```

```python
# 功能别名
from time import sleep as sl
sl(2)
print("hello")
```

