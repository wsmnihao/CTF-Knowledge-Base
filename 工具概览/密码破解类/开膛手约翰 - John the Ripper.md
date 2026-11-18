### 初次了解
#### 什么是哈希

**哈希**是一个将任意长度的输入（比如密码或文件）通过特定数学算法，转换成固定长度“指纹”的过程。这个结果就被称为哈希值。

三大核心特点：
1. **固定长度**
	- 论输入的内容有多长、多大，输出的哈希值长度是固定的。比如常见的MD5，不管是一个字母还是一部电影，生成的哈希都是固定的32位字符。
2. **不可逆性**（单向性）
	- 从输入可以轻松算出哈希值，但从哈希值**无法反向推导**出原始输入。这是它用来安全存储密码的根本原因。
3. **雪崩效应**
	- 输入哪怕只改动一个字符，输出的哈希值都会发生巨大的、完全不同的变化。

例子：

	假设密码内容为`Hello123`，用`md5sum`来计算它的哈希值
```bash
echo -n "Hello123" | md5sum

# 输出如下：
b84c13f5da7d8f239486f3459b38f835  -
```

这个 `b84c13f5da7d8f239486f3459b38f835` 就是 `Hello123` 的 **MD5 哈希值**。

#### 为什么哈希的安全性这么高呢

**P与NP之间的事情

想象一下，你有一个**超级粉碎机**：

- 你扔进去任何东西（一本书、一张照片、一句话），它都会吐出一串固定长度的数字指纹（哈希值）
- 这台机器有个特性：**同样的东西扔进去，吐出来的指纹永远一样**
- 但坏消息是：**这个粉碎过程是不可逆的**——你只有指纹，不可能把原来的东西还原出来

**P与NP之间的关系

| 概念                   | 通俗理解       | 例子                                                                |
| -------------------- | ---------- | ----------------------------------------------------------------- |
| **P（多项式时间）类问题**      | 好解决的问题     | 把一列数字从小到大排序、做乘法 13×17、把密码算成哈希值                                    |
| **NP（非确定性多项式时间）类问题** | 验证容易，但解决困难 | 给你一个数 221，让你拆成 13×17——验证 13×17=221 很容易，但找到 13 和 17 很费劲。逆推哈希也是这类问题 |

#### 哈希真的安全吗？（John）开膛手会告诉你答案

**John的作用

`John the Ripper`是**离线密码哈希破解**工具里的大杀器。它不搞在线爆破，而是在你已经拿到密码哈希值之后，帮你把它还原成明文密码。

**破解哈希的方式

| 破解方式     | 核心思路                 | 优点           | 缺点                   | 适用场景                                 |
| -------- | -------------------- | ------------ | -------------------- | ------------------------------------ |
| **字典攻击** | 用预先准备好的常用密码列表进行尝试    | 速度快，效率高      | 高度依赖字典质量，复杂密码可能不在字典中 | 破解常见、简单的密码                           |
| **暴力破解** | 尝试所有可能的字符组合          | 理论上必然能破解     | 耗时随密码长度和复杂度指数级增长     | 密码长度较短或字符集已知                         |
| **规则攻击** | 在字典基础上进行变形（如替换、大小写等） | 能有效扩展字典的覆盖范围 | 仍受限于基础字典             | 破解经过简单变形的密码（例如`password`变`P@ssw0rd`） |

**规则攻击（Rules-based Attack）

这是 John 的一个特色功能：它会基于你提供的字典，自动生成一些常见的变体。比如，当字典里有 `password` 时，John 可以自动尝试 `Password`、`PASSWORD`、`passw0rd`、`p@ssword` 等常见变形。
用 John 启用规则攻击的方法：`--rules` 参数。
```bash
john --wordlist=字典.txt --rules hash.txt
```

### John的安装配置

**某些系统会预装John，比如kali等等

**安装
Linux

	有些Linux系统上是没有的，可以用以下这两种任意一个进行下载安装
```bash
sudo dnf install john 
sudo apt install john
```

**Windows

	Windows系统的话，则需要到浏览器里面搜索john，去下载安装压缩包，这里不做描述

### John的使用

有一点需要提到，这个目录是kali渗透测试的Linux发行版上的，用来存放“庞大”的字典库

`/usr/share/wordlists`

这个目录主要是为了给`John`以及`Gobuster`这些工具使用的提供一个存放常用字典文件（比如密码列表、目录名字典）的统一路径。


#### /usr/share/wordlists目录结构

#### 基础字典

| 文件/目录          | 用途                                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------- |
| rockyou.txt.gz | **最经典**的密码字典，来自 2009 年 RockYou 公司数据泄露事件，包含约 1400 万个真实密码。需要先解压：sudo gunzip /usr/share/wordlists/rockyou.txt.gz |
| fasttrack.txt  | FastTrack 渗透测试工具包的默认密码字典，包含常见的弱密码组合                                                                           |
| small.txt      | 小型精简版字典，用于快速测试                                                                                                |

#### 目录/路径爆破字典
 

| 文件/目录      | 用途                                                               |
| ---------- | ---------------------------------------------------------------- |
| dirb/      | **Dirb 工具专用字典**，常用于 Web 目录爆破。包含 `common.txt`、`big.txt` 等         |
| dirbuster/ | **DirBuster 工具专用字典**，包含 `directory-list-2.3-medium.txt`（约 22 万条） |
| gobuster/  | **Gobuster 工具专用字典**（如果安装了 gobuster 的话）                           |

#### 子域名爆破字典

| 文件/目录                            | 用途                                |
| -------------------------------- | --------------------------------- |
| subdomains-top1million-5000.txt  | 来自 SecLists 项目，包含最常见的 5000 个子域名列表 |
| subdomains-top1million-20000.txt | 包含最常见的 20000 个子域名列表               |

#### 综合字典集（ SecLists）

| 文件/目录     | 用途                                                           |
| --------- | ------------------------------------------------------------ |
| SecLists/ | **最全面的字典集合**，包含各种场景的字典文件，按分类存放在子目录中（密码、用户名、目录、子域名、Payload 等） |

#### 其他

| 文件/目录       | 用途                                    |
| ----------- | ------------------------------------- |
| metasploit/ | Metasploit 框架内置的密码字典（通常较小，是常用密码的精选集合） |
| wfuzz/      | Wfuzz Web 模糊测试工具使用的字典                 |
| wireshark/  | Wireshark 的一些过滤规则或字典                  |

**值得一提的是**rockyou.txt的来源是因为一场数据泄露事件。
2009年，一家名为**RockYou**的社交应用公司遭遇了严重的黑客攻击。攻击者利用**SQL注入漏洞**侵入了公司的数据库，并窃取了超过**3200万**用户的账户信息[](https://www.keepersecurity.com/blog/2023/08/04/understanding-rockyou-txt-a-tool-for-security-and-a-weapon-for-hackers/?trk=article-ssr-frontend-pulse_little-text-block)[](https://www.itnews.com.au/news/rockyou-hack-compromises-32-million-passwords-163017)。

这次事件之所以影响巨大，根源在于RockYou公司犯下了一个**严重的安全错误**：他们将用户的密码以**明文形式（Plaintext）** 存储在数据库中，完全没有加密[](https://www.keepersecurity.com/blog/2023/08/04/understanding-rockyou-txt-a-tool-for-security-and-a-weapon-for-hackers/?trk=article-ssr-frontend-pulse_little-text-block)[](https://m.techweb.com.cn/article/2009-12-17/498753.shtml)[](https://www.techweb.com.cn/news/2009-12-16/498267.shtml)。这导致黑客在侵入系统后，不需要任何破解，直接就能看到所有人的密码。泄露的密码随后被整理成一份文件，并以公司名“RockYou”命名，在黑客和网络安全社区中流传开来[](https://www.keepersecurity.com/blog/2023/08/04/understanding-rockyou-txt-a-tool-for-security-and-a-weapon-for-hackers/?trk=article-ssr-frontend-pulse_little-text-block)[](https://github.com/josuamarcelc/common-password-list)。

**从“安全灾难”到“安全工具”

讽刺的是，这份原本是安全灾难产物的密码列表，却因其**真实性**而变得极具价值。它包含了上千万个人们在真实场景下使用的密码，是研究用户密码习惯的绝佳样本[](https://www.keepersecurity.com/blog/2023/08/04/understanding-rockyou-txt-a-tool-for-security-and-a-weapon-for-hackers/?trk=article-ssr-frontend-pulse_little-text-block)。

因此，它被整合进了**Kali Linux**等渗透测试系统中，成为**John the Ripper**、**Hashcat**等密码破解工具的“标准字典”[](https://github.com/ikhomkodes/Kali-Linux-Rockyou-Txt-Wordlist)[](https://github.com/josuamarcelc/common-password-list)。安全人员用它来测试密码策略的强度，评估系统对暴力破解的抵抗力。

**“RockYou”家族的演变

原始的`rockyou.txt`包含约1400万个唯一密码[](https://github.com/josuamarcelc/common-password-list)。后来，社区基于相同理念，不断整合新的泄露数据库，生成了更大规模的版本，例如`RockYou2021.txt`（包含约820亿条）和`RockYou2024.txt`（包含近100亿条记录）[](https://github.com/ohmybahgosh/RockYou2021.txt/blob/main/README.md)[](https://www.darkreading.com/cyberattacks-data-breaches/10b-passwords-pop-up-on-dark-web-rockyou2024-release?blaid=6278708)[](https://www.kaggle.com/discussions/accomplishments/519169)。不过，现在你在Kali Linux的`/usr/share/wordlists`目录下看到并使用的，通常还是那个经典的、源自2009年泄露事件的原版文件[](https://github.com/ikhomkodes/Kali-Linux-Rockyou-Txt-Wordlist)。

简单来说，`rockyou.txt`就像一个直接从“真实犯罪现场”采集的“密码标本集”，因为它记录了真实用户的行为，所以成了安全测试中最常用的工具。

### John的基础破解哈希

**使用语法：

```bash
john [options] [file path]
	john # 工具名称
	[options] # 指定要加入的参数选项
	[file path] # 这个就是需要载入的字典了
```

#### 自动识别密码类型
	
当你不确定手头的哈希是 MD5、SHA-1、NTLM 还是其他格式时，John 会在未指定 `--format` 的情况下，自动分析哈希值的长度（如 32 位、40 位）、前缀（如 `$6$` 表示 Linux SHA-512）和字符集（十六进制或 Base64），从而推断其类型，并选用对应的破解策略。这一功能在快速测试时很方便，但在面对容易混淆的格式（如 MD5 与 NTLM）时可能出现误判，因此在准确知道哈希类型时，建议手动指定 `--format`。

**使用语法
```bash
john --wordlist=[path to wordlist] [path to file]
	--wordlist=     # 指定使用单词列表模式，读取你在路径中提供的文件
	[path to file] # 单词列表名称 
```
用例
```bash
john --wordlist=/usr/share/wordlists/rockyou.txt hash_to_crack.txt
```

#### 识别哈希类型
**识别脚本

John 的自动识别功能不是万能的，有时候它会认不出你给的哈希。这时候你不能干等着，需要借助外部工具来人工确认哈希类型。
这就要用到一个识别哈希类型的脚本了，这个需要到网络上下载下来，kali不会自己预装的，我的建议是直接存放到kali的/usr/share/john/的根目录下

```bash
sudo wget https://gitlab.com/kalilinux/packages/hash-identifier/-/raw/kali/master/hash-id.py
```

**使用
```bash
python3 hash-id.py
```
![[Pasted image 20260725171124.png]]

**识别格式使用
语法

```bash
john --format=[format] --wordlist=[path to file]
	--format # 哈希类型指定格式
	[format] # 哈希的格式
```

用例示例
```bash
john --format=raw-md5 --wordlist=/usr/share/wordlists/rockyou.txt hash_to_crack.txt
```

### 破解 Windows 认证哈希（NTLM 哈希）
#### 什么是 NTLM 哈希
**NTLM**（NT LAN Manager）是现代 Windows 操作系统用于存储用户和服务密码的哈希格式。它也被称为 **NTHash**。

**历史背景**：

- Windows NT 中的 "NT" 代表 **New Technology**（新技术）
- NTLM 是 LM（LAN Manager）哈希的继任者，安全性更高
- 现在 Windows 系统默认使用 NTLM 存储密码哈希

#### NTLM 哈希存储在哪儿？

| 存储位置                                  | 说明                                           |
| ------------------------------------- | -------------------------------------------- |
| **SAM 数据库**（Security Account Manager） | 本地用户账户信息，位于 `C:\Windows\System32\config\SAM` |
| **NTDS.dit**                          | Active Directory 域控上的数据库，存储域用户信息             |
#### 如何获取 NTLM 哈希？
1. **使用 Mimikatz**：`mimikatz.exe "privilege::debug" "sekurlsa::logonpasswords" exit`
2. **导出 SAM 文件**：从 Windows 系统中提取 SAM 文件
3. **从域控获取**：获取 `NTDS.dit` 文件
#### 为什么破解 NTLM 哈希？

| 场景                 | 说明                              |
| ------------------ | ------------------------------- |
| 提取哈希后，想还原出明文密码     | 用于横向移动或权限提升                     |
| 密码策略弱              | 破解成功后，可获取用户的真实密码                |
| 替代方案：Pass the Hash | 如果不破解哈希，可以直接用哈希值进行身份验证（不需要明文密码） |
#### John 中如何破解 NTLM 哈希？

**关键点**：NTLM 哈希在 John 中的准确格式名是 **`NT`**，而不是 `ntlm`、`netntlm` 或 `netntlmv2`。

**为什么不用 `ntlm`？**
- `ntlm` 或 `netntlm` 通常用于破解 **NTLM 网络认证协议数据包**（包含用户名、挑战值等完整信息）。
- 当你手里只有一个 **32 位纯哈希值**（如 `5460C85BD858A11475115D2DD3A82333`）时，John 需要的是 `--format=NT`。

**破解命令**：
```bash
john --format=NT --wordlist=/usr/share/wordlists/rockyou.txt ntlm.txt
```

或者可以加上查询相关的，即可查到当前版本的John的用法
```bash
john --list=formats | grep -i "ntlm"
```

### 破解Linux系统中的/etc/shadow
#### 什么是 /etc/shadow？
`/etc/shadow` 是 Linux 系统上**存储用户密码哈希**的文件。它包含每个用户的密码哈希值、密码最后更改日期、密码过期信息等。每行对应一个用户账户。

**重要**：

- 只有 **root 用户** 才有权限读取这个文件
- 格式示例：

```bash
root:$6$2nwjN454g.dv4HN/$m9Z/r2xVfweYVkrr.v5Ft8Ws3/YYksfNwq96UL1FX0OJjY1L6l.DS3KEVsZ9rOVLB/ldTeEL/OIhJZ4GMFMGA0:18576::::::
```

#### 为什么不能直接用 John 破解 /etc/shadow？

John 需要**同时知道用户名和对应的哈希**才能工作。`/etc/shadow` 只有哈希和 UID/GID 等信息，但缺少用户名（用户名在 `/etc/passwd` 里）。所以需要把两个文件合并成 John 能理解的格式。

---

##### 工具：unshadow

`unshadow` 是 John 套件内置的工具，作用是把 `/etc/passwd` 和 `/etc/shadow` 合并成一个文件，供 John 破解。

**语法**：
```bash
unshadow [path to passwd] [path to shadow] > 输出文件
```

**示例：
```bash
unshadow local_passwd local_shadow > unshadowed.txt
```

### 单破解模式
#### 什么是单破解模式？

John 除了字典模式（`--wordlist`）外，还有 **单破解模式（`--single`）**。它不读字典文件，而是根据 **用户名** 和 **GECOS 字段**（用户全名、办公电话等信息）自动生成候选密码。

#### 词扭曲（Word Mangling）示例

假设用户名是 `Markus`，John 会自动尝试这些变形：

| 变形方式  | 示例                              |
| ----- | ------------------------------- |
| 加数字   | `Markus1`、`Markus2`、`Markus123` |
| 大小写变换 | `markus`、`MARKUS`、`mArKuS`      |
| 加特殊字符 | `Markus!`、`Markus$`、`Markus*`   |
| 翻转/截断 | `sukraM`、`Mark`                 |
这就是 **词扭曲**——John 根据一套内置规则，把用户名“揉捏”成各种可能的密码。
#### GECOS 字段是什么？
在 `/etc/passwd` 中，第 5 个字段是 GECOS 字段，存储用户的一般信息（全名、电话等）。
```bash
root:x:0:0:root:/root:/bin/bash
          ↑
        GECOS字段（第5个字段，以冒号分隔）
```
John 会把这些信息也加入变形池，增加破解成功率。
#### 如何使用单破解模式？
**语法：
```bash
john --single --format=[格式] [文件路径]
```

### 自定义规则
#### 什么是自定义规则
自定义规则允许你**自己定义密码变形模式**，让 John 按照你指定的规则生成候选密码。当你了解目标环境的密码策略时（比如必须包含大小写、数字、符号），这非常有用。
#### 为什么需要自定义规则？
很多组织强制密码复杂度要求，用户往往采用可预测的模式来满足要求：

| 要求   | 用户的典型做法     |
| ---- | ----------- |
| 大写字母 | 首字母大写       |
| 数字   | 末尾加 1 或 123 |
| 符号   | 末尾加 ! 或 @   |
例如，密码 `Polopassword1!` 就是基于 `polopassword` 这种可预测的变形。

**攻击者可以利用这种可预测性**，通过自定义规则动态生成候选密码。
#### 自定义规则的语法
规则定义在 `john.conf` 文件中，路径通常在：

- `/etc/john/john.conf`
- `/opt/john/john.conf`
#### 1. 定义规则名称
```bash
[List.Rules:THMRules]
```
这行定义规则的名字是 `THMRules`。
#### 2. 常用修饰符

| 修饰符 | 作用        |
| --- | --------- |
| c   | 首字母大写     |
| A0  | 在单词前面添加字符 |
| Az  | 在单词末尾添加字符 |
#### 3. 字符集
写在 `[ ]` 里，表示要添加的字符类型：

| 字符集     | 含义       |
| ------- | -------- |
| [0-9]   | 数字 0-9   |
| [A-Z]   | 大写字母 A-Z |
| [a-z]   | 小写字母 a-z |
| [A-z]   | 大写 + 小写  |
| [!£$%@] | 指定的符号    |
#### 4. 完整规则示例
```bash
[List.Rules:PoloPassword]
cAz"[0-9] [!£$%@]"
```

#### 如何使用自定义规则
```bash
john --wordlist=字典.txt --rule=规则名 哈希文件
```
**示例：
```bash
john --wordlist=/usr/share/wordlists/rockyou.txt --rule=PoloPassword hash.txt
```

### 破解ZIP文件密码
#### 工具：zip2john

`zip2john` 是 John 套件中专门处理 ZIP 文件的工具，作用是从加密的 ZIP 文件中提取密码哈希。

**语法**：
```bash
zip2john [选项] [ZIP文件] > [输出文件]
```
**示例：
```bash
zip2john secure.zip > zip_hash.txt
```
#### 破解命令
```bash
john --wordlist=/usr/share/wordlists/rockyou.txt zip_hash.txt
```

### 破解RAR文件密码
#### 工具：rar2john
`rar2john` 是 John 套件中处理 RAR 文件的工具，作用是从加密的 RAR 文件中提取密码哈希。

**注意**：在 Kali 中，`rar2john` 的路径通常是 `/usr/bin/rar2john` 或 `/usr/lib/john/rar2john`。如果直接输入提示找不到，用完整路径
**语法**：
```bash
rar2john [RAR文件] > [输出文件]
```
**示例**：
```bash
rar2john secure.rar > rar_hash.txt
```
#### 破解命令
```bash
john --wordlist=/usr/share/wordlists/rockyou.txt rar_hash.txt
```

### 破解SSH密钥密码
#### 工具：ssh2john
`ssh2john` 是 John 套件中处理 SSH 私钥（`id_rsa`）的工具，作用是从加密的私钥文件中提取密码哈希。

**注意**：在 Kali 中，`ssh2john` 可能叫 `ssh2john.py`，路径通常是 `/usr/share/john/ssh2john.py` 或 `/opt/john/ssh2john.py`
**语法**：
```bash
python3 /usr/share/john/ssh2john.py [id_rsa文件] > [输出文件]
```
**示例**：
```bash
python3 /usr/share/john/ssh2john.py id_rsa > id_rsa_hash.txt
```
#### 破解命令
```bash
# 1. 提取哈希
python3 /usr/share/john/ssh2john.py id_rsa > id_rsa_hash.txt

# 2. 破解哈希
john --wordlist=/usr/share/wordlists/rockyou.txt id_rsa_hash.txt

# 3. 查看密码
john --show id_rsa_hash.txt
```

### 实战速查表

| 目标类型         | 提取工具        | John 格式/命令           |
| ------------ | ----------- | -------------------- |
| 纯 MD5        | 无           | --format=raw-md5     |
| 纯 SHA-1      | 无           | --format=raw-sha1    |
| 纯 SHA-512    | 无           | --format=raw-sha512  |
| NTLM         | 无           | --format=NT          |
| Linux shadow | unshadow    | --format=sha512crypt |
| ZIP          | zip2john    | 直接 `john`            |
| RAR          | rar2john    | 直接 `john`            |
| SSH 私钥       | ssh2john.py | 直接 `john`            |
