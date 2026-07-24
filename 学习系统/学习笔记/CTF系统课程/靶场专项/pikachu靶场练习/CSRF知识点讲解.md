# 🛡️ CSRF（跨站请求伪造）深度解析
### 一、定义

**CSRF（Cross-Site Request Forgery，跨站请求伪造）**：攻击者利用用户已登录的身份，在用户不知情的情况下，以用户的名义向服务器发送恶意请求，执行非用户本意的操作。

> **通俗理解**：你把银行卡和密码都插在ATM里（已登录），有人偷偷用你的手去按"转账"按钮。

---

### 二、CSRF的核心本质

|核心概念|说明|
|---|---|
|**利用对象**|用户的**身份凭证**（Cookie/Session）|
|**触发条件**|用户**已登录**目标网站|
|**攻击结果**|执行**非用户本意**的操作（改密码、转账、删数据等）|
|**关键漏洞**|服务器**只认凭证，不认操作者本人**|

---

### 三、攻击原理（图解）
```text
用户浏览器                         目标网站
    │                                  │
    │  1. 用户登录，获得Cookie/Session  │
    │─────────────────────────────────>│
    │                                  │
    │  2. 用户访问恶意网站              │
    │─────────────────────────────────>│
    │                                  │
    │  3. 恶意网站自动向目标网站发请求   │
    │  （携带用户Cookie）              │
    │─────────────────────────────────>│
    │                                  │
    │  4. 目标网站以为是用户本人操作     │
    │  执行请求（转账/改密码等）        │
    │<─────────────────────────────────│
    │                                  │
```
**关键点**：浏览器在向目标网站发送请求时，会自动携带该域名下的Cookie，攻击者不需要知道密码，只需要**诱导用户触发请求**。

---

### 四、CSRF的三种攻击手法

|类型|方式|示例|
|---|---|---|
|**GET型**|通过URL携带参数|`<img src="http://bank.com/transfer?to=attacker&money=1000">`|
|**POST型**|通过自动提交表单|`<form action="http://bank.com/transfer" method="POST"><input name="to" value="attacker"></form><script>document.forms[0].submit();</script>`|
|**链接型**|诱导用户点击|`<a href="http://bank.com/delete?id=1">点击领取红包</a>`|

---

### 五、CSRF与XSS的核心区别

|对比维度|**CSRF**|**XSS**|
|---|---|---|
|**攻击目标**|借用**用户身份**发请求|在**页面注入恶意脚本**|
|**受害者**|已登录的**正常用户**|**所有访问页面的用户**|
|**攻击方式**|诱导用户**点击/访问**|利用页面**输入输出**缺陷|
|**利用条件**|用户**已登录**目标网站|网站**存在注入点**|
|**攻击结果**|执行**操作**（转账/改密码）|执行**脚本**（窃取Cookie/篡改页面）|
|**一句话总结**|**借用你的手**|**在你眼里植入木马**|

---

### 六、防御方案对比

|防御方式|原理|强度|适用场景|
|---|---|---|---|
|**CSRF Token**|每次请求携带随机Token，服务端验证|⭐⭐⭐⭐⭐|表单提交、API接口|
|**SameSite Cookie**|限制第三方网站发送Cookie|⭐⭐⭐⭐|所有Cookie|
|**验证Referer**|检查请求来源域名|⭐⭐⭐|一般防护|
|**二次验证**|输入密码/验证码|⭐⭐⭐⭐⭐|敏感操作（转账、改密）|
|**图形验证码**|人类验证|⭐⭐⭐⭐⭐|登录、关键操作|
|**双重Cookie验证**|同时验证Cookie中的Token|⭐⭐⭐⭐|API防护|

**最佳实践**：**CSRF Token + SameSite Cookie + 敏感操作二次验证** 组合使用。

### 七、CSRF Token的详细原理

这是目前最主流的防御方式：
```text
1. 服务器生成一个随机Token
   ↓
2. Token存入用户Session，同时嵌入HTML表单
   ↓
3. 用户提交表单时，携带Token
   ↓
4. 服务器比对表单Token与Session Token
   ↓
5. 一致 → 合法请求；不一致 → 拒绝
```

**Token要求**：

- **随机性**：不可预测（使用UUID或加密随机数）
    
- **唯一性**：每个会话/每个请求唯一
    
- **时效性**：有过期时间
    

---

### 八、真实CSRF攻击场景（历史案例）

|案例|时间|手法|影响|
|---|---|---|---|
|**Netflix CSRF漏洞**|2019|修改用户订阅套餐|用户被强制升级套餐|
|**Twitter CSRF漏洞**|2017|发送指定推文|用户被迫自动发推|
|**GitHub CSRF漏洞**|2016|修改仓库配置|仓库设置被篡改|
|**支付宝历史漏洞**|2014|绕过支付验证|资金安全风险|

---

### 九、如何检测一个系统是否存在CSRF

| 检测步骤               | 方法                             |
| ------------------ | ------------------------------ |
| **1. 抓包分析**        | Burp Suite拦截请求，观察是否携带Token参数   |
| **2. 尝试移除Token**   | 移除Token参数，看服务器是否拒绝请求           |
| **3. 尝试篡改Token**   | 修改Token值，看服务器是否验证              |
| **4. 尝试从其他域名发起请求** | 构造跨域请求，看服务器是否防御                |
| **5. 检查Cookie属性**  | 查看`SameSite`是否有设置，`Secure`是否启用 |
### 十、代码示例

#### ❌ 存在CSRF的代码（Python Flask）
```python
@app.route('/change_password', methods=['POST'])
def change_password():
    new_password = request.form['password']
    # 仅凭Session验证身份 → 存在CSRF风险
    user = get_current_user()  # 从Session获取用户
    update_password(user.id, new_password)
    return '密码已修改'
```
#### ✅ 防御CSRF的代码
```python
import secrets
from flask import session

# 生成Token
def generate_csrf_token():
    token = secrets.token_hex(16)
    session['csrf_token'] = token
    return token

# 验证Token
def validate_csrf_token():
    form_token = request.form.get('csrf_token')
    session_token = session.get('csrf_token')
    return form_token and session_token and form_token == session_token

# 路由处理
@app.route('/change_password', methods=['POST'])
def change_password():
    if not validate_csrf_token():
        return 'CSRF验证失败', 403
    # 继续处理请求...
```
### 十一、CSRF的变种：Login CSRF

|类型|说明|
|---|---|
|**Login CSRF**|攻击者用自己的账号登陆目标网站，让受害者（被诱导点击）的浏览器记录下攻击者的账号，后续受害者的操作（如购物、评论）都会被记录在攻击者名下|

---

### 十二、一句话总结

> **CSRF的本质是"身份被冒用"**——服务器信任了浏览器携带的Cookie，但**无法区分请求是用户本人主动发起的，还是被恶意网站伪造的**。防御的关键，就是**让服务器能够验证每个请求的"意图"**，而不是只验证"身份"。

### 十三、题目
[[CSRF练习]]