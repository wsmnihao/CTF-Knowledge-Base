# 第 5 章 文件操作与归档压缩

> **本章目标**：读完后你能——
> 1. 说清 `cp`、`mv`、`rm` 三个最常用命令各自「最可能出事」的那个参数，并给出防御写法
> 2. 解释为什么 `mv` 一个大目录在同一个文件系统里是瞬间的、跨文件系统却要等很久，并说出跨文件系统移动正在被写入的文件会发生什么
> 3. 在文件被删除但仍有进程持有它的情况下，把数据完整救回来
> 4. 独立完成一次 `tar` 打包与解包，正确使用压缩参数、`-C`、`--exclude` 和 `--strip-components`
> 5. 用 `rsync` 做增量镜像，并解释路径末尾那个斜杠为什么决定了「同步内容」还是「同步目录本身」
> 6. 写出安全的 `find` 批量处理命令，并说清 `-exec {} +` 与 `xargs` 的分工
>
> **前置知识**：第 3 章《终端、Shell 与命令基础》、第 4 章《文件系统与目录结构》
>
> **预计耗时**：75 分钟

这一章讲的三个命令，你在 Linux 上敲过它们的次数一定远超其他任何命令。`cp`、`mv`、`rm`。

**但也正因为高频，它们是全书最容易造成不可逆损失的工具。** `rm` 没有回收站，不弹确认框，写错了也没有后悔药。这一章会把「安全写法」和「为什么必须这么写」绑在一起讲——不是让你记住几条咒语，而是让你看到每个命令底下藏着什么。

同时本章要解决一个很实际的问题：**数据怎么打包、怎么传输、怎么批量处理**。tar / gzip / rsync / find 这四组工具是运维日常里出现频率最高的组合拳。

---

## 5.1 `cp`：那个默认会覆盖你的参数

### 默认行为：三个「不」

`cp` 在**不做任何询问**的情况下直接覆盖目标文件。Ubuntu 默认**没有**给 `cp` 加 `-i` 交互确认（很多桌面发行版加了，这里没有）。

而且默认 `cp` 有三个「不」：

- **不**保留时间戳（目标文件的时间变成"现在"）
- **不**保留属主（非 root 无法保留）
- **不**保留符号链接本身——它会**跟随**链接，复制链接指向的实际内容

```bash
$ echo hello > a.txt
$ cp a.txt b.txt
$ ls -l --time-style=+%H:%M a.txt b.txt
```

```console
-rw-r--r-- 1 user user 6 10:45 a.txt
-rw-r--r-- 1 user user 6 10:45 b.txt
```

### 最该记住的那个坑：目标是不是目录

这是 `cp` 用错频率最高的地方，规则只有一句话：**如果最后一个参数是已存在的目录，源会被放进那个目录里。**

```bash
$ mkdir -p dst
$ cp a.txt dst/
```

```console
dst/a.txt
```

```bash
$ cp a.txt dst/b.txt      # 目标不是已存在的目录 -> 改名为 b.txt
```

```console
dst/b.txt
```

脚本里如果用变量拼路径，这个差异会变成极难查的 bug。**防御写法：永远写全目标路径，包括文件名**，或者用 `cp -T` 强制把目标当普通文件（`-T` 出错而不是放进目录里）。

### `-r` vs `-a`：符号链接的差异是陷阱

```bash
$ cp -r  源/ 目标/    # 递归复制，但会跟随符号链接
$ cp -a  源/ 目标/    # archive = -dR --preserve=all，保留符号链接本身
```

`cp -a` 里的 `-d` 是关键：它让 `cp` 把符号链接**复制成符号链接**，而不是把目标文件的内容复制过来。

这个差异在两种情况下会咬人：

**（1）自引用的符号链接会让 `cp -r` 无限递归。**

```bash
$ ln -s . selflink
$ cp -r 源/ 目标/
```

```console
cp: cannot copy a directory into itself, '源/selflink' into '目标/源/selflink'
```

GNU `cp` 会检测并拒绝，但**其他工具（尤其是老脚本里的 `tar` 不带 `-h`）不一定**。真实事故里有整个 `/home` 被复制爆的情况。

**（2）`cp -a` 才会正确保留 Apache / Nginx 的链接结构。**

配置文件里满是 `sites-enabled/default -> ../sites-available/default` 这种软链。`cp -r` 会把它变成两份独立的真实文件，之后 `a2ensite`（管理软链的命令）就完全失效了。

### 该用哪个

| 场景 | 写法 |
|---|---|
| 复制单个普通文件 | `cp 源 目标` |
| 复制目录，要保留一切 | `cp -a 源/ 目标/` |
| 复制目录，不在乎权限/时间/链接 | `cp -r 源 目标` |
| 覆盖前想确认一次 | `cp -i 源 目标` |
| 目标必须不存在，否则报错 | `cp -T 源 目标` |

**默认用 `-a`**，除非你明确知道自己不需要保留任何属性。

---

## 5.2 `mv` 跨文件系统的真实代价

### 同文件系统：只是改了个目录项

在同一个文件系统内，`mv` 调用的是 `rename(2)` 系统调用——内核只修改目录里的一个指针，**不复制任何数据**，所以无论文件是 1 字节还是 1 TB，都是瞬间完成，而且**原子**（要么成功要么失败，不存在中间状态）。

### 跨文件系统：复制 + 删除

一旦源和目标在不同文件系统（比如 `/home` 到 `/mnt/usb`），`mv` 退化成：

1. **完整复制**整个目录树到目标
2. **逐个删除**源文件

三个后果：

- **慢**。1GB 文件跨 `mv` 可能要几十秒，你能明显感到停顿。
- **不原子**。中途失败（磁盘满、权限不足、被 Ctrl+C）会留下**一半新一半旧**的烂摊子。
- **正在被写入的文件会丢数据**。这是最严重的。

```bash
$ mv /home/user/大文件.log /mnt/usb/
```

**为什么正在写入的文件会丢数据**：`mv` 跨文件系统时做的是"新建一个副本 + 删掉原件"。假设某个进程正持有原件的 fd 写日志——内核里那份数据还在（因为 fd 没关），但**文件名已经没了**。`mv` 返回 0，一切看着正常，而那个进程还在往一个"已经没有名字"的 inode 里写，直到它退出，数据彻底消失。

同文件系统内做 `mv` 就没有这个问题：inode 没变，只是名字变了，进程持有的 fd 照常有效。

> **这就是为什么"日志轮转要跨文件系统"必须小心**。第 14 章讲的正确做法是**先在同一文件系统内 `mv`（瞬间完成），再 `cp` 或 `gzip` 慢活**，顺序反了就会丢数据。

---

## 5.3 `rm`：没有回收站的删除

### 必须建立的三条认知

**（1）`rm` 不弹确认框。** `rm -i` 会弹，但默认不弹。

**（2）`rm` 不进回收站。** 删除后唯一的"后悔药"是文件系统层面的救援（第 4 章说过的 ext4 `debugfs`，那是专家操作，且不保证成功）。

**（3）`rm -rf` 遇到错误也会继续。** `-f` 的字面意思是 force——权限不足、文件不存在、目录无法进入，**全部忽略，继续删剩下的**。这是它和 `rm -r` 的关键区别，也正是它危险的原因：你以为它会停下来，其实不会。

### `rm -rf /` 保护了什么，没保护什么

GNU `coreutils` 的 `rm` 默认开启 `--preserve-root`，会拒绝删除 `/`：

```bash
$ sudo rm -rf /
```

```console
rm: refusing to remove '/'
```

**但这层保护非常有限**，以下三个都是真实的删除方式：

```bash
$ sudo rm -rf /*        # 通配符展开成一级条目，绕过检查
$ cd / && sudo rm -rf . # 当前目录就是根
$ sudo rm -rf "$UNSET_VAR"   # 变量为空时，如果写成 $VAR/ 就变成 rm -rf /
```

最后一种最隐蔽。**防御写法是给变量加引号**：

```bash
# 危险：变量为空时变成 rm -rf /
rm -rf $TARGET/

# 安全：变量为空时变成 rm -rf ''，报错但什么都不删
rm -rf "$TARGET"
```

这和第 3 章讲的引号规则是同一件事：**变量永远加双引号**。`rm` 是这条规则后果最严重的地方。

### 唯一可靠的删除习惯

```bash
# 1. 永远先预演：把 rm 换成 echo，看清楚要删什么
$ echo -e "\n\033[31mDEL\033[0m $HOME" && find ~/Downloads -name '*.iso' -mtime +30
```

```console
DEL /home/user
/home/user/Downloads/ubuntu-24.04.3.iso
/home/user/Downloads/old-kernel.iso
```

**确认清单没问题，再去掉 `echo` 真的删。** 这个习惯能挡掉 95% 的误删事故。

```bash
# 2. 实在想删得放心，用回收站
$ apt install trash-cli
$ trash-put ~/那个文件
```

`trash-put` 走的是桌面环境的回收站接口，误删了可以还原——这是 Linux 上唯一名副其实的"后悔药"。

### 唯一真正的后悔药：进程还持有文件

这是本节最实用的技巧，也是第 4 章 `/proc/PID/fd` 的直接应用。

**Linux 删除文件时只是删掉目录项。** 如果有进程仍然打开着这个文件，内核会等所有 fd 关闭后才真正释放数据块。所以：

```bash
$ lsof | grep 已删除的文件名
```

```console
nginx  1234  root  3w  0  12345 0t  SW 09:12   0t 0 20481 0t 0 0     0 2851 0    0 0t 0 1024 0 1518 1789335120
COMMAND  PID USER  FD  TYPE DEVICE    SIZE/OFF NLINK NODE NAME
nginx    1234 root    3w   REG  253,0     20481     0 2851 /var/log/nginx/access.log (deleted)
```

**`(deleted)` 就是机会。** 把 fd 直接复制出来：

```bash
$ sudo cp /proc/1234/fd/3 ~/access-log-rescued.log
$ sudo tail -f /proc/1234/fd/3        # 还能持续抓后续内容，直到进程退出
```

> ⚠️ 前提是**那个进程还活着**。一旦进程退出，fd 关闭，数据立即被释放，没有第二次机会。所以发现误删后第一件事是**停止那个服务**（不是停止写入，是停掉整个服务让它关 fd——但更好的做法是别停，用 `cp` 抢在前面救），第二件事才是执行恢复。

---

## 5.4 `mkdir -p` 与 `rmdir`

### `-p` 的两个作用

```bash
$ mkdir -p /tmp/proj/src/utils     # 中间层不存在也能一次建出来
$ mkdir -p /tmp/proj/src/utils     # 再执行一次不报错（幂等）
```

**`mkdir -p` 是幂等的**，这是它在脚本里的核心价值：不管执行一次还是十次，结果都一样，不需要先判断存不存在。

对比一下：

```bash
$ mkdir a/b/c
mkdir: cannot create directory 'a/b/c': No such file or directory
$ mkdir -p a/b/c                  # 正确
```

> 注意 `mkdir -p` **不会**因为父目录是文件而报错纠正——`mkdir -p a/b` 如果 `a` 是个普通文件，会报 `Not a directory`。这个错误信息很容易误导人以为是权限问题。

### `rmdir` 的安全设计

```bash
$ rmdir 空目录        # 只删空目录
$ rmdir 有文件的目录
rmdir: failed to remove '有文件的目录': Directory not empty
```

**`rmdir` 拒绝删除非空目录**——这是一个内建的保护，比 `rm -rf` 安全得多。写脚本清理临时目录时，优先用 `rmdir`：

```bash
$ rmdir /tmp/tmpdir 2>/dev/null || echo "目录非空，跳过"
```

递归删除空目录树的命令是 `rmdir -p`：

```bash
$ rm -rf /tmp/build && mkdir -p /tmp/build/a/b/c
$ rmdir -p /tmp/build/a/b/c
```

```console
/tmp/build
```

一次删掉了三层空目录。这是清理"空壳目录树"最安全的工具。

---

## 5.5 通配符批量操作：预演文化

第 3 章讲过通配符，这里补上它和 `rm` 组合时的正确姿势。

### 陷阱一：匹配不到时

```bash
$ rm *.txt
rm: cannot remove '*.txt': No such file or directory
```

目录里没有 `.txt` 文件时，通配符**原样传给命令**，命令把 `*.txt` 当成一个不存在的文件名。这个行为在 `rm` 上无害，但到了 `scp`、`docker` 之类会把参数当路径解析的地方就会出错。

### 陷阱二：匹配到了太多

```bash
$ rm -rf ~/Downloads/*
```

`Downloads` 里哪天混进了一个子目录呢？`rm -rf` 会**递归**删掉整个子目录树，而且 `-f` 保证遇到任何权限问题都继续。

### 正确姿势：三层防护

```bash
# 第 1 层：用 find 精确筛选（比通配符能表达的条件多得多）
$ find ~/Downloads -type f -name '*.iso' -mtime +30 -print

# 第 2 层：看清清单，记住真实数量
$ find ~/Downloads -type f -name '*.iso' -mtime +30 -print | wc -l

# 第 3 层：加 -print 再看一遍，然后换成 -delete
$ find ~/Downloads -type f -name '*.iso' -mtime +30 -delete
```

`find` 的 `-print` 和 `-delete` 只差一个词，这让它成为一个**天然的预演机制**。这是本节最值得记住的技巧。

---

## 5.6 tar：打包、压缩、看内容

### 先分清：tar 不是压缩

`tar` 是**归档（archive）**——把多个文件和目录按顺序拼成一个文件，加上目录结构。`gzip` 才是**压缩**。所以你会见到两个后缀：

- `.tar` — 只打包，没压缩
- `.tar.gz` / `.tar.bz2` / `.tar.xz` — 打包后用对应算法压缩

### 五个最常用的写法

```bash
# 打包（c = create）
$ tar -cvf 项目.tar 项目目录/

# 查看内容，不解包（t = list）
$ tar -tvf 项目.tar

# 解包（x = extract，v = verbose）
$ tar -xvf 项目.tar

# 打包 + gzip 压缩（z 走 gzip）
$ tar -czf 项目.tar.gz 项目目录/

# 打包 + xz 压缩（J 走 xz）
$ tar -cJf 项目.tar.xz 项目目录/
```

四个字母含义：**c**reate / e**x**tract / **v**erbose / lis**t**。

> `tar -zxvf` 里 `z` 只在**解压时**才需要，`xvf` 不带 `z` 也能解开 `.gz`（GNU tar 自动识别）。但**打包时 `-z` 必须显式写**，否则你得到的是一个体积没变小、却顶着 `.gz` 名字的 `.tar`。

### `-C`：在指定目录下打包

```bash
$ tar -czf /tmp/备份.tar.gz -C /home/user 文档/
```

`-C` 出现在文件名之前，意思是"接下来的路径相对于这个目录"。这条命令生成的是 `备份.tar.gz`，解开后是 `文档/`，**而不是** `user/文档/`。

这个技巧的价值是**打包结果不依赖你当前的所在目录**，脚本里必须用。

### 那个关键的 `.`

```bash
$ tar -czf 备份.tar.gz -C /home/user .        # 解开后直接是内容
$ tar -czf 备份.tar.gz -C /home/user 文档      # 解开后是 文档/
```

打包 `.`（当前目录）而不是目录名，是做**增量备份**的标准写法——解包时内容直接落在目标目录，不需要先进去再退出来。

### `--exclude`：排除不需要的东西

```bash
$ tar -czf 备份.tar.gz -C /home/user \
    --exclude='*.log' --exclude='.cache' --exclude='node_modules' .
```

被排除的文件在归档里**完全不存在**，解压后也不会生成占位文件。

### `--strip-components`：解包时砍掉前几层

```bash
$ tar -tzf 备份.tar.gz | head -3
```

```console
用户名/文档/a.txt
用户名/文档/b.txt
用户名/文档/子目录/c.txt
```

```bash
$ tar -xzf 备份.tar.gz --strip-components=2
```

解压后当前目录下直接出现 `a.txt`、`b.txt`、`子目录/`，前两层被砍掉。

> ⚠️ **从不可信来源解包 tar 是危险的。** 恶意 tar 可以用 `../../etc/passwd` 这样的路径名，在解包时把文件写到目录之外，覆盖你的配置。GNU tar 对这类路径有防护但**不是绝对可靠**（历史上有 CVE）。实践规则：**只解包你信任来源的 tar**。第 20 章讲容器时会再次碰到这个问题。

---

## 5.7 gzip / bzip2 / xz：速度与体积的取舍

三个压缩算法，同一份文本数据（1MB）的典型结果：

| 算法 | 后缀 | 压缩后体积 | 压缩速度 | 解压速度 | 日常场景 |
|---|---|---|---|---|---|
| `gzip` | `.gz` | 约 4.0 MB → **35%** | **快** | 快 | 默认首选 |
| `bzip2` | `.bz2` | 约 32% | 慢 | 中 | 几乎已被 xz 取代 |
| `xz` / `lzma` | `.xz` | 约 28% | **很慢** | 中等 | 发布包、备份归档 |

**选择规则**：

- **日常压缩、日志轮转、临时文件 → `gzip`**。速度优势在日常使用中远比那 7% 的体积重要。
- **需要传给别人、要长期存档、关心传输时间 → `xz`**。体积收益在跨网络传输时能抵消压缩耗时。
- **`bzip2` 现在基本没有选它的理由**，只在必须兼容老系统时用。

### 常用参数

```bash
$ gzip -k 文件           # -k 保留原文件（默认会删掉原文件！）
$ gzip -d 文件.gz        # 解压
$ gzip -l 文件.gz        # 看压缩前后比例，不实际解压
$ gzip -9 文件           # 最高压缩比（1 最快，9 最好）
$ gzip -c 文件 | 命令     # -c 输出到 stdout，不改原文件
```

> ⚠️ **`gzip` 默认删除原文件**，这是很多人以为"文件怎么没了"的原因。压缩日志时正确的流水线是 `gzip < 文件 > 文件.gz`，或者用 `-k`。

> **已经是压缩格式的数据不要再压缩**。jpg、mp4、zip、xlsx 内部已经是压缩格式，gzip 它们基本不减小体积，纯属浪费 CPU。判断方法：`file 文件`（第 4 章）会直接告诉你它是不是压缩数据。

---

## 5.8 zip：什么时候必须用它

`tar` 和 `zip` 的选择不是"哪个更好"，而是**目标平台决定**。

| | `tar` | `zip` |
|---|---|---|
| 跨 Windows/macOS | 需要额外工具 | 原生支持 |
| 保留 Unix 属主和权限 | ✅ | ⚠️ 部分保留 |
| 保留 xattr / ACL | ✅ | ❌ |
| 保留符号链接 | ✅ | ❌ |
| 保留稀疏文件空洞 | ✅ | ❌ |
| 增量/同步 | ❌ | ❌ |

**结论**：

- **自己机器之间传、备份、打包 → `tar`**（属性保留完整）
- **发给不装 tar 的 Windows 用户 → `zip`**（双击就能解压）
- **需要保留符号链接或权限 → `tar`**，zip 会把它们悄悄丢掉

```bash
$ zip -r 项目.zip 项目目录/     # -r 递归
$ unzip -l 项目.zip             # 只列出不解压
$ unzip -t 项目.zip             # 测试完整性（-t = test）
```

`unzip -t` 是在传输后验证压缩包完好的最快手段，比直接解压安全——一个损坏的 zip 可能解压到一半才失败，那时你已经污染了目标目录。

---

## 5.9 rsync：增量同步，以及那个著名的斜杠陷阱

### 为什么不是 scp

`scp` 是**传输**工具：`scp -r 源 目标` 就把源完整传一遍。10GB 目录改了一个文件，`scp` 也要传 10GB。

`rsync` 是**同步**工具：它先比较两端，**只传差异块**。同样的场景只传几 KB。`rsync` 还保留权限、时间戳、属组，并在失败时能重试。

### 那个斜杠

这是 `rsync` 最高频的错误：

```bash
rsync -avz 源/  目标/    # 同步「源目录里的内容」  -> 目标/xxx
rsync -avz 源   目标/    # 同步「源这个目录本身」  -> 目标/源/xxx
```

**末尾的 `/` 决定了是同步"里面的东西"还是"这个东西"。** 加错了不会报错，只会让目标多一层或少一层目录。

> **口诀：源的末尾斜杠 = 要它的内容；目标的末尾斜杠通常无害（rsync 会自动建），但源的必须有且明确。**

### `--delete` 的破坏力

```bash
$ rsync -avz --delete 源/ 目标/
```

`--delete` 让 rsync **删除目标里源里不存在的文件**。它的本意是"让两边完全一致"，但也意味着：

**只要源路径写错一个字符，目标目录就会被清空。**

```bash
$ rsync -avz --delete /data/ 目标/     # 正确
$ rsync -avz --delete /dat/  目标/     # 目标会被清成只剩 /dat 里有的东西
$ rsync -avz --delete 源/ ~/backup/    # 如果 ~/backup 写成了 /  → 系统根目录被清
```

**`rsync --delete` 是本书最危险的单条命令**，危险程度超过 `rm -rf`。

### 唯一安全的用法：永远先 `--dry-run`

```bash
$ rsync -avzn --delete 源/ 目标/
```

`-n` 就是 `--dry-run`，只打印不执行。**把 `-n` 加上去，看到输出满意了，去掉 `-n` 再跑一次。** 这是 `rsync --delete` 唯一可靠的操作纪律。

搭配两个额外保险：

```bash
# --backup：被 --delete 删掉的文件先挪到备份目录，不直接消失
$ rsync -avz --delete --backup --backup-dir=/tmp/rsync-backup 源/ 目标/
```

```bash
# 排除关键文件，防止被 --delete 波及
$ rsync -avz --delete --exclude='.git/' 源/ 目标/
```

### 远程同步

rsync 两端都要有：

```bash
$ rsync -avz --delete 源/ user@主机:/目标/
$ rsync -avz user@主机:/源/ 目标/
```

第 17 章讲 SSH 时会深入 rsync 隧道和密钥免密登录的配合。

---

## 5.10 find：能力最强的批量工具

`find` 的语法是 `find 起点 条件 动作`。第 4 章说过它能读目录，但真正的威力在条件组合。

### 最常用的五个条件

```bash
$ find /var/log -type f -name '*.log'          # 类型 + 名称
$ find /home -type d -name 'node_modules'      # 只找目录
$ find /tmp -type f -size +100M                # 大于 100MB
$ find /var/log -type f -mtime +30             # 30 天前修改过
$ find /tmp -type f -mmin -10                  # 10 分钟内修改过
```

### `-mtime` 的取整陷阱

`find` 对 `-mtime` **向下取整**，这一点非常反直觉：

| 写法 | 含义 |
|---|---|
| `-mtime 0` | 今天改过（24 小时内） |
| `-mtime 1` | 1 到 2 天前改过 |
| `-mtime +7` | **至少 8 天前**改过 |
| `-mtime -7` | 7 天以内改过 |
| `-mtime -1` | 24 小时内改过 |

所以"删除 7 天前的文件"要写 `+7`，它实际删的是 8 天前的。**差一天不算错，但你得知道自己差了一天。**

### `-exec {} +` 与 `xargs`：本节的核心

```bash
# 语义化写法：对每个匹配结果执行一次命令
$ find . -name '*.txt' -exec rm {} \;

# 批量写法：把所有结果攒成一批，多次调用（通常快很多）
$ find . -name '*.txt' -exec rm {} +

# 等价但更高效的写法
$ find . -name '*.txt' -print0 | xargs -0 rm
```

`{}` 是结果的占位符，`\;` 表示"每个结果单独执行一次"，`+` 表示"攒够一批再执行"。

**`{} +` 比 `{} \;` 快一到两个数量级**，因为后者每个文件都要 `fork` 一次 `rm`。

**它和 `xargs` 的分工**（第 7 章讲过 xargs，这里补齐选择依据）：

| | `find -exec {} +` | `find ... \| xargs` |
|---|---|---|
| 能否中间接管道 | ❌ 只能在末尾 | ✅ 可以 `\| wc -l` 先统计 |
| 文件名含空格/换行 | ✅ 自动处理 | 必须配 `-print0` + `-0` |
| 能控制并发 | ❌ | ✅ `xargs -P 8` |

**默认用 `-exec {} +`**（安全）。只有在需要中间加管道时才用 `xargs`，而且**永远配 `-print0` / `-0`**：

```bash
$ find . -type f -name '*.log' -print0 | xargs -0 grep -l 'ERROR'
```

> ⚠️ 不加 `-0` 是经典事故：`find . -name '*.txt' | xargs rm` 遇到名为 `我的 文件.txt` 的文件会报 `rm: cannot remove '我的'`。**空格不是分隔符，是参数边界。**

### `-delete` 与 `-prune`

```bash
$ find /data -type f -name '*.tmp' -delete
```

`-delete` 是**直接删除，没有确认**。它隐含 `-depth`（后序遍历），且**和 `-prune` 不能同时用**。

`-prune` 的作用是"这个分支我已经处理过了，别往里走"：

```bash
# 在 /data 里查找，但完全跳过 node_modules
$ find /data -name node_modules -prune -o -type f -name '*.log' -print
```

这条 `-prune -o` 的写法要读成：**（遇到 node_modules 就剪掉）否则（按条件打印）**。`-o` 是逻辑或，是 `find` 里表达"例外"的常用手段。

---

## 5.11 locate 与 find 的取舍

`find` 是**实时遍历**文件系统，所以永远准确，但在有几百万文件的目录上很慢。

`locate` 是**查数据库**——`updatedb` 定期扫描一遍所有路径存进索引，`locate` 只查索引，所以快，但**可能返回已经不存在的路径**。

```bash
$ locate sshd_config
$ sudo updatedb                     # 手动刷新索引
$ locate -i sshd                   # 忽略大小写
$ locate -e sshd_config            # -e 确认文件确实存在
```

**取舍规则**：

- **要绝对准确、要按条件组合筛选 → `find`**
- **只记不清路径、只想按名字模糊搜一下 → `locate`**
- **脚本里需要确定性 → `find`**（`locate` 的结果可能过期，脚本因此出错）

Ubuntu 上 `locate` 由 `plocate` 提供，比老的 `mlocate` 更快也更省内存。

---

## 5.12 本章小结

**`cp` 默认会静默覆盖，且不保留时间戳、属主和符号链接。** 最该记的坑是「目标是不是已存在目录」——决定源被放进去还是改名。默认用 `-a`，需要精确控制目标时加 `-T`，因为 `-a` 里的 `-d` 是符号链接能正确保留的原因。

**`mv` 同文件系统是 `rename(2)`，瞬间且原子；跨文件系统退化成"复制 + 删除"**，因此慢、不原子，而且**正在被进程写入的文件会丢失后续数据**。跨文件系统的移动必须先做备份。

**`rm` 不进回收站、不弹确认、`-f` 遇错不停。** GNU 的 `--preserve-root` 只挡 `rm -rf /`，挡不住 `rm -rf /*` 和变量为空的情况——**给变量加双引号**是唯一可靠防护。唯一的后悔药是 `/proc/PID/fd`：文件被删但进程还持有时可以救回来。

**`mkdir -p` 幂等，`rmdir` 拒绝删非空目录**，这两个安全特性在脚本里应该优先使用。

**通配符批量删除的正确姿势是先 `find -print` 预演再 `find -delete`**，`-print` 和 `-delete` 只差一个词，天然构成预演。

**tar 是归档不是压缩**，压缩要显式加 `-z`（gzip）或 `-J`（xz）；`-C` 让打包结果不依赖当前目录，`--exclude` 排除的内容在归档里完全不存在，`--strip-components` 砍掉解包后的前几层。只解包可信来源的 tar。

**gzip 日常用，xz 存档用**，bzip2 基本没有理由选。gzip 默认删原文件，要保留加 `-k`。

**rsync 只传差异块，但 `--delete` 是全书最危险的单条命令**——源路径错一个字符就清空目标。纪律是**永远先加 `-n` 干跑**，必要时配 `--backup-dir`。源的末尾斜杠决定同步内容还是目录本身。

**`find -exec {} +` 比 `{} \;` 快一到两个数量级**，因为后者每个文件 fork 一次；需要中间加管道时才用 `xargs`，且**必须配 `-print0` / `-0`**。`-mtime` 向下取整，`+7` 实际是 8 天前。

**`find` 实时准确但慢，`locate` 快但可能过期**，脚本里用 `find`。

---

## 5.13 动手实验：用 rsync 做本地镜像备份

> 环境：Ubuntu 24.04 LTS，Server 版亦可
> 耗时：约 20 分钟

### 目标

用 `rsync` 建立一份本地目录镜像，亲眼验证三件事：增量传输、斜杠语义差异、以及 `--delete` 同步删除的效果和它的危险性。

### 步骤

**第 1 步：造一份有内容的源目录**

```bash
$ mkdir -p /tmp/src/项目/{文档,图片}
$ for i in $(seq 1 5); do echo "内容 $i" > /tmp/src/项目/文档/文件$i.txt; done
$ echo "logo" > /tmp/src/项目/图片/logo.txt
$ find /tmp/src -type f | sort
```

```console
/tmp/src/项目/图片/logo.txt
/tmp/src/项目/文档/文件1.txt
/tmp/src/项目/文档/文件2.txt
/tmp/src/项目/文档/文件3.txt
/tmp/src/项目/文档/文件4.txt
/tmp/src/项目/文档/文件5.txt
```

**第 2 步：干跑（关键纪律）**

```bash
$ rsync -avzn /tmp/src/项目/ /tmp/dst/
```

```console
building file list ... done
./文档/
./文档/文件1.txt
./文档/文件2.txt
./文档/文件3.txt
./文档/文件4.txt
./文档/文件5.txt
./图片/
./图片/logo.txt

sent 71 bytes  received 230 bytes  2,404.00 bytes/sec
total size is 301  speedup is 0.84
```

注意 `-n` 在这里：`drwxr-xr-x` 和 `-rw-r--r--` 这些属性列因为 `-a` 被保留了。**先把这一步看清楚再往下走。**

**第 3 步：确认斜杠语义**

```bash
$ rsync -avz /tmp/src/项目/ /tmp/dst/          # 有末尾斜杠
$ find /tmp/dst | sort
```

```console
/tmp/dst
/tmp/dst/文档
/tmp/dst/文档/文件1.txt
...
```

```bash
$ mkdir -p /tmp/dst2
$ rsync -avz /tmp/src/项目 /tmp/dst2/          # 无末尾斜杠
$ find /tmp/dst2 | sort
```

```console
/tmp/dst2
/tmp/dst2/项目
/tmp/dst2/项目/图片
/tmp/dst2/项目/图片/logo.txt
/tmp/dst2/项目/文档
...
```

**观察**：有斜杠时内容直接铺进 `/tmp/dst`；无斜杠时**多了一层 `项目/`**。这就是那个陷阱。

**第 4 步：真正同步，并验证增量**

```bash
$ rsync -avz /tmp/src/项目/ /tmp/dst/
$ rsync -avzn --delete /tmp/src/项目/ /tmp/dst/
```

```console
building file list ... done

sent 71 bytes  received 230 bytes  2,404.00 bytes/sec
total size is 301  speedup is 0.84
```

**文件列表是空的**，因为两边已经完全一致——**这就是增量的含义**。如果用 `scp -r` 同样这一步会重新传 6 个文件。

**第 5 步：制造一个差异，再同步**

```bash
$ echo "新增内容" > /tmp/src/项目/文档/文件6.txt
$ rm /tmp/src/项目/文档/文件1.txt
$ rsync -avzn --delete /tmp/src/项目/ /tmp/dst/
```

```console
building file list ... done
deleting ./文档/文件1.txt
./文档/文件6.txt

sent 122 bytes  received 18 bytes  2,800.00 bytes/sec
total size is 317  speedup is 2.26
```

**观察两件事**：新增文件会被传，源里删掉的文件**在目标里也会被删**（`deleting`）。这就是 `--delete`。

**第 6 步：验证删除确实发生了**

```bash
$ ls /tmp/dst/文档/
```

```console
文件2.txt  文件3.txt  文件4.txt  文件5.txt  文件6.txt
```

`文件1.txt` 没了，镜像和源完全一致。

**第 7 步：亲手感受 `--delete` 的危险**

这一步**故意演示**一个真实事故的成因。

```bash
$ mkdir -p /tmp/src/重要数据
$ echo "绝对不能丢" > /tmp/src/重要数据/合同.txt
$ rsync -avz /tmp/src/重要数据/ /tmp/dst/文档/
```

```console
building file list ... done
./重要数据/
./重要数据/合同.txt
```

```bash
$ rm -rf /tmp/src/重要数据
$ rsync -avzn --delete /tmp/src/项目/ /tmp/dst/
```

```console
building file list ... done
deleting ./重要数据/
deleting ./重要数据/合同.txt
deleting ./文件2.txt
deleting ./文件3.txt
deleting ./文件4.txt
deleting ./文件5.txt
deleting ./文件6.txt
```

**观察**：源里那个目录没了，`--delete` 就准备把目标里对应的全部内容一起删掉。

> ⚠️ **如果你现在把 `-n` 去掉执行，上面这一串删除就会真的发生。** 这就是为什么 `--delete` 必须配干跑。这就是本实验最重要的产出——**这个事故不需要黑客，只需要一次 `rm` 打错路径**。

**第 8 步：用 `--backup-dir` 做一层保险**

```bash
$ mkdir -p /tmp/rs-backup
$ rsync -avz --delete --backup --backup-dir=/tmp/rs-backup /tmp/src/项目/ /tmp/dst/
$ find /tmp/rs-backup -type f | sort
```

```console
/tmp/rs-backup/文件2.txt
/tmp/rs-backup/文件3.txt
/tmp/rs-backup/文件4.txt
/tmp/rs-backup/文件5.txt
/tmp/rs-backup/文件6.txt
/tmp/rs-backup/重要数据/合同.txt
```

**被删掉的文件没有消失，而是被保存到了备份目录。** 这是 `--delete` 唯一推荐的加固方式。

### 验证

```bash
# 1. 镜像是否真的和源一致（-c = checksum，比对比大小更可靠）
$ rsync -avzc --delete /tmp/src/项目/ /tmp/dst/

# 2. 确认备份目录里有你本以为会丢的文件
$ cat /tmp/rs-backup/重要数据/合同.txt

# 3. 确认挂载表和环境干净
$ df -h /tmp | tail -1
```

```console
合同内容
```

第一次 `rsync -avzc` 应该没有任何输出——两边逐字节一致。

### 思考

1. 第 4 步两次同步的 `sent`/`received` 字节数说明了什么？如果换成 `scp -r`，这两步各会传输多少数据？
2. 第 3 步如果源写成 `/tmp/src/项目` 但目标写成 `/tmp/dst/项目/`，结果会和上面一样吗？为什么源和目标的斜杠规则看起来是对称的，实际却不能这么记？
3. 如果 `/tmp/src` 挂在一个很慢的网络文件系统上（源码是 bind mount 卷进去的），第 4 步的干跑还会准确反映真实耗时吗？`--dry-run` 到底扫描了多少数据？
4. `--delete` 和 `rm -rf` 的危险性相比，哪个更隐蔽？为什么？
5. 如果你只想让目标里**多余的**文件被清理，但想保留目标独有的文件（比如你在目标上手工加了 `.gitignore`），`--delete` 应该配合哪个选项？
6. 第 7 步那个"重要数据"场景，如果它是**目标独有**而不是源独有（你从没同步过它，只是手工放在目标里），`--delete` 会删掉它吗？为什么这个不对称性很重要？

### 清理

```bash
$ sudo umount /tmp/bindpoint 2>/dev/null
$ rm -rf /tmp/src /tmp/dst /tmp/dst2 /tmp/rs-backup
$ ls /tmp
```

> ⚠️ 清理完再确认一遍 `find /tmp -maxdepth 1 -name 'dst*' -o -name 'src'`，确保没有残留。本实验全程在 `/tmp` 下操作，没有碰任何系统目录。

---

## 5.14 自测题

### 一、简答

1. `cp` 在什么情况下会把源文件"放进"目标目录而不是改名？写出一个能强制它改名的选项。
2. `cp -r` 和 `cp -a` 在处理符号链接上的区别是什么？这个差异会造成哪两类真实故障？
3. 为什么 `mv` 一个文件跨文件系统比同文件系统慢得多且不是原子的？在这个过程中，一个正在被进程写入的文件会发生什么？
4. `rm -f` 的 `f` 具体指什么？它为什么会让 `rm -rf` 比 `rm -r` 更危险？
5. 为什么给 `rm` 的参数加双引号能防住一类严重事故？举出变量为空时的具体展开结果。
6. 文件被 `rm` 之后仍然能被恢复，前提条件是什么？恢复命令是什么？为什么时间窗口很短？
7. 为什么 `mkdir -p` 适合写进脚本，而 `mkdir` 不适合？`rmdir` 的哪个设计使它比 `rm -r` 安全？
8. `gzip` 默认行为里哪一点最容易让人误以为文件丢了？如何避免？
9. `tar -czf` 里的 `z` 和 `tar -xf` 里省略的 `z` 有什么本质区别？为什么打包时不能省？
10. `rsync --delete` 的路径参数写错会造成什么后果？唯一可靠的操作纪律是什么？
11. `find -mtime +7` 实际筛选的是多少天以前修改的文件？这个取整行为为什么容易让人以为有 bug？
12. 在什么情况下必须用 `xargs` 而不是 `find -exec {} +`？不配 `-print0` / `-0` 会出什么问题？

### 二、命令填空

1. 复制目录并完整保留权限/时间戳/符号链接：________
2. 复制目标已存在时报错而不是放进去：________
3. 只看 `mv` 一个大目录跨文件系统是否还在传输（不实际改数据）：________
4. 列出某个被误删但仍被进程持有的文件（返回 `/proc/PID/fd` 路径）：________
5. 只删除空目录，且目录非空时报错：________
6. 打包 `/etc` 下的配置为压缩包，但排除 `.git` 和缓存：________
7. 解包时把归档里最前面两层目录去掉：________
8. 压缩文件但**保留**原文件：________
9. 测试 zip 包完整性而不解压：________
10. 用 rsync 做镜像，**只传差异**且把目标多余文件删掉（先干跑）：________
11. 找出 `/var/log` 下 7 天前的 `.gz` 日志并删除（先只打印）：________
12. 在 `/data` 里搜索但跳过 `node_modules` 目录：________
13. 把一批文件名可能含空格的文件安全地交给 `grep -l`：________
14. 刷新 locate 数据库：________

### 三、故障分析

**案例 1**

> 现象：运维同事写了个清理脚本：
> ```bash
> #!/bin/bash
> DIR=/data/reports/$1
> rm -rf $DIR/*.log
> ```
> 某天他执行 `./cleanup.sh 2024`，几秒后 `/data/reports` 下所有年份的目录连同里面的报表全部消失。
> 1. `rm -rf $DIR/*.log` 里到底删了什么？请在 shell 里推演一遍 `DIR` 被展开后的完整命令。
> 2. 这个脚本有**两个**独立的设计问题，分别是什么？
> 3. 重写成安全版本，要求：参数为空或不合法时拒绝执行；只删 `.log`；删除前先打印清单；用 `set -euo pipefail`。

**案例 2**

> 现象：一个用 `cp -r` 做部署的脚本上线后，Nginx 报 `site is disabled`。配置目录原本是这样：
> ```
> /etc/nginx/sites-enabled/默认站 -> ../sites-available/默认站
> ```
> 脚本执行 `cp -r /模板/nginx /etc/nginx/` 之后：
> ```
> /etc/nginx/sites-enabled/默认站      （变成普通文件）
> /etc/nginx/sites-available/默认站    （变成普通文件）
> ```
> 1. `cp -r` 对符号链接做了什么，导致这个结果？
> 2. 为什么这会让站点"看起来配置都在，但没生效"？
> 3. 部署脚本应该怎么改？改完之后要注意什么新问题？

**案例 3**

> 现象：一个 8GB 的日志目录需要定期归档到另一块磁盘。同事写了：
> ```bash
> mv /var/log/app/*.log /mnt/archive/
> gzip /mnt/archive/*.log
> ```
> 结果是归档出来的文件有一半是 0 字节，而且原始日志莫名其妙少了很多行。
> 1. `mv` 的这两个形式里，先做哪一个才能避免丢数据？为什么？（提示：结合第 5.2 节）
> 2. 就算顺序改对了，`mv` 通配符匹配到的文件如果数量超过 ARG_MAX 会发生什么？
> 3. 把这个脚本改成不会丢数据的版本，并且要能在匹配不到任何文件时安全退出（不报错）。

**案例 4**

> 现象：一条备份命令每天凌晨跑，最近一周的告警是"备份成功"，但恢复演练时发现三天前的备份包里缺了日志目录下的一个子目录。
> ```bash
> rsync -avz --delete /backup/ /data/     # 方向搞反了
> ```
> 1. 这条命令实际做了什么？（注意源和目标的位置）
> 2. 为什么"命令返回 0"掩盖了这个问题？
> 3. 怎么改才能同时避免这个方向错误和上一步那个"路径拼错就清空"的问题？

**案例 5**

> 现象：一个清理任务在测试环境跑得好好的，上生产后把 `/var/lib/xxx/cache` 下的 `.tmp` 文件连同 cache 目录本身一起删了，导致服务启动失败（它依赖 cache 目录存在这个事实）。
> ```bash
> find /var/lib/xxx/cache -name '*.tmp' -delete
> ```
> 1. 为什么 `-name '*.tmp' -delete` 会把**目录**也删掉？`-type f` 漏了会怎样？
> 2. 这个 `-delete` 的真实匹配范围是什么（注意 `find` 的隐含行为）？
> 3. 正确写法是什么？怎么才能在删之前看到完整清单？

### 四、综合实践

1. 写一个脚本 `~/bin/backup-mirror`，实现一套**安全的目录镜像备份**，要求：
   - 用法：`backup-mirror 源目录 目标目录`，参数缺失或目标与源相同则拒绝执行
   - 永远先干跑并把清单打印出来，读 `y` 才继续，其他输入一律取消
   - 使用 `--delete` 保持镜像一致，同时用 `--backup-dir` 把将被删除的文件保存到带时间戳的目录
   - 排除 `.git/`、`.cache/`、`*.tmp`
   - 干跑失败或 rsync 返回非零时立即退出，不继续后续步骤
   - 用 `set -euo pipefail` 写，通过 ShellCheck 检查
   - **额外要求**：脚本要在源路径不存在时给出明确错误而不是让 rsync 去"清空目标"（这是 `--delete` 最隐蔽的坑，请说明你怎么防的，并解释为什么"源不存在"必须当成致命错误）

2. 你要写一份《文件与归档操作规范》，必须包含：
   - **删除规范**：允许用 `rm -rf` 的前提条件、禁止的写法、必须加引号的规则，以及三种"后悔药"（预演、回收站、`/proc/PID/fd` 抢救）各自适用的场景和失效条件
   - **移动规范**：同文件系统与跨文件系统的区别、日志轮转的正确顺序及原因、什么情况下 `mv` 会造成正在写入的数据丢失
   - **归档规范**：`tar` vs `zip` vs `gzip`/`xz` 的选择依据、三个压缩算法的取舍表、解包不可信归档的风险与规则
   - **同步规范**：`rsync --delete` 的使用前提、干跑纪律、斜杠规则、`--backup-dir` 的推荐用法，以及一条"永远不许写"的命令示例
   - **批量处理规范**：`find` vs `xargs` vs 通配符的选择依据、`-print0`/`-0` 的强制规则、`-exec {} +` 的性能理由
   - 一份"删除事故复盘模板"，要求至少覆盖：现象、根因、缺失的防护环节、事后加上的机制
   - 至少两条"我们团队不这么写，因为……"的团队特有规定，并说明理由

---

**下一章预告**：第 6 章《权限模型与 sudo》——你会发现 `ls -l` 那串 `drwxr-xr-x` 每一组三个字符到底代表什么、`umask` 这个数字是怎么决定你新建文件的权限的、为什么 `/etc/shadow` 是 `r--------` 而不是 `600`，以及一条写错的 `sudoers` 规则能让你在**完全不知情的情况下**失去 root 密码。

---

*本章完。*