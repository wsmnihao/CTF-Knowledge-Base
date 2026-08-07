# 基于get请求的CSRF

	登录任意一个用户，账号信息点击提示就能显示出来。正常贴近真实案例是在某个网站需要获取用户信息，要实施csrf，需要我们的hack先注册个普通账号，了解用户的个人信息的基本设计逻辑，再构造csrf的恶意url链接，诱使受害者点击，从而完成整个攻击路径。

### 方法一
	这里登录任意一账号，模拟受害者。
	lili
	123456

![[Pasted image 20260620170844.png]]

**构建payload

	登录账号之后，点击修改个人信息，点击提交，抓取提交信息的数据包

![[Pasted image 20260620180006.png]]

在请求区域中右键>相关工具>生成CSRF Poc

	例如修改信息如下：
	sex：or
	use:no
	phonenum：vi50
	email：123hack@hack.moc

![[Pasted image 20260620180418.png]]

**注解：
1、修改区域内的信息
2、生成恶意bp软件制作的恶意CSRF url地址
3、复制！！！


*这里用bp生成的CSRF poc制作的恶意链接在url上面有明显特征，请注意！


**得胜
记得将浏览器的流量放行处理即可，不是关闭拦截！！！
![[Pasted image 20260620180937.png]]

### 方法二

	除了使用bp软件以外，可以直接在url上面构造payload

**构造payload

	登录任意一个账号，按F12或者检查元素，点击网络，点击提交或者刷新，找到修改的url地址
	如下：
	http://pikachu:82/vul/csrf/csrfget/csrf_get_edit.php?sex=girl&phonenum=18396432213&add=usa&email=pikachu%40qq.com&submit=%E6%8F%90%E4%BA%A4

	构造为如下信息：
	sex：NULL
	phonenmu：NULL
	add：NULL
	email：hack@ishackme.moc
	
![[Pasted image 20260621180512.png]]


	完整构造payload地址
	http://pikachu:82/vul/csrf/csrfget/csrf_get_edit.php?sex=NULL&phonenum=NULL&add=NULL&email=hack%40ishack.moc&submit=%E6%8F%90%E4%BA%A4

	图示：

![[Pasted image 20260621181146.png]]

	注解：这个url地址很长，也有明显特征！！！

# 基于post请求的CSRF
![[Pasted image 20260620181050.png]]

**构建payload

	原理同上

![[Pasted image 20260620181305.png]]

**得胜
![[Pasted image 20260620181551.png]]

# 基于token的CSRF

	点击提示：显示查看源码，检查token的相关代码信息

![[Pasted image 20260620182111.png]]

**源码展示
![[Pasted image 20260621181950.png]]

**分析：

Pikachu 的 Token 关卡采用了标准的 CSRF Token 防御实现：每次刷新页面生成新的随机 Token，并绑定到用户 Session 中。这导致攻击者无法在“不知情”的情况下获取有效 Token，因此无法发起 CSRF 攻击。该关卡的“通关”目标不是绕过 Token，而是理解其防御逻辑。