# 第 3 章 终端、Shell 与命令基础

> **本章目标**：读完后你能——
> 1. 说清终端、tty、伪终端、shell 四者的分工，并能解释 `Ctrl+C` 到底是怎么传到你手上那个程序里的
> 2. 看到一条陌生的 Linux 命令，在十秒内猜出它的大致用途和参数形状
> 3. 用 `man` 查到任何一个命令或配置文件格式的权威文档，而不是去搜博客
> 4. 只用键盘完成文件操作，熟练使用 `Tab`、`Ctrl+R`、`Ctrl+A/E/W/U/K/L` 这几个键
> 5. 判断一个变量和通配符该不该加引号，以及加哪种引号，并能说出理由
> 6. 用退出码 `$?` 写出可靠的错误处理分支，而不是靠猜
>
> **前置知识**：第 2 章《安装 Ubuntu 24.04 LTS 与首次配置》
>
> **预计耗时**：60 分钟

你现在已经有一台装好的 Ubuntu 了。这一章是**全书使用频率最高的一章**，后面每一章都建立在它上面。

我不会在这里教你"怎么用命令行"——那种教程只会列出快捷键表，你背下来还是不会用。这一章要解决的是三件事：**你敲下的字符到底经过了什么**、**遇到不认识的东西去哪查**、**怎么用最少的按键表达最多的意图**。

---

## 3.1 终端、tty、伪终端、shell：四个不同的东西

大多数人初学时的困惑是"终端和 shell 有什么区别"。这个困惑会一直持续到你搞懂 `Ctrl+C` 的传递路径那一刻。所以我们从 `Ctrl+C` 开始倒推。

### 四个角色

| 名字 | 是什么 | 在哪 |
|---|---|---|
| **终端模拟器** | 一个**程序**，负责画窗口、渲染字体、处理按键 | gnome-terminal、Windows Terminal、tmux |
| **tty** | 内核里的**设备**，每个物理或虚拟控制台一个 | `/dev/tty1` ~ `/dev/tty6` |
| **伪终端（pty）** | 内核提供的**一对**伪设备，专门给"没有硬件的终端"用 | `/dev/pts/0`、`/dev/pts/1`… |
| **shell** | 一个**程序**，读你输入、解析、启动别的程序 | bash、zsh |

### 串起来看

你在图形窗口里敲 `ls`，实际发生的事：

```
你按 'l' 's' 回车
    ↓  键盘事件进到图形系统（X11 / Wayland）
    ↓  被正在运行的 gnome-terminal 窗口接收
    ↓  gnome-terminal 往 pty 的「主端」写入字节 'l','s','\n'
    ↓  ┌──────────── 内核缓冲区 ────────────┐
    │  主端 ←────── 字节流 ──────→ 从端   │
    └─────────────────────────────────────┘
    ↓  bash 的标准输入连的是从端，bash 读到了 'l','s','\n'
    ↓  bash 解析出命令名 ls，在 $PATH 里找到 /usr/bin/ls
    ↓  bash fork() 出子进程，exec() 成 /usr/bin/ls
    ↓  ls 执行完，退出码 0，退出
    ↓  bash 把自己要输出的提示符写进 pty 从端
    ↓  字节流到主端，gnome-terminal 渲染成你看到的字符
```

**关键点：bash 是运行在"从端"这一侧的，而它完全不知道背后有个图形窗口。** 对 bash 来说，屏幕就是一条双向字节管道。

### 为什么这解释了几个你遇到过的现象

**（1）为什么 `Ctrl+C` 能杀掉正在跑的程序？**

`Ctrl+C` 在终端里不是"字符"，它是一个特殊按键，终端驱动会把它翻译成：

1. 内核把信号 `SIGINT` 发给**当前 tty 的前台进程组**（process group）
2. bash 正在等 `ls`（或 `sleep`、`ping`），这个子进程属于前台进程组
3. 子进程收到 SIGINT，默认行为是终止
4. bash 察觉到子进程死了，重新打印提示符

**所以 `Ctrl+C` 杀的不是"终端"，是前台进程组。** 这解释了两个细节：

- 后台跑的程序不受 `Ctrl+C` 影响（第 12 章会展开）
- 一个程序如果屏蔽了 `SIGINT`，`Ctrl+C` 对它无效——很多服务程序就这么干

**（2）为什么 `Ctrl+C` 打在窗口标题上没反应？**

因为在图形窗口里，`Ctrl+C` 被终端模拟器自己截获了，发成 `SIGINT`；而切换到 tty2 后按 `Ctrl+C`，信号由内核直接发给那个 tty 的前台进程组。这两条路殊途同归。

**（3）为什么 SSH 登录后提示符里是 `pts/0` 而不是 `tty1`？**

因为 SSH 没有物理控制台。sshd 为每个连接创建一个 pty，你的 shell 挂在 `/dev/pts/0` 上：

```bash
$ tty
/dev/pts/0

$ echo $SSH_TTY
/dev/pts/0

$ tty
/dev/pts/1
```

`Ctrl+Alt+F2` 切 tty 是切不到 SSH 会话上的——那是物理控制台，不是 pty。

### tmux / screen 在这个模型里的位置

它们是**跑在 pty 中间的一层程序**。你敲的命令先到 tmux，tmux 把它转发给里面真正的 shell，同时自己维护一份屏幕状态。所以 tmux 能在网络断了之后恢复界面——因为那层字节流从来没断过，只是中间那个程序还活着。

第 17 章会专门讲 tmux 和 screen 的实际用法。

---

## 3.2 一次本地登录的完整流程

Ubuntu Server 开机后，按 `Ctrl+Alt+F2` 切到 tty2 输入用户名，会发生这一串事情：

```
内核启动
  ↓
systemd（PID 1）
  ↓  getty@.service → /sbin/agetty --login --name=tty2 tty2
agetty 打开 /dev/tty2，设置终端参数（波特率、行规程）
  ↓  显示 "Ubuntu 24.04 LTS web-01 tty2" + "login:"
  ↓  等待你输入用户名
读入用户名 "ubuntu"，启动 /bin/login
  ↓
login 通过 PAM 认证
  ↓  /etc/pam.d/login  决定问什么、怎么验证
  ↓  验证密码
  ↓  读 /etc/passwd 找到 uid=1000
  ↓  设置环境变量（HOME、USER、SHELL、PATH…）
  ↓  读 /etc/profile → /etc/bash.bashrc → ~/.profile → ~/.bashrc
  ↓  exec 用户指定的 shell（/bin/bash）
bash 启动
  ↓  打印 PS1 提示符
  ↓  读你的输入
```

你可以把这条链上的每一环都单独查证：

```bash
# 谁在守着 tty2
$ systemctl status getty@tty2
```

```console
● getty@tty2.service - Getty on tty2
     Loaded: loaded (/lib/systemd/system/getty@.service; enabled)
     Active: active (running) since Wed 2025-09-10 14:20:11 CST; 2 days ago
   Main PID: 812 (agetty)
```

```bash
# PAM 的调用者
$ ps -ef --forest | head -20
```

```bash
# 登录后会执行哪些配置文件
$ ls -la ~/.bashrc ~/.profile ~/.bash_profile /etc/profile /etc/bash.bashrc
```

**记住这条链的用途**：当你说"为什么我的 alias 不生效"或者"为什么改了 `/etc/profile.d/x.sh` 没反应"时，答案永远在这条链上——文件是否在这个链里、shell 是不是交互式的。

### SSH 登录的差异

```
sshd（PID 里的 sshd: ubuntu@pts/0）
  ↓  处理密钥/密码认证（sshd_config + PAM）
  ↓  创建 pty：/dev/pts/0
  ↓  设置环境（SSH_CONNECTION、SSH_TTY…）
  ↓  直接 exec 用户的 shell（不走 /bin/login）
```

**两条路径的差异有三个实际影响**：

| 影响 | 本地登录 | SSH 登录 |
|---|---|---|
| `tty` 命令输出 | `/dev/tty2` | `/dev/pts/0` |
| 是否走 `/etc/profile` | 是 | **否**（sshd 直接 exec shell） |
| `SSH_CONNECTION` 等变量 | 无 | 有 |

> **实践含义**：如果你在 `/etc/profile` 里加了 PATH 修改，SSH 登录的用户可能拿不到。写全局环境配置应该用 `/etc/environment` 或 `/etc/profile.d/*.sh`——后者 SSH 登录的 bash 也会读（因为 Ubuntu 的 `~/.profile` 会被 `.bashrc` 的逻辑或 bash 的非登录 shell 路径覆盖，实际情况要实测）。**不确定就两个都写，或者干脆写进 `~/.bashrc`**，这是最省心的做法。

---

## 3.3 提示符：每一段都有用

Ubuntu 的默认提示符：

```
ubuntu@web-01:~/docs$
└─1─┘└─2─┘└3┘└─4─┘└5┘
```

| 编号 | 内容 | 含义 |
|---|---|---|
| 1 | `ubuntu` | 当前用户名（`\u`） |
| 2 | `web-01` | 主机名（`\h`，只取短名） |
| 3 | `:` | 分隔符，纯装饰 |
| 4 | `~/docs` | 当前工作目录（`\w`，家目录显示为 `~`） |
| 5 | `$` | `#` 表示 root，`$` 表示普通用户（`\$`） |

**这不是装饰，每一个都是排障信息。** 最有用的是第 4 段：

- 显示 `~` 说明你在家目录，路径短，说明改动范围可控
- 显示一长串 `/var/lib/docker/overlay2/xxx/diff` 说明你在某个深层路径，这里面的文件可能是**别的程序生成的**，随手删会出事

### 自己改提示符

```bash
$ echo "$PS1"
\[\e]0;\u@\h: \w\a\]${debian_chroot:+($debian_chroot)}\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$
```

看不懂没关系，把它加长一点你就看懂了：

```bash
$ PS1='[\u \h \w]\$ '
```

```console
[ubuntu web-01 ~/docs]$
```

常用的转义序列：

| 序列 | 含义 |
|---|---|
| `\u` | 用户名 |
| `\h` | 主机名（短） |
| `\H` | 主机名（完整，含域名） |
| `\w` | 当前目录完整路径 |
| `\W` | 当前目录**基名**（`~/docs` 而不是完整路径） |
| `\t` | 时间 HH:MM:SS |
| `\T` | 时间 HH:MM |
| `\$` | `$` 或 `#`（按用户身份） |
| `\n` | 换行 |

**让提示符显示上一条命令的退出码**——这是最实用的一个定制，第 21 章写脚本时会一直用到：

```bash
$ PS1='[\u@\h \W]\$ '
```

改成：

```bash
# 临时试
$ export PS1='\[\e[32m\]`[exit:$?]`\w\[\e[0m\]\$ '
```

让目录路径带颜色的版本（把这个加到 `~/.bashrc` 永久生效）：

```bash
# .bashrc 追加
export PS1='\[\e[1;32m\][\u@\h] \[\e[1;34m\]\w\[\e[0m\]\$ '
```

> **一个实用细节**：`PS1` 里必须有 `\[` 和 `\]` 包住颜色转义序列，否则 bash 计算提示符长度时会把不可见的转义字符算成可见宽度，**光标就会错位**——表现是敲完命令后光标跳到奇怪的位置。这个坑只有自己动手改过一次提示符才会遇到。

---

## 3.4 命令的三段式结构

几乎所有 Linux 命令都是这个形状：

```
命令  [选项]  [参数]
 ↓       ↓        ↓
做什么  怎么做   对谁做
```

```bash
$ ls -lah /etc
     ─┬─  ─┬─  └┬┘
     ls   选项  参数
```

### 短选项与长选项

```bash
$ ls -l /etc      # 短选项：单个字母，前面一个短横
$ ls --all /etc   # 长选项：完整单词，前面两个短横
```

**两条实用规则**：

**（1）短选项可以合并**

```bash
$ ls -l -a -h
$ ls -lah        # 等价，写起来快
```

**（2）长选项不能用 `--` 合并**

```bash
$ ls -la --all --human-readable    # 对
$ ls --la --all                    # 错
```

### `--` 的作用：结束选项解析

当参数本身以 `-` 开头时，命令会把它当成选项。用 `--` 告诉命令"后面的都是参数"：

```bash
$ touch -- -weird-file-name
```

这就是为什么第 5 章会告诉你 `rm -rf -- --dangerous-dir` 是个值得养成的小习惯。

### 选项的位置

GNU 工具（`ls`、`cp`、`grep` 等）允许选项出现在参数**后面**：

```bash
$ ls /etc -lah        # 对 GNU 工具有效
```

但 POSIX 严格规定选项必须在参数前。所以**写脚本时把选项放在参数前面**，兼容性最好。

### 一个例外：选项的值

有些选项要跟值，格式有两种：

```bash
$ ls --block-size=1K /etc      # 等号形式（长选项）
$ ls -s 1K /etc               # 分离形式（短选项）
$ du --max-depth=1 /var       # 长选项带值
```

### 快速判断一个陌生命令

不用查文档，先从命令名本身猜：

| 命名习惯 | 含义 | 例子 |
|---|---|---|
| `ls` / `cat` / `cp` / `mv` / `rm` | 无扩展名，最基础的操作 | `ps` `df` `chmod` |
| `xxxctl` | 控制类 | `systemctl` `journalctl` `loginctl` |
| `xxx` + `-d` | **daemon**，后台常驻服务 | `sshd` `cron` `systemd-journald` |
| `get`/`set`/`list`/`show` | 子命令式 | `systemctl get-default` |
| 四个字母、无分隔 | 早期 Unix 工具，缩写 | `awk` `grep` `sed` `find` `chmod` |

---

## 3.5 查文档：`--help` 与 `man`

这是本章要你形成的最重要的习惯。

### 三条路径，按速度选

```bash
# 最快：选项列表（可能不全，但够用）
$ ls --help

# 标准：完整手册页
$ man ls

# 忘了命令名？按关键词反查
$ man -k mount      # 等价于 apropos mount
$ apropos "resize disk"

# 只看一行摘要
$ whatis ls
```

### `man` 怎么用

打开后按 `/` 搜索，按 `n` 下一个，`N` 上一个，按 `q` 退出：

```bash
$ man ls
```

```console
LS(1)                          User Commands                          LS(1)

NAME
       ls - list directory contents

SYNOPSIS
       ls [OPTION]... [FILE]...

DESCRIPTION
       List information about the FILEs (the current directory by default).
       Sort entries alphabetically if none of -cftuvSUX nor --sort is
       specified.

OPTIONS
       -a, --all
              do not ignore entries starting with .
       ...
```

**这一页的排版是固定的三段结构**：`NAME` 是什么、`SYNOPSIS` 怎么用、`OPTIONS` / `DESCRIPTION` 细节。看到 `SYNOPSIS` 里方括号 `[...]` 表示可选、大写字母表示参数占位。

`man` 默认用 `less` 分页，所以下面这些键可用：

| 键 | 作用 |
|---|---|
| 空格 / `f` | 下一页 |
| `b` | 上一页 |
| `/关键词` | 向下搜索 |
| `?关键词` | 向上搜索 |
| `n` / `N` | 下一个/上一个匹配 |
| `g` / `G` | 文件开头/结尾 |
| `q` | 退出 |

### 配置文件也有 man 页

这是很多人不知道的。系统的配置文件格式有专门的 man 手册：

```bash
$ man 5 fstab      # 第 5 节 = 文件格式
$ man 5 crontab
$ man 5 passwd
$ man 5 resolv.conf
$ man 7 ioctl      # 第 7 节 = 杂项/底层接口
```

所以当你不知道 `/etc/fstab` 第五列填什么时，正确的第一步是 `man 5 fstab`，不是搜博客。

---

## 3.6 man 的分节：为什么有 8 个"节"

man 手册按类别分节，命令名冲突时用 `man 1 passwd` 指定节号：

| 节 | 类别 | 例子 |
|---|---|---|
| **1** | 用户命令 | `man 1 ls`、`man 1 bash` |
| **2** | 系统调用（内核提供的） | `man 2 open`、`man 2 socket` |
| **3** | 库函数（C 标准库） | `man 3 printf`、`man 3 malloc` |
| **4** | 设备文件和特殊文件 | `man 4 random`、`man 4 tty` |
| **5** | **文件格式和配置** | `man 5 fstab`、`man 5 passwd` |
| 6 | 游戏 | 基本不用 |
| 7 | 杂项（宏包、内核接口） | `man 7 signal`、`man 7 regex` |
| **8** | **系统管理命令** | `man 8 useradd`、`man 8 sshd` |
| 9 | 内核管理命令 | `man 9 msync` |

**记住 1 / 5 / 8 三个就够用了**：1 是你敲的命令，5 是配置文件格式，8 是 root 用的管理命令。

⚠️ **注意 `passwd` 的两种含义**：

```bash
$ man 1 passwd    # 改密码的命令
$ man 5 passwd    # /etc/passwd 的文件格式
```

`useradd` 也有两个身份：`man 8 useradd` 是管理命令本身，`man 5 useradd` 讲的是 `/etc/passwd` 里那行数据的格式约定。

```bash
$ man 8 useradd
$ man 5 useradd
```

第 11 章会用到这两个的区别。

---

## 3.7 键盘：把鼠标丢掉

从这一节开始，你要能在**完全不碰鼠标**的情况下完成文件操作。这不是耍酷——服务器上没有鼠标，图形界面崩了的时候也没得选。

### 必须会的那几个

| 键 | 作用 | 场景 |
|---|---|---|
| `Tab` | 补全 | 敲一半命令，按一次补全 |
| `↑` / `↓` | 翻历史命令 | 执行过的命令重新调出来 |
| `Ctrl+R` | 反向搜索历史 | **最好用的键**，记住命令里几个字就能找到 |
| `Ctrl+A` | 光标到行首 | 和 `Ctrl+E` 配合改命令 |
| `Ctrl+E` | 光标到行尾 | 同上 |
| `Ctrl+W` | 删前一个词 | 打完长命令打错了要删一段 |
| `Ctrl+U` | 删到行首 | `Ctrl+A` 之后接它 = 清空整行 |
| `Ctrl+K` | 删到行尾 | |
| `Ctrl+L` | 清屏 | 等同 `clear`，但不动命令 |
| `Ctrl+C` | 中断前台程序 | |
| `Ctrl+D` | 结束输入 / 退出 | 在空行上按 = 退出 shell |
| `Ctrl+Z` | 挂起当前程序 | 回到 shell 但程序还活着 |

### `Ctrl+R`：历史搜索的正确用法

不要用 `↑` 一直翻。正确做法是敲几个记得的字，然后 `Ctrl+R`：

```bash
$ Ctrl+R
(reverse-i-search)`': systemctl sta
```

```console
(reverse-i-search)`': systemctl status nginx
(reverse-i-search)`': systemctl start nginx
```

再按一次 `Ctrl+R` 找上一个匹配，`Enter` 接受，`Ctrl+G` 取消。

> **注意**：搜到的是**整行历史命令**，不是单词。所以 `Ctrl+R` + 空格是常用技巧——加一个空格能匹配更多。

### 查看和修改终端按键绑定

```bash
# 列出当前所有绑定
$ bind -p

# 改一个绑定（当前会话有效）
$ bind '"\e[15~": backward-kill-word'
```

查看终端本身的设置：

```bash
$ stty -a
```

```console
speed 38400 baud; rows 24; columns 80; line = 0;
intr = ^C; susp = ^Z; erase = ^?; kill = ^U; eof = ^D;
```

### 那个经典的"终端死了"

如果屏幕完全没反应，敲什么都不出字，**先试 `Ctrl+Q`**。

**原因**：终端的流量控制（XON/XOFF）。有些程序或某些意外会让终端进入"暂停输出"状态，`Ctrl+S` 是暂停键，`Ctrl+Q` 是恢复键。误按 `Ctrl+S` 之后终端看起来就死了。

**排查顺序**：`Ctrl+Q` → `Ctrl+C` → `Ctrl+Z` → 换窗口。

---

## 3.8 通配符与引号

这一节是本书最容易被低估、但实际最容易让人栽跟头的地方。

### 先说清楚一件事：通配符是 shell 干的，不是命令干的

```bash
$ echo *.txt
```

你敲下 `echo *.txt` 时，**shell 先把 `*.txt` 展开成实际的文件名**，然后才把结果交给 `echo`：

```bash
$ echo *.txt
a.txt b.txt c.txt
```

`echo` 根本不知道通配符的存在。如果把同样的星号交给一个不经过 shell 的程序（比如 `find` 自己内部），它会当字面量处理。

### 通配符表

| 符号 | 含义 | 例 |
|---|---|---|
| `*` | 任意长度的任意字符（含空） | `*.txt`、`a*`、`*log*` |
| `?` | **恰好一个**字符 | `file?.txt` |
| `[abc]` | 括号内任一字符 | `file[123].txt` |
| `[a-z]` | 范围 | `file[0-9].log` |
| `[!abc]` / `[^abc]` | 取反（bash） | `file[!0-9].txt` |
| `{a,b}` | 枚举（brace expansion） | `{a,b}.txt`、`file{1..10}` |

**`?` 只匹配一个字符**，这个区别经常考：

```bash
$ ls file?.txt     # 只匹配 file1.txt、fileA.txt
$ ls file*.txt     # 匹配 file.txt、file123.txt、file_long_name.txt
```

⚠️ **一个必须知道的通配符陷阱**：

```bash
$ rm -rf /var/lib/*
```

这条命令会删掉 `/var/lib` 下**所有文件**，包括那些名字里不带通配符字符的。通配符由 shell 在执行前就展开了，程序收到的是一长串明确的文件名——**它没有"通配"这个概念，也就没有任何机会提醒你**。

执行任何带通配符的 `rm` 之前，先把命令的 `rm` 换成 `echo` 或 `ls -d` 跑一遍看会命中什么。

### 引号的三种状态

这是本节的核心。规则只有三条：

| 写法 | 变量展开 | 通配符 | 分词 |
|---|---|---|---|
| 无引号 `abc` | ✅ | ✅ | ✅ |
| 单引号 `'abc'` | ❌ | ❌ | ❌ |
| 双引号 `"abc"` | ✅ | ❌ | ❌ |

**默认加双引号**，这是最不容易出错的习惯。

### 实战：为什么必须加引号

**（1）变量里有空格**

```bash
$ FILE="my document.txt"
$ wc -l $FILE          # 错！wc 收到两个参数
      wc: 'my': No such file or directory
$ wc -l "$FILE"        # 对
      42 my document.txt
```

**（2）通配符必须被保护**

```bash
$ find . -name *.txt        # 错！shell 先展开了 *.txt
$ find . -name "*.txt"      # 对！find 收到字面的 *.txt
```

这条错误极其常见。`find` 的 `-name` 参数**必须**加引号。

**（3）空变量**

这是一个区分单双引号价值的经典案例：

```bash
$ EMPTY=""
$ touch a $EMPTY b        # shell 分词后 → 两个参数
$ touch a "$EMPTY" b      # 保持一个空参数 → 三个参数
```

`$EMPTY` 未加引号时，shell 会做**分词**——因为它是空的，分词后整个词消失了。`"$EMPTY"` 里的双引号阻止了分词，所以它是一个空字符串参数。

**什么时候这很重要**：`bash` 脚本里 `cmd "$var"` 和 `cmd $var` 在 `var` 为空时会变成完全不同的参数个数，很多线上事故来自这里。

### 单引号 vs 双引号

**单引号比双引号更"强"，也更适合大多数场景**：

```bash
$ NAME='Tom'
$ echo "Hello, $NAME"      # Hello, Tom   （变量展开）
$ echo 'Hello, $NAME'      # Hello, $NAME （字面量）
$ echo "It's fine"         # 错！双引号里的 ' 没意义但不影响，但反之…
$ echo 'It'\''s fine'      # 单引号里要表示 ' 必须断开转义，很丑
```

**实用取舍**：

- **默认双引号**，因为绝大多数时候你需要变量展开
- **只在需要字面量 `$`、`*`、反引号时才用单引号**

比如在 `awk`、`sed`、`find` 里：

```bash
$ awk '{print $1}'      # 单引号：awk 要看到字面的 $1
$ sed 's/a/b/g'          # 单引号：$ 可能会出现
$ find . -name '*.log'   # 单引号或双引号都行
```

### 反斜杠转义

```bash
$ touch 'a b.txt'        # 推荐
$ touch a\ b.txt         # 等价，但可读性差
$ echo "cost: \$100"     # 双引号里转义 $ → 字面的 $
$ echo \$HOME            # 不用引号，用反斜杠
```

### bash 的完整展开顺序

这是理解引号的理论支撑。bash 在把一行输入变成参数列表时，按**这个固定顺序**做处理：

```
1. 花括号展开        {a,b} → a b
2. ~ 展开             ~ → /home/ubuntu
3. 变量展开           $VAR → 值
4. 命令替换           $(...) → 输出
5. 算术展开           $((1+2)) → 3
6. 分词               按 IFS 把结果切成多个词
7. 通配符展开         * → 匹配到的文件名
8. 去掉引号           ' " 只剩内容
```

**关键点：分词（6）在通配符（7）之前。** 这就是为什么变量里的空格会被切成多个参数——第 3 步展开了变量，第 6 步就把里面的空格当成分隔符了。**双引号的作用就是在第 6 步阻止分词。**

---

## 3.9 环境变量与 `$PATH`

### 变量长什么样

```bash
$ echo $HOME
/home/ubuntu

$ echo "PATH=$PATH"
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

$ printenv HOME USER SHELL
/home/ubuntu
ubuntu
/bin/bash

$ export MYVAR="hello"
$ echo $MYVAR
hello
```

**`export` 的作用**：让变量进入环境，被子进程继承。

```bash
$ MYVAR=hello        # 普通 shell 变量
$ bash -c 'echo $MYVAR'
```

```console
                                    # 空——子进程看不到
```

```bash
$ export MYVAR=hello
$ bash -c 'echo $MYVAR'
```

```console
hello                               # 子进程能看到
```

这个区别在第 20 章（Docker）和第 21 章（脚本）里会反复出现。

### `$PATH`：shell 怎么找到命令

你敲 `ls`，shell 怎么知道要执行 `/usr/bin/ls` 而不是别的？

它按 `$PATH` 里**从左到右**的顺序，每个目录试着找同名的可执行文件：

```
$PATH = /usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

依次尝试：
  /usr/local/sbin/ls   ？
  /usr/local/bin/ls    ？
  /usr/sbin/ls         ？
  /usr/bin/ls          ✓ 找到了，执行它
```

**顺序就是优先级。** 所以：

```bash
# 危险操作：把当前目录加进 PATH
$ export PATH=.:$PATH
```

之后你目录里一个叫 `ls` 的脚本就会盖掉系统的 `ls`。经典的事故场景：某次 `rm -rf` 打错了字母，把 `rm` 变成了同目录下你自己写的脚本。

**绝对不要往 `PATH` 里加 `.`**。

### 相关命令

```bash
# 看 PATH 有哪些目录，哪些不存在
$ echo $PATH | tr ':' '\n' | while read d; do
      [ -d "$d" ] && echo "OK      $d" || echo "MISSING $d"
  done
```

```console
OK      /usr/local/sbin
OK      /usr/local/bin
OK      /usr/sbin
OK      /usr/bin
OK      /sbin
OK      /bin
```

```bash
# 找出某个命令是哪个文件
$ type -a ls
ls is /usr/bin/ls
ls is aliased to `less'

$ which -a ls
/usr/bin/ls
/bin/ls
```

⚠️ **`which` 不可靠**：它只查 `$PATH`，不看别名、函数、shell 内建命令。用 `type -a`（bash 内建）更准。

```bash
# ls 到底是别名、函数还是程序？
$ type ls
```

```console
ls is aliased to `ls --color=auto'
```

看，Ubuntu 把 `ls` 做成了别名，加了颜色和 `-h`。**这解释了一个经典困惑**：你在脚本里写 `ls` 不会带颜色，因为别名只在交互式 shell 里生效。

### 缓存问题

bash 找到命令后会**记住**位置。如果你在 PATH 前面的目录里新建了一个叫 `mycmd` 的脚本，直接敲 `mycmd` 可能报 not found：

```bash
$ mycmd
bash: mycmd: command not found

$ hash -r     # 清除命令缓存
$ mycmd
```

### 永久修改环境变量

| 文件 | 何时加载 | 用途 |
|---|---|---|
| `/etc/environment` | 登录时，由 PAM 加载 | 最"干净"的全局环境设置 |
| `/etc/profile` | 登录 shell | 全局 shell 配置 |
| `/etc/profile.d/*.sh` | 登录 shell，被 `/etc/profile` 依次 source | **放全局配置的推荐位置** |
| `~/.profile` | 登录 shell，用户级 | |
| `~/.bashrc` | **交互式** shell，每个新窗口都读 | **放用户配置的推荐位置** |

**记住这个区别**：`~/.bashrc` 不在非交互式 shell 里生效，所以：

```bash
$ cat myscript.sh
export EDITOR=vim
echo $EDITOR
```

```console
                                     # 空！
```

```bash
$ bash -c 'source ~/.bashrc; echo $EDITOR'
```

```console
vim                                  # 这样才行
```

### PATH 的正确改法

```bash
# 错的：覆盖，可能丢系统 PATH
$ export PATH=/opt/mybins:$PATH          # 这个其实是对的

$ export PATH=/opt/mybins                # 这个是错的，会让 ls 都找不到

# 更好：把用户自己的 bin 放进系统已经搜索的目录
$ mkdir -p ~/.local/bin
$ mv myscript ~/.local/bin/
$ chmod +x ~/.local/bin/myscript
$ echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
```

Ubuntu 的 `~/.profile` 默认已经加了 `$HOME/.local/bin`，所以多数情况下你**什么都不用做**。

> **一个会让人抓狂的现象**：你在 `~/.bashrc` 里改了 PATH，然后新开的窗口里 `echo $PATH` 看到的还是旧的。原因通常是 `.bashrc` 开头有一段"非交互式 shell 就直接 return"的逻辑（第 3.2 节讲过），或者你在 `~/.bashrc` 里的修改被后面某行覆盖了。用 `bash -i` 强制交互式来测试。

---

## 3.10 退出码：`$?` 与命令链

**这一节是本章最重要的部分。** 你现在写不了可靠的自动化脚本，因为你没有判断"成功还是失败"的能力。`$?` 就是那个能力。

### `$?` 的含义

上一条命令的**退出状态**：0 表示成功，非 0 表示失败。

```bash
$ ls /etc
$ echo $?
0

$ ls /nonexistent
$ echo $?
2

$ sudo apt install 不存在的包
$ echo $?
100
```

### 有约定含义的退出码

不只是"非 0"，特定数字有通用含义：

| 码 | 含义 |
|---|---|
| **0** | 成功 |
| **1** | 通用错误（参数不合法、文件不存在等） |
| **2** | 用法错误（用法不对、选项无效） |
| **126** | 找到了，但无法执行（权限不足、不是可执行文件） |
| **127** | 命令或文件不存在 |
| **128 + N** | 被第 N 号信号杀死 |
| **130** | 被 SIGINT 杀死（`Ctrl+C`） |
| **137** | 被 SIGKILL 杀死（`kill -9`，也可能是 OOM） |

**用 `echo $?` 反推原因**是日常排障的常用手段：

```bash
$ ./myprogram
$ echo $?
```

```console
126                                 # 忘了 chmod +x
```

```bash
$ nonexistent-command
$ echo $?
```

```console
127                                 # 命令没打对，或者没在 PATH 里
```

第 12 章会展开信号与 128+N 的关系。

### 四种命令链

```bash
# ;  无条件顺序执行
$ cd /var/log ; ls

# &&  前一条成功才执行后一条
$ cd /var/log && ls

# ||  前一条失败才执行后一条
$ cd /nonexistent || echo "目录不存在，进入备用逻辑"

# |  管道：左边输出接到右边输入（和上面三个不是一类，见第 7 章）
$ cat /etc/hostname | tr a-z A-Z
```

**`&&` 是脚本里防错的基石**：

```bash
# 错的：不管前面成没成都往下走
$ sudo apt update ; sudo apt install nginx

# 对的：更新失败就别装
$ sudo apt update && sudo apt install nginx
```

⚠️ **`&&` 的陷阱**：`apt` 更新失败时它仍然会返回 0（部分情况下），所以这个保护并不完美。严谨的做法见下面的 `pipefail`。

### `&&` 的短路特性

```bash
$ false && echo "不会执行"
                                    # 无输出

$ true || echo "不会执行"
                                    # 无输出
```

`&&` 短路意味着：**如果前面条件已经能决定结果，后面的命令甚至不会被检查是否存在。** 这在写长条件链时很方便，但也会让人意外：

```bash
$ which nosuchcommand && sudo apt install nosuchcommand
                                    # 什么都没做——因为 which 失败了
```

### 管道与退出码的坑

```bash
$ false | true
$ echo $?
0
```

**`echo $?` 拿到的是右边命令 `true` 的退出码，左边 `false` 的失败被吞掉了。**

这是管道最常见的坑。解法是打开 `pipefail`：

```bash
$ set -o pipefail
$ false | true
$ echo $?
1
```

`pipefail` 的含义是：管道里**任何一环**失败，整个管道就算失败。

> **凡是写进脚本的管道，都要加 `set -o pipefail`。** 更完整的写法是 `set -euo pipefail`：
> - `-e`：任何命令失败就退出脚本
> - `-u`：引用未定义变量就退出
> - `-o pipefail`：管道中任一环失败就算失败
>
> 第 21 章会讲为什么 `set -e` 有一堆反直觉的陷阱。

### `set -e` 的一个反直觉行为

```bash
$ set -e
$ false
$ echo "这行不会执行"
```

看起来对。但如果 `false` 在条件里，`-e` 就不生效：

```bash
$ set -e
$ if false; then echo x; fi
$ echo "这行会执行"

$ false && echo x
$ echo "这行也会执行"      # false 是 && 左边，整个语句的退出码是 1
                           # 但 set -e 对 && || 左侧的命令不生效
```

**这是 `set -e` 最大的坑**，第 21 章会完整处理并给出正确写法。现在只要记住：**`set -e` 有帮助，但不要以为它能替代显式的错误判断。**

---

## 3.11 本章小结

1. **终端、tty、伪终端、shell 是四个不同的东西。** shell 跑在 pty 的从端，它只知道一条双向字节流。理解这一点，`Ctrl+C` 的传递路径自然就通了。
2. **`Ctrl+C` 杀的是前台进程组**，不是终端。这解释了后台进程为什么不受影响。
3. **SSH 登录不走 `/bin/login`**，所以 tty 是 `/dev/pts/N` 而不是 `/dev/ttyN`。
4. **提示符每一段都有用**，尤其是当前目录——它告诉你改动的影响范围。改 `PS1` 时别忘了用 `\[` `\]` 包住颜色序列，否则光标错位。
5. **命令形状是 `命令 [选项] [参数]`。** 短选项能合并（`-lah`），长选项不能；`--` 用来结束选项解析。
6. **`man 1` 看命令，`man 5` 看配置文件格式，`man 8` 看管理命令。** `man -k` 反查，`whatis` 看一行摘要。配置文件有 man 页是很多人不知道的事。
7. **`Ctrl+R` 是最好用的键**，比 `↑` 翻历史快得多。终端"死了"先试 `Ctrl+Q`。
8. **通配符是 shell 展开的，不是命令展开的。** `rm -rf /var/lib/*` 传给 `rm` 的是一长串明确文件名，它没有机会提醒你。
9. **默认加双引号。** 双引号阻止分词和通配但保留变量展开；单引号全阻止。最需要引号的三个场景：变量有空格、`find -name` 的模式、bash 脚本里的空变量。
10. **bash 的展开顺序是固定的**：花括号 → `~` → 变量 → 命令替换 → 算术 → **分词** → **通配** → 去引号。分词在通配之前，这就是变量里空格出问题的根因。
11. **不要往 `PATH` 里加 `.`**。改 PATH 要用追加式 `"$PATH:/new/dir"`。用 `type -a` 而非 `which` 查命令。
12. **退出码 `$?` 是脚本的分支能力。** `&&` 短路、`||` 兜底、`: ;` 无条件。**管道里要加 `set -o pipefail`**，否则左边的失败会被吞掉。

---

## 3.12 动手实验

### 实验 1：只用键盘，零鼠标

> 环境：Ubuntu 24.04 LTS 终端
> 耗时：约 15 分钟

### 目标

把键盘操作变成肌肉记忆，并亲眼验证 `Tab` 的三种行为。

### 步骤
**第 1 步：确认 `Tab` 补全的三种状态**

```bash
$ mkdir -p ~/tabtest && cd ~/tabtest
$ touch alpha.txt beta.txt alphabet.log gamma.conf
```

现在敲：

```bash
$ cat al<Tab>
```

**观察**：补全成 `alpha.txt`——**唯一匹配，直接补全**。

退格，改成：

```bash
$ cat alph<Tab>
```

**观察**：补全成 `alphabet.` 并停住，光标在最后一个字符后。**多个匹配时补全到公共前缀，需要你再按一次 `Tab`**。

再按一次 `Tab`：

```bash
$ cat alphabet<Tab>
```

**观察**：列出所有以 `alphabet` 开头的候选。第三种状态是**列出所有可能**。

**第 2 步：确认补全对路径也有效**

```bash
$ cd ~/tabte<Tab>       # 补全目录
$ ls /etc/ap<Tab>       # 补全路径
```

**第 3 步：用 `Ctrl+R` 而不是 `↑`**

```bash
$ Ctrl+R
(i-search)
```

依次输入 `cat` → `al` → `al`：

```console
(i-search)`cat al': cat alphabet.log
```

**观察**：回车前你可以继续编辑这条命令。`Ctrl+G` 取消搜索。

**第 4 步：编辑一条长命令**

```bash
$ Ctrl+R
# 找到之前那条长命令后：
# 1. Ctrl+A 跳到行首
# 2. Ctrl+U 清空（或者改 Ctrl+W 删词）
# 3. Ctrl+E 跳到行尾
# 4. Ctrl+W 删掉最后一个词
# 5. Ctrl+K 删到行尾
```

试一下这个组合：`Ctrl+A` → `Ctrl+U` 效果等同于清空整行。

**第 5 步：`Ctrl+D` 的两种用法**

```bash
$ cat > newfile.txt
hello
                              # 这里按 Ctrl+D 结束输入（cat 在等更多数据）
$ cat newfile.txt
hello
```

现在在**空行**上按 `Ctrl+D`，你会退出 shell：

```console
$ exit
```

重新登录后继续。

### 验证
```bash
# 确认当前终端的全部关键设置
$ stty -a | tr ';' '\n' | grep -E 'intr|susp|erase|kill|eof'
```

```console
intr = ^C
susp = ^Z
erase = ^?
kill = ^U
eof = ^D
```

### 思考
1. `kill = ^U` 是什么意思？在这个语境下 `kill` 是"杀掉进程"的意思吗？（提示：读 `stty` 的上下文）
2. 第 1 步三种状态里，哪一种对你来说最容易误操作？举一个真实的翻车场景。
3. 为什么 `Ctrl+D` 在 `cat > file` 里是"结束输入"，在空提示符上是"退出 shell"？两者本质是同一个机制吗？
4. 如果 `Ctrl+R` 搜到的是一条含密码的命令（`mysql -uroot -p'secret'`），按回车会发生什么？你的历史记录存在哪个文件里？该怎么处理？

### 清理
```bash
$ cd ~
$ rm -rf ~/tabtest
```

---

### 实验 2：引号、通配符、退出码的边界

> 环境：同上
> 耗时：约 20 分钟

### 目标

亲手撞一次引号的坑，并建立"用退出码判断成功"的习惯。

### 步骤
**第 1 步：变量里有空格（不加引号会坏）**

```bash
$ FILE="my report.txt"
$ touch $FILE                       # 敲完检查一下
$ ls -1 | grep report
```

**观察**：`ls -1` 里会看到 `my` 和 `report.txt` 两个文件——`touch` 收到了两个参数。

```bash
$ rm -f my report.txt
$ touch "$FILE"                     # 加双引号
$ ls -1 | grep report
```

```console
my report.txt
```

这次只有一个文件，名字里有空格。

**第 2 步：`find -name` 的引号**

```bash
$ mkdir -p sub && touch sub/x.txt
$ touch y.txt
```

```bash
$ find . -name *.txt        # 不加引号
```

**观察**：`find` 收到的模式已经被 shell 展开成了 `sub/x.txt y.txt` 两个词，于是它找的是"名字字面上叫 `sub/x.txt` 或 `y.txt` 的文件"——什么都找不到。

```bash
$ find . -name "*.txt"      # 加引号
```

```console
./sub/x.txt
./y.txt
```

**第 3 步：空变量的分词差异**

```bash
$ EMPTY=""
$ touch a $EMPTY b
$ ls -1 a* b
```

**观察**：只创建了 `a` 和 `b` 两个文件，空变量整个消失了。

```bash
$ touch a "$EMPTY" b
$ ls -1 a* b
```

**观察**：`b` 变成了 `a b`——因为 `$EMPTY` 作为独立的双引号参数保留了一个空字符串，`touch` 把 `a` 和空串拼成了一个文件名。

**第 4 步：通配符的破坏力（只看不删）**

```bash
$ mkdir -p danger && cd danger
$ touch keep.txt a1 a2 b1 c1
$ echo *
```

**观察**：输出里包含 `keep.txt`。所有文件都被 `*` 命中了。

> ⚠️ 这里 **不要真的执行** `rm -rf *`。养成习惯：任何带通配符的 `rm`，先把 `rm` 换成 `echo`。

**第 5 步：退出码**

```bash
$ ls /etc; echo "=$?"
0

$ ls /nonexistent 2>/dev/null; echo "=$?"
2

$ touch /tmp/xx && chmod 000 /tmp/xx
$ /tmp/xx; echo "=$?"
126

$ ./nosuchcommand
$ echo "=$?"
127
```

**第 6 步：`&&` 和 `||` 的短路**

```bash
$ false && echo "不会执行"
$ echo "第一条=$?"

$ true || echo "不会执行"
$ echo "第二条=$?"
```

**观察**：第一条的退出码是 1，第二条是 0。`&&`/`||` 整个语句的退出码取决于实际执行的那一侧。

**第 7 步：管道的退出码陷阱**

```bash
$ false | true
$ echo "无 pipefail =$?"

$ set -o pipefail
$ false | true
$ echo "有 pipefail =$?"
```

### 验证
```bash
# 一条命令看清当前 shell 的严格模式设置
$ set -o | grep -E 'errexit|nounset|pipefail'
```

```console
errexit      off
nounset      off
pipefail     off
```

### 思考
1. 第 1 步里 `ls -1 | grep report` 为什么会漏掉 `my report.txt`？（提示：`ls` 默认输出的对齐方式）换成 `ls -1` 加引号判断就可靠，为什么？
2. 第 2 步的不加引号版本，shell 把 `*.txt` 展开成了几个词？如果当时目录里只有一个 `.txt` 文件，这个 bug 还会暴露吗？
3. 第 5 步里 `126` 和 `127` 都表示"跑不起来"，但原因完全不同。分别是什么？
4. 第 7 步如果 `pipefail` 关闭，`ls /nonexistent | wc -l` 的退出码是多少？加上 `pipefail` 之后呢？这解释了为什么某些监控脚本"看起来正常"但其实一直在失败。

### 清理
```bash
$ cd ~
$ rm -rf ~/danger "$FILE" /tmp/xx
$ unset set   # 关掉 pipefail 恢复默认（或直接开新终端）
```

---

## 3.13 自测题

### 一、简答

1. 伪终端的"主端"和"从端"分别由谁持有？bash 挂在哪一端？这为什么能解释 SSH 会话的 tty 是 `/dev/pts/0`？
2. `Ctrl+C` 到达正在执行的 `sleep 100` 的完整路径是什么？用"进程组"这个词说清楚。
3. 登录时读配置文件的顺序是什么？SSH 登录和本地登录在这个顺序上有什么不同？这会导致什么实际后果？
4. 提示符里 `~` 和 `.` 的区别是什么？为什么这个区别在排障时很重要？
5. `man 1 passwd` 和 `man 5 passwd` 分别讲什么？为什么要分开？
6. `$PATH` 里的目录顺序意味着什么？往 `$PATH` 里加当前目录 `.` 会有什么具体风险？
7. bash 处理一行输入的展开顺序是什么？分词和通配符谁先谁后？这个顺序解释了什么常见故障？
8. 退出码 126 和 127 分别表示什么？各自最常见的原因是什么？

### 二、命令填空

1. 反向搜索历史命令：________
2. 清除 bash 的命令路径缓存：________
3. 查看 `ls` 到底是别名、函数还是程序：________
4. 查看终端的按键设置（intr / eof / kill 分别是什么）：________
5. 终端"没反应"时先试的键：________
6. 把一行命令传给 `find -name` 且不展开通配符，正确写法是 ________
7. 脚本中让管道里任何一环失败都算失败的选项：________
8. 查 `passwd` 命令的手册（不是文件格式）：________
9. 在 `$PATH` 前面加一个目录 `/opt/bin`，正确写法：________
10. 只用一条命令列出 `$PATH` 里**不存在**的目录：________

### 三、故障分析

**案例 1**

> 现象：你写了个脚本 `/opt/scripts/deploy.sh` 并 `chmod +x` 了。在终端里 `deploy.sh` 报 `command not found`，但 `./deploy.sh` 能正常跑。同目录下别的脚本 `build.sh` 用 `./build.sh` 调用没问题。
> 1. 为什么必须加 `./`？
> 2. 有三种修法（改脚本里的调用方式、改 PATH、在当前目录建软链）。哪种最好？为什么？
> 3. 有人提议在脚本里加 `export PATH=.:$PATH`。这个方案会带来什么风险？

**案例 2**

> 现象：一个定时任务脚本里有一段：
> ```bash
> cp /data/input.csv /data/output.csv && rm /data/input.csv
> ```
> 上游偶尔会因为磁盘满导致 `input.csv` 是 0 字节。某天发现 `output.csv` 变成 0 字节，且 `input.csv` 已被删除。
> 1. `cp` 在什么情况下会返回 0 却复制了 0 字节的内容？
> 2. 这个 bug 是 `&&` 造成的吗？如果不是，`&&` 在这里起了什么作用？
> 3. 把这段改写成能正确处理"输入文件无效"情况的版本。

**案例 3**

> 现象：你在 `~/.bashrc` 末尾加了一行 `export PATH="/opt/mytools:$PATH"`。在终端里 `echo $PATH` 看到的还是旧值。用 `bash -i -c 'echo $PATH'` 能看到新值。
> 1. 普通的 `bash -c` 和 `bash -i` 有什么不同？`~/.bashrc` 为什么在非交互式时不被加载？
> 2. 如果你想让所有场景都生效，这个配置应该放在哪三个位置？
> 3. 如果 `~/.bashrc` 里已经有 `$HOME/.local/bin` 的 PATH 设置，你的行应该加在它前面还是后面？为什么？

**案例 4**

> 现象：你写了个备份脚本：
> ```bash
> tar czf /backup/db.tar.gz /var/lib/postgresql && echo "备份完成：$(date)"
> ```
> 某天早上收到告警说备份文件 0 字节，但脚本明明打印了"备份完成"。
> 1. `echo` 那一行为什么会执行？`&&` 到底检查了什么？
> 2. 加上 `set -euo pipefail` 之后，这个脚本会正确报错吗？为什么 `tar` 写 0 字节还返回 0 这种情况 `set -e` 也救不了？
> 3. 这个脚本应该怎么改才能真正发现问题？

**案例 5**

> 现象：你执行了 `Ctrl+S` 之后终端完全没反应了，敲什么都没显示。换了个窗口就好了。
> 1. 这是什么机制导致的？
> 2. 恢复的快捷键是什么？
> 3. 哪些程序容易触发这个问题？（提示：想想老式的串口通信程序）

### 四、综合实践

1. 写一个脚本 `~/bin/safe-rm`，它是一个 `rm` 的安全包装，要求：
   - 不加引号直接敲 `safe-rm *` 时，必须先打印将要删除的完整文件列表，并要求用户输入 `yes` 才继续
   - 空参数时拒绝执行并给出用法提示
   - 拒绝以 `-` 开头的参数（即不接受选项）
   - 处理完退出码要能区分「用户取消」和「删除失败」
   - 用 `set -euo pipefail` 写，且通过 ShellCheck 检查
   - **额外要求**：脚本自己在任何情况下都不允许出现"删掉调用者所在目录"或"删掉 `/`"的可能。说明你怎么防的。

2. 你要给团队写一份《Shell 使用规范》，文档必须包含：
   - 变量引号规范：什么情况必须加双引号、什么情况用单引号，各给两个真实场景
   - 通配符安全规范：哪类命令前面必须先做 `echo` 预演，给出两条团队约定
   - 错误处理规范：什么时候用 `set -euo pipefail`、什么时候必须显式判断 `$?`、什么时候必须加 `pipefail`。**各说明原因**，不要只写规则
   - PATH 规范：允许往 `$PATH` 加什么、不允许加什么、用户私有工具的标准安装位置是哪个目录
   - 一份"新人最容易踩的五个坑"清单，每个坑写清楚现象、根因、正确写法
   - 至少两条"我们的团队不这么写，因为……"的团队特有规定，并说明理由

---

**下一章预告**：第 4 章《文件系统与目录结构》——你会发现 `/etc/fstab` 里那六个字段、发现 `/proc` 是内核开的窗口、发现为什么一个符号链接被删掉之后原文件还在，以及为什么你删掉 `/var/lib/docker/xxx` 会让整台机器的容器全挂。

---

*本章完。*