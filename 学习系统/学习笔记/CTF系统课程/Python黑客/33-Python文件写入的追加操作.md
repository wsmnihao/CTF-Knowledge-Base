### 追加写入操作快速入门

示例
```python
# 1.打开文件，通过a模式打开即可
f = open("python","a")

# 2.文件追加写入
f.write("hello world)

# 3.内容刷新
f.flush()
```

==注意==：
- a模式：文件不存在会创建文件
- a模式：文件存在会在最后，追加写入文件。

```python
# # 打开文件暗金  
# f = open("K:/Mirror_Void_Arsenal/Python/day12/write_1.txt","a",encoding="UTF-8")  
#  
# # write写入  
# f.write("hello world!!!")  
#  
# # 刷新  
# f.flush()  
#  
# # 关闭文件  
# f.close()  
  
# 打开一个存在的文件  
f = open("K:/Mirror_Void_Arsenal/Python/day12/open_read.txt","a",encoding="UTF-8")   
# 追加写入  
f.write("以上都是小狐狸的笔记！！！")  
  
# 刷新  
f.flush()  
  
# 关闭文件  
f.close()
```