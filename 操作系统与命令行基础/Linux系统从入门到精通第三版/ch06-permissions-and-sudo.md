# 第 6 章 权限模型与 sudo

> **本章目标**：读完后你能——
> 1. 把 `ls -l` 里那串 9 个字符逐位读出来，并在看到任何一行权限时立刻判断「属主能不能删、同组能不能进、其他人能不能改」
> 2. 解释 `umask 022` 为什么让新建文件变成 `644` 而不是 `666`，并算出任意 umask 下的结果
> 3. 说明 setuid / setgid / sticky 三个特殊位各自的行为，以及为什么「给脚本加 setuid」在 Linux 上无效
> 4. 读懂 `/etc/shadow` 为什么是 `640 root:shadow` 而不是 `600`，并解释 `shadow` 这个组存在的意义
> 5. 说出 sudo 依赖 setuid 的完整工作原理，以及 sudo 相对 `su` 的三个具体优势
> 6. 独立写出一条正确的 sudoers 规则，并用 `visudo` 校验、在失效前撤销它
>
> **前置知识**：第 4 章《文件系统与目录结构》、第 5 章《文件操作与归档压缩》
>
> **预计耗时**：75 分钟

`chmod 777` 是 Linux 世界最广为流传的坏习惯。它的本意是"解决权限问题"，实际效果是**把整个系统上所有的安全边界一次性拆掉**。

这一章要让你彻底摆脱"遇到权限问题就 `chmod 777`"这个反射。方法不是背一张权限表，而是理解**权限位到底在检查什么**——理解之后你会发现，正确的权限通常就是 `644`、`755`、`750` 这几个很无聊的数字，而且你再也不会需要 `777`。

本章还会碰 setuid。这是整个 Unix 权限模型里最强大、也最危险的一个机制：它让一个普通用户执行的程序**自动获得文件属主的身份**。`sudo` 就建立在它之上，而历史上绝大多数本地提权漏洞也都是它的产物。

---

## 6.1 三类用户，以及 root 到底是什么

### UID 0 才是关键

Linux 里没有"root 用户"这个特殊实体。**判定标准只有一条：UID 是否等于 0。**

```bash
$ id
uid=1000(user) gid=1000(user) groups=1000(user),27(sudo)
```

UID 为 0 的账号拥有这个系统上**不受任何权限检查约束**的能力。你可以在 `/etc/passwd` 里新建一个叫 `toor` 的 UID 0 账号，它的权限和 root **完全一样**——名字毫无意义。

（顺带一提：这不是理论。历史上多次入侵的收尾步骤就是把某个普通账号的 UID 改成 0，从而"免费"获得 root。）

### 三类账号

| 类型 | UID 范围（Ubuntu 默认） | 例子 | 特征 |
|---|---|---|---|
| **超级用户** | 0 | `root` | 不受限，交互 shell 是 `/bin/bash` |
| **系统服务账号** | 1 – 999 | `www-data`、`nginx`、`postgres`、`systemd-network` | **不可登录**，shell 通常是 `/usr/sbin/nologin` 或 `/bin/false` |
| **普通用户** | 1000 起 | `user`、`li` | 可登录，有家目录和登录 shell |

服务账号用低 UID 是刻意的：**低 UID 让它排在权限列表前面**，同时低 UID 也意味着即使权限位写错了（比如误设 `777`），它的文件也是系统里排序最靠前、最容易被发现的一批。

第 11 章会讲用户和组的完整管理机制，这里只强调一条判断原则：**看到一个陌生账号，先问「谁需要它、它需要交互登录吗」**。第 11 章的 `nologin` 话题会从这里接着讲。

---

## 6.2 权限位：一串字符，九个问题

### 拆解 `ls -l` 的第一列

```bash
$ ls -l /etc/passwd
```

```console
-rw-r--r-- 1 user user 1234 Sep 12 10:22 /etc/passwd
```

```console
-  rw-  r--  r--
│   │    │    │
│   │    │    └── 其他人(others)：r--
│   │    └─────── 属组(group)：r--
│   └──────────── 属主(user)：rw-
└──────────────── 文件类型：- 普通文件
```

九个字符对应九个独立的问题，每个字符只有三种状态：**有**（字母）、**没有**（`-`）、**本身就代表开关**（`s`、`t`，见 6.6）。

注意第一个字符**不是权限**，是**类型**：

| 字符 | 类型 |
|---|---|
| `-` | 普通文件 |
| `d` | 目录 |
| `l` | 符号链接 |
| `b` / `c` | 块设备 / 字符设备 |
| `p` / `s` | 命名管道 / socket |

第 4 章讲过这些，现在它们有了权限含义：**只有前两种会出现在日常的 `chmod` 场景里**。

### 三个字符的语义

| 位 | 对**文件**的含义 | 对**目录**的含义 |
|---|---|---|
| `r` | 能读取内容 | 能**列出**目录里的文件名 |
| `w` | 能修改内容 | 能在目录里**创建、删除、重命名**条目 |
| `x` | 能作为程序执行 | 能**进入（cd）并访问**其中的文件 |

**目录的三条权限是完全独立的，违反直觉的地方在这里：**

```bash
$ mkdir -p demo && chmod 444 demo     # r--r--r--
$ ls demo
```

```console
ls: cannot open directory 'demo': Permission denied
```

```bash
$ chmod 600 demo                      # rw-------
$ ls demo
```

```console
$                        # 能列，但列不出任何东西
```

`r` 给了却看不到，因为**没有 `x` 你连 stat 这些条目都做不到**——目录的内容本质上是"名字到 inode 的一个映射表"，`x` 是读这张表的许可，`r` 只是"知道有哪些表项存在"。

反过来：

```bash
$ chmod 300 demo                      # -wx------
$ ls demo
ls: cannot open directory 'demo': Permission denied
$ touch demo/x                        # 但能创建
$ ls -ld demo
```

```console
drwx------ 2 user user 4096 Sep 12 10:22 .
```

**这是本节最该记住的一点**：目录的 `w` 位控制的是"增删条目"，而**删除一个文件不需要对该文件本身有 `w` 权限，只需要对它所在的目录有 `w` 权限**。这条规则解释了大量"为什么我能删掉一个只读文件"的困惑，也是第 5 章那个"删掉别人只读文件"现象的原理。

---

## 6.3 `chmod`：符号法与八进制法

### 两种写法

```bash
# 八进制：每位是 r=4 w=2 x=1 之和
$ chmod 644 文件

# 符号法：who+/-/=，who 是 u g o a
$ chmod u=rw,g=r,o=r 文件
$ chmod a+x 脚本
$ chmod g-w,go-rwx 文件
```

**怎么从 `ls -l` 反推八进制**：把每组三个字符的字母换成数字再相加。

| 字符组 | 八进制 |
|---|---|
| `rwx` | 7 |
| `rw-` | 6 |
| `r-x` | 5 |
| `r--` | 4 |
| `-w-` | 2 |
| `--x` | 1 |
| `---` | 0 |

`drwxr-xr-x` = 755。`-rw-r--r--` = 644。`drwx------` = 700。

**给脚本加执行权限用符号法的 `+x`，不要用数字**——`chmod +x` 只在已有的权限上加执行位，不会误改其他位。用数字时如果你写成 `chmod 777 脚本`，就顺手把读和写也打开给所有人了。

### 三个必须知道的限制

**（1）你只能把你**已有**的权限授予别人。** 普通用户不能 `chmod` 出自己都没有的权限位，也不能 `chmod` 别人拥有的文件。所以"`chmod` 之后更严了怎么办"——答案是降不下来，得让属主或 root 来做。

**（2）递归 `-R` 是本章最危险的选项之一。**

```bash
$ chmod -R 755 /var/www        # ⚠️ 会把里面所有文件都设成可执行
```

`755` 对目录是对的，对文件是错的。**文件不需要 `x`，而且不该有**。

```bash
$ find /var/www -type d -exec chmod 755 {} +   # 目录
$ find /var/www -type f -exec chmod 644 {} +   # 文件
```

**分开处理是唯一正确的方式**——这正是第 5 章讲的 `-exec {} +` 的实际用途。

> ⚠️ `chmod -R 777 /` 和 `chmod -R` 打错路径是运维事故的经典来源。和 `rm -rf` 一样，纪律是**先 `ls` 看清楚要改的是哪棵树**。

**（3）复制权限用 `--reference`。**

```bash
$ cp -p 模板.conf 新.conf     # 连权限带时间戳一起复制
$ chmod --reference=模板.conf 新.conf
```

### 三个必须知道的默认值

| 场景 | 结果 | 为什么 |
|---|---|---|
| 目录 | `755` | 别人需要能进能读，里面放的是共享内容 |
| 普通文件 | `644` | 别人只需要读（可执行文件才给 `x`） |
| 私密文件（SSH 私钥、密码） | `600` | 只有你能读 |
| 私有目录（`~/.ssh`） | `700` | 只有你能进 |

**`644` 和 `755` 是 Linux 上最常见的两个值，不是巧合**——它们是"共享但不可改"的默认选择。了解这些默认值，你处理绝大多数文件时都不需要 `chmod`。

---

## 6.4 `chown` 与 `chgrp`：属主和属组是两件事

```bash
$ chown 用户:组 文件        # 同时改两者
$ chown 用户 文件          # 只改属主
$ chown :组 文件           # 只改属组
$ chgrp 组 文件            # 同上，另一种写法
```

**属主和属组分开设置是有实际意义的。** 典型的场景：一个共享的日志目录，属主是运维用户，但属组是 `adm` 组，于是 `adm` 组的成员能读，运维用户能写，**其他所有人都不能碰**。第 5 章讲的 `/home` 挂 `nodev,nosuid,noexec` 之外，这是权限层面最常用的协作模式。

### 三个限制

**（1）只有 root 能改属主。** 普通用户改自己的文件属主是**被禁止的**（防止通过转移属主逃避配额或责任追溯）。

**（2）普通用户只能改到"自己所属的组"。**

```bash
$ id
uid=1000(user) gid=1000(user) groups=1000(user),27(sudo),6(disk)

$ chgrp disk 文件        # 成功（user 是 disk 组成员）
$ chgrp root 文件       # 失败：not a member of group "root"
```

**（3）`chown -R` 会改变文件对所有者的可见性。**

```bash
$ chown -R www-data:www-data /srv/app    # ⚠️ 递归改整棵树
```

⚠️ 这是 web 部署的标准命令，也是事故的标准来源：递归改一个目录树时，`.git`、`.env`、上传目录里的文件属主全被改掉，某些程序（比如某些框架的缓存目录检查）会突然失败。**部署时更安全的做法是只改需要的那一层**，或者改完立刻用 `find` 检查 `.env` 和密钥文件的属主。

> **一个真实陷阱**：修改用户的 UID 之后，他原来拥有的所有文件都变成"无主文件"（属主显示为原来的数字 UID）。这是第 11 章的内容，但排查权限问题时经常撞见——`ls -l` 里出现 `1001 1001` 这样的数字属主，就是这个原因。

---

## 6.5 umask：新文件的权限是怎么决定的

### 一条减法

新建文件时，内核**先给一个最大权限，再减掉 umask**：

| 类型 | 起始权限 | 减 umask | 结果 |
|---|---|---|---|
| 普通文件 | `666`（rw-rw-rw-） | `umask 022` | **`644`**（rw-r--r--） |
| 目录 | `777`（rwxrwxrwx） | `umask 022` | **`755`**（rwxr-xr-x） |

```bash
$ umask
```

```console
0022
```

**这解释了为什么你新建的文件从来不是 `666`。** 很多人以为"文件天生就是 644"，实际上默认权限是 `666`，是 umask 扣掉了"给其他人写"这一位。

**为什么文件和目录的起始值不同**：文件默认不给任何执行位（因为普通文件大多不该被执行），目录必须给（否则别人连进都进不去）。

### 常用 umask 取值

| umask | 文件 | 目录 | 场景 |
|---|---|---|---|
| `000` | `666` | `777` | **永远别用**，任何人都能改你的文件 |
| `022` | `644` | `755` | 单人使用（默认） |
| `002` | `664` | `775` | 共享组，所有组成员可读写 |
| `027` | `640` | `750` | 只允许同组读 |
| `077` | `600` | `700` | 高度私密 |

```bash
$ (umask 077 && touch 私密.txt && mkdir 私密目录)
$ (umask 002 && touch 共享.txt)
$ ls -l 私密.txt 共享.txt
```

```console
-rw------- 1 user user 0 10:58 私密.txt
-rw-rw-r-- 1 user user 0 10:58 共享.txt
```

注意子 shell `( ... )`：umask 只影响**当前 shell 及其后续子进程**。用 `( )` 包起来可以只在一个临时作用域里改它，不污染当前会话。

### 三个实践要点

**（1）umask 是**每个 shell 独立**的，不是用户属性。** 写在 `~/.bashrc` 里只对登录 shell 生效；**systemd 服务不读 `.bashrc`，它有自己的 `UMask=`**（默认 `0022`）。这是"我明明在 `.bashrc` 里设了 umask，服务创建的文件却还是 644"的原因，第 15 章讲 unit 文件时会正式处理。

**（2）umask 不能加权限，只能减。** 用 `chmod` 才加得上。

**（3）`cp` 的行为受 umask 影响，但方向相反。** `cp` 会尽量保留源文件的权限位，umask 只扣掉你没有的权限位。想让 `cp` 完全复制权限（含时间戳），用 `cp -p`。

---

## 6.6 特殊权限位：setuid / setgid / sticky

三个高位，`ls -l` 用 `s` 和 `t` 表示。它们是本章最重要也最容易出事的部分。

### setuid（4000）

**行为：执行这个文件的进程，自动获得文件属主的身份。**

```bash
$ ls -l /usr/bin/passwd
```

```console
-rwsr-xr-x 1 root root 68208 Sep 12 10:22 /usr/bin/passwd
```

属主的 `x` 位置显示成了 `s`——这表示**这个文件同时有 setuid 和执行权限**。它的意义是：**任何用户都能执行它，而它以 root 身份执行**，因为只有 root 有权限修改 `/etc/shadow`。

注意第 6.7 节会说明，`passwd` 需要读 `/etc/shadow`，但它**不需要给用户 setuid root**——它有专门的机制（下面说）。它有 setuid 是一个历史遗留。

### setgid（2000）

**在文件上**：执行时获得文件属组的身份。
**在目录上**（更常用）：**该目录下新建的文件继承目录的属组**，并且子目录自动继承 setgid。

```bash
$ mkdir -p /srv/共享 && chgrp adm /srv/共享 && chmod 2775 /srv/共享
$ ls -ld /srv/共享
```

```console
drwxrwsr-x 2 user adm 4096 Sep 12 11:02 /srv/共享
```

现在任何人在这里创建文件，文件都自动属于 `adm` 组，`adm` 组成员自动能读——**不需要逐个 `chgrp`**。这是多人共享目录的标准做法。

### sticky（1000）

**行为：目录里的文件，只有文件属主（和 root）能删除或重命名。**

```bash
$ ls -ld /tmp
```

```console
drwxrwxrwt 19 root root 4096 Sep 12 11:02 /tmp
```

那个 `t` 就是 sticky 位。`/tmp` 是 `777`（任何人都能写），但**你只能删自己在里面创建的文件**。这正是第 4 章提到的"`/tmp` 有粘滞位"。

没有 sticky 位的后果很容易想象：一个 `777` 的共享目录里，任何用户都能 `rm` 掉别人的文件。

### ⚠️ 为什么「给脚本加 setuid」在 Linux 上无效

```bash
$ chmod u+s 脚本.sh
$ ls -l 脚本.sh
```

```console
-rwsr-xr-x 1 user user 200 Sep 12 11:05 脚本.sh
```

位确实设上了，**但运行它不会获得任何提权**。原因是 Linux 内核在执行 `#!` 开头的脚本时，会**主动忽略 setuid 和 setgid**。

这是个 1990 年代末引入的加固决定，逻辑很直接：脚本的解释器（`/bin/sh`）会自己决定怎么处理参数，而**脚本文件在解释器启动后就可以被改写**。攻击者只需在脚本开头写 `#!/bin/sh` 再往里插入一行，就能在 setuid 上下文里执行任意代码。所以内核干脆不给脚本这个能力。

**结论**：需要 setuid 的必须是**编译后的二进制**。如果你发现某个需求是"让一个脚本临时以 root 运行"，正确答案是 `sudo`，而不是 `chmod u+s`。

### 为什么 setuid 是提权漏洞的重灾区

setuid 程序以 root 身份运行，但它的**输入通常来自不可信的低权限用户**（命令行参数、环境变量、文件、socket）。任何一处对输入的边界检查写错，攻击者就能让这个程序替他执行任意代码——**并且自动带着 root 权限**。

真实的 setuid-root 程序清单（`find / -perm -4000`）里至今仍有大量条目，其中多个属于系统关键组件。第 23 章讲编译和调试时会用这个列表做实战。

```bash
$ find / -perm -4000 -type f 2>/dev/null
```

```console
/usr/bin/chfn
/usr/bin/chsh
/usr/bin/passwd
/usr/bin/sudo
...
```

**最小化 setuid 程序数量**是 Ubuntu 加固基线里的一条，思路就是这个。

---

## 6.7 `/etc/shadow` 为什么是 `640 root:shadow`

先纠正一个流传很广的说法：`/etc/shadow` 的权限**不是** `r--------`（600），在 Ubuntu 上是：

```bash
$ ls -l /etc/passwd /etc/shadow /etc/group
```

```console
-rw-r--r-- 1 root root   1904 Sep 12 11:02 /etc/passwd
-rw-r----- 1 root shadow  1345 Sep 12 11:02 /etc/shadow
-rw-r--r-- 1 root root    1310 Sep 12 11:02 /etc/group
```

**为什么 `passwd` 和 `group` 是 644（世界可读），`shadow` 却是 640？**

因为**用途完全不同**。`/etc/passwd` 里没有任何秘密——只是"用户名、UID、主目录、登录 shell"的对应表，任何程序都需要查它（`ls` 要显示文件属主、`id` 要显示名字、SSH 要知道用户存在），所以必须世界可读。

而 `/etc/shadow` 里是**密码哈希**。哈希不能被读走，因为它可以被离线爆破。

### `shadow` 这个组是干什么的

权限是 `640`，属组是 `shadow` 而不是 `root`。**专门建一个组，就是为了让"需要读哈希的程序"能用组权限读，而不用给它们完整的 root。**

现实中确实有这类程序：某些邮件服务器的 POP/IMAP 认证服务需要读密码哈希来做验证。它们以 `shadow` 组成员身份运行，**能读 `/etc/shadow`，但不能改系统任何其他东西**。这就是 6.4 节讲的"属主属组分离"最典型的一次应用。

**组权限位是 `r` 不是 `rw`**，因为这些程序只需要**读**哈希来验证密码，不需要修改。

第 11 章会完整讲这三个文件的关系和 `chage` 等工具，本节只建立"哪些信息算秘密"这个判断标准。

---

## 6.8 sudo：它靠 setuid 工作

### 完整原理链

```bash
$ which sudo
```

```console
/usr/bin/sudo
$ ls -l /usr/bin/sudo
```

```console
-rwsr-xr-x 1 root root 195712 Sep 12 10:22 /usr/bin/sudo
```

setuid root 的二进制。执行过程：

1. 你执行 `sudo apt update`
2. 内核启动 `/usr/bin/sudo`，并把它的**有效 UID 设成 0**（因为文件属主是 root 且有 setuid 位）
3. sudo 通过 **PAM** 向你索要密码（第 17 章会讲 SSH 时的 PAM，这里是同一个机制）
4. sudo 读 `/etc/sudoers`，检查「当前用户在这个主机上，是否被允许以 root 身份运行这条命令」
5. 通过则：sudo 把自己的身份降回你的 UID，然后以 root 身份 **fork 出子进程**执行目标命令
6. 记录审计日志到 `/var/log/auth.log`：**谁、在什么时候、从哪个 tty、执行了什么**

第 4 步是重点：**sudo 的全部权限逻辑都在 `/etc/sudoers` 这一个文件里**。它和内核的权限检查是两层独立机制。

### sudo 相对 `su` 的三个实质优势

`su root` 是老做法，问题在于**它给你一个不受限制的 root shell**。sudo 的改进都是围绕这一点：

**（1）sudo 只授权一条命令，不给 root shell。**

```bash
$ sudo apt update        # 只允许这一条
# 之后想再干别的，要再敲一次、再输一次密码
```

**（2）sudo 走 sudoers 策略，可以精确限制"哪个用户能做什么"。**

`su` 只有一条规则：知道 root 密码的人全都是 root。sudo 可以写成"`deploy` 用户可以用 root 身份跑 `systemctl restart nginx`，但不能碰别的"。

**（3）sudo 记录审计信息，带上真实发起者。**

`/var/log/auth.log` 里有 `user : TTY=pts/0 ; PWD=/home/user ; USER=root ; COMMAND=/usr/bin/apt update`。**用 root 跑过的每条命令都能追溯到具体的人。** 在 `su` 的世界里，日志里只有 root。

### 密码缓存与它的反面

首次 `sudo` 输入密码后，**默认 15 分钟内**（`timestamp_timeout`）再执行 sudo 不需要重新输。

```bash
$ sudo -k          # 立即作废缓存（等价于 sudo -i 之外的"下次一定要密码"）
```

**安全提醒**：这意味着你把终端留着不管，别人（或者你自己误操作）可以在 15 分钟内以 root 身份执行任何被允许的命令。在共享环境里养成执行完 `sudo -k` 的习惯。

---

## 6.9 sudoers 语法：易错点集中区

### 铁律：只用 `visudo`

```bash
$ sudo visudo                    # 编辑 /etc/sudoers
$ sudo visudo -f /etc/sudoers.d/99-lab    # 编辑 drop-in 文件（推荐）
```

**绝对不要直接 `sudo vim /etc/sudoers`。** 理由：

1. **语法错误会让文件不可解析**，结果是**所有人（包括 root）都无法再使用 sudo**。你会被锁在门外，只能进恢复模式或用 live CD 修。
2. **visudo 会在保存前做语法检查**，错误时拒绝保存并指出行号。
3. **visudo 会在编辑期间加锁**，防止两个管理员同时编辑互相覆盖。

```bash
$ sudo visudo -c                 # 只校验语法，不进入编辑
```

### 规则的形状

```
用户  主机 = (以谁身份运行)  是否免密: 命令列表
```

```text
user  ALL = (ALL:ALL) ALL
```

逐段读：

| 段 | 值 | 含义 |
|---|---|---|
| 用户 | `user` | 谁 |
| 主机 | `ALL` | 任意主机（单机系统上没意义，但语法要求写） |
| 运行身份 | `(ALL:ALL)` | 可切换到任意用户、任意组 |
| 免密 | 缺省 | 需要密码；写 `NOPASSWD:` 则免密 |
| 命令 | `ALL` | 允许运行任意命令 |

**这一行就是 Ubuntu 的默认规则**，它在 `/etc/sudoers` 里，通常通过 `%sudo ALL=(ALL:ALL) ALL` 授予 `sudo` 组的全部成员。

### 最常见的四个错误

**（1）文件名里有 `.` 会被静默忽略。**

```bash
$ sudo visudo -f /etc/sudoers.d/lab.rules    # ⚠️ 这条规则永远不会生效
$ sudo visudo -f /etc/sudoers.d/99-lab       # ✅
```

`sudo` 会跳过 `/etc/sudoers.d` 下**文件名含 `.` 的文件**（这是为了兼容 `README`、`dpkg-dist` 之类）。**不报错，不警告，规则就是不起作用**——这是最坑的一个。文件名只能含字母、数字、下划线、连字符。

**（2）`sudoedit` 打开的是目标文件，sudoers 本身不要用全路径乱写。**

**（3）用 `/etc/sudoers.d/` 而不是改 `/etc/sudoers`。**

主文件在 Ubuntu 上自带 `#includedir /etc/sudoers.d` 指令，所有 drop-in 文件都会被读。**改 drop-in 不会覆盖发行版的默认配置**，所以 `apt` 升级时不会因为你的改动而产生冲突。这是正确的做法。

**（4）`= ` 和 `NOPASSWD:` 写错位置导致规则完全不同。**

```text
user ALL=(ALL) NOPASSWD: /bin/ls /bin/cat     # 免密执行 ls 和 cat
user ALL=(ALL) /bin/ls NOPASSWD: /bin/cat     # ❌ 语法错或含义完全不同
```

`NOPASSWD:` 是标签，必须紧贴在命令列表前面，冒号不能少。

### 最小权限的写法

真实运维里，`NOPASSWD:` 应当配一条**窄到不能再窄**的命令：

```text
user ALL=(root) NOPASSWD: /usr/bin/systemctl restart nginx.service
```

对比之下，下面这些是常见的**危险写法**：

```text
user ALL=(ALL) NOPASSWD: ALL          # 等于交出整个 root
user ALL=(ALL) NOPASSWD: /bin/bash    # 一个 shell = 上面那条
user ALL=(ALL) NOPASSWD: /bin/cat /etc/shadow   # 直接读密码哈希
```

**第二条是最常见的误配。** 任何时候看到 `NOPASSWD: /bin/bash`、`NOPASSWD: ALL`、`NOPASSWD: /bin/sh`，都应该当成事故处理。

---

## 6.10 sudo 的常用变体

```bash
$ sudo -l                    # 列出"我"被允许执行什么
$ sudo -l -U user            # 列出"user"被允许执行什么（需要 root）
$ sudo -u www-data 命令      # 以 www-data 身份执行（不是 root）
$ sudo -i                    # 模拟 root 完整登录（改 HOME、读 root 的环境）
$ sudo -s                    # 起一个 root shell，但保持当前目录和环境
$ sudo -E                    # 保留当前环境变量（受 env_keep 限制）
$ sudo -n 命令               # 非交互：需要密码就直接失败，绝不等待输入
$ sudo -k                    # 作废密码缓存
$ sudoedit 文件              # 以 root 权限编辑文件，但不给你 root shell
```

三个最需要理解的：

**`sudo -u` vs 默认的 root。** `sudo 命令` 等于 `sudo -u root 命令`。想以别的身份跑就用 `-u`。这是权限收窄的正确工具：

```bash
$ sudo -u www-data whoami     # 而不是 sudo whoami
```

**`sudo -i` vs `sudo -s`。** `-i` 模拟**完整登录**：切换到目标用户的 `HOME`、加载其登录配置、把 `PATH` 重置为该用户的默认值。`-s` 只起一个 shell，**保留你原来的工作目录和部分环境**。这个差异在执行相对路径命令时会导致完全不同的结果。

**`sudo -n` 是脚本里唯一该用的形式。** 没有 `-n`，脚本在需要密码时会**无限等待输入**，而 cron 和 CI 里没有人能输入：

```bash
$ sudo -n systemctl is-active nginx || echo "服务未运行"
```

---

## 6.11 提权的边界：root 也不是万能的

### root 能做什么

- 读写系统上**任何**文件，包括 `/etc/shadow`、`/proc/sys/kernel/*`
- 绑定或监听 **1024 以下**的端口（这就是为什么 web 服务要先 `setcap` 或走端口转发）
- 终止或修改**任何**进程，包括其他用户的
- 加载内核模块、修改内核参数
- `chroot` 到任意目录，制造新的文件系统视角
- 读取 `/proc/kcore`（等价于整个物理内存的视图）

### root 仍然做不到什么

这几条是本章最反直觉、也最能体现"现代 Linux 不是 Unix"的知识点：

**（1）AppArmor 对 root 依然生效。** Ubuntu 默认启用 AppArmor，它按路径做限制。**即使 root 执行某个程序，只要该程序的 profile 不允许访问某路径，访问就会被拒绝**。想临时绕过可以 `aa-disable`，但那是把最后一道锁拆了。

**（2）以 `errors=remount-ro` 挂载的文件系统变成了只读**，root 也不能写（除非重新挂载为读写）。

**（3）已经删除的数据无法恢复。** `rm` 之后的文件，除非还有进程持有 fd（第 5 章那个 `/proc/PID/fd` 的招），否则 `root` 也拿不回来。

**（4）有些内核接口默认禁用。** `/dev/mem`、未特权的 `ptrace` 跨用户追踪等，需要显式配置才能开启。

### 容器里的 root 更弱

容器里的 UID 0 **不是**宿主机的 UID 0。它被 namespace 限制在一个很小的范围内：只能看到容器内的进程、文件系统、网络。

但有两个必须警惕的例外：

> ⚠️ **把宿主机目录 bind mount 进容器，等于把那个目录的全部权限交给了容器内的 root。** 而容器内可以挂载设备节点。所以 `-v /:/host` 这类挂载在安全上是极危险的——第 20 章会详细讲这件事，因为它是最常见的容器逃逸手法之一。

### 现代的收敛方向：capabilities

root 会获得**全部** capabilities，但 capabilities 是可以**逐项丢弃**的：

```bash
$ getcap /usr/bin/ping
```

```console
/usr/bin/ping cap_net_raw=ep
```

这解释了 6.7 节那个细节：`passwd` **不需要 setuid root**。它有 `cap_dac_override`（忽略文件读权限检查）和 `cap_chown`，只拿它需要的两项能力，而不是整个 root。**给一个二进制精确的 capability 集合，比给它 setuid 安全得多**——这是权限模型从"要么全有要么全无"往精细化走的方向。

---

## 6.12 本章小结

**root 不是身份，是 UID 0。** 把任意账号的 UID 改成 0 就等于给了它完整 root。系统服务账号（UID 1–999）的 shell 应为 `nologin`，让它们不可登录。

**`ls -l` 第一列是 9 个字符：1 个类型 + 3 组 × 3 位，每组对应属主/属组/其他人的 rwx。** 对目录，三条权限语义完全不同：`x` 是进入和 stat 的许可，`r` 只是"知道有哪些条目"，**没有 `x` 给了 `r` 也什么都做不了**。删除文件不需要对文件有 `w`，只需要对**所在目录**有 `w`。

**`chmod` 优先用符号法**（`chmod +x`），递归改权限必须把目录和文件分开处理（`find -type d` / `find -type f`）。常用默认值：目录 755、文件 644、私密文件 600。

**属主和属组分开有实际价值**：`/etc/shadow` 的 `640 root:shadow` 就是为了让需要读哈希的程序用组权限读，而不用拿整个 root。

**umask 是减法**：文件从 `666` 起、目录从 `777` 起，减掉 umask。这就是为什么新建文件是 `644`。**umask 属于 shell 而不属于用户**，所以 systemd 服务不读 `.bashrc`，它有自己的 `UMask=`。

**setuid 让程序以属主身份执行**（`sudo` 就靠它），**setgid 在目录上让新文件继承属组**（共享目录标准做法），**sticky 让 `777` 目录里只有属主能删自己的文件**（`/tmp`）。**Linux 主动忽略脚本的 setuid**——需要提权就用 `sudo`。setuid 是提权漏洞的重灾区，因为程序以 root 运行却接受低权限用户的输入。

**sudo 靠 setuid 工作**：内核把它以 UID 0 启动，它通过 PAM 验证密码、读 `/etc/sudoers` 判定、再降权后 fork 出子进程。相比 `su` 的三个优势是**授权单条命令而非给 root shell**、**可用 sudoers 精确限制**、**日志记录真实发起者**。

**sudoers 只能用 `visudo` 编辑**，因为语法错误会锁死所有人的 sudo。drop-in 文件**名字里不能有 `.`**，否则被静默忽略。`NOPASSWD: /bin/bash` 等价于交出 root，必须当成事故。

**容器里的 root 被 namespace 限制**，但 bind mount 宿主目录等于交出该目录全部权限，是最常见的逃逸手法。

**现代方向是 capabilities**：`passwd` 用 `cap_dac_override` 而不是 setuid root，权限模型正在从"全有或全无"走向精细化。

---

## 6.13 动手实验：配置、验证、撤销一条 sudo 规则

> 环境：Ubuntu 24.04 LTS，**需要一个你自己有 sudo 权限的账号**
> 耗时：约 20 分钟
> 权限：需要 root（通过 sudo）

### 目标

亲手写一条免密 sudo 规则，用 `visudo` 的语法检查确认它正确，验证它真的生效，然后**干净地撤销**——并亲眼看到 `visudo` 如何拒绝一条有语法错误的规则。

### 步骤

**第 1 步：记录基线**

```bash
$ sudo -l
```

```console
Matching Defaults entries for user on ubuntu:
    env_reset, mail_badpass, secure_path=...

User user may run the following commands on ubuntu:
    (ALL : ALL) ALL
```

**记下你现在能做什么**，最后要和它一致。做完实验后如果 sudo 配坏了，你得靠这个 baseline 恢复。

**第 2 步：观察 umask 的实际效果**

```bash
$ umask
```

```console
0022
```

```bash
$ touch 普通文件 && mkdir 普通目录
$ (umask 077 && touch 私密文件 && mkdir 私密目录)
$ (umask 002 && touch 共享文件)
$ ls -l 普通文件 私密文件 共享文件 && ls -ld 普通目录 私密目录
```

```console
-rw-rw-r-- 1 user user 0 11:20 共享文件
-rw-r--r-- 1 user user 0 11:20 普通文件
-rw------- 1 user user 0 11:20 私密文件
drwxr-xr-x 2 user user 4096 11:20 普通目录
drwx------ 2 user user 4096 11:20 私密目录
```

**验证减法规则**：`666 - 022 = 644`，`777 - 022 = 755`，`666 - 077 = 600`。

**第 3 步：看清目录权限与文件权限不是一回事**

```bash
$ chmod 444 普通文件 && ls -l 普通文件
```

```console
-r--r--r-- 1 user user 0 11:20 普通文件
```

```bash
$ rm 普通文件
```

```console
（删除成功，没有任何报错）
```

**观察**：文件本身是 `444`（不可写），但**你依然能删掉它**——因为删除需要对**所在目录**有 `w` 权限。这是 6.2 节那条规则的直接验证。

**第 4 步：观察 sticky 位**

```bash
$ ls -ld /tmp
```

```console
drwxrwxrwt 19 root root 4096 Sep 12 11:20 /tmp
```

那个 `t` 就是 sticky 位。因为 `/tmp` 是 `777`，**你能在这里创建任何文件**：

```bash
$ touch /tmp/我的文件 && ls -l /tmp/我的文件
```

```console
-rw-r--r-- 1 user user 0 11:21 /tmp/我的文件
```

**但 sticky 位保证你只能删自己的**。这个保障在别的目录不存在：

```bash
$ mkdir -p /tmp/共享测试 && chmod 777 /tmp/共享测试
$ touch /tmp/共享测试/别人的文件
```

```console
$ rm /tmp/共享测试/别人的文件
（如果这个文件属主不是你，会失败：Operation not permitted）
```

把 `/tmp` 和 `/tmp/共享测试` 对比着看：权限位**完全一样**（都是 777），安全性却完全不同，差别就是那一个 sticky 位。

**第 5 步：配置一条免密规则（用 `visudo -f`）**

```bash
$ sudo visudo -f /etc/sudoers.d/99-lab
```

在打开的编辑器里输入（**注意结尾的 `NOPASSWD:` 冒号不能少**）：

```text
user ALL=(root) NOPASSWD: /usr/bin/systemctl is-active nginx.service
```

> 把 `user` 换成你自己的用户名。把 `is-active` 这条换成任意一条**只读、无副作用**的命令——实验目的是验证机制，不是真的重启服务。

**第 6 步：校验语法（关键一步）**

```bash
$ sudo visudo -c
```

```console
/etc/sudoers: parsed OK
/etc/sudoers.d/99-lab: parsed OK
```

看到 `parsed OK` 才算成功。

**第 7 步：验证规则真的生效**

```bash
$ sudo -l
```

```console
User user may run the following commands on ubuntu:
    (ALL : ALL) ALL
    (root) NOPASSWD: /usr/bin/systemctl is-active nginx.service
```

你的规则出现在列表里了。

```bash
$ sudo -k && sudo -u root /usr/bin/systemctl is-active nginx.service; echo "退出码=$?"
```

```console
inactive
退出码=3
```

`sudo -k` 先作废缓存。如果这条命令**没有提示输密码**就执行了，说明免密生效；如果它卡在密码提示，说明规则没匹配上。

**第 8 步：亲眼看 `visudo` 拒绝错误的规则**

这一步是本实验最有价值的部分。

```bash
$ sudo visudo -f /etc/sudoers.d/99-lab
```

把内容改成一条**漏掉 `NOPASSWD:`** 的规则：

```text
user ALL=(root) /usr/bin/systemctl is-active nginx.service
```

尝试保存（`:w`）。**visudo 会拒绝保存并报错**：

```console
>>> 语法错误，/etc/sudoers.d/99-lab 第 1 行
>>> 期望 PASSWD: 或 NOPASSWD: 标签
```

> **如果你当时用了 `sudo vim /etc/sudoers.d/99-lab` 而不是 `visudo`，这个错误会被直接写进文件。** 结果是 `sudo` 对**所有人**失效——包括 root。你会被彻底锁在 sudo 外面，只能从恢复模式或 live CD 进来手改。这就是本实验要你记住的唯一一件事。

**第 9 步：恢复正确内容并再次确认**

```bash
$ sudo visudo -f /etc/sudoers.d/99-lab
```

改回：

```text
user ALL=(root) NOPASSWD: /usr/bin/systemctl is-active nginx.service
```

```bash
$ sudo visudo -c
```

```console
/etc/sudoers: parsed OK
/etc/sudoers.d/99-lab: parsed OK
```

**第 10 步：撤销规则（不能忘）**

```bash
$ sudo rm /etc/sudoers.d/99-lab
```

> ⚠️ **实验做完立刻撤销。** 留在系统里的免密规则就是一颗定时炸弹——第 17 章会讲为什么 sudo 免密在远程场景下尤其危险。

**第 11 步：确认回到基线**

```bash
$ sudo -l
```

```console
User user may run the following commands on ubuntu:
    (ALL : ALL) ALL
```

和第 1 步的输出**一致**了。

### 验证

```bash
# 1. 规则文件确实没了
$ ls -l /etc/sudoers.d/
$ sudo visudo -c

# 2. sudo 整体语法健康（这一步在每章实验后都该跑一次）
$ sudo visudo -c

# 3. 你的 sudo 能力已恢复基线
$ sudo -n true && echo "sudo 正常" || echo "sudo 需要密码（正常）"
```

```console
/etc/sudoers: parsed OK
sudo 正常
```

### 思考

1. 如果你误把 `/etc/sudoers.d/99-lab.rules`（**注意多了 `.rules`**）当作文件名创建规则，`sudo -l` 会显示它吗？为什么 visudo 不报错？
2. 第 6 步如果 `visudo -c` 报 `parsed OK` 但你的规则其实写错了命令路径（比如服务名拼错），会发生什么？规则加载了但没用，这属于哪一类问题？
3. 假设你要给一个自动化部署账号配置免密，最容易出事的命令是什么（结合本节的"最小权限"讨论）？请写出一条你认为可以接受的规则，并说明为什么它比 `NOPASSWD: ALL` 安全。
4. 第 4 步里 `/tmp` 和 `/tmp/共享测试` 权限位相同但安全性不同。如果你要建一个团队共享的临时目录（权限 777 但希望彼此不能删对方的文件），应该怎么加权限位？
5. 你在 `.bashrc` 里设了 `umask 077`，但一个 systemd 服务创建的文件仍然是 `644`。这是为什么？第 6.5 节给了提示，第 15 章会给出正式解法——你能提前说出解法吗？
6. `chmod 700 目录` 之后，目录里的文件属主不是你，你能 `cd` 进目录吗？能 `ls` 吗？能在里面创建文件吗？（这是 6.2 节三条权限独立性的完整测试）

### 清理

```bash
$ sudo rm -f /etc/sudoers.d/99-lab
$ rm -f ~/普通文件 ~/私密文件 ~/共享文件
$ rmdir ~/普通目录 ~/私密目录 2>/dev/null
$ rm -f /tmp/我的文件
$ rm -rf /tmp/共享测试
$ sudo visudo -c
```

```console
/etc/sudoers: parsed OK
```

> ⚠️ 清理的最后一步**必须是 `visudo -c`**。确认 sudo 的语法是健康的，你才算真正收尾。如果这条命令报错，你的系统现在处于"无法使用 sudo"的状态，需要立刻从恢复模式处理。

---

## 6.14 自测题

### 一、简答

1. 为什么说"root 不是用户而是 UID 0"？把某个普通账号的 UID 改成 0 会有什么后果？
2. 一个目录的权限是 `r--r--r--`（444）。你 `ls` 它会发生什么？如果是 `rwx------` 而你是属主，`ls` 又会发生什么？说明目录三条权限各自的作用。
3. 为什么你能 `rm` 掉一个权限是 `444` 的只读文件？删除操作真正检查的是哪个对象的权限？
4. `chmod -R 755 /var/www` 为什么是错的？正确做法是什么（写出命令）？
5. 非 root 用户能不能把文件的属主改给自己？为什么内核要禁止这个操作？
6. `umask 022` 时新建的文件和目录各是什么权限？写出这两条减法算式。为什么文件不能从 `777` 起算？
7. 为什么 Ubuntu 上 `/etc/passwd` 是 644 而 `/etc/shadow` 是 640？专门建一个 `shadow` 组的意义是什么？
8. 你执行 `chmod u+s 脚本.sh` 并且 `ls -l` 显示 `-rwsr-xr-x`，但脚本运行时并没有获得任何额外权限。为什么？另外，现代 Linux 上有没有比 setuid 更好的做法（`passwd` 是怎么做的）？
9. sticky 位在 `/tmp` 上解决了什么问题？如果一个 777 的共享目录没有 sticky 位，会出现什么现象？
10. `sudo` 是怎么获得 root 权限的？完整说出内核、PAM、sudoers 三者各自的作用。
11. sudo 相对 `su root` 的三个实质优势是什么？哪一个在事后追责时最有用？另外，`sudo` 默认多久内不需要重复输密码？怎么立刻作废？为什么在共享环境里应该养成作废的习惯？
12. `NOPASSWD: /bin/bash` 为什么等价于交出完整 root 权限？给出一个既满足自动化需求又限制得住的写法。

### 二、命令填空

1. 查看自己当前的 umask：________
2. 只在当前 shell 里把 umask 设为 077 并创建文件：________
3. 递归把 `/srv/app` 下所有**目录**设成 755、**文件**设成 644（两条命令）：________
4. 只修改属组、不改属主：________
5. 查看 `/usr/bin/sudo` 是否是 setuid-root：________
6. 列出系统里所有 setuid-root 的二进制：________
7. 列出系统里所有 sticky 位的目录：________
8. 以 `www-data` 身份执行命令（不是 root）：________
9. 起一个 root 的完整登录 shell：________
10. 在脚本里执行一条**可能需要密码**的 sudo 命令，且绝不等待输入：________
11. 用 `visudo` 创建一个 drop-in 规则文件（文件名合法、无 `.`）：________
12. 只校验 `/etc/sudoers` 及 drop-in 的语法，不进入编辑：________
13. 查看**另一个用户**被允许执行哪些 sudo 命令：________
14. 查看某个二进制文件有哪些 capabilities：________

### 三、故障分析

**案例 1**

> 现象：把脚本拷贝到服务器后执行报 `Permission denied`，但文件明明是 `-rwxr-xr-x`。同目录的其他脚本可以正常运行。
> ```bash
> $ ls -l 部署.sh 构建.sh
> -rw-r--r-- 1 deploy deploy 2048 Sep 12 11:40 部署.sh
> -rwxr-xr-x 1 deploy deploy 512 Sep 12 11:40 构建.sh
> $ ./部署.sh
> bash: ./部署.sh: Permission denied
> ```
> 1. 报错信息里的 `Permission denied` 有哪几种完全不同的可能原因？（提示：不只是文件权限）
> 2. 你会按什么顺序排查？第一条命令敲什么？
> 3. 如果文件是 `755` 但**所在目录**是 `600`，执行 `./部署.sh` 能成功吗？说明原因。

**案例 2**

> 现象：一个运维同事为了省事，往 `/etc/sudoers.d/` 里加了一条规则想让部署脚本免密执行重启：
> ```text
> deploy ALL=(ALL) NOPASSWD: /etc/init.d/nginx restart
> ```
> 结果：
> 1. 规则完全没有生效，`sudo` 仍然要密码。同事检查了拼写、路径、用户名，都没错。他漏看了什么？（提示：文件）
> 2. 假设文件名没问题了，这条规则的**权限范围**是否合理？`/etc/init.d/nginx` 在现代 Ubuntu 上还存在吗？正确的做法应该指向什么？
> 3. `restart` 之外还需要考虑什么，才能让这条规则真的安全可用？（提示：参数、通配符）

**案例 3**

> 现象：一个部署脚本里执行了 `sudo -u www-data php artisan migrate`，CI 上一直正常，昨天开始失败：
> ```console
> sudo: a terminal is required to read the password; either use the -S option
> ```
> 1. 这条报错说明 sudo 在做什么？为什么昨天还好好的？
> 2. 应该怎么改这条命令？（写出完整形式）
> 3. 除了这个报错，CI 里用 sudo 还有什么常见坑？（提示：第 6.11 节和第 12 章）

**案例 4**

> 现象：一个服务用 `www-data` 身份运行，需要写 `/srv/app/cache`。运维发现改目录属组为 `adm` 后服务开始报错 `Permission denied`，而 `ls -l` 显示目录是 `drwxrwsr-x www-data adm`。
> 1. 从权限位看，`www-data` 属于 `adm` 组吗？`s` 这个字符说明什么？
> 2. 这个错误最可能的原因是什么？和 `umask` 有关系吗？
> 3. 给出两种修法，并说明哪一种在多人协作场景下更合适。

**案例 5**

> 现象：一个容器（Docker）以 `--privileged` 运行，容器内是 UID 0。安全团队在排查时发现攻击者可以在容器里修改宿主机的 `/etc/passwd`。
> 1. `--privileged` 做了什么，使得容器内 root 能碰到宿主机文件系统？（提示：6.11 节末）
> 2. 就算不加 `--privileged`，什么样的挂载参数依然会导致宿主机某个目录被完全控制？
> 3. 给出两个降低风险的做法（一个针对挂载，一个针对容器内用户）。

### 四、综合实践

1. 写一个脚本 `~/bin/perm-audit`，审计指定目录下的权限问题并生成报告，要求：
   - 用法：`perm-audit 目录 [报告文件]`，目录不存在时报错退出
   - 找出并列出**所有** setuid 和 setgid 的文件（`find` 的权限匹配），对每个文件用 `stat` 补充属主和属组
   - 找出世界可写（`o+w`）的**目录**，这是最危险的一类，单独分组输出
   - 找出属主是 root 但**组权限给了写**（`rwsrws` / `rwxrw`）的文件，标注这些文件通常意味着什么
   - 找出所有权属无人（属主显示为数字 UID）的文件，统计数量——这类文件通常是 UID 变更后遗留的
   - 用 `awk` 给报告加一行汇总：各类问题各多少个
   - 用 `set -euo pipefail` 写，通过 ShellCheck 检查
   - **额外要求**：报告里必须包含一句明确的处置建议（哪些可以立刻修、哪些必须先确认属主意图），并且**绝不能修改任何文件权限**——只读审计，不做任何变更。请在脚本注释里写明这个约束的原因

2. 写一份《sudo 使用规范》，必须包含：
   - **授权原则**：什么时候该给免密、什么时候绝对不给；为什么 `NOPASSWD: ALL`、`NOPASSWD: /bin/bash`、`NOPASSWD: /bin/su` 都必须被禁止；`NOPASSWD:` 与命令通配符 `*` 组合的风险（给个具体危险例子）
   - **规则写法规范**：drop-in 文件的命名要求（并解释为什么不能有 `.`）、规则字段逐段解释、允许的命令粒度示例（列出至少 3 条你认可的具体规则）
   - **编辑纪律**：为什么必须用 `visudo`、改完必须 `visudo -c`、什么时候需要 `visudo -f` 而不是改主文件
   - **审计要求**：定期用什么命令核对"谁拥有免密权限"、日志在哪、怎么从 `/var/log/auth.log` 里筛出某人的提权记录
   - **应急流程**：`visudo` 改坏了导致 sudo 完全失效时的两条恢复路径（一条有 root 密码，一条没有）
   - 一份"新人最容易写的三条危险 sudo 规则"清单，每条写清后果和正确写法
   - 至少两条"我们团队不这么写，因为……"的团队特有规定，并说明理由

---

**下一章预告**：第 7 章《文本流：管道与重定向》——你会发现 `>` 和 `>>` 之间只差一个字符却是"覆盖"和"追加"的全部差别、`2>&1` 为什么不能写成 `&>2`（顺序反了就是完全不同的意思）、一条管道其实只是内核里的一个缓冲区，以及为什么 `xargs` 不加 `-r` 会在某些脚本里造成意料之外的行为。

---

*本章完。*