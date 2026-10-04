# 第 7 章 文本流：管道与重定向

> **本章目标**：读完后你能——
> 1. 说清文件描述符 0/1/2 是什么，并用 `ls -l /proc/self/fd` 亲眼看到重定向发生的那一刻
> 2. 正确写出 `>` `>>` `2>` `2>&1` `&>` 的各种组合，并能解释 `2>&1` 为什么不能写成 `&2>1`
> 3. 用 `sort | uniq -c | sort -rn` 出一份频次统计，并说清 `sort -u` 为什么能顶替 `sort | uniq`
> 4. 在脚本里用 `set -o pipefail` 把管道中被吞掉的失败捞出来
> 5. 用 `xargs -r` 把一批文件名安全地交给另一个命令，不被空格和空输入坑到
> 6. 理解管道是内核缓冲区而不是数据对象，能解释为什么 `find . | head` 会报 141
>
> **前置知识**：第 5 章《文件操作与归档压缩》
>
> **预计耗时**：70 分钟

你在 Windows 的 PowerShell 里可能写过 `Get-Content x.log | Select-String "error"`。到了 Linux 上，`|` 还在，但你马上会撞上两个 PowerShell 里不存在的坑。

第一个：`false | true` 在 Linux 里返回 **0**——管道左边失败了，你的脚本当成功过去了。第二个：`cmd > out.log 2>&1` 和 `cmd 2>&1 > out.log` 结果完全不同，可它们看起来只是顺序不同。

这两个坑背后是同一件事：**Linux 的命令不"传递对象"，它们传递的是字节流**。三条字节流（标准输入、标准输出、标准错误）每一刻都有明确的去向——终端、文件、管道、垃圾桶。谁往哪写，shell 靠三个整数就能表达清楚。本章就是把这三个整数讲透，然后你就不再需要背任何管道技巧了，因为所有技巧都是这一个概念的推论。

---

## 7.1 文件描述符 0 / 1 / 2

**文件描述符（file descriptor，fd）**是内核给进程的"已打开文件"的编号。进程要读写任何东西——终端、文件、管道、socket——都得先拿到一个 fd，然后调用 `read(fd, ...)` 或 `write(fd, ...)`。

进程启动时，内核固定给它三个：

| fd | 名字 | 默认指向 | 用途 |
|---|---|---|---|
| **0** | 标准输入 stdin | 键盘 / 伪终端 | 命令的**输入源** |
| **1** | 标准输出 stdout | 终端 | 命令的**正常结果** |
| **2** | 标准错误 stderr | 终端 | 命令的**诊断信息** |

Windows 也有同一套概念（标准句柄 0/1/2），.NET 里的 `Console.Out` 就是 fd 1，`Console.Error` 就是 fd 2。所以你并不需要从零理解，只是需要把"句柄"这个词换成"描述符"。

关键机制在这里：**shell fork 出子进程时，子进程的 fd 表是父进程 fd 表的副本。** 所以"重定向"根本不需要目标程序配合——shell 只是在启动它之前改了子进程 fd 表里的几行指向。`ls` 里的代码从头到尾只知道自己往 fd 1 写，它完全不知道自己写进了文件。

### 用 /proc 亲眼看到这件事

`/proc` 是内核给每个进程开的窗口（文件系统那部分会再展开），fd 表就挂在里面：

```bash
$ ls -l /proc/self/fd
```

```console
total 0
lrwxrwxrwx 1 root root  0 Sep 27 10:14 /proc/self/fd -> /proc/8942/fd
lrwx------ 1 root root 64 Sep 27 10:14 /proc/self/fd/0 -> /dev/pts/0
lrwx------ 1 root root 64 Sep 27 10:14 /proc/self/fd/1 -> /dev/pts/0
lrwx------ 1 root root 64 Sep 27 10:14 /proc/self/fd/2 -> /dev/pts/0
```

`self` 指的是"执行这条命令的进程自己"。三个箭头都指向 `/dev/pts/0`——你的伪终端。这是**重定向之前**的状态。

现在重定向一下：

```bash
$ ls -l /proc/self/fd > /tmp/fd-demo.txt
$ cat /tmp/fd-demo.txt
```

```console
total 0
lrwxrwxrwx 1 root root  0 Sep 27 10:14 /proc/self/fd -> /proc/1234/fd
lrwx------ 1 root root 64 Sep 27 10:14 /proc/self/fd/0 -> /dev/pts/0
lrwx------ 1 root root 64 Sep 27 10:14 /proc/self/fd/1 -> /tmp/fd-demo.txt
lrwx------ 1 root root 64 Sep 27 10:14 /proc/self/fd/2 -> /dev/pts/0
```

注意 **fd 1 变成了文件，fd 2 还指向终端**。这一条就是后面所有顺序问题的根：重定向是**一条一条逐个生效**的，改 fd 2 时"当前"指向 fd 1 的那个位置，很可能就是我们要改的东西。

`/proc/self/fd` 还有一个更有意思的性质——**它是一个可以当文件名用的路径**。命令读它，拿到的就是那个真实文件描述符：

```bash
$ cat /proc/self/fd/0          # 等价于不带参数的 cat
```

这条性质在 7.10 会展开成 `/dev/fd` 和 `/dev/stdin`。

### 自己造一个描述符

shell 内建的 `exec` 能新增 fd：

```bash
$ exec 3> /tmp/fd3-demo.txt
$ echo "写进 fd 3" >&3
$ exec 3>&-                    # 关掉 fd 3（- 表示关闭）
$ cat /tmp/fd3-demo.txt
```

```console
写进 fd 3
```

`>&3` 是"写到 fd 3"，`3>&-` 是"把 fd 3 关掉"。多出来的 fd 不参与默认的输出，所以 `echo "写在屏幕上" >&3` 和 `echo "写在屏幕上"` 可以并存——这在日志处理里很有用。

> **fd 为什么从 0 开始编号**：早期 Unix 只有一个约定——`< file` 会把文件挂到 fd **0** 上（这个 0 就是"第 0 号"，不是"第一个"），而输出固定走 fd **1**。后来要区分正常输出和诊断信息时，没有空位了，只好把"错误"追加成 fd **2**，同时为了不破坏已有代码，把标准输出从 0 挪到 1。这个历史包袱被 POSIX 固化了，所以今天 fd 0 是输入、1 是输出、2 是错误，**"0 是第一个"这种直觉在 Linux 上不成立**。

---

## 7.2 `>` `>>` `2>` `2>&1` `&>` `2>/dev/null`

⚠️ **先说清楚 `>` 的后果**：`>` 是**截断写入**——文件存在就把内容清空，不存在就创建。这意味着 `> out.log` 的一次手滑（路径少一个字母）可以直接抹掉一个已经跑了一整天的日志文件。养成习惯：往已有文件写之前先 `ls -l` 看一眼它多大、多旧。

### `>` 和 `>>`：写还是追加

```bash
$ date > /tmp/run.log
$ date > /tmp/run.log        # 再跑一次，文件被清空重写
$ date >> /tmp/run.log       # 追加
```

```console
$ cat /tmp/run.log
Fri Sep 27 10:20:11 CST 2026
Fri Sep 27 10:20:14 CST 2026
```

只有两行。**第一次 `>` 的内容被第二次覆盖了。** 这个区别在定时任务里是致命的：`* * * * * /usr/bin/backup.sh > /var/log/backup.log` 每分钟都在清空日志，一小时后你只剩一分钟的记录。正确写法是 `>>`。

（这和第 5 章 `cp` 的覆盖行为是同一回事：**`>` 就是内核层面的 `O_TRUNC`。**）

### `2>`：把 stderr 分家

```bash
$ ls /nonexistent > /tmp/out.txt
```

```console
ls: cannot access '/nonexistent': No such file or directory
```

终端上看到了错误，但 `/tmp/out.txt` 是空的——因为错误走的是 fd 2，`>` 只改了 fd 1。要把错误也收进去：

```bash
$ ls /nonexistent > /tmp/out.txt 2>&1
$ cat /tmp/out.txt
```

```console
ls: cannot access '/nonexistent': No such file or directory
```

注意 `2>&1` 里写的是 `1`，**指 fd 1 的当前指向**，而 fd 1 的当前指向因为前面的 `>` 已经变成 `/tmp/out.txt` 了。所以 stdout 和 stderr 一起进了文件。

### `2>&1` 的顺序为什么不能颠倒

这是本章最该记住的一个反直觉点。把顺序换过来：

```bash
$ ls /nonexistent 2>&1 > /tmp/out.txt
```

```console
ls: cannot access '/nonexistent': No such file or directory
$ cat /tmp/out.txt
```

`/tmp/out.txt` **是空的**，错误打到了终端上。

原因是 shell 按**从左到右**逐条执行重定向：

1. `2>&1` 执行时，**fd 1 还指向终端**（`>` 还没执行），于是把 fd 2 接到终端上。
2. `> /tmp/out.txt` 执行，把 fd 1 改接到文件。**fd 2 不会跟着变**——它已经记住了"终端"这个具体去向。

所以 `2>&1` 里的 `1` 是一个**快照**，读的是"此刻 fd 1 指向哪里"，而不是"以后 fd 1 变了就跟着变"。

打个比方：`2>&1 > file` 像是你先说"小李，以后你和小王一起汇报"，然后才把汇报对象改成经理——小李已经被安排给旧对象了。`> file 2>&1` 才是"先把小王换上去，再让小李跟他一起"。

**记忆规则：想合并两个流，`>` 永远写在 `2>&1` 前面。**

### `2>&1` 和 `1>&2` 不是一回事

后者是把 stdout 接到 stderr 上，用处是"把正常输出伪装成错误输出"，好让调用方只在收集 stderr 时也能拿到它：`echo "进度：50%" >&2`。有些工具用这招把不该被 `$(...)` 捕获的提示输出出去。

### `&>`：bash 的简写，不是 POSIX

```bash
$ ls /nonexistent &> /tmp/out.txt      # 等价于 ls /nonexistent > /tmp/out.txt 2>&1
$ cat /tmp/out.txt
```

```console
ls: cannot access '/nonexistent': No such file or directory
```

省了一个字，代价是**它是 bash 扩展，POSIX sh 没有**。Ubuntu 24.04 上这通常不构成问题（`/bin/sh` 指向 `dash`，但交互式登录和 `#!/bin/bash` 都是 bash），可一旦 shebang 写成 `#!/bin/sh`，行为会变得非常糟糕：

```bash
$ dash -c 'echo hi &> /tmp/trap.txt'
hi
$ cat /tmp/trap.txt
```

文件被创建了，**但是空的**。因为 `&` 在 POSIX 里是"放到后台执行"：`echo hi` 被丢到后台打印到终端，`> /tmp/trap.txt` 退化成一个只有重定向、没有命令的空命令，它的全部作用就是以截断模式创建这个文件。**命令看起来"运行了"，输出却凭空消失了。**

所以规矩是：**脚本里能写 `> f 2>&1` 就别用 `&>`。** `&>>` 追加版同样是 bash 扩展。

### `2>/dev/null`：明确的垃圾桶

`/dev/null` 是一个设备文件，写进去的字节被内核直接丢弃，读出来永远返回空。它不是"空文件"，是"黑洞"。

```bash
$ ls /nonexistent 2>/dev/null
$ echo $?
```

```console
2
```

没有任何输出，但**退出码仍然是 2**——`/dev/null` 只处理字节流，不影响退出码。这招的标准用法是"我不在乎错误信息，只在乎有没有结果"：

```bash
$ rm -rf -- "$TMPDIR/build" 2>/dev/null || echo "清理失败，手动检查 $TMPDIR"
```

> **`/dev/null` 与 `/dev/zero` / `/dev/urandom` 的区别**（第 4 章会展开设备文件）：`/dev/zero` 读出无限个 `\0`，用来造稀疏文件；`/dev/urandom` 读出随机字节，用来生成密钥密码；`/dev/null` 读出 0 字节、写进多少丢多少。

### 一张对照表

读这张表是为了查，不是为了背。每一行的"为什么"都在上面。

| 写法 | 含义 | fd 1 去向 | fd 2 去向 |
|---|---|---|---|
| `cmd` | 默认 | 终端 | 终端 |
| `cmd > f` | 覆盖写 | 文件 f | 终端 |
| `cmd >> f` | 追加写 | 文件 f | 终端 |
| `cmd 2> f` | 错误覆盖写 | 终端 | 文件 f |
| `cmd > f 2>&1` | 两者都进 f | 文件 f | 文件 f |
| `cmd 2>&1 > f` | **陷阱** | 文件 f | 终端 |
| `cmd &> f` | 同 `> f 2>&1`（bash） | 文件 f | 文件 f |
| `cmd &>> f` | 同 `>> f 2>&1`（bash） | 追加到 f | 追加到 f |
| `cmd > f 2> g` | 输出和错误分家 | 文件 f | 文件 g |
| `cmd 2> /dev/null` | 丢弃错误 | 终端 | 黑洞 |
| `cmd > /dev/null` | 丢弃输出 | 黑洞 | 终端 |

---

## 7.3 `<<` heredoc 与 `<<EOF` 变量展开

前面所有重定向都是把**输出**导向别处。`<<` 反过来：它把一段**输入文本**喂给命令。

```bash
$ wc -l << EOF
hello
world
EOF
```

```console
2 /dev/stdin
```

bash 在启动 `wc` 之前，先把这三行文字变成一个临时流接到 fd 0 上。`EOF` 那行（必须顶格、独占一行）叫**界定符（delimiter）**，它的作用只是告诉 bash"文本到这儿结束"——它不会被传给 `wc`，这也是为什么输出是 2 而不是 3。

**heredoc 的本质是 stdin，不是文件。** 理解这一点，很多困惑会消失：它能接任何读 stdin 的命令，位置也是标准的 stdin 位置。

### 加引号和不加引号：这是唯一重要的区别

```bash
$ NAME=ubuntu
$ cat << EOF
你好，$NAME
今天是 $(date +%Y)
EOF
```

```console
你好，ubuntu
今天是 2026
```

不加引号的界定符（或者写成 `<<EOF`）意味着 heredoc 内容**先被 shell 展开**：变量替换、命令替换、算术展开、反斜杠转义，全都生效。

给界定符加上引号就完全相反：

```bash
$ NAME=ubuntu
$ cat << 'EOF'
你好，$NAME
今天是 $(date +%Y)
EOF
```

```console
你好，$NAME
今天是 $(date +%Y)
```

原封不动。**凡是内容里有 `$`、`\` 或反引号又想保持字面量，就一定加引号**，这一点和单引号的作用是同一个道理（第 3 章讲过：`'$'` 里的内容完全不过 shell）。`<<EOF` 和 `<<'EOF'` 的区别，实质上就是单引号和不加引号的区别。

### `<<-`：只能吃 Tab，不能吃空格

```bash
$ cat <<-EOF
	缩进用 Tab 的版本
	这一行也缩进了
	EOF
```

```console
缩进用 Tab 的版本
这一行也缩进了
```

`<<-` 会剥掉每行开头的 **Tab**（不是空格！）。它是为那种必须把脚本缩进写在函数体里的风格准备的。**注意最后那个界定符本身也必须用 Tab 顶格**——这一条不遵守就直接语法报错，而且是新手最常撞的 heredoc 报错。

### 用 heredoc 生成配置文件

这是它最实用的场景，比一串 `echo` 干净得多：

```bash
$ cat > /tmp/motd << 'EOF'
本机仅供实验，禁止登录。
所有访问将被记录。
EOF
```

```console
$ cat /tmp/motd
本机仅供实验，禁止登录。
所有访问将被记录。
```

引号很关键：如果配置里有 `$`（比如密码里的 `$` 符号），不加引号 shell 会试图展开，然后报 `bad substitution`。

还有一种用法能省事——一个命令要吃两段输入时：

```bash
$ diff <(sort a.txt) <(sort b.txt)
```

`<(...)` 叫**进程替换**，是 bash 扩展：shell 为括号里的命令单独开一个管道，把它的输出接成一个看起来像文件的路径 `/dev/fd/63`。这严格说属于 7.10 的内容，但它和 heredoc 解决同一个问题（造一个临时输入源），习惯放在一起讲。

---

## 7.4 管道的本质：内核缓冲区

管道 `|` 是整章最重要的一个符号。它和重定向最大的区别在于：**重定向的终点是一个文件描述符指向的持久对象，管道的终点是一个内核里的内存缓冲区。**

### 管道的真相

`ls | wc -l` 在 bash 内部做了四件事：

1. 创建一个内核里的**管道缓冲区**（Linux 默认容量 64 KiB，受 `/proc/sys/fs/pipe-max-size` 限制）
2. 它的**读端**成为 `wc` 的 fd 0
3. 它的**写端**成为 `ls` 的 fd 1
4. fork 出两个进程**同时启动**，谁都不等谁

可以这样看：`ls` 和 `wc` 就像两个人之间传纸条。`ls` 把结果写进缓冲区，缓冲区满了 `ls` 就阻塞等待；`wc` 从缓冲区读，读完一截就腾出空间，`ls` 又能接着写。**中间没有任何"数据对象"传递，只有字节。**

这带来两个必须理解的行为。

### 行为一：管道里的命令是并发跑的，不是接力跑的

```bash
$ for i in 1 2 3; do echo "第 $i 个"; sleep 1; done > /tmp/serial.txt
$ cat /tmp/serial.txt
```

```console
第 1 个
第 2 个
第 3 个
```

这条命令花了 3 秒，你已经猜到了。下面这条**只花 1 秒**：

```bash
$ for i in 1 2 3; do echo "第 $i 个"; sleep 1; done | cat > /tmp/serial.txt
```

`cat` 是并行的第三个进程，在第一个 `echo` 落地的瞬间就能往文件写，而不是等全部结束。**这就是把一个慢速输出接到 `tee`、`grep`、`head` 上时"感觉变快了"的原因**——你把过滤挪到了和产生数据同时进行的位置。处理大文件时这个差别是数量级的。

### 行为二：管道是单向的，而且没人管错误

```bash
$ ls /nonexistent | wc -l
```

```console
0
```

`ls` 报了错，可它的错误走 fd 2 不走管道。你只看到 `0` 行，还以为目录是空的。**管道只搬运 stdout。** 要把 stderr 也拖进来，得显式合并：

```bash
$ ls /nonexistent 2>&1 | wc -l
```

```console
1
```

（`ls` 的失败码还是被吞了，那是 7.5 的内容。）

### SIGPIPE：为什么 `find | head` 会抱怨

管道还有个特性值得单独讲，因为它解释了一个真实会让你心烦的现象：

```bash
$ find / -name '*.iso' 2>/dev/null | head -3
```

```console
/home/ubuntu/iso/ubuntu-24.04.iso
/home/ubuntu/iso/debian-live.iso
/home/ubuntu/iso/archlinux.iso
```

`head` 读到 3 行就退出并关闭了读端。这时候缓冲区还没写满，`find` 会收到一个信号叫 **SIGPIPE**（编号 13），默认动作是终止进程。多数时候无所谓（输出已经够了），但退出码变成了 **141**（128 + 13），这在脚本里会变成一个假故障：

```bash
$ find / -name '*.iso' 2>/dev/null | head -3 > /dev/null
$ echo $?
141
```

这个 141 该不该处理？先理解它为什么存在：**写入端发现读端没了必须被杀掉**，否则它会一直往一个没人读的缓冲区里写，最终卡死。想让它安静下来可以写 `| { head -3; cat > /dev/null; }` 让下游继续读到 EOF，也可以直接接受——**在交互式使用里 141 是正常的**，只有当脚本依赖 `find` 跑完整棵树时它才变成问题。

顺便看一眼管道到底长什么样：

```bash
$ ls -l /proc/self/fd | grep pipe
```

```console
lrwx------ 1 root root 64 Sep 27 10:31 /proc/self/fd/0 -> pipe:[29184]
lrwx------ 1 root root 64 Sep 27 10:31 /proc/self/fd/1 -> pipe:[29184]
```

两个 fd 指向**同一个**管道对象。`pipe:[29184]` 这个写法也说明了一件事：**管道对用户态程序来说就是"一个带编号的东西"，和打开一个文件没区别**——所以 fd 机制对管道天然适用。管道也只能单向流，想要双向得用两个管道或者 socket。

---

## 7.5 管道的退出状态：`pipefail`

第 3 章提到过这个坑，现在把它讲透，因为它是"重定向和管道"这一整章唯一影响**正确性**的部分。

### 默认规则：只看最后一个命令

```bash
$ false | true
$ echo $?
0
```

`false` 失败得很明确，`true` 成功得更明确，可整条管道的退出状态**只取最后一个命令的**。放进脚本：

```bash
# 危险：dmesg 失败了，但脚本认为一切正常
$ sudo dmesg > /tmp/log.txt | wc -l && echo "日志采集成功" >> /tmp/report.txt
```

### `pipefail`：任一环失败，整个管道失败

```bash
$ set -o pipefail
$ false | true
$ echo $?
1
```

`pipefail` 的准确语义是：**取管道中从右往左第一个非零退出码**。如果全都成功就是 0。

所以现在上面那条脚本会正确地跳过 `&&` 后面那句。**凡是写进脚本的管道，都应该打开它。**

### 想知道每个环节的真实状态

```bash
$ (exit 3) | (exit 5) | (exit 7)
$ echo "${PIPESTATUS[@]}"
```

```console
3 5 7
```

`PIPESTATUS` 是 bash 数组，按管道从左到右存了每个命令的退出码。它**极其易失**——任何一条普通命令都会覆盖它：

```bash
$ (exit 3) | (exit 5); echo "${PIPESTATUS[@]}"
```

```console
3 5                                    # 对
```

```bash
$ (exit 3) | (exit 5) > /dev/null; echo "${PIPESTATUS[@]}"
```

```console
                                      # 被覆盖成某个单值了——别这么写
```

它也不是 POSIX 特性，脚本里要靠它做精细判断时记得 shebang 写 `#!/bin/bash`。

### `pipefail` 什么时候会失效

先说清楚它**不会**漏掉什么：只要管道里**任何一环返回了非零**，`pipefail` 就一定抓得到，不在乎那一环在左边还是右边。

```bash
$ set -o pipefail
$ ls /nonexistent | tee /tmp/log.txt > /dev/null
$ echo $?
2                                     # ls 的退出码被取上来了，尽管 tee 自己返回 0
```

这条特别值得注意：**`tee` 的退出码永远是 0**（它只是抄一份数据，几乎不会失败）。所以 `cmd | tee log` 的退出码完全依赖 `pipefail`，没开就等于只看 `tee`。7.6 节的 `cmd | sudo tee /etc/xxx` 尤其要注意。

真正让 `pipefail` 失效的是**三种情况**：

**（1）管道尾部有 `|| true`（最常见）**

```bash
$ set -o pipefail
$ sudo dmesg --level=err | tail -100 || true
$ echo $?
0                                     # 你亲手把失败改写成了成功
```

`|| true` 的字面意思就是"前一条失败的话，返回 0"——这**彻底废掉**了 `pipefail`，因为整条管道现在的退出码被 `true` 定成了 0。规则：**脚本里管道尾部不要出现 `|| true`**，确实需要忽略失败就用中间变量把退出码接住，在管道外面判断。

**（2）失败发生在 shell 自己身上**

```bash
$ set -o pipefail
$ cat /etc/passwd > /root/denied.txt | wc -l
bash: /root/denied.txt: Permission denied
0                                     # 管道返回了 wc 的 0，看不出这里出过问题
```

管道里的 `cat` 和 `wc` 都成功了，出错的是 bash 打开输出文件那一步。`pipefail` 只管管道，**管不了 bash 自己的重定向失败**——这类问题只能靠检查输出内容或改写逻辑。

**（3）命令自己吞掉了错误**

某些工具会把内部失败折叠成 0。这一类 `pipefail` 无能为力，只能靠检查输出内容。

> **本章只需要记住一句**：管道出现在脚本里 → 写 `set -euo pipefail` → 管道尾部不放 `|| true` → 需要判断具体是谁失败时看 `PIPESTATUS`。第 21 章会把 `set -e` 剩下的反直觉行为和正确写法补齐。

---

## 7.6 `tee` 为什么存在

管道有一个硬性缺陷：**终点只能有一个。** `cmd > out.log` 让屏幕变黑；`cmd` 让屏幕正常但什么都不留。你想要的往往是"**屏幕上实时看，同时存一份**"。

`tee` 就是为此存在的。它的名字来自管道的形状 T——数据在主管里流动时，分一支到支管里去：

```bash
$ sudo dmesg --level=err | tee /tmp/kernel-err.log | head -10
```

```console
[    2.116833] usb 1-3: device descriptor read/64, error -71
[   18.440291] EXT4-fs error (device sda1): iommu_...
[   31.992104] systemd[1]: Failed to start NetworkManager.
[   44.201887] audit: type=1400 apparmor="DENIED" operation="open"
head -10
```

三件事同时发生：`dmesg` 的错误级消息**出现在屏幕**上、**写进 `/tmp/kernel-err.log`**、并且只有前 10 行进了 `head`。数据流是：

```
sudo dmesg --level=err
      │ stdout
      ▼
    tee ──────────▶ /tmp/kernel-err.log
      │ stdout
      ▼
    head -10
```

`tee` 就是那个三通接头。没有它，你只能二选一。

### `tee` 的常用写法

```bash
# 追加而不是覆盖（和 >> 的取舍完全一致）
$ sudo dmesg --level=err | tee -a /var/log/kernel-err.log

# 同时写多个文件
$ some-report | tee /tmp/report.txt /home/ubuntu/share/report.txt

# 只写文件不看屏幕
$ some-report | tee /tmp/report.txt > /dev/null
```

⚠️ `tee` **默认覆盖**目标文件。要往已有的日志里追加，一定要显式 `-a`，否则跑一次 cron 任务就清空一次历史记录。

### `tee` 最经典的实战：配合 sudo 写受保护的文件

写 `/etc` 下的文件需要 root，但如果你把 `sudo` 加在管道右边，**输出还是会留在屏幕上**：

```bash
$ some-command | sudo tee /etc/sysctl.d/99-custom.conf
```

```console
（some-command 的输出照常显示在屏幕上）
```

对比一下常见的两难：

```bash
# 写法 A：能写，但屏幕全黑，成功了你也不知道
$ sudo some-command > /etc/sysctl.d/99-custom.conf

# 写法 B：屏幕有输出，但权限不够（sudo 只作用于 tee 本身）
$ some-command > /etc/sysctl.d/99-custom.conf
bash: /etc/sysctl.d/99-custom.conf: Permission denied
```

`tee` 把这个二选一变成了两者兼得。**这是 `tee` 在生产环境里最值得记住的用法**，写 systemd 单元、写 netplan、写 `/etc/ssh/sshd_config` 时都会用到。

> **一个必须知道的限制**：`sudo` 需要在终端上输入密码。非交互式场景（cron、`systemd` 的 `ExecStart`、ssh 的 `Command=`）里 `sudo tee` 会卡住或直接失败。系统级服务要写文件，正确做法是给服务账号配置 sudoers 规则，或者干脆把文件生成逻辑放到 `ExecStartPre` 里用 root 直接跑。

---

## 7.7 `sort -u`、`uniq -c` 与管道组合统计

管道真正开始好用的地方是这里：**三个只做一件事的小工具组合起来，产出一份频次统计。** 这个组合叫「Unix 哲学」最经典的示范，每个工具都很笨，但组合起来非常强。

### 先说 `uniq` 的致命限制

`uniq` 的作用是"把**相邻的**重复行合并成一行"。**只能合并相邻的。**

```bash
$ printf 'apple\nbanana\napple\n' > /tmp/fruits.txt
$ uniq /tmp/fruits.txt
```

```console
apple
banana
apple
```

两行 `apple` 中间隔了一行 `banana`，所以 `uniq` 什么都没合并。**这不是 bug，是 `uniq` 的设计**——它被假定上游已经排好序了，这样它可以只用 O(1) 的内存处理任意大的文件（流式去重，不需要把全部内容装进内存）。

### 所以 `sort` 必须排在 `uniq` 前面

```bash
$ sort /tmp/fruits.txt | uniq
```

```console
apple
banana
```

**记住这个顺序：`uniq` 处理相邻，所以 `sort` 一定在它前面。** 这是初学者最常见的错误，而且错得非常隐蔽——数据看起来"有点重复但说不清哪里不对"。

### `sort -u`：一步到位

```bash
$ sort -u /tmp/fruits.txt
```

```console
apple
banana
```

`sort -u` 在排序的同时丢掉重复项，**它等价于 `sort | uniq`**，但省掉一个进程。生产里两者结果一样，选哪个看你更想让读者一眼看懂——`sort | uniq` 更直白，`sort -u` 更省。

### `uniq -c`：数次数

```bash
$ sort /tmp/fruits.txt | uniq -c
```

```console
      2 apple
      1 banana
```

`-c` 在每行前面加上"这一行连续出现了几次"，数字**右对齐在宽度 7 的字段里**（别被前面那一堆空格吓到）。

### 完整的频次统计流水线

```bash
$ sort /tmp/fruits.txt | uniq -c | sort -rn | head -1
```

```console
      2 apple
```

四个环节各干一件事：

| 环节 | 干什么 | 不加会怎样 |
|---|---|---|
| `sort` | 让相同内容相邻 | `uniq` 什么都不合并 |
| `uniq -c` | 数出每一组的个数 | 没有计数 |
| `sort -rn` | 按数字从大到小排 | 你看不出哪个最常见 |
| `head -1` | 只要第一名 | 输出太长没法看 |

> ⚠️ 第二个 `sort` 的 `-r` 是逆序，`-n` 是**按数值**比较。少了 `-n`，`sort` 按字典序排，输出会变成 `10 apple` 排在 `2 apple` 前面——因为 `"10" < "2"`（字符 `'1'` 的编码值小于 `'2'`）。**计数排序一定要带 `-n`。**

### 稍复杂的输入：按第 N 个字段排

真实数据很少是一行一个词。假设有这样一个文件：

```bash
$ cat /tmp/sizes.txt
```

```console
nginx.conf    4820
bash          9214
vim           7341
sshd_config   1102
```

```bash
$ sort -k2 -n /tmp/sizes.txt
```

```console
nginx.conf    4820
vim           7341
bash          9214
sshd_config   1102
```

**注意：这行其实排错了**——`-k2` 从第 2 字段**一直排到行尾**，所以它是拿字段 2、3、4……做字典序比较，而不是只看字段 2 的数值。要严格只按一个字段排，必须写范围：

```bash
$ sort -k2,2n /tmp/sizes.txt
```

```console
sshd_config   1102
nginx.conf    4820
vim           7341
bash          9214
```

`k2,2n` = "第 2 到第 2 字段，按数值"。**这是 `sort` 最容易写错的一个选项**，默认值是"到行尾"。分隔符用 `-t` 指定：

```bash
$ sort -t: -k2,2n /etc/passwd           # 按 uid 排
$ sort -t, -k3,3n /var/log/stats.csv    # CSV 的第 3 列
```

### 一个真实的 locale 陷阱

`sort` 和 `uniq` 的比较规则受 `LC_ALL` / `LANG` 影响。中文字符串用不同 locale 排序结果完全不同；跨机器比对输出时更会遇到"我这排出来跟你那不一样"的困惑。`LC_ALL=C sort` 强制按字节序，结果与机器语言设置无关。

**约定俗成：在脚本里做确定性排序，一律加 `LC_ALL=C`。**

### 从 `dmesg` 到错误统计

本章实验会把这条流水线用在一个真实对象上。核心就这一行：

```bash
sudo dmesg --level=err | cut -d']' -f2- | cut -c 2- | cut -d' ' -f1-4 | LC_ALL=C sort | uniq -c | sort -rn | head
```

逐段读：`--level=err` 只要错误级；`cut -d']' -f2-` 砍掉 `[    2.116833]` 这个时间戳；`cut -c 2-` 再去掉残留的一个空格；`cut -d' ' -f1-4` 取前 4 个词当作"错误种类"的粗略代表（`EXT4-fs error` 和 `EXT4-fs warning` 前四个词一样，就归成一类）；后面是熟悉的排行榜流水线。

"取前几个词当分类依据"是**权宜之计**，不是精确分类。精确的话得用正则把消息模板抽出来——那是第 8 章和第 22 章的内容。现在这个粗粒度版本已经足够回答"哪类内核错误最常见"。

---

## 7.8 `cut`、`tr`、`paste`、`column`、`nl`

这五个都是**按列或按字符搬运文本**的小工具。它们的共同特点是：都不理解内容的含义，只理解位置。**这个"不理解"既是缺点也是优点**——它意味着它们极快、极可预测，而且不会因为数据格式微变就崩掉。

### `cut`：按分隔符或列号切

```bash
$ cat /etc/passwd | head -3
```

```console
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
ubuntu:x:1000:1000:Ubuntu User:/home/ubuntu:/bin/bash
```

```bash
$ cut -d: -f1,7 /etc/passwd | head -3
```

```console
root:/bin/bash
daemon:/usr/sbin/nologin
ubuntu:/bin/bash
```

`-d:` 指定分隔符，`-f1,7` 取第 1 和第 7 字段（字段之间用逗号，范围写 `1-3`）。

不想用分隔符就按字符切：

```bash
$ cut -c1-4 /etc/passwd | head -3     # 每行前 4 个字符
```

⚠️ **`cut` 按字节计数，不按字符。** 一个汉字在 UTF-8 里占 3 字节，所以 `cut -c1-4` 切中文文本会切出乱码：

```bash
$ echo "你好世界" | cut -c1-4
```

```console
ä½
```

这不是 bug，是设计——`cut` 诞生于 ASCII 时代。处理中文或任何多字节内容时，换行数为零的 `awk`/`sed`（它们按字符处理）更合适，或者干脆别切中文。

### `tr`：逐字符替换 / 删除

```bash
$ echo "hello world" | tr a-z A-Z
```

```console
HELLO WORLD
```

`tr a-z A-Z` 的意思是"把 `a` 到 `z` 的字符替换成对应的 `A` 到 `Z`"。这是它最常见的用法（`tr '[:lower:]' '[:upper:]'` 是等价写法，且不受 locale 之外的字符集影响）。

其他三个常用形态：

```bash
$ echo "a   b    c" | tr -s ' '          # -s 压缩连续重复
```

```console
a b c
```

```bash
$ echo "hello" | tr -d 'l'                # -d 删除指定字符
```

```console
heo
```

```bash
$ echo "hello" | tr -cd '[:alnum:]'       # -c 取反：保留字母数字，其余全删
```

```console
hello
```

⚠️ `tr` 的参数集合是 **1 对 1 映射**的：`tr abc xyz` 是 `a→x, b→y, c→z`，三组必须一样长（`-d`/`-s` 除外）。这是它和 `sed 's/a/b/g'` 的本质区别——`tr` **只处理单个字符**，要替换多字符子串必须用 `sed`（第 8 章）。

### `paste`：把多个文件横向拼

```bash
$ cat > /tmp/names.txt << 'EOF'
alice
bob
carol
EOF
$ cat > /tmp/roles.txt << 'EOF'
ops
dev
sre
EOF
```

```bash
$ paste /tmp/names.txt /tmp/roles.txt
```

```console
alice	ops
bob	dev
carol	sre
```

**默认用 Tab 拼。** 这就是 `cut` 的反向操作。

反过来把一个文件的每一行**竖着串成一行**（`-s`，serial）：

```bash
$ paste -sd, /tmp/names.txt
```

```console
alice,bob,carol
```

`-d,` 把分隔符从 Tab 改成逗号。生成 CSV 键值对时的常用拼法：

```bash
$ paste -sd= /tmp/names.txt
```

```console
alice=bob=carol
```

### `column`：让输出像张表

管道里最容易被忽略的救命工具。默认对齐：

```bash
$ ls -l /etc | column -t
```

```console
total 62
drwxr-xr-x  3 root root 4096 Sep 27 09:02 .
drwxr-xr-x 22 root root 4096 Sep 10 08:14 ..
-rw-r--r--  1 root root  1578 Aug 20 11:03 adduser.conf
-rw-r--r--  1 root root   10 Aug 20 11:03 fstab
```

`column -t` 按**空白字符**自动识别列边界并对齐。指定分隔符用 `-s`：

```bash
$ cut -d: -f1,3 /etc/passwd | head -5 | column -t -s:
```

```console
root      0
daemon    1
bin       2
sys       3
sync      4
```

**为什么这一步值钱**：默认分隔符是**多个空格**而不是真正的空格。`ls -l` 那几列看起来是空格隔开的，实际上是用空格填充的定宽列。一旦文件来自 CSV、JSON 或者用 `echo "$a $b"` 拼出来的，`column -t` 的效果就会散架——这时候必须显式 `-s`。

### `nl`：编号

```bash
$ nl /tmp/names.txt
```

```console
     1	alice
     2	bob
     3	carol
```

默认 6 位宽度、右对齐、Tab 分隔。常和管道配合用来标行号：

```bash
$ nl -ba -w3 -s': ' /tmp/names.txt
```

```console
  1: alice
  2: bob
  3: carol
```

`-b a`（`-ba`）强制给空行也编号（默认行为是空行不编号），`-w3` 宽度 3，`-s': '` 自定义分隔符。**`cut -c1-8` 这种硬编码偏移量是脆弱的，`nl` 加一个能自动跟着走的分隔符才是稳的。**

> **顺带一句 `head` 和 `tail`**：它们也常出现在管道里。`tail -n +2 file` 从第 2 行开始输出（跳过表头），`head -n 20` 取前 20 行，`tail -f` 持续跟踪新增内容。第三个会在第 15 章讲 journalctl 时用到。

---

## 7.9 `xargs` 的并行与空输入保护 `-r`

`xargs` 解决的是一个具体问题：**有些命令只吃命令行参数，不吃 stdin。**

```bash
$ ls *.log | rm            # 错
```

`rm` 根本不看 stdin，它只认参数。所以 `ls *.log` 的输出一大串文件名会被**完全忽略**——`rm` 直接跑了个空操作然后报错。`xargs` 的职责就是把 stdin 的内容切成一批参数，喂给后面那个命令：

```bash
$ ls *.log | xargs rm
```

一句话：**管道给字节，`xargs` 把字节重新组装成参数。**

### 陷阱一：文件名里有空格和引号

默认的 `xargs` 按空白切分，遇到单引号、双引号和反斜杠还有一套自己的处理规则。文件名里有空格时会把一个文件拆成两个参数：

```bash
$ ls *.log | xargs rm
rm: cannot remove 'my': No such file or directory
```

解法是把分隔符换成 NUL（GNU 工具的 `-print0` 和 `xargs -0` 是配套的）：

```bash
$ find . -name '*.log' -print0 | xargs -0 rm
```

**`-print0` 在每个文件名后面输出一个 NUL 字节而不是换行，`xargs -0` 告诉它按 NUL 切分。** 文件名里可以包含换行、Tab、空格，任何字符都不再是特殊的。这是处理文件名时唯一安全的写法。

### 陷阱二：空输入会执行一次没有参数的命令

这个陷阱更隐蔽，也更危险：

```bash
$ printf '' | xargs echo "我在空输入下也被执行了"
```

```console
我在空输入下也被执行了
```

输入是空的，但 `xargs` **仍然执行了一次命令**——只是没带参数。后果分两种：

```bash
$ find /data -name '*.tmp' -mtime +30 | xargs rm
rm: missing operand
```

这个还算好，因为 `rm` 不带参数会当场报错。**真正麻烦的是那些"不带参数"有独立含义的命令**——`git add` 不带参数等于"把当前目录全部加入暂存区"，`docker rm` 不带参数等于"删掉所有容器"，`gunzip` 不带参数等于"把当前目录的 `.gz` 全部解开"。这类命令一旦在空输入下被执行，后果和你的本意毫无关系。

解法就是 `-r`（`--no-run-if-empty`），让 `xargs` 在输入为空时直接退出：

```bash
$ printf '' | xargs echo "空输入下我也被执行了"
```

```console
空输入下我也被执行了
```

```bash
$ printf '' | xargs -r echo "空输入下我也被执行了"
```

第二次**没有任何输出**。

> ⚠️ **`-r` 是 GNU 扩展**，BSD / macOS 的 `xargs` **没有这个选项**，而它们的默认行为恰好就是"空输入不执行"。所以 `-r` 在 macOS 上会直接报 `illegal option -- r`。这是"Linux 脚本拷到 Mac 上跑不通"的经典原因之一。
>
> **规矩：凡是输入可能为空的 `xargs`，一律显式写 `-r`。** 多打两个字符，换来一条不依赖任何默认值的可靠行为。

### 其余常用选项

```bash
# 每次最多给 2 个参数（分批调用）
$ find . -name '*.tmp' | xargs -r -n 2 ls -l

# -L 是"每次几行"，一次传入的内容更完整
$ cat /tmp/names.txt | xargs -r -L 1 echo

# 参数要插在命令中间就必须用 {} 占位
$ find . -name '*.tmp' | xargs -r -I{} mv {} /tmp/trash/

# 显示实际执行的命令，调试时非常有用
$ find . -name '*.tmp' | xargs -r -t rm

# 参数从文件读而不是从 stdin
$ xargs -r -a /tmp/names.txt echo

# 并行执行 4 份，大批量独立任务能快好几倍
$ find /var/log -name '*.gz' | xargs -r -P4 -t gzip -t
```

`-I{}` 有一个必须知道的副作用：**它隐含了 `-L 1`**，也就是 xargs 每次只读一行、只做一次替换、只调用一次命令。所以 `find . -name '*.log' | xargs -r -I{} gzip {}` 在四万个文件上就是四万次进程启动，而 `xargs -r -n 100 gzip` 只启动四百次——**快两个数量级**。`-I` 是为了参数位置被迫付出的代价，不是更快的写法：能用 `-n` 就用 `-n`，`-I` 只在参数必须插在中间时才用。

`-P` 并行的正确用法：给**彼此独立、无共享状态**的任务用。`rm -i`、交互式命令、有顺序依赖的批处理都**不能**并行，否则输出会交错成一团。

---

## 7.10 `/dev/stdin` 与 `/dev/fd`

前面 7.1 提过：`/proc/self/fd` 里的每一项都可以当文件名用。系统把它包装成了两个更好记的入口。

### `/dev/fd` 是什么

```bash
$ ls -l /dev/fd/
```

```console
lrwxrwxrwx 1 root root  4 Apr 23 12:44 /dev/fd -> /proc/self/fd
```

一个符号链接，指向 `/proc/self/fd`。所以 `cat /proc/self/fd/0` 和 `cat /dev/fd/0` 完全等价。`/dev/fd/N` 里的 N 就是描述符编号，还有三个更好用的别名：

| 路径 | 等价于 | 含义 |
|---|---|---|
| `/dev/stdin` | `/dev/fd/0` | 标准输入 |
| `/dev/stdout` | `/dev/fd/1` | 标准输出 |
| `/dev/stderr` | `/dev/fd/2` | 标准错误 |

### 为什么需要它们

因为**有些命令只认文件名，不认 stdin**。stdin/stdout/stderr 描述的是"数据的方向"，但很多工具的签名里就写着 `char *filename`，没法用流喂。

真正无法替代的场景是这个——把本地文件通过 stdin 送到远端：

```bash
$ ssh root@web-01 'cat > /tmp/uploaded.txt' < /tmp/names.txt
```

`ssh` 把 stdin 直接接到远端那个 `cat` 上。这条命令没有出现任何本地文件路径，靠的就是"stdin 是个可以被继承的字节流"这件事。另一个例子是 `wc -l /dev/stdin < file`——`wc` 本来就能读 stdin，但一旦你需要的是一个**路径**而不是一个流，`/dev/stdin` 就是唯一的选择。

顺带说一句：`cmd | tee log | tee /dev/stderr` 里的第二个 `tee` 等价于 `>&2`，纯粹绕了一圈。**能用 `>&2` 就别这么写**，`/dev/fd` 在这里只是证明它确实就是 fd 2 的别名。

### 进程替换：`<()` 和 `>()`

7.3 提到的 `diff <(sort a) <(sort b)` 现在可以解释了。bash 为每个 `<()` 开一个子进程加一个管道，把管道的**读端**挂到子进程的 fd 1，再把这个管道注册为当前 shell 的一个新 fd（通常是 63 或 62），于是 `/dev/fd/63` 就是那个虚拟文件。

```bash
$ diff <(sort a.txt) <(sort b.txt)     # 两份都排好序再比
$ wc -l <(pgrep -f nginx)              # 一个需要"文件名"的命令吃到管道数据
$ cat > >(gzip > out.gz) < in.txt      # 同时保留原文件
```

**这是 bash 扩展，POSIX sh 没有。** 但它是 shell 里最优雅的"临时文件"替代方案：不用建文件、用完即消失、并发安全（真临时文件会有"文件名冲突"和"清理时机"两个老问题）。

### 真实的坑：`/dev/stdin` 不能重复打开

```bash
$ while read -r line; do
>     cat /dev/stdin | wc -l
> done < /tmp/names.txt
```

内层的 `cat /dev/stdin` 读的就是**同一个** fd 0——已经被外层 `while read` 消耗掉了，结果是空。这类问题在管道里特别容易出现，因为"输入"往往是匿名的。

想避免就把数据真正落到一个文件里，或者 `exec 3< file` 开一个新 fd 来读。

---

## 7.11 本章小结

1. **fd 是进程的"已打开文件编号"**。0/1/2 对应 stdin/stdout/stderr。shell fork 时复制 fd 表，所以重定向不需要目标程序配合。`ls -l /proc/self/fd` 是验证这一切的观察窗。
2. **`>` 是截断（O_TRUNC），`>>` 是追加。** 定时任务日志必须用 `>>`，否则每跑一次清空一次。
3. **重定向从左到右逐条生效。** `2>&1` 里的 `1` 是"此刻 fd 1 的快照"，所以 `> file 2>&1` 对、`2>&1 > file` 错。**`>` 永远写在 `2>&1` 前面。**
4. **`&>` / `&>>` 是 bash 扩展不是 POSIX。** 在 dash 里 `cmd &> f` 会创建一个空文件、把输出丢到终端——静默失败。
5. **`2>/dev/null` 只丢 stderr**，退出码仍是原来的值。
6. **`<<` heredoc 是 stdin 不是文件。** `<<EOF` 展开变量和命令替换，`<<'EOF'` 保持字面量（等于单引号），`<<-EOF` 只剥 Tab，界定符必须顶格。
7. **管道是内核里的 64 KiB 缓冲区**，读端给右边当 fd 0、写端给左边当 fd 1。**它传字节，不传对象。**
8. **管道里的命令并发执行**，所以把过滤接到下游是实打实的性能优化。
9. **写端发现读端消失会收到 SIGPIPE 被杀**，退出码 141。`find | head` 报 141 是正常的；要消化全部输出就得让下游读到 EOF。
10. **管道退出状态默认只取最后一个命令**，`pipefail` 改成"任一环非零即非零"。`PIPESTATUS` 能看每一环。**脚本里的管道要开 `pipefail`，但尾部不能有 `|| true`。** 它管不了 bash 自己的重定向失败。
11. **`tee` 解决"一份数据两个去向"的矛盾**，最有用的形态是 `cmd | sudo tee /etc/xxx`。它默认**覆盖**，追加要显式 `-a`。因为 `tee` 自己的退出码永远是 0，`cmd | tee log` 的成败判断**完全依赖 `pipefail`**。
12. **`uniq` 只合并相邻行，所以 `sort` 必须在它前面**，`sort -u` 等价于 `sort | uniq`。统计模板：`sort | uniq -c | sort -rn | head -N`，第二个 `sort` 的 `-n` 不能省，`sort -k2` 要写 `-k2,2` 才只排一个字段。
13. **`cut` 按字节计数（切中文会乱码），`tr` 只处理单个字符**（多字符替换用 `sed`），`column -t` 是让管道输出能读的救命工具。
14. **`xargs` 把 stdin 的字节重新组装成参数**，处理文件名必须 `find -print0 | xargs -0`。`-r` 是 GNU 扩展，作用是空输入时完全不执行命令；BSD/macOS 没这个选项且默认就是安全的。**能用 `-n` 就别用 `-I{}`**（后者隐含 `-L 1`，等于一次文件一次进程）。
15. **`/dev/fd` 是 `/proc/self/fd` 的别名**，`/dev/stdin` 就是 fd 0。它在"命令只认文件名"的场合能救场（`<()` `>()` 进程替换就是它的延伸用法），但同一个 fd 不能被重复打开。

---

## 7.12 动手实验：把内核错误清洗成一列，并排出频次

> 环境：Ubuntu Server 24.04 LTS（内核 6.8），普通用户 + `sudo`
> 耗时：约 30 分钟

### 目标

把 `dmesg` 的输出经由一串管道和重定向，清洗成**一列**干净的内核错误消息，再用频次统计找出最常见的几类错误。全程只用到本章的 `>` `>>` `2>&1` `|` `tee` `cut` `sort` `uniq` `nl` `xargs` `heredoc`。

### 步骤

**第 1 步：准备一个干净的工作目录，先看一眼再动手**

```bash
$ mkdir -p ~/lab7 && cd ~/lab7
$ pwd
```

```console
/home/ubuntu/lab7
```

⚠️ 这一章会创建和覆盖文件。所有写入都在 `~/lab7` 里，**不要在 `/etc` 或 `/var/log` 下试**。

**第 2 步：把内核环形缓冲区完整落盘**

```bash
$ sudo dmesg > dmesg-raw.txt 2> dmesg-err.txt
$ wc -l dmesg-raw.txt
$ ls -l dmesg-err.txt
```

```console
   1247 dmesg-raw.txt
-rw-r--r-- 1 ubuntu ubuntu 0 Sep 27 10:40 dmesg-err.txt
```

`dmesg` 的内容全走 stdout，stderr 是空的——所以这个写法**一次就把两个流分开落到了两个文件**，这就是 7.2 的 `> f 2> g`。

看前几行长什么样：

```bash
$ head -5 dmesg-raw.txt
```

```console
[    0.000000] Linux version 6.8.0-31-generic (buildd@lcy02-amd64-051) #31-Ubuntu SMP PREEMPT_DYNAMIC
[    0.000000] Command line: BOOT_IMAGE=/boot/vmlinuz-6.8.0-31-generic root=UUID=1c2f3a4b-...
[    0.000000] DMI: Supermicro SYS-6029P-WTR/X11DPi-N, BIOS 3.4 11/02/2023
[    0.117472] smpboot: Allowing 32 CPUs, 0 hotplug CPUs
[    2.116833] usb 1-3: device descriptor read/64, error -71
```

注意开头那个 `[    0.000000]`——**这是清洗时要处理掉的东西。**

**第 3 步：`>` 与 `>>` 的对比，亲手做一次**

```bash
$ date >> t.log
$ sleep 1
$ date >> t.log
$ cat t.log
```

```console
Sun Sep 27 10:41:02 CST 2026
Sun Sep 27 10:41:03 CST 2026
```

两行都在。现在把 `>>` 换成 `>`，跑两次：

```bash
$ date > t.log
$ sleep 1
$ date > t.log
$ cat t.log
```

```console
Sun Sep 27 10:41:07 CST 2026
```

⚠️ **只有一行了。** 第一次 `>` 已经把文件清空，第二次又清空重写。**这就是为什么定时任务写日志必须用 `>>`。**

**第 4 步：只挑出错误级消息**

`dmesg` 支持按优先级过滤（emerg/alert/crit/err/warn/note/info/debug）：

```bash
$ sudo dmesg --level=err | tee errors-raw.txt | head -5
$ wc -l errors-raw.txt
```

```console
[    2.116833] usb 1-3: device descriptor read/64, error -71
[   18.440291] EXT4-fs error (device sda1): iommu_fault: 0x0
[   31.992104] systemd[1]: Failed to start NetworkManager.service.
[   44.201887] audit: type=1400 apparmor="DENIED" operation="open" profile="snap.lxd"
[  102.338215] usb 1-3: device descriptor read/64, error -110
```

如果 `wc -l` 显示 0（干净机器上确实可能一条错误级都没有），把 `--level=err` 改成 `--level=err,warn`；如果还是空，就执行下面**第 4.5 步**造一份样本再继续。

**第 4.5 步（备用）：用 heredoc 造一份可控的样本日志**

这台机器如果一条错误都没有，就用第 7.3 节的 heredoc 造一份。顺带复习 `<<'EOF'` 保持字面量：

```bash
$ cat > errors-raw.txt << 'EOF'
[    2.116833] usb 1-3: device descriptor read/64, error -71
[    3.000001] systemd[1]: Failed to start Load Kernel Modules.
[    4.000002] EXT4-fs error (device sda1): iommu_fault: 0x0
[    5.000003] systemd[1]: Failed to start Load Kernel Modules.
[    6.000004] usb 1-3: device descriptor read/64, error -110
[    7.000005] EXT4-fs error (device sda1): iommu_fault: 0x0
[    8.000006] audit: type=1400 apparmor="DENIED" operation="open"
[    9.000007] systemd[1]: Failed to start Load Kernel Modules.
[   10.000008] usb 1-3: device descriptor read/64, error -71
[   11.000009] EXT4-fs error (device sda1): iommu_fault: 0x0
EOF
$ wc -l errors-raw.txt
```

```console
10 errors-raw.txt
```

**第 5 步：清洗掉时间戳，得到一列干净消息**

```bash
$ cut -d']' -f2- errors-raw.txt | cut -c 2- | nl | head -6
```

```console
     1	usb 1-3: device descriptor read/64, error -71
     2	systemd[1]: Failed to start Load Kernel Modules.
     3	EXT4-fs error (device sda1): iommu_fault: 0x0
     4	systemd[1]: Failed to start Load Kernel Modules.
     5	usb 1-3: device descriptor read/64, error -110
     6	EXT4-fs error (device sda1): iommu_fault: 0x0
```

第一刀 `cut -d']' -f2-`：把 `]` 当分隔符，取**第 2 字段到行尾**（`-f2-` 的 `-` 表示"到末尾"）。剩下的是 ` usb 1-3: ...`，前面还挂着一个空格。第二刀 `cut -c 2-` 把它切掉。

**注意这里为什么用 `-d']'` 而不是 `cut -c 15-`**：时间戳的字符位置不是恒定的（用 `dmesg -T` 的人类可读时间戳，长度会变），**按内容切永远比按偏移量切稳。**

**第 6 步：把清洗结果存成文件，同时在屏幕上留一份**

```bash
$ sudo dmesg --level=err | cut -d']' -f2- | cut -c 2- | tee errors.txt | column -t | head -5
```

```console
usb 1-3: device descriptor read/64, error -71
systemd[1]: Failed to start Load Kernel Modules.
EXT4-fs error (device sda1): iommu_fault: 0x0
usb 1-3: device descriptor read/64, error -110
audit: type=1400 apparmor="DENIED" operation="open"
```

这条管道里每一环各干一件事：`sudo` 提权 → `dmesg` 产出 → `cut` ×2 清洗 → `tee` 分流（一支进 `errors.txt`，一支继续往下）→ `column -t` 对齐 → `head` 截断。**管道不保存中间结果**，这条流水线跑第二遍就是重新算一遍——这也是它比一串临时文件更省事的地方。

**第 7 步：统计频次**

```bash
$ cut -d' ' -f1-3 errors.txt | LC_ALL=C sort | uniq -c | sort -rn
```

```console
      4 EXT4-fs error (device
      3 systemd[1]: Failed to
      2 usb 1-3: device descriptor
      1 audit: type=1400 apparmor="DENIED"
```

**现在亲手验证「`uniq` 只合并相邻」这条规则**——把 `sort` 去掉：

```bash
$ uniq -c errors.txt | head -5
```

```console
      1 usb 1-3: device descriptor read/64, error -71
      1 systemd[1]: Failed to start Load Kernel Modules.
      1 EXT4-fs error (device sda1): iommu_fault: 0x0
      1 systemd[1]: Failed to start Load Kernel Modules.
      1 EXT4-fs error (device sda1): iommu_fault: 0x0
```

**每一行都是 1。** 同样的消息被别的东西隔开了，`uniq` 一个都没合并。这就是"排序必须在前面"的直接证据。

**第 8 步：`xargs -r` 的空输入保护**

```bash
$ printf '' | xargs echo "空输入下我也被执行了"
```

```console
空输入下我也被执行了
```

```bash
$ printf '' | xargs -r echo "空输入下我也被执行了"
```

第二次**没有任何输出**。换成真实场景——一个可能什么都找不到的查找：

```bash
$ find /home/ubuntu -name '*.nothing-here' -print
```

```console
                                    # 无输出（确实一个都没找到）
```

```bash
$ find /home/ubuntu -name '*.nothing-here' | xargs echo 计划删除
```

```console
计划删除                            # ← 空输入下也执行了，只是这次"无害"
```

```bash
$ find /home/ubuntu -name '*.nothing-here' | xargs -r echo 计划删除
```

```console
                                    # 无输出
```

**换成 `wc -l` 就能看出 `-r` 的真正价值**——不加 `-r` 时它会打印一个 `0`：

```bash
$ find /home/ubuntu -name '*.nothing-here' | xargs wc -l
0
```

这个 `0` 到底是"找到了 0 个文件"，还是"xargs 执行了一次不带参数的 `wc`（它的 stdin 被接到了 `/dev/null`，所以读到 EOF）"？**单看输出无法区分。** 加了 `-r` 之后，一个字都不输出，含义才是无歧义的：

```bash
$ find /home/ubuntu -name '*.nothing-here' | xargs -r wc -l
                                    # 无输出
```

**再验证一下 `-0` 组合能处理带空格的文件名：**

```bash
$ mkdir -p ~/lab7/spaced && cd ~/lab7/spaced
$ touch "my report.txt" "another one.txt"
$ find . -name '*.txt' | xargs ls -1
```

```console
ls: cannot access './my': No such file or directory
ls: cannot access './report.txt': No such file or directory
ls: cannot access './another': No such file or directory
ls: cannot access './one.txt': No such file or directory
```

```bash
$ cd ~/lab7
$ find ./spaced -name '*.txt' -print0 | xargs -0 ls -1
```

```console
my report.txt
another one.txt
```

`-print0 | xargs -0` 正确处理了带空格的文件名。**处理文件名只有这一种写法是安全的。**

**第 9 步：`/dev/fd` 让只认路径的命令吃到管道数据**

```bash
$ cut -d' ' -f1-3 errors.txt | LC_ALL=C sort | uniq -c | sort -rn | head -1 > /tmp/top.txt
$ cat /tmp/top.txt
$ sort -k2,2n /tmp/top.txt        # 一个本该用 wc -l 的场合，改用路径
```

```console
      4 EXT4-fs error (device
      4 EXT4-fs error (device
```

更直接的例子：

```bash
$ sudo dmesg --level=err | head -100 | wc -l /dev/stdin
```

```console
7
```

`wc` 完全可以用 `wc -l` 读到 EOF，但有些程序签名里写死了 `char *filename`，那时 `/dev/stdin` 就是唯一的选择。

### 验证

```bash
# 1. 清洗后的行数必须和原始一致（一个字符都没丢）
$ wc -l < errors-raw.txt
$ wc -l < errors.txt
```

```console
10
10
```

```bash
# 2. 第一行里绝对不能再出现 ']'（时间戳已被切掉）
$ head -1 errors.txt | grep -c ']'
```

```console
0
```

⚠️ `grep -c` 没匹配时返回**退出码 1** 但仍打印 `0`。看到 `0` 就是成功了，bash 如果因此报 `command not found` 或类似信息，那是 `&&` 链在起反作用，不是实验失败。

```bash
# 3. 计数总和必须等于总行数（一条消息都没漏算）
$ cut -d' ' -f1-3 errors.txt | LC_ALL=C sort | uniq -c | awk '{s+=$1} END {print s}'
```

```console
10
```

（这里借 `awk` 做了一次求和，它只出现在验证步骤里——awk 的完整用法是第 8 章的内容。）

```bash
# 4. tee 分流正确：文件里的内容和管道里看到的完全一致
$ diff <(cut -d']' -f2- errors-raw.txt | cut -c 2-) errors.txt && echo "一致"
```

```console
一致
```

```bash
# 5. 确认当前 shell 开了 pipefail（后面写脚本要用）
$ set -o | grep pipefail
```

```console
pipefail     on
```

### 思考

1. 如果第 7 步里把 `sort -rn` 写成 `sort -r`（少了 `-n`），当错误种类出现次数超过 9 次时，排行的第一行会不会是错的？举一个具体的排序过程说明。
2. 第 2 步你用了 `sudo dmesg > dmesg-raw.txt 2> dmesg-err.txt`。如果改成 `sudo dmesg > dmesg-raw.txt 2>&1`，`dmesg-err.txt` 会变成什么状态？改成 `sudo dmesg 2>&1 > dmesg-raw.txt` 呢？
3. 第 6 步的管道里，如果 `dmesg` 因为某种原因失败了（比如 `sudo` 密码过期），终端上**看起来**会有几个结果？此时 `errors.txt` 文件是什么状态？加上 `set -o pipefail` 之后，脚本能不能发现这个问题？
4. `cut -c 2-` 里那个 `2` 是什么意思？如果某一行消息是空的（`dmesg` 里偶尔有空行），这一刀之后会得到什么？换一个更健壮的写法。
5. `find ./spaced -name '*.txt'`（不加 `-print0`）如果目录里有一个文件名里带**换行符**的文件，会发生什么？在这个实验的数据规模下你有可能发现吗？
6. 为什么 `head -5` 放在 `tee` 的**右边**很重要？如果写成 `... | head -5 | tee errors.txt`，`errors.txt` 里会剩下几行？跑一次验证一下。

### 清理

```bash
$ cd ~
$ rm -rf ~/lab7 /tmp/fd3-demo.txt /tmp/fd-demo.txt /tmp/top.txt /tmp/trap.txt
```

⚠️ `rm -rf ~/lab7` 会**递归删除整个目录且不提示**。执行前先用 `ls ~/lab7` 确认里面只有本实验产生的文件。

```bash
# 关掉 pipefail，恢复当前 shell 的默认状态
$ set +o pipefail
$ set -o | grep pipefail
```

```console
pipefail     off
```

---

## 7.13 自测题

### 一、简答

1. 文件描述符是什么？为什么 `ls > out.txt` 这个重定向不需要 `ls` 自己配合就能生效？如果 `ls` 的源代码里写的是 `write(1, ...)`，它知道自己写进的是文件吗？
2. 用你自己的话解释为什么 `cmd 2>&1 > f` 和 `cmd > f 2>&1` 结果不同。重定向的执行顺序是什么？`2>&1` 里的 `1` 到底指什么？
3. `&> file` 在 bash 里等价于什么？把同样的命令放进 `dash` 里执行会发生什么？为什么结果是这个？
4. `<<'EOF'` 和 `<<EOF` 的区别是什么？这个区别和第 3 章的单引号是什么关系？`<<-EOF` 到底能剥掉什么、不能剥掉什么？
5. 管道在内核里是什么对象？它的容量受什么限制？`find / -name '*.iso' | head -3` 之后 `$?` 是 141，这个码是怎么算出来的，应该当成故障吗？
6. 默认情况下 `false | true` 的退出码是多少？打开 `pipefail` 之后是多少？`pipefail` 在哪三种情况下抓不到失败？`PIPESTATUS` 记录的是什么？
7. `sort | uniq -c` 和 `sort -u` 分别做什么？`uniq` 为什么只处理相邻的重复行——如果它也做全局去重，会牺牲什么？排序时 `sort -k2` 和 `sort -k2,2` 有什么区别？
8. `xargs` 解决什么问题？`xargs -r` 又解决什么问题，它在哪几个平台上有、在哪几个平台上没有？`-I{}` 相比 `-n` 付出了什么代价？
9. `/dev/fd/0` 和 `/proc/self/fd/0` 是什么关系？`/dev/stdin` 又是什么？为什么"同一个 fd 不能被重复打开"会成为一个需要注意的问题？

### 二、命令填空

1. 把命令的标准输出**和**标准错误都写进 `/tmp/run.log`（覆盖），且必须在 POSIX sh 里也能跑：________
2. 把命令的标准输出写进 `/tmp/run.log`（追加），但丢弃标准错误：________
3. 用一条管道统计 `access.log` 里出现次数最多的 5 个客户端 IP，只用 `cut` / `sort` / `uniq` / `head`，每一环都要写出来（不要省略号）：________
4. 把当前目录下所有扩展名为 `.log` 的文件（含名字里有空格和换行的）交给 `gzip` 压缩，且当没有匹配文件时不做任何事：________
5. 把 `dmesg` 里所有错误级消息的内核时间戳去掉，并把结果同时写到 `errs.txt` 和终端上：________

### 三、故障分析

**案例 1**

> 现象：你写了个每日备份脚本，第一周一切正常，两周后去查备份历史，发现日志文件里**只有一天**的记录，而且每天都只有最后一条。
> ```bash
> #!/bin/bash
> set -euo pipefail
> tar czf /backup/db.tar.gz /var/lib/postgresql && echo "$(date) 备份完成" > /var/log/backup.log
> rsync -av /backup/ /backup-mirror/ | tee /var/log/backup-detail.log | tail -20
> ```
> 1. 脚本里有多处写法会导致"日志只有一天"，请找出**全部**并逐个说明原因。
> 2. `set -o pipefail` 在这个脚本里对第二行有帮助吗？为什么？
> 3. 把第二行改写成"rsync 失败时报错并保留完整日志、但屏幕上仍然只显示最后 20 行"的正确形式。

**案例 2**

> 现象：某人在自己的 Linux 机器上验证通过的脚本，拷到同事的 macOS 上跑，第一条命令就报错：
> ```bash
> find /data -name '*.tmp' | xargs -r rm -f
> ```
> 1. macOS 上报的是什么错？根本原因是什么？
> 2. 两个平台在这个行为上的默认差异是什么？`-r` 到底保护的是什么？如果换成 `xargs rm -f`（不加 `-r`），在 Linux 上会出什么问题？
> 3. 写一个在两个平台上都能安全跑的等价写法。

**案例 3**

> 现象：一个清理脚本这样统计要删的文件数：
> ```bash
> COUNT=$(find /data/logs -name '*.gz' | wc -l)
> echo "将删除 $COUNT 个文件"
> ```
> 某次 `/data/logs` 目录不存在，脚本照样继续跑，最后报告"将删除 0 个文件"并以退出码 0 结束。运维据此认为"日志已经清理干净"，实际是 `find` 根本没跑起来。
> 1. 为什么 `wc -l` 会让这个问题变得不可见？管道里的退出码取自哪一环？
> 2. 写出两个修复方案：一个用 `pipefail`，一个不用管道。
> 3. 如果你只能改一个字，你会改哪个？说明理由。

**案例 4**

> 现象：一个监控脚本检查磁盘：
> ```bash
> df -h / | awk 'NR==2 {print $5}' | tr -d '%' | xargs -r test "$2" -lt 90 || echo "磁盘告警"
> ```
> 1. 这里的 `||` 挂在 `xargs` 后面，`test` 是管道的一环。它的退出码会传出来吗？`pipefail` 打开和关闭时行为各是什么？
> 2. 如果根分区使用率是 95%，脚本会输出什么？如果 `/var` 分区是 95% 但根分区是 10% 呢？
> 3. 这个脚本还有至少两个明显的问题（不只这两个），请指出并修正。

### 四、综合实践

1. 写一个脚本 `~/lab7/kerneltop.sh`，把本章的技巧串成一个完整工具。要求：
   - 有 `#!/bin/bash` 和 `set -euo pipefail`，并且**不使用** `|| true`
   - 用 heredoc 写一段使用说明作为 `--help` 的输出内容，说明里要**解释** `2>&1` 的顺序为什么重要
   - 从 `/var/log/syslog` 或 `/var/log/kern.log` 中提取所有含关键字的消息（关键字通过第一个位置参数传入，未传时用一个默认值），按"消息前 3 个词"聚合计数，输出前 10 名，格式为 `次数  消息前若干词`，并用 `column -t` 对齐
   - 用 `tee` 把完整结果同时写到 `/tmp/kerneltop-<日期>.log`（**追加**）并在屏幕上显示最后 20 行
   - 用 `xargs -r` 把匹配到的**文件路径**列表交给 `ls -lh` 统计它们占了多少空间，且必须处理路径里可能有空格的情况
   - 用 `/dev/fd` 或 `/dev/stdin` 做**一件**管道里做不到的事，并说明是哪件、为什么管道做不到
   - 用 `LC_ALL=C` 保证排序结果在任何机器上一致
   - 末尾明确区分"查到了东西"和"什么都没查到"两种结果
   - 用 `bash -n kerneltop.sh` 检查语法

2. 你要给团队写一份《文本流规范》，必须包含以下内容：
   - **重定向决策表**：针对"既要屏幕又要文件"、"只要文件"、"只要屏幕"、"要丢弃错误"这四种需求各自的标准写法，以及每个写法的反例（写出来并说明为什么错）
   - **管道三条铁律**：每条都要给出违反它的真实后果，并各配一个错误示例和一个正确示例
   - **`sort` / `uniq` / `xargs` 的顺序规范**：为什么是这个顺序，写错时的**症状**是什么（写症状，不要写定义）
   - **`&>` 的立场**：写清楚你们团队用还是不用；如果不用，在什么条件下允许用
   - **`xargs -r` 的立场**：哪些情况**必须**加、哪些可以不加，以及 macOS 兼容性对你们团队意味着什么
   - **一份"新人最容易写错的五个重定向"清单**，每条写清楚现象、根因、正确写法
   - 至少两条"我们团队不这么写，因为……"的特有规定，并说明理由

---

**下一章预告**：第 8 章《grep / sed / awk 三剑客》——本章的管道只是把字节原样传递，真正要"按模式挑出来"和"按规则变形"，就得靠 `grep`、`sed`、`awk` 这三个真正的文本处理器。你会发现本章的 `cut -d: -f1` 在 `awk '{print $1}'` 面前有多苍白无力，也会第一次理解为什么 `sed` 能一行改一万个文件却不需要把文件读进内存。

---

*本章完。*
