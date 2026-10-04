# 第 11 章 用户、组与身份管理

> **本章目标**：读完后你能——
> 1. 读懂 `/etc/passwd`、`/etc/shadow`、`/etc/group` 三个文件的每一列，并解释为什么它们权限不同
> 2. 解释 UID/GID 的分配规则，判断改动 UID 会带来哪些连带后果
> 3. 熟练使用 `useradd` 的 `-m -s -G -c -r` 等选项，并说清 `-m` 不加会怎样
> 4. 安全地修改用户属性，特别是记住 `usermod` 的 `-a` 不能省
> 5. 从 CSV 批量建用户并设置密码，知道密码文件为什么必须立刻删掉
> 6. 迁移家目录、找出并清理孤儿文件
> 7. 创建规范的服务账号，并说清 `nologin` 能挡什么、挡不住什么
> 8. 配置时区与时间同步，并说出时间不准会连锁破坏哪些东西
> 9. 改主机名后知道还要动 `/etc/hosts`，以及云主机上的特殊之处
> 10. 解释 `LC_ALL` 的覆盖范围，以及为什么脚本里必须显式设置它
> 11. 用 `chage`、PAM、SSH 密钥三层收紧账号安全
>
> **前置知识**：第 6 章《权限模型与 sudo》
>
> **预计耗时**：90 分钟

系统里的每一个"身份"最终都是**一个数字**。文件属主是数字，进程的运行者是数字，sudo 的授权对象也是数字。

本章要做的，是让你能从这些数字反推出人名（`ls` 显示不出属主名字时）、能安全地管理这些身份、并且知道改动一个数字会波及多大一片。

---

## 11.1 三件套：`passwd`、`shadow`、`group`

### `/etc/passwd`： everyone 都能看

```bash
$ grep -E '^(root|daemon|www-data|ubuntu):' /etc/passwd
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
ubuntu:x:1000:1000:Ubuntu User:/home/ubuntu:/bin/bash
```

七列，用冒号分隔：

| 列 | 字段 | 含义 |
|---|---|---|
| 1 | 用户名 | 登录名，`[a-z_][a-z0-9_-]*[$]?` |
| 2 | 密码占位 | **现在固定是 `x`**，真正的哈希在 `shadow` 里 |
| 3 | **UID** | 文件权限里记录的就是这个数字 |
| 4 | **GID** | 主组 |
| 5 | GECOS | 注释字段，通常是真实姓名，逗号分隔可有多个 |
| 6 | 家目录 | 登录后的起始目录 |
| 7 | 登录 shell | 登录后执行的程序 |

```bash
$ finger ubuntu
Login: ubuntu     Name: Ubuntu User
Directory: /home/ubuntu    Shell: /bin/bash
```

`finger` 读的就是第 5 列，所以 `-c "真实姓名"` 不是装饰。

⚠️ **第 2 列必须是 `x`。**早期 Unix 把哈希直接写在 `passwd` 里，导致任何用户都能 `cat /etc/passwd` 拿到所有人的密码哈希（那时候的哈希很弱）。现在拆成两个文件是标准做法。

### `/etc/shadow`：只有 root 和 shadow 组能读

```bash
$ sudo cat /etc/shadow | grep -E '^(root|ubuntu):'
root:$y$j9T$abc123$hashhashhashhashhashhash:19875:0:99999:7:::
ubuntu:$y$j9T$def456$hash2hash2hash2hash2ha:20100:0:99999:7:::
```

九列：

| 列 | 字段 | 含义 |
|---|---|---|
| 1 | 登录名 | 与 `passwd` 对应 |
| 2 | **加密后的密码** | 见下面的前缀表 |
| 3 | 最后一次改密码的日期 | **从 1970-01-01 起的天数**，不是日期 |
| 4 | 最小间隔 | 两次改密码之间至少隔几天 |
| 5 | 最大间隔 | 密码最长有效期，到期强制改 |
| 6 | 警告提前期 | 到期前几天开始提醒 |
| 7 | 宽限期 | 到期后还能登录几天，之后锁定 |
| 8 | 账号失效日 | 从 1970 起的天数，到期账号作废 |
| 9 | 保留 | 未使用 |

**第 3 列是"天数"这点最容易搞错。**想换算成日期：

```bash
$ date -d "19875 days ago" +%Y-%m-%d
2024-05-15
```

或者反过来算今天是多少：

```bash
$ echo $(( ($(date +%s) / 86400) ))
19875
```

第 2 列开头的一个字符就有特殊含义：

| 前缀 | 含义 |
|---|---|
| `$y$` | **yescrypt**，Ubuntu 默认 |
| `$6$` | SHA-512 crypt |
| `$1$` | MD5 crypt，⚠️ 已不安全 |
| `$2b$` / `$2y$` | bcrypt |
| `!` 开头 | 密码被锁定（`passwd -l` 加的），账号存在但不能密码登录 |
| `*` | **根本无法用密码登录**（服务账号就应该是这个） |
| 空 | ⚠️ 空密码，任何人不用密码就能登录，立即改 |

⚠️ **看到第 2 列为空或 `!` 开头要立刻处理。**`!` 是 `passwd -l` 的正常结果，但空密码是重大漏洞。

### 密码哈希前缀表

| 前缀 | 算法 | 状态 |
|---|---|---|
| `$y$` | yescrypt | Ubuntu 默认 |
| `$6$` | SHA-512 | 可用 |
| `$1$` | MD5 | ⚠️ 已被视为不安全 |
| `$5$` | SHA-256 | 少用 |
| `$2b$` | bcrypt | 可用 |

判断某个哈希算法好不好，看前缀就行，不用管参数细节。

### `/etc/group`：补充组在这里

```bash
$ grep -E '^(sudo|adm|ubuntu|docker):' /etc/group
sudo:x:27:ubuntu,liu
adm:x:4:syslog,jing
ubuntu:x:1000:
docker:x:988:ubuntu
```

四列：

| 列 | 字段 | 含义 |
|---|---|---|
| 1 | 组名 | |
| 2 | 组密码占位 | 基本恒为 `x` |
| 3 | **GID** | |
| 4 | 成员列表 | **这里只有"补充组"** |

⚠️ **`passwd` 里的 GID 是主组，`group` 里的成员列表是补充组，两个概念不能混。**

**主组**每个用户只有一个，来自 `/etc/passwd` 第 4 列。建用户时会自动建一个同名组。

**补充组**可以有任意多个，是 `/etc/group` 第 4 列列出来的那些。`sudo` 权限的本质就是"在 sudo 组里"。

判断一个用户的完整组身份，要用 `id`：

```bash
$ id ubuntu
uid=1000(ubuntu) gid=1000(ubuntu) groups=1000(ubuntu),27(sudo),4(adm),988(docker)
```

### 三个文件的权限为什么不同

```bash
$ ls -l /etc/passwd /etc/shadow /etc/group /etc/gshadow
-rw-r--r-- 1 root root   2345 /etc/passwd
-rw-r----- 1 root shadow  1341 /etc/shadow
-rw-r--r-- 1 root root    1290 /etc/group
-rw-r----- 1 root shadow   829 /etc/gshadow
```

| 文件 | 权限 | 为什么 |
|---|---|---|
| `passwd` | `644` | 所有人都需要查到"UID 1000 是谁"才能显示文件属主 |
| `shadow` | `640 root:shadow` | 只有少数特权程序需要读哈希，用组权限放行，不用给 root |
| `group` | `644` | 同 `passwd`，需要显示组名 |
| `gshadow` | `640 root:shadow` | 组管理者的凭据 |

⚠️ **`shadow` 组存在的唯一意义**就是让"需要读密码哈希的程序"用组权限访问，而不是把整个文件的读权限交给它们。ch06 已经讲过这个设计。

### ⚠️ 永远用 `getent`，不要用 `grep`

```bash
$ getent passwd ubuntu          # 正确：走完整套 NSS
```

```console
ubuntu:x:1000:1000:Ubuntu User:/home/ubuntu:/bin/bash
```

```bash
$ grep '^ubuntu:' /etc/passwd    # 只在本地文件里找
```

```console
ubuntu:x:1000:1000:Ubuntu User:/home/ubuntu:/bin/bash
```

今天两者一样。但在这些场景下结果完全不同：

| 场景 | `grep /etc/passwd` | `getent passwd` |
|---|---|---|
| 账号来自 LDAP/AD（公司域） | **查不到** | 查得到 |
| 账号来自 NIS | 查不到 | 查得到 |
| 账号来自 systemd 动态用户 | 查不到 | 查得到 |
| 账号来自 `sssd` | 查不到 | 查得到 |

`getent` 会按 `/etc/nsswitch.conf` 的顺序走完整套 **NSS**（Name Service Switch）机制，`grep` 只看第一个文件。

**运维习惯：查用户信息一律用 `getent passwd 用户名`。**`grep` 只在"我明确知道这个账号在本地文件里"时用。

```bash
$ getent passwd 1000            # 反查：UID 1000 是谁
$ getent group sudo
$ id -u ubuntu                  # 只要 UID
$ id -gn ubuntu                 # 只要主组名
```

---

## 11.2 UID 与 GID：分配规则与改动代价

### 分配规则

Ubuntu 24.04 的规则写在 `/etc/login.defs`：

```bash
$ grep -E '^(UID_MIN|UID_MAX|GID_MIN|GID_MAX|SYS_UID)' /etc/login.defs
UID_MIN			1000
UID_MAX			60000
GID_MIN			1000
GID_MAX			60000
SYS_UID_MIN		1
SYS_UID_MAX		999
```

| 范围 | 用途 |
|---|---|
| `0` | **root**，唯一且特殊 |
| `1`–`999`（`SYS_UID_MAX`） | 系统账号，由包管理器创建 |
| `1000`–`60000` | 人类账号，`useradd` 从这里往上分配 |
| `65534` | `nobody`，权限最少的降权身份 |

GID 规则相同。

⚠️ **UID 0 是硬编码的特权**：所有 `uid == 0` 的进程都是 root。所以绝不能创建第二个 UID 0 的账号。

### ⚠️ 改 UID 会波及什么

```bash
$ sudo usermod -u 2001 liu
```

看起来只是改了 `/etc/passwd` 里一个数字，实际上：

**问题一：文件属主不会自动跟着变。**

文件里存的是数字 UID（不是名字）。`liu` 的文件现在记录的仍是 `1001`，但 `/etc/passwd` 里已经没有 `1001` 这个用户了：

```bash
$ ls -ln /home/liu
drwxr-xr-x 5 1001 1001 ...     # 只剩数字，因为 1001 查不到名字了
```

必须手动迁移：

```bash
$ sudo find /home/liu -uid 1001 -exec chown -u liu {} +
```

⚠️ **`-exec chown` 必须放在最后面**，否则后面的条件会被 chown 吃掉。这是从 ch05 延续下来的习惯。

⚠️ **还要改家目录本身**，很多人漏掉这一步：

```bash
$ sudo chown liu:liu /home/liu
```

**问题二：正在运行的进程仍持有旧 UID。**

改完 UID 后，已经登录的会话里，`whoami` 之类的结果不会立刻变。**必须重新登录。**正在运行的服务进程也一样——重启服务才生效。

**问题三：数据库和配置里可能有旧数字。**

MySQL、PostgreSQL、Git 仓库、Zabbix、Grafana 这类东西把 UID 存进了自己的表。改 UID 之后它们会突然"不认识"这个用户。

⚠️ **改 UID 之前先查有没有冲突：**

```bash
$ getent passwd 2001
$ getent passwd 2001 | grep -q . && echo "已被占用" || echo "空闲"
```

### UID 复用：一个容易被忽略的安全坑

删掉用户 `liu`（UID 1001）之后，Linux 下次分配时**可能把 1001 再分给新用户**。

新用户自动继承了旧用户留下的所有文件的访问权——因为文件里记的是 `1001`，而新用户也是 `1001`。

⚠️ **离职人员处理流程必须包含这一步**：不要直接 `userdel` 就完事。要么把旧账号的 UID 标记为"永久占用"，要么用 `userdel` 后确认新账号不会拿到同一 UID。

```bash
$ sudo usermod -l liu_old liu     # 改名占位，UID 不变
```

先改名占坑，再考虑删除。

### `-o` 选项：允许重复 UID

```bash
$ sudo usermod -u 2001 -o liu
```

⚠️ **只在你明确知道后果时用。**重复 UID 会导致文件权限判断完全混乱，排错成本极高。

### 为什么要统一 UID：NFS

NFS 是典型的例子。**NFS 不传用户名，只传 UID/GID。**两台机器上同一个用户必须有同一个 UID，他才能访问对方的文件。

```text
机器 A：liu = 1001
机器 B：liu = 1001   → A 上 liu 写的文件，B 上的 liu 能正常读写

机器 B：liu = 1005   → B 上的 liu 访问 A 的文件会被拒绝
```

⚠️ 企业环境批量建号（`useradd` 脚本、`ansible`、`for i in ...; useradd` 循环）时，**显式指定 UID**，否则两台机器的同一个用户名会拿到不同 UID，NFS 目录权限全乱。

---

## 11.3 `useradd` 常用选项

### ⚠️ 最该记住的选项是 `-m`

```bash
$ sudo useradd -m liu
```

`-m` 的作用是**创建家目录并从 `/etc/skel` 复制模板**。**不加 `-m` 就没有家目录。**

后果不只是"少个目录"：

**后果一：用户登录后 HOME 指向一个不存在的路径。**

```bash
$ sudo useradd broken
$ su - broken
-bash: /home/broken: No such file or directory
```

**后果二：数据写到意外的地方。**

用户的 `~/.bashrc` 不存在，于是所有 shell 配置都不生效；编辑器配置、家目录里的脚本都不存在。看起来"能登录"，实际上什么都没配置。

**后果三（Ubuntu 上较少见）：权限安全隐患。**

如果 `/home` 权限是 `755` 而不是 `755 root:root` 之外更严格的值，普通用户可能能往别人的家目录里写东西。所以建家目录时还要确认属主正确。

```bash
$ ls -ld /home/liu
drwxr-xr-x 5 liu liu 4096 /home/liu
```

### `useradd` vs `adduser`

Debian/Ubuntu 上有两个不同的命令，行为差别很大：

| | `useradd` | `adduser` |
|---|---|---|
| 来源 | shadow-utils 的原生工具 | Debian 的 perl 脚本 |
| 建家目录 | **默认不建**，要 `-m` | **默认建** |
| 复制 `/etc/skel` | 要 `-m` | 默认就做 |
| 设密码 | 不做 | **交互式询问** |
| 写 `/etc/mail spool` | 可选 | 默认做 |
| 交互式提问 | 无 | 有 |

```bash
$ sudo adduser liu        # 会问密码、问 Full Name 等
$ sudo useradd -m liu     # 什么都不问，直接建
```

⚠️ **写脚本时两者的默认值不同，混用会得到不同结果。**我建议：脚本里统一用 `useradd -m` 并显式写全选项；手工建号用 `adduser` 更省事。

### 常用选项速查

```bash
$ sudo useradd -m -s /bin/bash -G sudo -c "Liu,Ops" liu
```

| 选项 | 含义 | 什么时候用 |
|---|---|---|
| `-m` | 建家目录 + 复制 `/etc/skel` | 人类账号**必加** |
| `-M` | **不**建家目录 | 系统账号（与 `-m` 相反） |
| `-d /path` | 指定家目录路径 | 家在数据盘上 |
| `-s /bin/bash` | 登录 shell | 人类账号 |
| `-s /usr/sbin/nologin` | 禁止登录 | **服务账号必用** |
| `-c "注释"` | GECOS，通常写真实姓名 | 便于 `finger` 显示 |
| `-G 组1,组2` | 加入**补充组** | 给权限时 |
| `-g 组名` | 指定**主组** | 很少用 |
| `-u 1005` | 显式指定 UID | 批量建号、NFS 环境 |
| `-r` | 系统账号（UID 从 `SYS_UID_MIN` 分配） | 服务账号 |
| `-k /etc/skel2` | 用别的模板目录 | 定制模板 |
| `-p '哈希'` | 直接设密码哈希 | ⚠️ 见下 |
| `-N` | 不自动建同名组 | 主组另有其组时 |

⚠️ **`-p` 的问题**：密码哈希会出现在你的 shell 历史和进程列表里。正常流程应该用 `passwd` 交互式设密码，或批量时用 `chpasswd`（见 11.5）。

### `/etc/skel`：新家目录的模板

```bash
$ ls -la /etc/skel/
-rw-r--r-- 1 root root  125 Feb 11 10:23 .bash_logout
-rw-r--r-- 1 root root  2921 Feb 11 10:23 .bashrc
-rw-r--r-- 1 root root  501 Feb 11 10:23 .profile
```

`useradd -m` 会把这些复制到新家目录，并设成新用户拥有。

⚠️ **往 `/etc/skel` 里放东西之前想清楚：**

| 放进去的东西 | 后果 |
|---|---|
| 项目模板、`.gitconfig` | ✅ 合理，每个新用户都该有 |
| ⚠️ 任何含密钥的文件 | ❌ 每个新用户都拿到同一份私钥 |
| ⚠️ 某个项目的 `.env` | ❌ 泄露给所有新账号 |

⚠️ 特别注意：如果你在 `/etc/skel` 里放了 `.ssh`，那么**每个新用户的家目录都会有那个 `.ssh` 目录**，一旦里面的权限不对，新用户就会被 SSH 拒绝登录。

⚠️ **用户会继承 `/etc/skel` 里的权限位。**如果模板里有 `0777` 的文件，它就会被这么复制下去。

### 验证建号结果

```bash
$ getent passwd liu
liu:x:1001:1001:Liu,Ops:/home/liu:/bin/bash

$ id liu
uid=1001(liu) gid=1001(liu) groups=1001(liu),27(sudo)

$ ls -la /home/liu/
drwxr-xr-x  3 liu liu  4096 Feb 15 09:12 .
drwxr-xr-x 14 root root  4096 Feb 10 08:33 ..

$ ls -l /home/liu/.bashrc
-rw-r--r-- 1 liu liu 3771 Feb 15 09:12 .bashrc
```

**四条都对了才算建号成功。**只看到 `getent passwd` 有输出是不够的——那只说明记录建了，家目录和属主可能都是错的。

---

## 11.4 改属性：`usermod`、`groupadd`、`gpasswd`

### ⚠️ `usermod -aG` 的 `-a` 不能省

这是本章最重要的一个坑：

```bash
$ sudo usermod -G sudo liu          # ⚠️ 危险！liu 原本在 adm、docker 组
```

**`-G`（不带 `-a`）会把补充组列表整个替换成你给的那一个。**执行完 liu 就只剩 `sudo` 组，`adm` 和 `docker` 都没了。

正确写法：

```bash
$ sudo usermod -aG sudo liu
```

⚠️ **判断标准很简单：写 `-G` 之前问自己"我是不是要把用户的组全部替换掉"。**99% 的情况不是，所以 99% 要写 `-aG`。

⚠️ 这个操作**不会立刻生效**：用户当前已登录的会话组是登录时确定的，必须重新登录（或用 `newgrp`）。

### `usermod` 常用选项

```bash
$ sudo usermod -aG docker liu              # 加补充组
$ sudo usermod -s /bin/zsh liu             # 换登录 shell
$ sudo usermod -d /data/home/liu -m liu    # ⚠️ 迁移家目录，-m 表示搬走内容
$ sudo usermod -l liu_new liu              # 改用户名
$ sudo usermod -c "新注释" liu             # 改 GECOS
$ sudo usermod -e 2026-12-31 liu           # 账号到期日
$ sudo usermod -L liu                      # 锁密码
$ sudo usermod -U liu                      # 解锁密码
```

⚠️ **`usermod -d ... -m` 迁移家目录的几个坑：**

- 目标目录**已经存在**时，`-m` 不会搬，而是保留旧目录不动，静默失败；
- 用户当前正在家目录里时，迁移会留下一堆还在旧位置的进程；
- 迁移完 `/etc/passwd` 里的家目录路径变了，但**用户当前会话还在旧路径**。

```bash
$ fuser -vm /home/liu/          # 迁移前先确认没人用
```

### ⚠️ 改用户名时的顺序

```bash
$ sudo usermod -l liu_new liu        # 1. 改用户名
$ sudo groupmod -n liu_new liu       # 2. 改同名组名
$ sudo usermod -d /home/liu_new -m liu_new   # 3. 迁家目录
```

⚠️ **顺序错了会出问题**：先改组名再改用户名，中间会有一个用户名为 `liu` 但组名已不存在的窗口。

⚠️ **改用户名不会自动迁移 NFS 目录**——NFS 里是 UID 决定的，改名后老名字的目录不再属于你。

### 组管理

```bash
$ sudo groupadd docker                     # 建组（下一个空闲 GID）
$ sudo groupadd -r chrony                  # 系统组（GID 从 SYS 范围分配）
$ sudo groupmod -n docker_new docker       # 改组名
$ sudo groupdel docker                     # 删组（组里必须没人）
$ getent group docker                      # 查组是否存在

$ sudo gpasswd -a liu docker               # 加成员
$ sudo gpasswd -d liu docker               # 删成员
$ sudo gpasswd -m liu liu2 docker          # 把 liu2 移到 docker 组
```

⚠️ **`gpasswd -m` 也危险**：它是"移动"，会把人从原组移走。想"只加不删"就用 `-a`。

⚠️ **`groupdel` 不会删组里的用户**，但会让他们的主组变成一个不存在的 GID，`ls` 显示不出组名。删组前先查：

```bash
$ getent group docker
docker:x:988:liu,wang
```

⚠️ **删掉用户的主组会出问题。**每个用户的主组不能被删。

### `newgrp`：不改记录换当前会话的主组

```bash
$ newgrp docker
$ id
uid=1001(liu) gid=988(docker) groups=1000(liu),27(sudo),988(docker)
```

这**不修改** `/etc/passwd`，只改当前 shell 的主组。退出这个 shell 就恢复。

⚠️ **一个真实的安全陷阱**：如果你在 **root 的上下文**里 `newgrp docker`，然后退出，`$SHELL` 指向的是 docker 组的 root shell——之后你可能在一个"看起来还是 root"的上下文里操作 docker 组权限。养成习惯：`newgrp` 之后确认 `id` 输出。

---

## 11.5 批量建用户

### 从 CSV 生成

先准备数据（格式：`用户名,真实姓名,UID`）：

```bash
$ cat > ~/users.csv << 'EOF'
zhang01,Zhang Wei,1001
zhang02,Zhang Ling,1002
li03,Li Na,1003
EOF
```

建号循环：

```bash
$ while IFS=, read -r user gecos uid; do
>     sudo useradd -m -u "$uid" -s /bin/bash -c "$gecos" "$user"
> done < ~/users.csv
```

⚠️ **加 `-u` 显式指定 UID**——理由见 11.2 的 NFS 部分。三列分别是 `user` / `gecos` / `uid`，第三列传给 `-u` **是 UID 不是 GID**，写脚本时不要把名字起混。

⚠️ **CSV 里的真实姓名含逗号（`Zhang, Wei`）会直接破坏 `IFS=,` 的解析**——多出来的字段会被 `read` 当成第三个变量，UID 那一列就变成了姓名的后半截。两种解法：改用 `|` 作分隔符，或者干脆改用 `adduser` 逐个交互式创建（它会自己问每一项）。

### ⚠️ 批量设密码：密码文件必须立刻删

生成随机密码：

```bash
$ openssl rand -base64 12
```

批量设置（`chpasswd` 读的是 `用户:密码` 格式）：

```bash
$ sudo chpasswd < ~/passwords.csv
```

其中 `passwords.csv` 是这样生成的：

```bash
$ while IFS=, read -r user rest; do
>     pw=$(openssl rand -base64 12)
>     echo "$user:$pw"
> done < ~/users.csv > ~/passwords.csv
$ chmod 600 ~/passwords.csv
```

⚠️ **四条安全纪律：**

1. **`chmod 600` 要在写文件之前就做**，或者至少在把密码交出去之前做。
2. **用完立刻销毁**：`shred -u ~/passwords.csv`（`shred` 在 SSD 上不保证真的擦掉，见第 24 章）。
3. **不要把密码写进命令行参数**：`useradd -p '哈希'` 会进 shell 历史；`echo $pw` 会出现在进程列表里。
4. **交付方式**：不要贴在聊天工具里。当面给、或者让对方首次登录自己改。

⚠️ **`useradd -p` 传哈希而不是明文**（`openssl passwd` 生成哈希），但哈希出现在历史里同样是泄露。

### 强制首次登录改密码

```bash
$ sudo chage -d 0 liu
```

`-d 0` 把"最后改密码日期"设为今天，也就是**强制下次登录必须改密码**。批量建号后必做。

### `passwd --stdin` 已经没有了

⚠️ 老教程里的 `echo '密码' | passwd --stdin 用户` **在现代系统上会失败**，`--stdin` 选项已被移除。用 `chpasswd`。

### 幂等：先查再建

```bash
$ id -u liu >/dev/null 2>&1 && echo "已存在，跳过" || sudo useradd -m liu
```

⚠️ **脚本里反复 `sudo` 会反复要密码。**三种解法：

```bash
$ sudo -v                        # 先缓存凭据（15 分钟内有效）
```

```bash
$ sudo -s                        # 整段在一个 root shell 里做
$ # ... 所有命令 ...
$ exit
```

```bash
$ echo '密码' | sudo -S cmd     # 从 stdin 读 sudo 密码（⚠️ 会进历史）
```

推荐第一种。

---

## 11.6 家目录迁移与孤儿文件

### ⚠️ `userdel` 不删家目录

```bash
$ sudo userdel liu
```

这条命令**只删 `/etc/passwd` 里的记录**。家目录 `/home/liu` 还在：

```bash
$ ls -ld /home/liu
drwxr-xr-x 5 1001 1001 4096 Feb 15 09:12 /home/liu
```

⚠️ **属主变成了数字**——因为系统里已经没有 `1001` 这个用户了，没有名字可显示。

这类文件叫**孤儿文件**（orphan files）。

### 找出孤儿

```bash
$ find /home -nouser
/home/liu
/home/wang
```

`-nouser` 的含义是"属主的 UID 在系统里查不到"。

```bash
$ find / -xdev -nouser -type f 2>/dev/null | head -20
```

⚠️ **`-xdev` 很重要**：不加它会跨文件系统搜索，在 NFS 挂载点上可能遍历几百万个文件，甚至触发网络风暴。

### 清理的顺序

⚠️ **删之前先看清楚，再删具体路径，不要用通配符：**

```bash
$ du -sh /home/liu                      # 先看多大
$ find /home/liu -type f | wc -l         # 再看多少文件
$ find /home/liu -mtime -30 | head       # 看看最近有没有改动
```

确认无用后：

```bash
$ sudo rm -rf /home/liu
```

⚠️⚠️ **`-nouser` 的结果不能直接喂给 `rm -rf`。**`find / -nouser -delete` 这种命令在生产机上极其危险——它会把**所有**属主查不到的遍历都删掉，包括那些正在被某个已经删除的 UID 使用的关键目录。**永远先列出来，一个一个确认。**

### 带删除的 `userdel`

```bash
$ sudo userdel -r liu
```

`-r` 会删掉：

- 家目录 `/home/liu`
- 邮件 spool `/var/mail/liu`（如果存在）

⚠️ `-r` 删家目录时**不会问你**。⚠️ 如果家目录里有人放的东西（比如运维手动传的证书、备份的 dump），一起没了。**执行前务必 `ls -la` 看一眼。**

⚠️ `-r` 在家目录不存在时会报错：

```bash
$ sudo userdel -f -r liu       # -f 强制，不因家目录缺失而失败
```

### ⚠️ 用户删了，进程还在

```bash
$ sudo userdel liu
$ ps -u liu
  PID TTY          TIME CMD
1892 ?        00:00:03 mylongjob.sh
```

⚠️ **删账号不会杀进程。**内核里的进程凭的是 UID 数字，账号记录消失后进程照样跑，而且**它写入的文件属主会变成一个不存在的数字**。

```bash
$ kill 1892                  # 或 pkill -u liu
$ sudo pkill -u liu          # 杀该用户所有进程（会杀他的 tmux 会话！）
$ sudo pkill -9 -u liu       # 顽固的
```

⚠️ `pkill -u` 会连带杀掉该用户的 **tmux/screen 会话**、正在跑的交互式程序。如果那个用户正开着 vim 保存东西，直接丢数据。

### 为什么"用户注销后进程还在"

这个问题的答案在 PAM 里。SSH 登录会话结束时，`pam_close_session` 会给会话内的所有进程发 `SIGHUP`。

**但这些情况进程会活下来：**

| 情况 | 为什么活下来 |
|---|---|
| `nohup cmd &` | 忽略 SIGHUP |
| `setsid cmd` | 新会话，不接受终端的 HUP |
| `tmux` / `screen` 里的程序 | 挂在伪终端上 |
| `at` / `cron` / systemd 启动的 | 没有终端，不受 HUP 影响 |
| 孤儿进程（父进程先死了） | 被 init 收养，重新指向 `/dev/null` |

```bash
$ ps -o pid,ppid,tty,stat,cmd -p 1892
```

`Tty` 列是 `?` 就表示没有终端——这类进程不受 SIGHUP 影响。

⚠️ **实践含义**：清理离职人员的账号时，`userdel` + `pkill -u` + 检查 systemd 里以该用户运行的服务，三个都要做。

---

## 11.7 服务账号与 `nologin` 的真实边界

### 规范的服务账号

```bash
$ sudo useradd -r -s /usr/sbin/nologin -d /var/lib/myapp -c "My App" myapp
```

| 部分 | 作用 |
|---|---|
| `-r` | 系统账号，UID 从 `SYS_UID_MIN`（1–999）里挑一个**当前空闲**的 |
| `-s /usr/sbin/nologin` | 禁止交互式登录 |
| `-d /var/lib/myapp` | 只改 `/etc/passwd` 里的路径字符串，**不会创建目录** |
| `-c` | 注释写清是什么服务 |

⚠️ **`-d` 不建目录。**`useradd` 不会帮你 `mkdir`，所以建号之后那一行 `ls -ld /var/lib/myapp` 会报"No such file or directory"。数据目录要么由 `postinst` 脚本创建，要么由你显式建：

```bash
$ sudo install -d -o myapp -g myapp -m 0750 /var/lib/myapp
```

⚠️ **也别把 995 写死。**`-r` 是在 1–999 范围内挑一个没被占用的，所以实际 UID 取决于你这台机器上已经有哪些系统账号。验证要用实际值：

```bash
$ getent passwd myapp
```

```console
myapp:x:995:995:My App:/var/lib/myapp:/usr/sbin/nologin
```

第三、四个字段的数字**取决于你的机器**，可能是 995 也可能是别的空闲号。判断标准只有两个：**落在 1–999 之间**，以及**和 `myapp` 组同名**。

```bash
$ id myapp
```

```console
uid=995(myapp) gid=995(myapp) groups=995(myapp)
```

```bash
$ ls -ld /var/lib/myapp
```

```console
drwxr-x--- 2 myapp myapp 4096 Feb 20 10:00 /var/lib/myapp
```

如果你看到的是别的数字，那也完全正常——**不要为了让输出好看去手工指定 UID**，让 `-r` 自己挑才是正确做法。

`nologin` 的内容就是一行提示语：

```bash
$ cat /usr/sbin/nologin
This account is currently not available.
```

### ⚠️ `nologin` 不是什么

**这是本章最重要的认知：`nologin` 不是安全边界，它只挡交互式登录。**

| 方式 | `nologin` 账号能做什么 |
|---|---|
| `su - myapp` | ❌ 被拒绝，显示提示语 |
| `ssh myapp@localhost` | ❌ 被拒绝（无密码且 shell 是 nologin） |
| `sudo -u myapp /usr/bin/xxx` | ✅ **照样能执行**——sudo 不检查登录 shell |
| `su myapp -s /bin/bash`（root 执行） | ✅ **能绕过**——root 可以指定 shell |
| `systemd` 里 `User=myapp` | ✅ 正常工作（服务不"登录"） |
| `cron` 里以它身份跑 | ✅ 正常工作 |

**结论：攻击者如果已经拿到了 root，他完全不需要 `nologin` 账号。**`nologin` 的作用是**防手滑**——防止有人用这个账号 SSH 登录后拿到一个 shell，而不是防攻击。

⚠️ 那真正的权限边界在哪？在**文件权限**和**systemd 的沙箱选项**：

```ini
[Service]
User=myapp
Group=myapp
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/var/lib/myapp
```

systemd 的隔离选项才是真正的边界，第 15 章会展开。

### 服务账号的其他规范

**密码字段应该是 `*` 或 `!`**，表示无法密码登录：

```bash
$ sudo getent shadow myapp
myapp:*:20100:0:99999:7:::
```

⚠️ **`useradd` 不会自动设这个。**如果服务账号的密码字段是空的（`useradd` 有时会出现），它就是一个**空密码账号**——安全性问题。检查并修复：

```bash
$ sudo passwd -l myapp
```

**不要多个服务共用一个账号。**后果：

- 无法分辨哪个服务写的文件；
- 权限粒度混乱，A 服务能读 B 服务的文件；
- 审计日志里全是同一个用户名，溯源无效。

⚠️ **不要用 root 跑服务。**服务被攻破 = 直接是 root。

### systemd 的 `DynamicUser`

systemd 提供了一种更干净的方式：连 `/etc/passwd` 记录都不需要。

```ini
[Service]
DynamicUser=yes
StateDirectory=myapp
```

systemd 启动时临时创建一个用户，进程结束后删掉。⚠️ **但动态 UID 每次启动可能不同**，所以需要固定权限的目录（数据库文件）不能直接用这个方式。第 15 章会详细讲。

---

## 11.8 时间与时区

### 时区：只影响显示

```bash
$ timedatectl
               Local time: Fri 2026-03-13 14:22:31 CST
           Universal time: Fri 2026-03-13 06:22:31 UTC
                 RTC time: Fri 2026-03-13 06:22:31
                Time zone: Asia/Shanghai (CST, +0800)

System clock synchronized: yes
              NTP service: active
          RTC in local TZ: no
```

```bash
$ timedatectl list-timezones | head
$ sudo timedatectl set-timezone Asia/Shanghai
```

⚠️ **`Time zone` 和 `System clock synchronized` 是两件事。**时区设对了但时钟没同步，是最常见的"时间看起来对、其实不对"——因为你所在时区的时间和 UTC 只差一个固定偏移。

### 时间同步：Ubuntu 24.04 的默认是 `systemd-timesyncd`

```bash
$ systemctl status systemd-timesyncd
$ timedatectl show -p NTPSynchronized
NTPSynchronized=yes
```

⚠️ **Ubuntu 从 21.04 起不再默认装 chrony**，默认客户端是 `systemd-timesyncd`（桌面和服务器都是）。chrony 更适合服务器，因为它有更好的时钟**渐进调整**（slew）算法和更完整的监测手段，需要时自己装：

```bash
$ sudo apt install chrony
$ systemctl status chrony
```

⚠️ **两个客户端不要同时启用**，它们会互相干扰。

### ⚠️ 用 chrony 时

```bash
$ chronyc tracking
Reference ID    : C0A8010B (192.168.1.11)
Stratum         : 3
Ref time (UTC)  : Fri Mar 13 06:20:11 2026
System time     : 0.000012345 seconds slow of NTP time
Last offset     : -0.000000421 seconds
RMS offset      : 0.000000512 seconds
Frequency       : 12.345 ppm slow
Skew            : 0.352 ppm
Root delay      : 0.000123456 seconds
Root dispersion : 0.000023456 seconds
Update interval : 64.2 seconds
Leap status     : Normal
```

| 字段 | 怎么看 |
|---|---|
| `Stratum` | 时间源层级，0 = 本地时钟，3 = 正常（隔了两层） |
| `System time` | ⚠️ 关键：当前和标准时间的差，秒。应该很小 |
| `Leap status` | ⚠️ 关键：`Normal` 才是同步正常 |

```bash
$ chronyc sources -v
  MS Name/IP address         Stratum Poll Reach LastRx Last sample
==============================================================================
^* 192.168.1.11                   3   6   377   18   -0.000123 +/-  0.000456 seconds
^+ ntp.ubuntu.com                2   6   377   21   -0.000234 +/-  0.000789 seconds
^? 203.107.6.88                  0   6   0     -     +0.000000 +/-  0.000000 seconds
```

符号列的含义：

| 符号 | 含义 |
|---|---|
| `*` | 当前选用的源 |
| `+` | 可用的候选 |
| `-` | 可用但精度不够 |
| `?` | ⚠️ 不可用（没响应） |

一次性校时（脚本用）：

```bash
$ sudo chronyd -q
```

配置文件 `/etc/chrony/chrony.conf` 里最关键的一行：

```text
makestep 1.0 3
```

含义是"启动后的前 3 次，如果偏差超过 1 秒就直接跳到正确时间，之后改成渐进调整"。虚拟机时钟常常偏得厉害，这一行能省掉很多麻烦。

### ⚠️ 时间不准会连锁破坏什么

这是本章最有价值的一张表：

| 被破坏的东西 | 具体症状 |
|---|---|
| **TLS / HTTPS** | ⚠️ `certificate is not yet valid` 或 `expired`——证书有效期判断错了，curl、git、apt 全挂 |
| **`apt update`** | ⚠️ `Release file ... is not yet valid` / `expired`——索引的 `Valid-Until` 校验失败 |
| **日志** | 跨主机的日志顺序错乱，排查故障时时间线全是错的 |
| **Kerberos** | ⚠️ `kinit: Clock skew too large`——时间偏差超过 5 分钟就认证失败 |
| **数据库事务** | 主从复制中断、事务时序错乱 |
| **cron / systemd timer** | 任务该跑的时候不跑，或重复跑 |
| **文件 mtime** | 编译系统、增量构建判断失效 |
| **JWT / 一次性密码** | 令牌被判为过期 |
| **分布式锁 / 选主** | 判断哪个节点更新 |

⚠️ 最隐蔽的是 TLS 和 apt：**你会以为和网络有关，实际是时钟**。

### 排查顺序

```bash
$ timedatectl                                        # 1. 时区对不对
$ timedatectl show -p NTPSynchronized                # 2. 同步状态
$ ping -c3 ntp.ubuntu.com                            # 3. DNS 和网络通不通
$ chronyc tracking                                   # 4. 偏差多大
$ chronyc sources -v                                 # 5. 哪个源在拖后腿
$ sudo journalctl -u chrony --since "1 hour ago"     # 6. 服务自己怎么说
```

⚠️ **上面第 4、5 步要先装 chrony**：

```bash
$ command -v chronyc || echo "chrony 未安装，下面两步跳过"
$ sudo apt install chrony
```

因为第 3 节的 `systemd-timesyncd` 只告诉你"同步了没有"，不告诉你**偏差多少、哪个源在拖后腿**。要看到这两个信息就得用 chrony 的客户端。

⚠️ **DNS 不通时，chrony 可能连初始校时都做不到**——因为源地址是域名。而且即使连上了，`makestep` 缺失时它会慢慢挪动时钟，看起来"在同步但一直差几秒"。

### ⚠️ 不要用 `date -s` 改时间

```bash
$ sudo date -s "$(date '+%Y-%m-%d %H:%M:%S')"     # ⚠️ 不推荐
```

问题：

1. NTP 会**把它拽回去**，你的修改无效；
2. ⚠️ **时钟回拨**可能让正在运行的数据库、分布式系统出问题；
3. 硬件时钟（RTC）和系统时钟会不一致。

如果实在必须先手动校时（否则 TLS 完全不通），要连 RTC 一起改：

```bash
$ sudo date -s "2026-03-13 14:30:00"
$ sudo hwclock --systohc        # 把系统时钟写回硬件时钟
```

或者反过来：

```bash
$ sudo hwclock --hctosys        # 以硬件时钟为准
```

### 容器里的时间

⚠️ **容器共享宿主机的内核，时钟就是宿主机的时钟**，容器内改不了（除非 `--cap-add SYS_TIME`，⚠️ 极其危险，不要在生产这么做）。

容器里能改的只有**时区**：

```bash
$ docker run -e TZ=Asia/Shanghai ...
```

⚠️ 这只影响程序的时间显示和日志格式，**不影响时钟准确性**。

---

## 11.9 主机名与 `/etc/hosts`

### 改主机名

```bash
$ hostnamectl
 Static hostname: ubuntu-server
       Icon name: computer-vm
         Machine ID: 4e1f...
      Architecture: x86-64
   Virtualization: kvm

$ sudo hostnamectl set-hostname app-01
```

三种 hostname 的区别：

| 类型 | 何时消失 | 用途 |
|---|---|---|
| **static**（静态） | 重启还在 | 你设置的那个 |
| **transient**（瞬时） | 重启丢失 | DHCP/云平台下发 |
| **pretty**（显示名） | 独立 | 可以带空格和 Unicode |

```bash
$ hostname -f              # 完整 FQDN
$ hostname -I              # 所有 IP
```

### ⚠️ 改完主机名，sudo 会开始"抱怨"

改完主机名后用 sudo，会看到这种提示：

```text
sudo: unable to resolve host app-01: Name or service not known
```

⚠️ **这不是 sudo 的 bug，是 `/etc/hosts` 没同步。**sudo 调用 `gethostname()` 拿主机名，然后去做一次地址解析；解析失败就打这条警告。

```bash
$ sudo nano /etc/hosts
```

```text
127.0.0.1   localhost
127.0.1.1   ubuntu-server
```

改成：

```text
127.0.0.1   localhost
127.0.1.1   app-01
```

⚠️ **不要删掉 `127.0.1.1` 这一行。**它的作用是"这台机器自己的完整名字"——很多工具（包括 sudo、部分 systemd 单元、`hostname -f`）依赖它。删掉之后可能一堆东西出问题。

```bash
$ sudo systemctl restart systemd-hostnamed    # 让 hostname 相关的服务重新读
```

### `/etc/hosts` 的三个限制

| 限制 | 说明 |
|---|---|
| **只做正向解析** | 能"名字→IP"，**不能反查**（那是 `dig -x`） |
| **不支持通配符** | ⚠️ `*.example.com` 无效 |
| **不认域名后缀** | 必须写完整名字，hosts 里没有"搜索域"概念 |

优先级在 `/etc/nsswitch.conf` 里：

```bash
$ grep '^hosts' /etc/nsswitch.conf
hosts: files dns
```

`files` 在 `dns` 前面，所以**hosts 里的条目会覆盖 DNS**。⚠️ 这既是特性也是陷阱——一条过期的 hosts 记录可以让所有人访问不到正确的服务，而且没有任何报错，只是"连不上"。

### ⚠️ 云主机的特殊之处

在 OpenStack、阿里云、AWS、腾讯云上：

**主机名由云平台设置**，通常通过 cloud-init：

```bash
$ sudo cloud-init query hostname
```

⚠️ **你手动 `hostnamectl set-hostname` 改的值，重启后可能被云平台重置回它给的。**这不是故障，是你没理解谁在管理。

要在云主机上永久改名，必须：

1. 在**云平台的控制台或 API** 里改实例名；
2. 或者配置 cloud-init 不管理 hostname：

```bash
$ sudo tee /etc/cloud/cloud.cfg.d/99-preserve-hostname.cfg << 'EOF'
preserve_hostname: true
EOF
```

⚠️ **绝对不要改 `169.254.169.254`（元数据服务）的 hosts 解析。**那会导致实例无法获取自己的身份信息，很多云厂商的 agent 会挂掉。

### ⚠️ 不要在 hosts 里劫持别人的域名

```text
# ⚠️ 绝对不要这么干
1.2.3.4   google.com
```

这在实验环境里可能"图个方便"，但：

- 是明确的**流量劫持**行为；
- 会破坏其他人对同一个域名的访问；
- 在合规审计里是严重问题；
- 你以为是你在测，其实所有同事的流量都被你改了。

要"临时把某个域名指向本地测试环境"，用 dnsmasq 或 `curl --resolve`，不要动 hosts。

---

## 11.10 locale 与字符集

### 三个环境变量

```bash
$ locale
LANG=zh_CN.UTF-8
LANGUAGE=zh_CN:zh
LC_CTYPE="zh_CN.UTF-8"
LC_NUMERIC="zh_CN.UTF-8"
LC_TIME="zh_CN.UTF-8"
LC_ALL=
```

| 变量 | 作用 |
|---|---|
| `LANG` | 基准语言，决定没被覆盖的那些 |
| `LC_XXX`（`LC_TIME`、`LC_COLLATE`…） | 只覆盖某一类行为 |
| `LC_ALL` | ⚠️ **覆盖全部** |

优先级：

```text
LC_ALL  >  具体的 LC_XXX  >  LANG  >  内置默认值（C / POSIX）
```

⚠️ **只要 `LC_ALL` 有值，所有 `LC_XXX` 都会被它无视。**这是最容易踩的坑。

### ⚠️ `LC_ALL` 的四种典型陷阱

**陷阱一：排序规则变了。**

```bash
$ printf '10\n9\n2\n' | sort
10
2
9
```

```bash
$ printf '10\n9\n2\n' | LC_ALL=C sort
10
2
9
```

看起来一样，但**混合内容时差别巨大**：

```bash
$ printf 'apple\nBanana\ncherry\n' | sort          # C.UTF-8：大写在前
Banana
apple
cherry
```

```bash
$ printf 'apple\nBanana\ncherry\n' | LC_ALL=C.UTF-8 sort   # 按字母序
apple
Banana
cherry
```

⚠️ **`C` locale 是按字节（ASCII）排序**，所以大写字母全在小写前面。任何"两个列表顺序要对得上"的脚本对比，都会被这个搞乱。

**陷阱二：`ls` 的列对齐错乱。**

```bash
$ LC_ALL=C ls -l       # 中文文件名按字节算宽度，列全歪
```

**陷阱三：日期格式变。**

```bash
$ LC_ALL=C date
Fri Mar 13 14:22:31 CST 2026
$ LC_ALL=en_US.UTF-8 date
Fri Mar 13 14:22:31 CST 2026

$ date +%x        # %x 是"本 locale 下的日期格式"，值随 locale 变
```

⚠️ 脚本里用 `date +%x` 或 `date +%c` 解析日期，`LC_ALL` 一变结果就变。

**陷阱四：浮点数格式变。**

```bash
$ LC_ALL=de_DE.UTF-8 awk 'BEGIN{print 1.5}'     # 可能输出 1,5
```

⚠️ 某些 locale 下小数点会变成逗号，直接影响 `awk`、`sort -n` 之后的数字处理。

### ⚠️ 脚本里永远显式设 `LC_ALL=C`

```bash
$ LC_ALL=C sort -k2 -n list.txt
$ LC_ALL=C awk -F: '{print $1}' /etc/passwd
```

**理由**：你要的是**稳定、可预测、对字节正确**的行为，而不是"符合本地用户习惯"。C locale 保证了这一点。

在脚本开头统一设：

```bash
#!/usr/bin/env bash
set -euo pipefail
export LC_ALL=C
```

⚠️ 但要注意：**这会影响脚本自己的输出格式**（比如日期）。如果脚本要输出给人看的本地化时间，应该在**处理完之后、输出之前**再切回目标 locale。

### ⚠️ 设了不存在的 locale 会直接报错

```bash
$ export LC_ALL=zh_CN.UTF-8
$ ls
bash: warning: setlocale: LC_ALL: cannot change locale (en_US.UTF-8): No such file or directory
```

⚠️ **不是警告后继续工作，而是每条命令都可能受影响。**最典型的是 Python 和 Perl：它们看到无法设置的 locale 会直接抛异常退出。

```bash
$ locale -a
C
C.utf8
POSIX
en_US.utf8
```

⚠️ **最小化安装镜像里通常只有 `C.utf8`**，没有 `zh_CN.utf8` 或 `en_US.utf8`。

生成新的 locale：

```bash
$ sudo locale-gen
```

或者只生成指定的：

```bash
$ sudo locale-gen zh_CN.UTF-8
```

⚠️ **在 `/etc/locale.gen` 里取消注释对应的行**再运行 `locale-gen`，这是 Debian/Ubuntu 的标准方式：

```text
# zh_CN.UTF-8 UTF-8
en_US.UTF-8 UTF-8
```

### ⚠️ 设成不存在的 locale：另一个方向的坑

```bash
$ export LC_ALL=xx_XX.utf8
$ ls
ls: cannot access '...': Invalid argument
```

⚠️ 更隐蔽的是：**`LC_ALL` 必须是有效值，否则不是"退回默认"，而是让程序拿到一个坏状态。**在 `~/.profile` 里写了一个 typo 的 locale，你的所有命令都会出问题，而且报错信息完全不提 locale。

### 持久化设置

| 文件 | 影响范围 | 何时生效 |
|---|---|---|
| `/etc/environment` | 全局 | PAM 登录时（最"干净"，不依赖 shell） |
| `/etc/default/locale` | 全局 | Ubuntu 桌面通过 PAM 读取 |
| `~/.pam_environment` | 单用户 | 登录时；⚠️ 需要权限且格式特殊 |
| `~/.profile` | 单用户，登录 shell | 只影响 shell |
| `~/.bashrc` | 单用户，交互 shell | 只影响交互 shell |

```bash
$ echo 'LANG=zh_CN.UTF-8' >> ~/.profile
```

⚠️ SSH 非登录会话不读 `~/.profile` 的全部内容（只读 `~/.bashrc`，且 `~/.bashrc` 开头有一句非交互式就 return 的判断）。所以"我改了 `~/.profile` 但 SSH 进来还是老样子"是常见的。

⚠️ **服务器上建议保持 `LANG=C.UTF-8` 或不设。**理由：

1. 错误信息、命令输出都是英文，能搜到；
2. 英文日志对排障工具（grep 模式、正则）更友好；
3. 混合语言环境出现乱码的概率更低。

需要中文显示时，在需要的地方单独设置。

### 字符集：只该用 UTF-8

```bash
$ file -i notes.txt
notes.txt: text/plain; charset=utf-8

$ echo "中文" | file -i
/dev/stdin: text/plain; charset=utf-8
```

⚠️ **看到 `charset=iso-8859-1` 或 `unknown-8bit`，说明文件编码不对。**转换：

```bash
$ iconv -f iso-8859-1 -t utf-8 old.txt > new.txt
$ iconv -f gb2312 -t utf-8 old.txt > new.txt
```

⚠️ **`iconv` 转之前一定要确认源编码。**猜错了会把文件转成乱码，而且不可逆。判断依据：文件来源、程序文档、`file` 的判断、以及 `hexdump` 看字节特征。

⚠️ **`LANG=C` 时的副作用**：有些程序在 C locale 下会以为输入不是文本，把 UTF-8 的中文当二进制处理，导致 `grep` 只说 "binary file matches" 而不显示内容。

```bash
$ LANG=C grep 中文 file.txt
```

```console
Binary file file.txt matches
```

```bash
$ grep 中文 file.txt        # LANG=zh_CN.UTF-8 时正常显示
```

需要按行处理时加 `-a` 强制当文本：

```bash
$ LANG=C grep -a 中文 file.txt
```

---

## 11.11 账号安全

### 密码哈希：看前缀判断算法

见 11.1。⚠️ 弱哈希（`$1$`）意味着密码可以被离线爆破。判断现存账号用的算法：

```bash
$ sudo getent shadow | awk -F: '{print $2}' | grep -o '^\$[^$]*' | sort | uniq -c
    512 $y$
     12 $6$
```

⚠️ **出现 `$1$` 就要处理。**`pwconv` 可以把弱哈希重新计算成当前默认算法：

```bash
$ sudo pwconv
```

⚠️ **动手前先搞清楚 `pwconv` 到底做什么。**它的方向是**从 `/etc/passwd` 往 `/etc/shadow` 迁移**，不是反着来：

- 它读出**能解析出的密码哈希**（现代系统里 `/etc/passwd` 写的是 `x`，所以通常是空转），然后按 `/etc/login.defs` 的 `ENCRYPT_METHOD` 重算，写进 `/etc/shadow`；
- **它不会把哈希写回 `/etc/passwd`。**`/etc/passwd` 第二段保持 `x`，这是正确状态，不要去追求"把哈希放回 passwd"——那等于让全局可读的 passwd 又带上哈希，直接打破第 6 章讲的 shadow 设计；
- `-r`（`--read-only`）只做演练不写盘。**建议先跑一次看它打算改什么**；
- 它也只处理"哈希格式仍然可解析"的条目，已经是 `!` / `*` 锁定的账号不会被动。

```bash
$ sudo pwconv -r          # 只报告，不修改
$ sudo pwconv             # 确认无误后再真正执行
```

真正想升级算法，更可控的做法是逐个账号强制改密码（`chage -d 0` 或 `passwd`），或者装 `libpam-pwquality` / `passwdquality` 加强度校验。`pwconv` 在 Ubuntu 24.04 上属于 `passwd` 包自带的工具，非常用路径，用之前务必 `man pwconv` 读一遍。

### `passwd` 改密码

```bash
$ passwd
Changing password for ubuntu.
Current password: 
New password: 
Retype new password: 
passwd: password updated successfully
```

改别人的：

```bash
$ sudo passwd liu
```

⚠️ **用 `passwd` 设的密码会被检查相似度**（和旧密码太像会被拒），这是 PAM 的 `pam_pwquality` 在管。

### `chage`：账号生命周期

```bash
$ chage -l liu
Last password change					: Feb 15 09:12
Password expires						: never
Password inactive					: never
Account expires						: never
Minimum number of days between password change		: 0
Maximum number of days between password change		: 99999
Number of days before password expiry warning	: 7
```

| 操作 | 命令 | 说明 |
|---|---|---|
| 查看策略 | `chage -l 用户` | |
| 最长有效期 90 天 | `sudo chage -M 90 用户` | 到期强制改密 |
| 最短间隔 7 天 | `sudo chage -m 7 用户` | 防止刚改完又改 |
| 提前 14 天警告 | `sudo chage -W 14 用户` | |
| 强制下次登录改密 | `sudo chage -d 0 用户` | 批量建号必用 |
| 账号到期日 | `sudo chage -E 2026-12-31 用户` | 之后账号作废 |
| 到期后宽限 3 天 | `sudo chage -I 3 用户` | 之后锁定 |

⚠️ **`chage -M 99999` 是"永不过期"。**默认策略就是 99999（见上面的输出）。很多管理员手动改成 99999 来"图省事"，这在合规审计里是**明确的不符合项**。

⚠️ **强制定期改密也有代价**：用户会在最不方便的时候被要求改密。折中做法是设一个合理的 `-M`（如 90）+ 足够的 `-W` 警告期，而不是取消。

### PAM：策略真正落地的地方

```bash
$ ls /etc/pam.d/
chpasswd      common-account     common-auth      common-password
cron          login              sshd              sudo
```

⚠️ **改 PAM 配置前必须先备份，并且保持一个已登录的 root 会话不要关。**PAM 出错会导致**所有用户都登不进去**——包括 root。这是 SSH 改配置时最经典的把自己锁在门外的场景（第 17 章会详讲）。

密码强度：

```bash
$ grep -v '^#' /etc/security/pwquality.conf | grep -v '^$'
minlen = 8
minclass = 1
maxrepeat = 3
dictcheck = 1
usercheck = 1
```

| 字段 | 含义 | 建议 |
|---|---|---|
| `minlen` | 最短长度 | 12（8 已被视为太短） |
| `minclass` | 至少包含几类字符（大写/小写/数字/符号） | 3 |
| `maxrepeat` | 最多连续重复次数 | 3 |
| `dictcheck` | 不许用字典里的词 | 1 |
| `usercheck` | ⚠️ 不许包含用户名或其倒序 | 1 |

⚠️ **`usercheck = 1` 是很多人忘配的一项。**没有它，用户可以设置 `wang123`（用户名 + 数字）这种密码。

登录失败锁定：

⚠️ **`faillock` 不是 Ubuntu 24.04 的默认配置。**它是 `libpam-modules` 里的可选工具，PAM 里对应的 `pam_faillock` 行默认是注释掉的。所以先确认环境：

```bash
$ command -v faillock || echo "faillock 未安装"
$ grep -n pam_faillock /etc/pam.d/sshd /etc/pam.d/common-auth
```

没有输出就说明这条能力当前是关闭的。下面这些命令需要**先启用**才有效：取消 `/etc/pam.d/common-auth` 里 `pam_faillock.so` 及其 `preauth` / `authfail` / `account` 三行的注释，然后装 `faillock` 包。

启用之后：

```bash
$ faillock --user liu
```

```console
liu:
    When: 2026-03-13 15:02:00
    Type: tty
    Valid: tty
    TTY: pts/0
   Events: 6
```

```bash
$ sudo faillock --user liu --reset      # 解锁（把自己锁住时用）
```

⚠️ **失败锁定最大的风险是把管理员锁在外面**。而且注意：一旦启用，锁定的判定依据是 `tty`，**SSH 上锁住了你在本地终端不一定解得开，反之亦然**。对策：

1. 一定保留一条已登录的 root 会话；
2. 确认云平台的 VNC/串口控制台能进；
3. `failoffset` 和 `failinterval` 不要设太狠；
4. 在 `/etc/pam.d/sshd` 里把 `nullok` 之类的选项理解清楚再改。

### ⚠️ `passwd -l` 和 `usermod -L` 的区别

```bash
$ sudo passwd -l liu        # 给 shadow 的哈希前面加一个 !
$ sudo usermod -L liu       # 同上
```

两者效果一致（都是在哈希前加 `!`）。⚠️ **但它们都不会**：

- 删除账号；
- 禁止 SSH 密钥登录（⚠️ `passwd -l` 之后，**密钥登录仍然有效**）；
- 禁止已经登录的会话继续使用。

⚠️ **`passwd -l` 不是"禁用账号"。**要真正阻止登录：

```bash
$ sudo passwd -l liu                       # 禁用密码登录
$ sudo usermod -s /usr/sbin/nologin liu    # 禁用所有登录（⚠️ 会锁掉密钥登录）
```

⚠️ 两个都要做才完整。只想禁密码、保留密钥，就只做第一个。

### SSH 密钥登录（最有效的单点措施）

```bash
$ ssh-keygen -t ed25519 -C "liu@laptop"
```

```console
Generating public/private ed25519 key pair.
Enter file in which to save the key (/home/liu/.ssh/id_ed25519):
Enter passphrase (empty for no passphrase):
Your identification has been saved in /home/liu/.ssh/id_ed25519
Your public key has been saved in /home/liu/.ssh/id_ed25519.pub
The key fingerprint is:
SHA256:xK3m...（省略）...9fQ liu@laptop
```

⚠️ **passphrase 强烈建议设置。**它加密的是**私钥文件本身**，不是 SSH 会话。设了 passphrase 后，即使私钥文件泄露，攻击者还需要那个口令。

部署公钥：

```bash
$ ssh-copy-id -i ~/.ssh/id_ed25519.pub liu@server
```

手动方式：

```bash
$ mkdir -p ~/.ssh && chmod 700 ~/.ssh
$ cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
$ chmod 600 ~/.ssh/authorized_keys
```

⚠️ **三个权限必须对**：`.ssh` 是 `700`，`authorized_keys` 是 `600`，家目录不能是 `777`。SSH 客户端的 `StrictModes`（默认开）会拒绝权限不正确的文件，报 `UNPROTECTED PRIVATE KEY FILE` 或 `Permission denied (publickey)`。

⚠️ **装 `ssh-agent`** 免去每次输 passphrase：

```bash
$ eval "$(ssh-agent -s)"
$ ssh-add ~/.ssh/id_ed25519
```

### ⚠️ 禁用密码登录的正确顺序

这一步做错会把自己锁在外面：

**第 1 步：保持当前 SSH 会话不要关。**

**第 2 步：在当前会话里验证密钥登录确实能用。**开一个**新的**终端：

```bash
$ ssh -o PasswordAuthentication=yes liu@server 'echo OK'
```

⚠️ 加 `PasswordAuthentication=yes` 是故意让你用密码登一次，确认密码没被禁用。

**第 3 步：确认密钥能登。**

```bash
$ ssh liu@server 'echo OK'
```

⚠️ **如果这一步失败了，绝对不要继续改配置。**先排查（公钥路径、权限、`.ssh/config`）。

**第 4 步：改配置。**

```bash
$ sudo nano /etc/ssh/sshd_config
```

```text
PasswordAuthentication no
PubkeyAuthentication yes
PermitRootLogin prohibit-password
```

⚠️ **只改 `sshd_config` 是安全的**——改完不重启服务不影响现有会话。

**第 5 步：先验证语法，再重载，最后才关旧会话。**

```bash
$ sudo sshd -t                 # 语法检查，没有输出就是通过
$ sudo systemctl reload ssh     # reload 不断开现有连接
```

⚠️ **服务名是 `ssh`，不是 `sshd`。**Ubuntu 从 22.10 起把 OpenSSH 改成了 socket 激活：开机启用的是 `ssh.socket`，按需拉起的服务叫 `ssh.service`。写 `systemctl reload sshd` 会直接报 `Unit sshd.service not found`。配置文件的名字没变，仍然是 `/etc/ssh/sshd_config`，二进制也仍是 `/usr/sbin/sshd` —— **只有 systemd 单元名改了**。

⚠️ **socket 激活带来一个反直觉的坑：改了 `sshd_config` 里的 `Port` / `ListenAddress`，`reload ssh` 不生效。**这些值由 systemd 生成器在启动时从配置文件里读一次，改完必须：

```bash
$ sudo systemctl daemon-reload
$ sudo systemctl restart ssh.socket
```

⚠️ **`reload` 而不是 `restart` 是关键。**`restart` 会杀掉所有现有 SSH 连接——如果你只有一条会话，你会立刻被踢出去，然后进不去。`reload` 只让新连接用新配置。

⚠️ 改 SSH 配置的通用原则（第 17 章展开）：**保持一个会话、开一个 `-t` 检查、用 `reload`、`authorized_keys` 里放一个备用公钥。**

### 离职人员处理流程

⚠️ **顺序很重要。**直接 `userdel` 会丢掉审计线索，也会让在跑的服务出问题。

```text
第 1 步（立刻）：禁用登录
    passwd -l 用户
    usermod -s /usr/sbin/nologin 用户     # 如果要彻底断

第 2 步（立刻）：回收特权
    gpasswd -d 用户 sudo
    gpasswd -d 用户 docker
    sudo -l -U 用户                       # 回收 sudoers 里的显式条目
    sudo -l                               # 确认没有任何用户特定的 sudo 规则

第 3 步（立刻）：杀进程
    ps -u 用户
    sudo pkill -u 用户

第 4 步（立刻）：转移文件所有权
    find /项目目录 -uid 旧UID -exec chown root:root {} +
    find /home/用户 -uid 旧UID -exec chown root:root {} +

第 5 步（30 天后）：删账号
    sudo userdel 用户                     # 保留家目录做审计
    # 确认无审计需求后：
    sudo userdel -r 用户
```

⚠️ **第 4 步最容易漏。**用户留下的文件属主是一个已不存在的 UID，新来的用户拿到这个 UID 就会继承访问权（见 11.2）。

⚠️ **第 2 步里的 `sudo -l -U 用户` 是独立的一步。**用户可能不在 `sudo` 组，但在 `/etc/sudoers.d/` 里有以名字命名的规则文件——**移出组不影响这些**。

```bash
$ sudo -l -U liu
User liu is not allowed to run sudo on host.
```

⚠️ 还要检查 `/etc/sudoers.d/` 里有没有以他名字命名的文件。

### 定期审计

```bash
$ sudo awk -F: '$3 == 0 {print $1}' /etc/passwd          # 所有 UID 0 的账号
$ sudo awk -F: '$3 >= 1000 {print $1, $3}' /etc/passwd   # 所有人类账号
$ getent group sudo                                       # 谁在 sudo 组
$ sudo ls -l /etc/sudoers.d/                              # 逐个文件里的人名规则
$ sudo find / -xdev -nouser 2>/dev/null                   # 孤儿文件
$ sudo grep -l 'NOPASSWD' /etc/sudoers /etc/sudoers.d/*   # 免密规则
```

⚠️ **第一个命令的输出必须只有 `root`。**出现第二个 UID 0 就是严重问题。

---

## 11.12 本章小结

| 主题 | 关键点 |
|---|---|
| 三件套 | `passwd` 644 七列、`shadow` 640 root:shadow 九列、`group` 644 四列；哈希前缀 `$y$` `$6$` `$1$`；`!` 锁定、`*` 不能密码登录 |
| 查询 | ⚠️ 用 `getent` 不用 `grep`——LDAP/NIS/动态用户只有 getent 查得到 |
| UID | 0=root、1–999 系统、1000–60000 人类、65534 nobody；⚠️ 改 UID 不会带走文件属主，要 `find -uid -exec chown` 且改家目录本身 |
| UID 复用 | 删账号后 UID 可能被回收给新人，新人继承旧人文件权限 → 先改名占坑 |
| NFS | 跨机同一用户必须同 UID，批量建号要显式 `-u` |
| `useradd -m` | **不加就没有家目录**；`useradd` 与 `adduser` 默认值不同；`/etc/skel` 里别放密钥 |
| `usermod -aG` | ⚠️ **漏 `-a` 会清空用户所有其他补充组** |
| `newgrp` | 只改当前会话主组，不改记录；root 上下文里用完要确认 `id` |
| 批量建号 | `chpasswd` 读 `用户:密码`；⚠️ 密码文件 `chmod 600` + 用完 `shred -u`；`chage -d 0` 强制首登改密；`passwd --stdin` 已移除 |
| 孤儿文件 | `userdel` 不删家目录；`find /home -nouser`；⚠️ 别把 `-nouser` 直接喂 `rm -rf` |
| 删人 | ⚠️ 进程还在（`pkill -u`，⚠️ 会杀 tmux）；注销后进程活着是因为 nohup/setsid/tmux/cron 脱离了终端 |
| 服务账号 | `-r -s /usr/sbin/nologin -d /var/lib/x`；⚠️ **`-d` 不建目录**，要自己 `install -d`；⚠️ **`nologin` 只挡交互登录，`sudo -u` 照样能跑、root 能 `su -s` 绕过**——真正的边界是文件权限和 systemd 沙箱 |
| 时间 | 时区≠同步；⚠️ **21.04 起默认是 `systemd-timesyncd`，chrony 要自己装**；`chronyc tracking` 看 `System time` 和 `Leap status` |
| 时间不准的后果 | ⚠️ TLS 证书、apt `Valid-Until`、Kerberos（>5 分钟失败）、日志顺序、DB 事务、cron |
| 容器时间 | 共享宿主内核时钟，⚠️ 改不了；`TZ` 只影响显示 |
| 主机名 | ⚠️ 改完要同步 `/etc/hosts` 的 `127.0.1.1` 那行，否则 sudo 报警；⚠️ 不要删那行 |
| 云主机 | 主机名由平台管，手动改会被重置；⚠️ 不要动 `169.254.169.254` 的解析；不要在 hosts 里劫持他人域名 |
| locale | 优先级 `LC_ALL` > `LC_XXX` > `LANG`；⚠️ **`LC_ALL` 覆盖全部**，改 `sort` 顺序、`ls` 对齐、`date` 格式、浮点格式 |
| 脚本 | ⚠️ **永远 `export LC_ALL=C`**；locale 不存在会报 `cannot change locale`；最小镜像只有 `C.utf8`，需 `locale-gen` |
| 密码策略 | `chage -M -m -W -E -I -d 0`；⚠️ `-M 99999`（永不过期）是合规不符合项 |
| PAM | `/etc/pam.d/`；`pwquality.conf` 的 `minlen/minclass/usercheck`；⚠️ 改 PAM 前必须备份 + 保留已登录 root 会话 |
| 弱哈希 | ⚠️ `pwconv` 是**把哈希从 passwd 迁到 shadow**并重算，**绝不反向写进 passwd**；先 `pwconv -r` 演练 |
| 登录锁定 | ⚠️ **`faillock` 在 24.04 上不是默认启用的**（`pam_faillock` 默认注释），先用 `grep pam_faillock /etc/pam.d/common-auth` 确认；锁定按 tty 判定 |
| 禁登录 | ⚠️ `passwd -l` **不阻止密钥登录**；要彻底断再加 `usermod -s nologin` |
| SSH 加固 | ⚠️ 顺序：保留会话 → 验证密钥 → `sshd -t` → `systemctl reload`（不是 restart）→ 最后才关旧会话；改前放备用公钥 |
| 离职 | 禁用 → 回收特权（含 `sudo -l -U` 和 sudoers.d 里的人名文件）→ 杀进程 → **`find -uid chown` 转移文件** → 30 天后才删 |

---

## 11.13 动手实验：创建一个受限运维账号并验证它拿不到 root

### 目标

1. 创建一个普通的运维账号，确认它没有 root 权限；
2. 用 `visudo` 的 drop-in 方式给它**一条**白名单命令；
3. 验证它只能执行那一条命令，其他一切都被拒；
4. 验证即使拿到白名单里的命令，也无法借此提权到 root；
5. 理解 `sudo -l` 的含义，知道自己的权限边界在哪；
6. 用 `nologin` 服务账号验证"nologin 不是安全边界"。

### 步骤

> ⚠️ 本实验会修改 `/etc/sudoers.d/`。**请保持一个已登录的 root 会话不要关闭**，另开一个终端做验证，出问题随时能改回来。
>
> ⚠️ 用一个你敢折腾的账号做实验对象，不要拿生产管理员账号试。

**0. 先确定白名单里用哪个服务**

白名单要写死一条具体命令，所以**这条命令必须在你这台机器上真的能跑**。本实验统一用 `cron`（cron 计划任务守护进程），因为它是 Ubuntu 的常驻服务、体积小、重启无副作用：

```bash
$ systemctl list-unit-files 'cron*'
```

```console
cron.service    enabled
```

如果你的机器上没有（精简容器里可能没有），装上它：

```bash
$ sudo apt install cron
$ systemctl is-enabled cron
```

⚠️ **不要用 `nginx` 做这个实验。**第 10 章的实验结尾把它彻底卸载了，而白名单里放一个不存在的命令，测出来的"成功/失败"都没有意义。如果你想换成别的服务，**必须把后面所有 `restart cron`、`systemctl status cron`、sudoers 规则、预期输出一起改掉**——漏改一处，实验结论就废了。

先记下这个服务名，后面统一用 `cron`。

**1. 确认起点：新建账号没有任何特权**

```bash
$ sudo useradd -m -s /bin/bash -c "Ops User" opsdemo
```

```bash
$ id opsdemo
```

```console
uid=1002(opsdemo) gid=1002(opsdemo) groups=1002(opsdemo)
```

⚠️ `groups` 里**只有它自己**，没有 `sudo`。这就是"零特权"的起点。UID/GID 的具体数字取决于你机器上已有多少账号，不必和这里一致。

```bash
$ getent passwd opsdemo
```

```console
opsdemo:x:1002:1002:Ops User:/home/opsdemo:/bin/bash
```

```bash
$ ls -la /home/opsdemo/
```

```console
total 20
drwxr-x--- 3 opsdemo opsdemo 4096 Mar 13 15:10 .
drwxr-xr-x 25 root   root   4096 Mar 13 14:02 ..
-rw-r--r-- 1 opsdemo opsdemo  125 Mar 13 15:10 .bash_logout
-rw-r--r-- 1 opsdemo opsdemo 3771 Mar 13 15:10 .bashrc
-rw-r--r-- 1 opsdemo opsdemo  501 Mar 13 15:10 .profile
```

`-rw-r--r--` 加上 `drwxr-x---` 是正常的用户家目录：本人可写，同组可进入，其他人进不去。

**2. 切到该账号，确认它现在什么都做不了**

```bash
$ su - opsdemo
```

```bash
$ id
uid=1002(opsdemo) gid=1002(opsdemo) groups=1002(opsdemo)
```

```bash
$ sudo systemctl status cron
```

```console
opsdemo is not in the sudoers file.  This incident will be reported.
```

⚠️ 注意 "This incident will be reported"——失败尝试会记到日志里。这条记录本身就是发现暴力尝试的信号。

```bash
$ sudo -l
```

```console
Sorry, user opsdemo may not run sudo on this host.
```

**3. 先看清 `visudo` 的两种用法**

| 用法 | 命令 | 说明 |
|---|---|---|
| 直接编辑 `sudoers` | `sudo visudo` | ⚠️ 高危，改错整个 sudo 就废了 |
| 编辑 drop-in | `sudo visudo -f /etc/sudoers.d/50-opsdemo` | ⚠️ 推荐，改错了删掉文件就恢复了 |

⚠️ **drop-in 文件的命名规则**：文件名**不能包含 `.` 或 `~`**，且建议以数字开头（决定加载顺序）。Ubuntu 的 `/etc/sudoers` 里通常有一行：

```text
@includedir /etc/sudoers.d
```

确认这行在：

```bash
$ sudo grep includedir /etc/sudoers
@includedir /etc/sudoers.d
```

⚠️ **如果这行不存在（或者被注释了），你放在 `/etc/sudoers.d/` 的文件根本不会被读取。**这是"我配了 sudoers 但没生效"的常见原因。

**4. 创建白名单规则**

⚠️ **先用 `-f` 指定一个自己的文件检查语法，通过了才放进 `/etc/sudoers.d/`。**这是最安全的流程：

```bash
$ sudo visudo -f /tmp/50-opsdemo.test
```

在打开的编辑器里写：

```text
opsdemo ALL=(root) NOPASSWD: /usr/bin/systemctl restart cron
```

保存退出（`visudo` 会自动做语法检查，语法错它会拒绝保存）。

先手动验证一次语法：

```bash
$ sudo visudo -c -f /tmp/50-opsdemo.test
```

```console
/etc/sudoers.d/50-opsdemo.test: parsed OK
```

⚠️ **`parsed OK` 才算通过。**没有输出也代表通过，但显式看到这行更可靠。

装到正式位置：

```bash
$ sudo install -m 440 -o root -g root /tmp/50-opsdemo.test /etc/sudoers.d/50-opsdemo
```

```bash
$ sudo visudo -c
```

```console
/etc/sudoers: parsed OK
/etc/sudoers.d/50-opsdemo: parsed OK
```

⚠️ **权限必须是 `440 root:root`。**sudo 会拒绝加载属主或权限不对的 drop-in 文件，而且**报错经常被忽略**，导致"配了半天不生效"。

```bash
$ ls -l /etc/sudoers.d/
```

```console
-rw-r----- 1 root root  128 Mar 13 15:20 50-opsdemo
```

⚠️ 注意 `visudo` 创建的文件默认是 `440`，但如果你用 `cp` 或重定向创建，可能变成 `644` 或 `600`，sudo 就会跳过它。

**5. 回读规则：搞懂每个字段**

```bash
$ sudo cat /etc/sudoers.d/50-opsdemo
```

```text
opsdemo ALL=(root) NOPASSWD: /usr/bin/systemctl restart cron
```

| 字段 | 含义 |
|---|---|
| `opsdemo` | 用户名或 `#UID` |
| `ALL` | 主机（默认任意主机） |
| `(root)` | 可以切换到哪个身份 |
| `NOPASSWD:` | 免密码（⚠️ 只在极窄的白名单里用） |
| `/usr/bin/systemctl restart cron` | ⚠️ **必须写绝对路径 + 精确参数** |

⚠️ **为什么参数要写全？**这是本实验的核心。

```text
# 危险：这等于给了 root
opsdemo ALL=(root) NOPASSWD: /usr/bin/systemctl

# 更危险：还能创建任意服务单元，直接提权
opsdemo ALL=(root) NOPASSWD: /usr/bin/systemctl restart *

# 致命：shell 就是 root
opsdemo ALL=(root) NOPASSWD: /bin/bash
```

⚠️ 最阴险的一类是"看起来无害"的命令：

| 白名单里写 | 实际能干什么 |
|---|---|
| `/usr/bin/vim` | ⚠️ vim 里 `:w !/bin/sh` 直接拿到 root shell |
| `/usr/bin/find` | ⚠️ `find . -exec /bin/sh \;` |
| `/usr/bin/less` | ⚠️ `!command` |
| `/usr/bin/tar` | ⚠️ `tar --checkpoint-action=exec=sh` |
| `/usr/bin/apt-get` | ⚠️ 能装能删能改配置 |
| `/usr/bin/docker` | ⚠️ 等于 root（`-v /:/host`） |

⚠️ **白名单的原则：只允许"参数完全固定、没有解释器语义"的命令。**一旦命令能执行任意子命令，或者能编辑文件，它就是 root 的等价物。

**6. 回到 opsdemo 验证：白名单里那条能跑**

```bash
$ su - opsdemo
```

```bash
$ sudo -l
```

```console
Matching Defaults entries for opsdemo on host:
    env_reset, mail_badpass, secure_path=...

User opsdemo may run the following commands on host:
    (root) NOPASSWD: /usr/bin/systemctl restart cron
```

⚠️ **先读 `sudo -l` 的输出**，看清自己到底有什么权限，再去试。这一步很多教程会跳过，但它是最快的自查方式。

```bash
$ sudo -k
```

⚠️ `sudo -k` 让缓存的凭据立刻失效。下面这些测试才能真正验证"是否要密码"。

```bash
$ sudo systemctl restart cron
```

```console
Job for cron.service restarted.
```

⚠️ 这条命令跑了，**而且没有要密码**——因为 `NOPASSWD`。`restart` 对已经停止的服务也成立（会把它拉起来），所以输出里的"restarted"或"started"都算正常。

**7. 验证：白名单之外的一切都被拒**

```bash
$ sudo systemctl stop cron
```

```console
opsdemo is not allowed to run 'systemctl stop cron' as root on host.
```

⚠️ **注意报错文本**：它把你实际敲的完整命令回显出来了。`sudoers` 的匹配是**全字符串匹配**，`restart` 换成 `stop` 就不再匹配。

```bash
$ sudo systemctl restart ssh
```

```console
opsdemo is not allowed to run 'systemctl restart ssh' as root on host.
```

⚠️ 更危险的目标也一样被拒：

```bash
$ sudo cat /etc/shadow
```

```console
opsdemo is not allowed to run 'cat /etc/shadow' as root on host.
```

```bash
$ sudo bash
```

```console
opsdemo is not allowed to run 'bash' as root on host.
```

```bash
$ sudo -u root id
```

```console
opsdemo is not allowed to run '-u root id' as root on host.
```

**8. 验证：参数不能"追加"**

这一步很多人想不到：

```bash
$ sudo systemctl restart cron cron
```

```console
opsdemo is not allowed to run 'systemctl restart cron cron' as root on host.
```

⚠️ **加一个参数就不匹配了。**这正是"写全参数"的价值——它把权限锁死在一个具体动作上，而不是一类动作。

对比一下，如果规则写成 `/usr/bin/systemctl restart cron*`，那么上面这条命令就会**被允许**——而 `cron*` 能匹配到的东西比"重启 cron"多得多（比如 cron 的单元别名、以及你没想到的各种名字）。白名单的精确度就是安全性。

**9. 验证：拿不到 root shell（这是本实验的最终目标）**

```bash
$ sudo -l | grep -c 'ALL=(ALL)'
```

```console
0
```

```bash
$ sudo su -
```

```console
opsdemo is not allowed to run 'su -' as root on host.
```

```bash
$ sudo su root
```

```console
opsdemo is not allowed to run 'su root' as root on host.
```

```bash
$ sudo -i
```

```console
opsdemo is not allowed to run '-i' as root on host.
```

⚠️ `sudo -i`（模拟登录）被拒，说明**没有任何一条规则允许他变成 root 的完整登录环境**。

**10. 退出并确认最终状态**

```bash
$ exit
```

```bash
$ sudo -l -U opsdemo
```

```console
User opsdemo may run the following commands on host:
    (root) NOPASSWD: /usr/bin/systemctl restart cron
```

⚠️ **从 root 侧再查一次**，这是验收的正确姿势——不要只相信被测账号自己的说法。

```bash
$ sudo grep -r opsdemo /etc/sudoers.d/ /etc/sudoers
```

```console
/etc/sudoers.d/50-opsdemo:opsdemo ALL=(root) NOPASSWD: /usr/bin/systemctl restart cron
```

**11.（延伸）验证 `nologin` 不是安全边界**

创建一个服务账号：

```bash
$ sudo useradd -r -s /usr/sbin/nologin -d /var/lib/myapp -c "My App" myapp
$ sudo install -d -o myapp -g myapp -m 0750 /var/lib/myapp
```

⚠️ 第二行不是可选的：`useradd -d` 只改记录、不建目录。没有它，`ls -ld /var/lib/myapp` 必然失败。

```bash
$ getent passwd myapp
```

```console
myapp:x:995:995:My App:/var/lib/myapp:/usr/sbin/nologin
```

UID/GID 的数字**取决于你的机器**（`-r` 在 1–999 里挑空闲号），和这里不一致也正常。

```bash
$ id myapp
$ ls -ld /var/lib/myapp
```

```console
uid=995(myapp) gid=995(myapp) groups=995(myapp)
drwxr-x--- 2 myapp myapp 4096 Mar 13 15:30 /var/lib/myapp
```

⚠️ 注意 shadow 里的密码字段：

```bash
$ sudo getent shadow myapp
```

```console
myapp:!:20100:0:99999:7:::
```

`useradd` 不给密码时默认写 **`!`**，意思是"账号被锁定"——不能密码登录。`adduser --system` 写的是 `*`，意思是"这个账号压根不可能有密码"。**两者都挡密码认证，但语义不同**：`!` 后面还能跟哈希（锁住但保留），`*` 是彻底不可用。

验证交互式登录被拒绝：

```bash
$ su - myapp
```

```console
This account is currently not available.
```

⚠️ **`nologin` 挡住了这一条。**现在验证它挡不住什么。

⚠️ **注意这一步该在哪个终端做。**刚才你已经 `exit` 回了原账号，现在手上是一个**有 sudo 的普通账号**。`sudo -u` 不在 opsdemo 的白名单里，所以**不能**用 opsdemo 跑下面的命令——正确做法是**在 root 会话里直接跑**，因为任何特权主体都能绕过 `nologin`，这正是要证明的事实：

```bash
# 在 root 会话（或任何有 sudo 权限的账号下）
$ sudo -u myapp /usr/bin/id
```

```console
uid=995(myapp) gid=995(myapp) groups=995(myapp)
```

⚠️ **执行成功了。**`nologin` 完全没有阻止这件事——因为 `sudo -u` 直接切换身份并执行程序，**根本不看登录 shell**。连 `nologin` 里的那句提示语都不会打印。

⚠️ 这证明了一件事：**`nologin` 是防手滑的，不是安全边界。**真正限制这个账号的是文件权限：它只能读写 `/var/lib/myapp` 里属主是它的那些文件。

```bash
$ sudo -u myapp cat /etc/shadow
```

```console
cat: /etc/shadow: Permission denied
```

```bash
$ sudo -u myapp touch /etc/passwd-test
```

```console
touch: cannot touch '/etc/passwd-test': Permission denied
```

⚠️ 边界在这里，在内核的权限检查里，不在登录 shell 里。

再回到 opsdemo，**验证它的白名单没有因为这一步而扩大**：

```bash
$ su - opsdemo
$ sudo -u myapp /usr/bin/id
```

```console
opsdemo is not allowed to run '-u myapp /usr/bin/id' as root on host.
```

⚠️ 这条拒绝同样重要：它证明白名单是**精确匹配**的，`sudo -u` 不会因为"运维需要 sudo"而被顺带放行。

**12. 撤销**

⚠️ **先删规则，再删账号。**顺序反了会留下一个引用了不存在账号的规则（无害，但会一直报错）。

```bash
$ sudo rm -f /etc/sudoers.d/50-opsdemo
```

```bash
$ sudo visudo -c
```

```console
/etc/sudoers: parsed OK
```

```bash
$ sudo rm -f /tmp/50-opsdemo.test
```

⚠️ 先 `exit` 回原账号，后面两条 `userdel` 需要 sudo。

```bash
$ sudo userdel -r opsdemo
```

```bash
$ getent passwd opsdemo
```

```console
                       # 无输出 = 账号已删除
```

```bash
$ sudo userdel myapp
$ sudo rm -rf /var/lib/myapp
```

⚠️ ⚠️ **这里故意拆成两条，而且先 `userdel` 不带 `-r`。**因为 `/var/lib/myapp` 是我们用 `install -d` 手工建的数据目录，不是 `useradd -m` 建的家目录；`userdel -r` 对它是否生效取决于是不是记录的 home 路径。**拆开写、你亲手确认过目录内容之后再删**——这是删除数据目录唯一安全的姿势。

### 验证

| 检查项 | 期望结果 |
|---|---|
| `id opsdemo`（建号后） | `groups` 里只有 `opsdemo`，无 `sudo` |
| `su - opsdemo` 后 `sudo -l` | `Sorry, user opsdemo may not run sudo on this host.` |
| `visudo -c -f /tmp/50-opsdemo.test` | `parsed OK` |
| `ls -l /etc/sudoers.d/50-opsdemo` | `-rw-r----- 1 root root` |
| `sudo systemctl restart cron` | 成功，且不提示输密码 |
| `sudo systemctl stop cron` | `not allowed to run 'systemctl stop cron'` |
| `sudo systemctl restart ssh` | `not allowed` |
| `sudo systemctl restart cron cron` | `not allowed`（多一个参数即失效） |
| `sudo cat /etc/shadow` | `not allowed` |
| `sudo bash` / `sudo -i` / `sudo su -` | 全部 `not allowed` |
| `sudo -u myapp id`（在 root 会话） | ✅ 执行成功，`uid=<某个1–999的号>(myapp)`——nologin 挡不住 |
| opsdemo 执行 `sudo -u myapp id` | `not allowed`——白名单没被顺带放大 |
| `sudo -u myapp cat /etc/shadow` | `Permission denied`——真正的边界在文件权限 |
| `sudo -l -U opsdemo` | 只列出 `NOPASSWD: /usr/bin/systemctl restart cron` |
| 撤销后 `getent passwd opsdemo` | 无输出 |

### 思考

1. 规则里的 `(root)` 如果写成 `(ALL)`，`(ALL:ALL)`，或者干脆省略括号，分别意味着什么？在什么场景下需要给"切换身份"的权限？
2. 如果把 `NOPASSWD:` 去掉，opsdemo 每次都要输**自己的**密码。这个设计防的是哪一类攻击？它挡不住什么？
3. 假设你的运维团队需要能"重启任意服务"，你会怎么写规则才能在可控的前提下满足需求？（提示：想想别名和通配符的边界）
4. 步骤 11 里 root 会话执行 `sudo -u myapp /usr/bin/id` 成功了，但 opsdemo 执行同一条被拒。这两个结果分别说明了什么？为什么这条路径完全不受 `nologin` 影响？
5. 如果有人在 drop-in 里写了 `opsdemo ALL=(root) NOPASSWD: /usr/bin/systemctl restart cron`，但没有 `-l` 或 `-m` 参数选项，`visudo -c` 会报语法错误吗？如果不会，这个规则的实际后果是什么？
6. 这个实验全程用的是 `/etc/sudoers.d/` 的 drop-in 而不是直接改 `sudoers`。如果直接编辑 `/etc/sudoers` 时把最后一行写坏了，整台机器的 sudo 会怎样？你会怎么恢复？恢复的前提是什么？（提示：想想你还开着的那个会话）
7. 审计视角：如果一个普通用户突然申请"能重启某个服务"，你在给这条规则之前会问哪些问题？给完之后，你会怎么持续监控它的使用？

### 清理

```bash
$ sudo rm -f /etc/sudoers.d/50-opsdemo
$ sudo rm -f /tmp/50-opsdemo.test
$ sudo visudo -c
$ sudo userdel -r opsdemo
$ sudo userdel myapp
```

⚠️ 最后一条 ⚠️⚠️ **删目录前先确认里面没有你需要的东西**：

```bash
$ ls -la /var/lib/myapp
$ du -sh /var/lib/myapp
```

```bash
$ sudo rm -rf /var/lib/myapp
```

⚠️ **不要用通配符**：`sudo rm -rf /etc/sudoers.d/*` 会把所有 sudo 配置删掉，把所有有 sudo 权限的人锁死在外面。

---

## 11.14 自测题

### 一、简答

1. `/etc/passwd` 的七列分别是什么？为什么第 2 列现在固定是 `x` 而不是哈希？`/etc/shadow` 为什么是 `640 root:shadow` 而不是 `600`？
2. 为什么查用户信息要用 `getent passwd` 而不是 `grep /etc/passwd`？在什么场景下两者的结果会不同？
3. 你把 `liu` 的 UID 从 1001 改成了 2001，命令执行成功且没有报错。为什么他的文件现在 `ls -l` 显示不出属主名字？需要做哪两步才能修好？
4. `useradd` 和 `adduser` 在"是否默认创建家目录"上的差别是什么？为什么这会咬人？`/etc/skel` 里放错东西会造成什么后果？
5. `usermod -G sudo liu` 和 `usermod -aG sudo liu` 的区别是什么？后者为什么必须写 `-a`？改完之后 liu 已经登录的会话会生效吗？
6. `userdel liu` 之后，liu 的家目录为什么 `ls -l` 显示的是数字？他的进程还在跑吗？为什么？`nohup` 启动的进程为什么能在注销后存活？
7. 服务账号的 shell 设成 `/usr/sbin/nologin` 之后，`sudo -u myapp /usr/bin/id` 还能执行成功吗？这说明 `nologin` 到底防住了什么、没防住什么？真正限制这个账号的是什么？
8. 时区和时间同步是同一件事吗？Ubuntu 24.04 默认的 NTP 客户端是什么？`chronyc tracking` 输出里你最先看哪两个字段？
9. 改完主机名后 sudo 报 `unable to resolve host` 是怎么回事？为什么 `/etc/hosts` 里 `127.0.1.1` 那一行不能删？
10. `LC_ALL` 和 `LANG` 的关系是什么？为什么脚本里必须显式 `export LC_ALL=C`？设成一个不存在的 locale 会发生什么？

### 二、命令填空

1. 查用户 wang 的完整 passwd 记录（要支持 LDAP）：________
2. 查当前用户的 UID、全部组：________
3. 查某个 UID 反查用户名：________
4. 创建一个用户，家目录 `/data/home/zhang`，shell 是 bash，真实姓名写进 GECOS：________
5. 创建一个系统账号，不建家目录，shell 为 nologin：________
6. 把用户 liu 加入 docker 组（**不能影响他原有的其他组**）：________
7. 创建组 deployops 并把 liu 加进去（不覆盖原有成员）：________
8. 迁移用户家目录到 `/data/home/liu`：________
9. 找出 `/home` 下所有属主已不存在的目录：________
10. 杀掉某个用户的全部进程：________
11. 查看用户 liu 的密码有效期策略：________
12. 强制用户下次登录必须改密码：________
13. 查所有被锁定密码的账号（看 shadow 第 2 列以 `!` 开头的）：________
14. 查某个用户在 sudoers 里的全部权限（从 root 侧）：________

### 三、故障分析

**案例 1**

> 现象：运维同事执行了 `sudo usermod -G docker liu` 之后报告："我进不去服务器了，sudo 用不了。"
> 1. 这条命令对 liu 的组做了什么？
> 2. 为什么 liu 的 sudo 会失效？他的 sudo 权限来自哪里？
> 3. liu 已经登录的会话会立刻受影响吗？他需要做什么才能让改动生效？
> 4. 你怎么在不丢失其他组信息的前提下修复？（提示：先备份，再合并）
> 5. 这个错误在批量脚本里怎么避免？

**案例 2**

> 现象：某台 NFS 服务器上，用户 liu 的家目录挂在 `/mnt/share`。A 机器上的 liu（UID 1001）能正常读写，B 机器上的 liu（UID 1005）访问同一个目录时提示 `Permission denied`，但 `ls -ld /mnt/share` 显示权限是 `drwxrwxrwx`。
> 1. `drwxrwxrwx` 明明开放了所有权限，为什么 B 上的 liu 还是进不去？NFS 是怎么传权限的？
> 2. 目录权限位那一串里，NFS 服务端实际看的是哪部分？
> 3. 正确的修复方案是什么？批量脚本应该怎么改？
> 4. 如果 B 机器上的 liu 需要访问 A 机器上以 UID 1001 拥有的文件，还有别的办法吗？

**案例 3**

> 现象：某服务需要访问 `https://internal.example.com`，但 curl 报 `SSL certificate problem: certificate is not yet valid`。同事检查了证书有效期，证书是未来半年才到期。DNS 能解析，网络能 ping 通。
> 1. `not yet valid` 说明证书的有效期判断出了什么问题？这和证书本身"还没过期"矛盾吗？
> 2. 服务器时间不准会连锁影响哪些东西？至少说出四个。
> 3. 你按什么顺序排查？（给出至少四步命令）
> 4. 如果发现时钟偏差了，直接 `date -s` 改过来会有什么后续问题？

**案例 4**

> 现象：某同学按网上教程批量建了 20 个测试账号，脚本里用了 `useradd -m -u $(seq 2001 2020)`。三个月后他离职，这些账号被 `userdel -r` 删除。后来新入职的同学批量建号，脚本里同样用了 `seq 2001 2020`，结果他访问到了一个"应该没人能访问"的目录。
> 1. 发生了什么？内核层面是什么机制导致的？
> 2. 为什么 `userdel -r` 没能阻止这件事？
> 3. 正确的处理流程应该是什么？（至少四步，注意顺序）
> 4. 事后怎么审计才能发现"这个账号继承了不该有的权限"？

**案例 5**

> 现象：一台生产服务器上，运维用 `sudo visudo` 直接编辑 `/etc/sudoers`，编辑过程中编辑器异常退出，文件写坏了。此后所有用户执行 sudo 都报 `sudo: /etc/sudoers: syntax error`，包括 root。
> 1. 为什么连 root 也不能用 sudo 了？
> 2. 在编辑时保持一个已登录的 root 会话，为什么是这次事故能救回来的关键？
> 3. `visudo` 是怎么防止这种事的？它编辑的是原文件还是临时文件？
> 4. 除了"保持会话"，还有哪些做法能降低这类风险？（至少三个）
> 5. 如果机器已经断开无法登录，你还有哪些抢救途径？

### 四、综合实践

1. 写一份《新机器账号开通与权限分配规范》，要求：
   - **账号分类表**：至少四类（人类开发者、运维、服务账号、临时外部人员），每类列出 UID 范围、shell、家目录位置、初始组、是否需要密码、有效期策略
   - **开通检查清单**：至少 10 条，涵盖到 `useradd` 参数选择、`/etc/skel` 检查、密码策略、首次登录强制改密、UID 显式指定（并说明为什么）、`sudo -l` 验证
   - **权限授予规范**：如何决定用组授权还是 sudoers 授权；sudoers 规则的命名规范、权限位、drop-in 与直接编辑的取舍；至少列出六个"绝对不能写进白名单"的命令并说明每个的具体提权手法
   - **变更与回收流程**：从"人员入组/离职"两个方向各写一条流程，每条至少五步，包含 `passwd -l`、`usermod -s nologin`、`gpasswd -d`、`sudo -l -U`、杀进程、`find -uid -exec chown`、`userdel` 的正确顺序
   - **审计清单**：至少 8 条可执行的审计命令，每条写明"查什么、看到什么算正常、看到什么算异常"
   - **主机环境基线**：时区/时间同步/主机名/locale 四项各自的推荐配置和理由（每项至少写两句理由）
   - 附加要求：整份规范必须能在一台**没有外网**的新机器上执行；并明确写出一条"这份规范不覆盖什么"

2. 完成一次**完整的账号生命周期演练**（可在你自己的虚拟机上做），全程留下可复核证据：
   - **阶段 A（基线）**：记录机器当前的账号全景——UID 0 的账号列表、人类账号列表、各账号的补充组、`/etc/sudoers.d/` 里的全部文件和内容、`/home` 下的家目录列表（含属主数字）
   - **阶段 B（开通）**：创建一个运维账号，**先证明它没有任何特权**（记录 `sudo -l` 的报错原文），然后配置白名单，再**逐条测试**至少 8 个命令的正负两面（白名单内=成功、白名单外=拒绝、参数变体=拒绝、换身份=拒绝、拿 shell=拒绝），每条都记录实际输出。**必须包含至少一个"看起来无害但实际能提权"的命令测试**（如 `vim` 或 `find`），用来证明为什么不能放进白名单
   - **阶段 C（服务账号）**：创建一个服务账号，验证它的密码字段、`nologin` 的实际拦截效果、以及 `sudo -u` 能绕过 `nologin` 这个事实；然后把一个目录的属主设给它，验证它能写、验证它读不了 `/etc/shadow`
   - **阶段 D（回收）**：按正确顺序执行禁用 → 回收组 → 回收 sudoers → 杀进程 → 转移文件属主，每一步都用命令证明效果。**重点验证：`userdel` 之后家目录和文件属主变成了什么、`ps -u` 还能不能看到进程、重新建号会不会继承旧 UID**
   - **阶段 E（审计脚本）**：写一个**只读**的审计脚本，输出一份"账号风险报告"，至少包含：UID 0 的账号、密码字段为空或 `!` 开头的账号、home 不存在的账号、shell 非预期但可登录的账号、在 sudo 组和 sudoers 里同时出现的账号、有 `NOPASSWD` 的规则、`/home` 下的孤儿目录、`/etc/sudoers.d/` 里权限不对的文件。脚本必须支持"有问题时明确报出问题、没有问题时明确输出通过"，且**不修改任何东西**
   - **阶段 F（复盘）**：写一段说明——如果这台机器明天要交给别人接手，最容易出问题的是上面哪三项，为什么；以及你的方案里哪一步是不可逆的（备份要放在哪里）
   - 附加要求：所有删除操作前必须有一次显式 `ls` 或 `du` 并标 ⚠️；整个过程写成 `.md` 或 `.sh` 让人能复现

---

**下一章预告**：第 12 章《进程、作业与服务管理》——`ps aux` 里那个 `S`、`R`、`D`、`Z`、`T` 分别代表什么状态、`kill -9` 之后进程变成 `<defunct>` 是谁的责任、为什么 `kill -15` 才是正确姿势、Ctrl+C 到底发生了什么、后台任务 `&` 和 `nohup` 和 `setsid` 三者的区别、作业控制 `fg`/`bg`/`jobs` 怎么用，以及一段跑飞了的 shell 脚本要怎么在不影响别人的前提下安全停掉。

---

*本章完。*