
### 写操作快速入门

案例：
```Python
# 1.打开文件
f = open("python.txt","w")

# 文件写入
f wirte ('hello world')

# 内容刷新
f.flush() 
```

==注意==：
- 直接调用write，内容并未真正写入文件，而是会积攒在程序的内存中，称之为缓冲区。
- 当调用flush的时候，内容会真正写入文件
- 这样做是避免频繁的操作硬盘，导致效率下降，一次性写磁盘


```python
import time  
f = open("K:/Mirror_Void_Arsenal/Python/day12/write.txt","w",encoding="UTF-8")  
  
# 写进内存，还没真正写入文件！！  
f.write("hello,world!!!")  
  
# 写入！！ 将内存中积攒的内容，写道硬盘的文件中  
f.flush()  
  
# 时间函数  
# time.sleep()  
  
# 关闭文件 close内置flush功能的！！  
f.close()
```