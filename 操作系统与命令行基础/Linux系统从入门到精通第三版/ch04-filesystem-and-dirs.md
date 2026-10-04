# 第 4 章 文件系统与目录结构

> **本章目标**：读完后你能——
> 1. 解释「一切皆文件」这句话的准确含义，并说明 `/proc` 和 `/dev` 里的东西为什么不是真实存在于硬盘上的
> 2. 看到 `/` 下的任意一个目录，能说出「谁往这里写东西、什么东西删了会出事」
> 3. 独立读懂 `/etc/fstab` 的六个字段，并判断加一行新挂载配置时每个字段该怎么填
> 4. 用 `stat` / `file` / `readlink` 判断一个路径到底是文件、目录、链接还是设备
> 5. 说清符号链接和硬链接的本质区别，并预测「删除其中一方后数据还在不在」
> 6. 手工完成一次 bind mount 和卸载，并用 `/proc/mounts` 证明挂载确实发生过
>
> **前置知识**：第 3 章《终端、Shell 与命令基础》
>
> **预计耗时**：70 分钟

前面三章让你能在终端里把命令敲对。但你还没有回答过一个问题：`mkdir` 到底创建在了哪里？

这一章把 Linux 的存储层摊开来看。核心是一个听起来像玩笑、实际是内核设计总纲的说法——**一切皆文件**。理解了它，`/etc`、`/proc`、`/dev`、`/sys` 这几个看起来毫不相关的目录会突然变成同一件事的不同侧面；理解了它，你也才能解释那些真实事故，比如"删掉了 `/var/lib/docker` 下的某个目录，结果整台机器的容器全挂"。

本章还会第一次接触**挂载（mount）**。这是 Linux 里唯一一个"看起来像文件的目录其实是一整块硬盘"的地方，也是新手最容易把系统改到起不来的地方——所以本节里所有涉及 `umount` 和改 `/etc/fstab` 的地方都有 ⚠️ 标注。

---

## 4.1 一切皆文件：Unix 最著名的设计

### 一句话说清

在 Linux 里，**所有能被读写的资源都由内核统一包装成一个"路径 → 字节序列"的接口**。普通文件是这样，磁盘分区是这样，键盘输入是这样，正在运行的进程的内存也是这样。

这不是比喻。内核里有一张统一的结构叫 `inode`，每一种"东西"都是它的一种类型。程序用 `open()` / `read()` / `write()` / `close()` 这几个系统调用去操作它们，具体背后是磁盘、是内存、是设备寄存器还是别的什么，**对程序完全透明**。

### 用 `file` 看一眼

`file` 命令的本质上就是"读一段内容，猜这是什么"。这就是"一切皆文件"的直接体现。

```bash
$ file /etc/passwd /dev/null /proc/self/status /usr/bin/bash /usr
```

```console
/etc/passwd:        ASCII text
/dev/null:          character special file, device (13, 1)
/proc/self/status:  ASCII text
/usr/bin/bash:      ELF 64-bit LSB pie executable, x86-64, dynamically linked, for GNU/Linux 3.2.0, stripped
/usr:               directory
```

注意第二行：`file` 认出 `/dev/null` 是 `character special file, device (13, 1)`。主设备号 13 是 `misc` 那一类，次设备号 1 在其中对应 `null`。它**确实是一个设备**，只是被包装成了文件接口。

### 为什么 `/dev/sda1` 也能被 `cat`

因为磁盘分区在 `/dev` 下有对应的设备文件，而设备文件是可以 `open()` 成读写的字节流的。

```bash
$ sudo head -c 32 /dev/sda1 | od -A x -t x1z
```

```console
000000 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00  >................<
000010 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00  >................<
```

这里读出来的十六进制就是那块分区开头的原始字节。对 ext4 来说，这位置通常是超级块的引导区，所以看起来全是 0。

> ⚠️ **只读这块设备是安全的，但任何写入都是灾难性的。** `echo x > /dev/sda1` 意味着你正在往文件系统的元数据区域写一个字节，它不会报"设备忙"，不会要求确认，直接就把分区写坏。如果你想看看破坏的威力，记住这个命令存在就够了，**永远不要真的执行它**——恢复的唯一途径是重装或用备份还原。

### 这个设计带来了什么

它是 Unix 能长出 `| ` 管道的唯一前提。因为**所有东西的接口形态一致**，所以 `ls` 的输出能喂给 `grep`，`grep` 的输出能喂给 `wc`，`cat /dev/urandom` 的输出能喂给 `head`。程序不需要知道上游是什么，只需要知道"上游会给我一串字节"。

第 7 章会把这条线索推到极致：如果一切都是文件，那么**管道本身就是一个内核缓冲区**，两个进程之间的连接也就只是两个文件描述符。

---

## 4.2 FHS：根目录下的标准分工

Linux 有一套叫 **FHS（Filesystem Hierarchy Standard）** 的规范，规定了哪些目录该放什么。它不是法律，是社区共识，但 Ubuntu 完整遵守了它，所以你可以放心地依赖这些约定——写脚本时尤其重要。

### 主要目录一览

| 目录 | 放什么 | 会不会随系统更新而变 | 典型写入者 |
|---|---|---|---|
| `/` | 根，**必须存在**，其他一切都挂在这里 | — | 内核 |
| `/etc` | **系统级配置文件** | 会（每次升级都可能改） | `apt`、各服务的安装脚本、`dpkg` |
| `/var` | **会变化的数据**：日志、缓存、数据库、队列、pid | 会（一直在写） | `systemd-journald`、应用进程 |
| `/home` | 普通用户的家目录 | 不会 | 你和你的应用 |
| `/usr` | 只读的用户态程序和库，**不含用户数据** | 只在升级时变 | `apt install` |
| `/opt` | 第三方安装的、不走包管理器的软件 | 不会 | 手工安装的厂商软件 |
| `/tmp` | 临时文件，**重启即清空** | 会 | 各种程序 |
| `/boot` | 内核 + initramfs + grub | 升级内核时变 | `apt`（装内核包时） |
| `/proc` | 内核与进程的虚拟视图 | 无（本身就是活的） | 内核 |
| `/sys` | 设备与驱动（sysfs）的虚拟视图 | 无 | 内核 |
| `/dev` | 设备节点 | 无 | 内核 + `udev` |
| `/run` | 运行时状态（pid、socket），**重启即清空** | 会 | `systemd` 和服务 |
| `/mnt` | 给用户临时挂载用的空目录 | 不会 | 你 |
| `/media` | 自动挂载的可移动介质（U 盘、光盘） | 会 | `udisks` |

### 最该分清的三组

**`/etc` vs `/var`**：这是新手最常混淆的一对。判断标准只有一条——**重启机器后还需要人工干预吗**。

- 改了 `/etc/fstab` 但不生效，要你手工重新挂载 → `/etc`
- 日志、缓存、数据库 → `/var`
- `/etc/ssh/sshd_config`（配置） vs `/var/log/auth.log`（日志），同一个服务，一边 `/etc` 一边 `/var`

**`/usr` vs `/opt` vs `/home`**：都是"装东西"的地方，区别在谁来管。

- `/usr` 里的东西**由包管理器负责**。`apt remove vim` 会把它干净地删掉，因为它知道清单。往 `/usr` 里手工放文件是跟包管理器打架。
- `/opt` 里的东西**不管它的死活**。厂商给你一个 `xxx-2.1.tar.gz`，解压到 `/opt/xxx`，升级和卸载都得你自己做。
- `/home` 是你的数据，只受你控制。

> **Ubuntu 24.04 的一个变化**：这个版本起 `/bin`、`/sbin`、`/lib` 都不再是真实目录，而是指向 `/usr` 的**符号链接**（叫 usr-merge）。执行 `ls -l /bin` 会看到 `bin -> usr/bin`。所以老文档里"可执行文件在 `/bin`"的说法在现代 Ubuntu 上只是历史习惯，你写脚本时应该用 `/usr/bin`。

### 为什么 `/home` 通常单独分区

装机器时几乎一定会看到"是否把 `/home` 挂到独立分区"这个选项。它值得单独分区的理由有四个，重要性从高到低：

1. **重装系统不丢数据**。这是最主要的原因。格式化根分区重装，`/home` 原封不动地挂回去。
2. **可以挂不同的选项**。`/home` 是唯一存放不可信用户数据的地方，可以放心地加上 `nodev,nosuid,noexec`，即使有用户被攻陷了，也很难从家目录提权——因为家目录里不允许挂载设备、不允许 setuid 程序、不允许直接执行二进制。
3. **加密边界清晰**。LUKS 加密 `/home` 而不是加密整个盘，开机时输入一次口令即可，用户数据始终是密文。
4. **配额管理**。可以给不同用户组设不同上限（需要开启 `prjquota`），而根分区不用切碎。

第 2 点是安全视角，很多人忽略了：**你无法让 `/` 不执行任何东西**（因为要跑程序），但你可以让 `/home` 什么都不许干。

```bash
# /home 常用挂载选项
# /dev/sda3  /home  ext4  defaults,nodev,nosuid,noexec  0  2
```

### 需要 root 的目录

`/etc`、`/var`、`/usr`、`/boot`、`/opt` 下的写入，以及 `/` 本身，都需要 root 权限。普通用户能自由写的是 `/home/你的名字` 和 `/tmp`（`/tmp` 有粘滞位，第 6 章讲）。

---

## 4.3 mount 与挂载点

### 挂载到底做了什么

挂载的完整定义是：**把一个文件系统的根接到目录树的某个节点上**。挂载之后，那个目录原来的内容被暂时遮住（如果它原来有内容的话），访问该目录就等于访问那个文件系统。

这个"遮住"是理解一切的关键。两个真实例子：

- 你的 U 盘挂在 `/mnt/usb`，它自己的根目录下有个 `lost+found`，显示为 `/mnt/usb/lost+found`。
- 你把一个分区挂到 `/home`，会看到 `/home` 下你原来的家目录不见了——它们还在被遮住的那块文件系统里，`umount` 之后立刻回来。**这也是误挂载 `/` 会让你"整个系统目录都空了"的原因。**

```bash
$ lsblk --output NAME,SIZE,FSTYPE,MOUNTPOINT
```

```console
NAME   SIZE FSTYPE MOUNTPOINT
sda     40G
├─sda1  1.0G vfat   /boot/efi
├─sda2  511M ext4   /boot
├─sda3    8G ext4   /home
└─sda4   30G ext4   /
sr0    1024M iso9660 /media/cdrom
```

### 三个查询命令

```bash
$ findmnt /
```

```console
TARGET SOURCE        FSTYPE OPTIONS
/      /dev/sda4     ext4   rw,relatime
```

`findmnt` 是首选，它输出的是**树形结构**，可读性最好。`mount` 和 `/proc/mounts` 是底层视角：

```bash
$ cat /proc/self/mountinfo | head -3
```

```console
23 28 0:21 / /proc rw,nosuid,nodev,noexec,relatime shared:12 - proc proc rw
25 28 0:22 / /dev rw,nosuid - tmpfs tmpfs rw,size=4096k,mode=755
30 28 259:1 / / rw,relatime shared:1 - ext4 /dev/sda4 rw
```

> `/etc/mtab` 在现代 Linux 上是一个指向 `/proc/self/mounts` 的**符号链接**，不是真实文件。看到有人让你 `cat /etc/mtab`，直接 `cat /proc/mounts` 即可。

### `/etc/fstab` 逐字段讲解

`/etc/fstab`（filesystem table）定义了**开机时自动挂载哪些文件系统**。每行六个字段，用空格或 Tab 分隔：

```text
# <文件系统设备>  <挂载点>  <类型>  <选项>  <dump>  <通过>
UUID=8f3a...       /          ext4    errors=remount-ro  0  1
UUID=A1B2...       /boot/efi  vfat    umask=0077          0  1
UUID=9c4d...       /boot      ext4    defaults            0  2
UUID=7e8f...       /home      ext4    defaults,nodev,nosuid,noexec  0  2
UUID=DEAD...       none       swap    sw                  0  0
proc               /proc      proc    defaults            0  0
```

| # | 字段 | 含义 | 常见填法 |
|---|---|---|---|
| 1 | **设备** | 要挂的设备或文件系统 | 优先用 `UUID=xxx`，其次 `LABEL=xxx`，最后才是 `/dev/sda4` |
| 2 | **挂载点** | 挂到目录树的哪里 | 路径必须存在 |
| 3 | **类型** | 文件系统类型 | `ext4`、`vfat`、`swap`、`nfs`、`btrfs` |
| 4 | **选项** | 逗号分隔的挂载参数 | `defaults` 或 `defaults,额外选项` |
| 5 | **dump** | 是否参与 `dump` 备份 | 24.04 上留 `0`。`dump` 工具早已被淘汰，这个字段是历史遗留 |
| 6 | **通过** | `fsck` 检查顺序 | 根分区填 `1`，其他填 `2`，交换分区和不检查的填 `0` |

**为什么用 UUID 而不是 `/dev/sda4`**：设备名会变。加了一块硬盘、新建了 LVM、或者你在虚拟机里克隆了系统，`/dev/sda4` 可能变成 `/dev/sda5`，而 UUID 是文件系统本身的唯一标识，不会变。**新手应该无脑用 UUID。**

**`defaults` 展开成什么**：它不是一个关键词，而是七个选项的简写：

| 简写 | 全称 | 作用 |
|---|---|---|
| `rw` | — | 以可读写方式挂载 |
| `suid` | — | 允许执行文件的 setuid 位 |
| `dev` | — | 允许该文件系统里的设备文件生效 |
| `exec` | — | 允许直接执行二进制和脚本 |
| `auto` | — | 开机时用 `mount -a` 自动挂载 |
| `nouser` | `noowner` | 禁用用户挂载（仅 root 能挂） |
| `async` | — | 内存写满时才落盘，速度快但断电可能丢数据 |

所以 `/home` 那行的 `defaults,nodev,nosuid,noexec` 实际展开成 10 个选项，其中 3 个关掉了危险能力。

**用 `findmnt` 反查某个挂载点的实际生效选项**，比你猜要可靠：

```bash
$ findmnt -no OPTIONS /home
```

```console
rw,relatime,errors=remount-ro,noexec,nosuid,nodev
```

> ⚠️ **改 `/etc/fstab` 之前必须做两件事**，否则改错一个字符会让系统卡在紧急模式：
> 1. `sudo cp /etc/fstab /etc/fstab.bak` 留个备份
> 2. 改完之后**不要重启**，先跑 `sudo mount -a` 验证。这一步如果报错，说明配置有错，终端还在你手里，可以立刻改回来。只有 `mount -a` 静默通过，才说明可以安全重启。

---

## 4.4 路径的解析

### 四种写法

```bash
$ cd /etc/apt            # 绝对路径：从根开始
$ cd apt                 # 相对路径：从当前目录开始
$ cd -                   # 回到上一个目录
$ cd ~                   # 家目录
$ cd ~li                  # 用户 li 的家目录
```

`cd -` 能工作是因为 bash 记住了 `OLDPWD` 这个变量。`cd` 后面不带参数等价于 `cd $HOME`。

### `~` 展开的真实机制

`~` 不是 bash 的语法糖，它是一个**独立的展开步骤**，发生在路径解析之前，规则写在 bash 手册的「展开」章节里：

- `~` → 当前用户的家目录，从 `$HOME` 得到
- `~用户名` → 该用户的家目录，bash 去 `/etc/passwd` 里查这个用户的家目录字段

所以 `~www-data` 是合法的，能展开成 `/var/www`。

**这也解释了为什么要加引号**（第 3 章讲过引号，这里正好验证）：

```bash
$ mkdir 'tilde-test' && cd 'tilde-test' && pwd && cd ..
```

```console
/home/user/tilde-test
```

单引号让 bash 跳过展开，把 `~` 当成一个**名字里带波浪号的普通目录**。而 `cd ~tilde-test` 会尝试展开成一个名为 `tilde-test` 的用户——不存在，于是报错。

### `cd` 是 shell 内建命令，这是关键

```bash
$ which cd
```

```console
cd is a shell builtin
```

`cd` 之所以不能是一个外部程序，原因很实在：**外部进程改不了调用者的当前目录**。当前目录是进程的一个属性，bash 的 `cd` 修改的是 bash 自己的属性，然后让 bash 把它的新值继承给后面启动的所有子进程。

这带来一个实践后果：**每个进程有自己独立的当前目录**。

```bash
$ mkdir -p /tmp/procdemo && cd /tmp/procdemo
$ sleep 60 &
$ cat /proc/$!/cwd
```

```console
/tmp/procdemo
```

我们能在 `/proc` 里看到 `sleep` 的当前目录，而 bash 现在可以随便 `cd` 走，两者互不影响。第 12 章讲 `/proc/PID/cwd` 时会再用这个特性。

### `.`、`..` 与路径规范化

`.` 就是当前目录，`..` 是父目录。内核在解析路径时会自动消掉冗余的 `.` 和 `..`：

```bash
$ realpath /etc/../etc/apt/./sources.list.d/..
```

```console
/etc/apt
```

`realpath` 做两件事：把相对路径转成绝对路径，并且**必须存在的每一段**。这是脚本里处理用户输入路径的标准做法——它顺便消除了 `../` 这种路径穿越风险。

---

## 4.5 虚拟文件系统：内核开的四个窗口

`/proc`、`/sys`、`/dev`、`/run` 这四个目录里**没有任何东西真的在硬盘上**。它们是内核用同一套 `inode` 接口动态生成出来的视图。理解这一点，你就知道为什么它们"不能 `ls` 出固定内容"。

### `/proc` —— 进程与内核状态的窗口

`/proc` 是四个里面最重要的。每个正在运行的进程对应一个数字编号的子目录：

| 路径 | 内容 |
|---|---|
| `/proc/cpuinfo` | CPU 型号、核心数、缓存 |
| `/proc/meminfo` | 内存统计 |
| `/proc/uptime` | 开机秒数、空闲秒数 |
| `/proc/version` | 内核版本和编译器 |
| `/proc/cmdline` | 这次内核启动的参数 |
| `/proc/self/` | **当前进程自己**，`self` 是指向本 PID 的链接 |
| `/proc/<pid>/` | 某个进程的全套信息 |
| `/proc/sys/` | 内核参数，**可写** |

```bash
$ head -3 /proc/cpuinfo
```

```console
processor	: 0
vendor_id	: GenuineIntel
model name	: 12th Gen Intel(R) Core(TM) i5-12400
```

```bash
$ cat /proc/self/status | head -4
```

```console
Name:	bash
Umask:	0022
State:	S (sleeping)
Tgid:	2841
```

**读 `/proc` 是排查问题的第一手段**，因为它反映的是内核此刻的真实状态，而不是配置文件里你上次写的内容。

`/proc/PID/` 下面最常看的几个：

```bash
$ ls /proc/self/ | head -20
```

```console
attr
cwd
environ
exe
fd
io
maps
mountinfo
sched
smaps
stack
stat
status
syscall
```

- `cwd` —— 当前目录的符号链接（第 4.4 节用过）
- `exe` —— 可执行文件路径
- `fd/` —— 打开的文件描述符（第 7 章的主角）
- `environ` —— 环境变量（**注意：里面常有密钥，截图前先检查**）

### `/proc/sys` 是可写的

这里必须纠正一个常见误解：`/proc` **不是只读的**。

```bash
$ cat /proc/sys/kernel/hostname
```

```console
ubuntu-server
```

```bash
$ sudo sysctl -w kernel.hostname=my-box
```

```console
kernel.hostname = my-box
```

`/proc/sys` 下的文件**用 `echo 值 > 文件` 的方式直接写入**，效果等价于 `sysctl -w`。`sysctl` 命令只是帮你省去写文件名而已。但这些修改**重启后失效**（除非通过 `sysctl --system` 或 systemd 固化），因为 `/proc` 是内核内存的镜像。

```bash
# 永久生效：写进 /etc/sysctl.d/99-custom.conf，然后
$ sudo sysctl --system
```

> ⚠️ `/proc/sys` 里有些参数写错了会导致系统异常（比如网络栈和 `kernel` 组的部分参数）。改之前先 `sysctl -a | grep 参数名` 看清楚当前值，并记录下来以便回滚。

### `/sys` —— 设备与驱动

sysfs，把内核的设备模型暴露成目录树。**排查硬件问题的第一站**：

```bash
$ ls /sys/class/net/
```

```console
enp3s0  lo
```

```bash
$ cat /sys/class/net/enp3s0/speed
```

```console
1000
```

这告诉你物理网卡 `enp3s0` 的协商速率是 1000 Mbps——**不用装任何工具，也不用 `ethtool`**。第 16 章讲网卡时会大量用到这个目录。

```bash
$ cat /sys/block/sda/sda1/start /sys/block/sda/sda1/size
```

```console
2048
41922560
```

`start` 是起始扇区，`size` 是扇区数。分区结构可以直接从 sysfs 读出来验证。

### `/dev` —— 设备节点

前面讲过。这里补一个关键细节：**`/dev` 里的文件不是内核直接创建的**。内核只提供设备的信息，具体的节点文件由 **`udev`** 这个守护进程在启动时和设备变化时动态创建。这是历史上 devfs 已被淘汰、udev 取而代之的结果。

现代 Ubuntu 用 **devtmpfs** 挂载 `/dev`（由内核自动建基本节点），udev 再在其上补充规则化的名称和权限。

### `/run` —— 运行时状态

`/run` 是 **tmpfs**（内存文件系统），所以：

```bash
$ findmnt /run
```

```console
TARGET SOURCE FSTYPE OPTIONS
/run   tmpfs   tmpfs   rw,nosuid,nodev,size=1638140k,mode=755
```

三个后果：

1. **`/run` 里的东西重启就没了**——pid 文件、运行时 socket、缓存状态都算临时
2. **写 `/run` 极快**（就是写内存），所以服务把 pid 文件放这里
3. 老路径 `/var/run` 现在是**指向 `/run` 的符号链接**，`/var/lock` 同理指向 `/run/lock`

```bash
$ ls -l /var/run
```

```console
lrwxrwxrwx 1 root root 13 Sep 12 10:22 /var/run -> /run
```

---

## 4.6 看穿一个路径：`stat` / `file` / `readlink`

`ls -l` 给的是"人看的"信息。想看内核眼里的真相，用这三个命令。

### `stat` —— 内核对一个路径的全部认知

```bash
$ stat /usr/bin/bash
```

```console
  File: /usr/bin/bash
  Size: 1234904        Blocks: 2472          IO Block: 4096   regular file
Device: 8,2   Inode: 2621451    Links: 1
Access: (0755/-rwxr-xr-x)  Uid: (    0/    root)   Gid: (    0/    root)
Access: 2025-03-11 14:22:01.000000000 +0800
Modify: 2025-03-11 14:22:01.000000000 +0800
Change: 2025-03-11 14:22:01.000000000 +0800
 Birth: -
```

三个时间戳的含义经常被问：

| 字段 | 含义 | 谁会更新它 |
|---|---|---|
| **Access** | 最后读取时间 | `cat`、`grep` 这类读操作 |
| **Modify** | 最后写入时间 | 内容被修改 |
| **Change** | 元数据变更时间 | 权限、属主、大小、链接数任何一项变化 |

`Change` 容易被误解：**`chmod` 一个文件不会改 `Modify`**，但会改 `Change`。这是排查"到底谁动了权限"的唯一线索。

`stat -c` 只取你需要的字段，脚本里应该这么写：

```bash
$ stat -c '%n inode=%i links=%h size=%s mode=%a owner=%U:%G' /usr/bin/bash
```

```console
/usr/bin/bash inode=2621451 links=1 size=1234904 mode=755 owner=root:root
```

`-L` 让 `stat` 跟随符号链接，`-h`（默认）不跟随。

### `file` —— 靠内容猜类型

前面用过。这里强调它的**局限**：`file` 靠读文件头的 magic number 加启发式规则判断，所以：

- 对**空文件**它只能报 `empty`
- 对内容是文本但扩展名是 `.sh` 的文件，它报 `ASCII text` 而不是脚本
- 它只看内容，**不看你有没有执行权限**

```bash
$ file script.sh script.txt empty.dat
```

```console
script.sh:   ASCII text
script.txt:  ASCII text
empty.dat:   empty
```

这就是为什么老手在执行一个下载来的 `.sh` 之前会先 `file` 一下——确认它到底是脚本还是二进制。

### `readlink` —— 顺着链接看终点

```bash
$ readlink /lib
```

```console
usr/lib
```

```bash
$ readlink -f /lib/x86_64-linux-gnu/libc.so.6
```

```console
/usr/lib/x86_64-linux-gnu/libc.so.6
```

`-f`（canonicalize）会**把路径里所有符号链接全部展开**，给出最终的真实路径。这是脚本里必须用 `-f` 的原因：只写 `readlink /lib` 在第 19、20 章讲运行时库定位时会出问题，因为那是个**相对**链接。

---

## 4.7 符号链接与硬链接

两者都叫"链接"，但实现完全相反。

### 硬链接：同一个 inode 的另一个名字

`ln a b` 创建的 `b` 和 `a` **是同一个文件**。它们共享 inode，共享数据块，共享权限和时间戳。

```bash
$ echo hello > orig.txt
$ ln orig.txt hard.txt
$ stat -c '%n inode=%i links=%h' orig.txt hard.txt
```

```console
orig.txt inode=2621500 links=2
hard.txt inode=2621500 links=2
```

inode 编号相同，链接数都是 2。**这就是硬链接的本质：目录项级别的别名。**

> ⚠️ **删除硬链接的任何一方都不会丢数据**，因为还有另一个名字指向同一个 inode。只有当**最后一个名字**被删除时，数据才真正被释放。

硬链接有三个硬限制：

1. **不能跨文件系统**。inode 是每个文件系统内部的概念，`ln /home/a /mnt/usb/b` 会报 `Invalid cross-device link`。
2. **普通用户不能对 root 拥有的文件建硬链接**。这是 `fs.protected_hardlinks` 内核保护，防止有人抢注一个还没被发现的敏感文件。
3. **不能指向目录**。`ln` 对目录直接拒绝——否则目录树会出现环，`..` 的语义就崩了。

### 符号链接：一个装着路径字符串的普通文件

```bash
$ ln -s orig.txt soft.txt
$ file soft.txt
```

```console
soft.txt: symbolic link to orig.txt
```

`soft.txt` 是一个**独立的普通文件**，内容就是字符串 `orig.txt`。它有自己的 inode。

```bash
$ stat -c '%n inode=%i links=%h type=%F' orig.txt soft.txt hard.txt
```

```console
orig.txt inode=2621500 links=2 regular file
soft.txt inode=2621501 links=1 symbolic link
hard.txt inode=2621500 links=2 regular file
```

### 三组行为对比

| 场景 | 硬链接 | 符号链接 |
|---|---|---|
| 能跨文件系统 | ❌ | ✅ |
| 能指向目录 | ❌ | ✅ |
| 原文件删除后 | 数据还在（另一个名字） | **变成断链**，路径失效 |
| 目标内容改变 | 自动反映 | 自动反映 |
| `rm` 链接本身 | 链接数减 1 | 只删这个路径文件 |
| 需要目标事先存在 | ❌ | ❌ |

**"原文件删除后"这一行是本质差别**：硬链接是数据的多个名字，删一个还有另一个；符号链接是路径的快捷方式，路径断了就没了。

### 断链是什么样

```bash
$ rm orig.txt && cat soft.txt
```

```console
cat: soft.txt: No such file or directory
```

```bash
$ cat hard.txt
```

```console
hello
```

**记住这个区别，它在真实故障里天天出现**：DBA 清理旧日志时 `rm` 了一个日志文件，某个用软链指向它的服务就断了——因为路径没了。而用硬链接的场景（例如 `/var/log` 轮转前的做法）则是安全的。

### 用法分工

- **符号链接**：跨文件系统、指向目录、需要"跟着目标走"的场景。`/lib -> /usr/lib`、`/var/run -> /run`、`/etc/alternatives/` 下那一堆都是。
- **硬链接**：同一个文件系统的"快照式"引用。**第 14 章会讲它最经典的用途**——`cp -l` 给正在写的日志创建一个不断变化的硬链接，先 `mv` 走让日志立刻从目录里消失，再慢慢慢慢 `cp` 内容，磁盘占用瞬间归零。这在 ext4 上有效，在 btrfs 上无效（因为 btrfs 会做写时复制）。

---

## 4.8 特殊文件与字符设备

### `/dev/null` —— 最常用的一个

行为极其单纯：**写进去的字节全部丢弃，读出来永远是 EOF**。

```bash
$ ls -l /dev/null
```

```console
crw-rw-rw- 1 root root 1, 3 Sep 12 10:22 /dev/null
```

开头的 `c` 就是字符设备（character special），`1, 3` 是主次设备号。

它的意义是**丢弃输出或输入**，而不产生任何副作用：

```bash
# 丢掉 stderr
$ some-command 2>/dev/null

# 两边都丢掉，只关心退出码
$ some-command > /dev/null 2>&1

# 输入也丢掉：让程序读到"空输入"立刻结束
$ cat < /dev/null
```

### `/dev/zero` 和 `/dev/full`

这两个配对使用，是**测试工具和造文件的利器**：

⚠️ **动手前先记住 `dd` 的危险来自哪里**：它默认**不询问、不覆盖保护**，而且 `of=` 后面跟错一个字符就是不可逆的破坏。所以永远遵守三条——① `of=` 写**完整路径**，不用相对路径；② 绝不写成裸设备名（`of=/dev/sda`）；③ 容量超过 1 GB 时加上 `status=progress` 和 `conv=fsync`，避免"看起来写完了其实还在缓冲区"。

```bash
# 无限输出 0 字节，用来生成一个 100MB 的测试文件
$ dd if=/dev/zero of=/tmp/testfile bs=1M count=100 status=progress

# 写不进去，永远返回 ENOSPC，用来测试程序的磁盘满处理逻辑
$ dd if=/dev/urandom of=/dev/full bs=1k count=1
```

```console
dd: error writing '/dev/full': No space left on device
```

### `/dev/urandom` 与 `/dev/random`

两者都是随机数发生器，区别在于 `/dev/random` 会在熵不足时**阻塞等待**。在现代硬件（有 `rdrand` 指令）上这个差异已经不重要，但传统规则仍然有效：

- `/dev/urandom`：**不阻塞**，用于常规场景
- `/dev/random`：**阻塞**，只在生成长期密钥时用

```bash
$ head -c 16 /dev/urandom | od -A n -t x1
```

```console
 9f 4c a1 77 2e 0b d3 61 f0 08 b5 e4 3c 1d a7 22
```

> ⚠️ **不要用 `/dev/random` 生成会话 ID 或临时密码**。在容器或刚启动的极简系统上，熵池填充很慢，它可能阻塞几秒到几十秒，导致服务启动超时。这类场景永远用 `/dev/urandom`。

### 块设备、字符设备与伪终端

`file` 或 `ls -l` 的第一个字符就是设备类型：

| 开头 | 类型 | 例子 |
|---|---|---|
| `-` | 普通文件 | `/etc/passwd` |
| `d` | 目录 | `/usr` |
| `l` | 符号链接 | `/lib` |
| `b` | 块设备（按块读写） | `/dev/sda` |
| `c` | 字符设备（按字节流） | `/dev/null`、`/dev/tty0` |
| `p` | 命名管道（FIFO） | 第 21 章 |
| `s` | socket | 第 18 章 |

块设备和字符设备的差别不是"是不是硬件"，而是**内核的读写粒度和调度方式**：磁盘适合按块（通常 4KB）读写并可重排以优化寻道，键盘和串口只能按字节顺序来。

---

## 4.9 本章小结

**「一切皆文件」不是修辞，是内核的接口设计。** 所有资源都通过 `open`/`read`/`write` 暴露成字节流，这一致性是管道、脚本、一切 Unix 工具能组合的前提。

**FHS 是一套可依赖的约定。** 需要人工干预的静态配置放 `/etc`，一直在变的运行时数据放 `/var`，包管理器管的程序放 `/usr`，不管死活的第三方软件放 `/opt`。判断 `/etc` 还是 `/var` 的标准只有一条：重启后需不需要你再动一次。

**`/home` 单独分区有四个理由**，最实际的是重装不丢数据，最被忽视的是它可以安全地加上 `nodev,nosuid,noexec` 三个选项。

**挂载是把文件系统根接到目录树某个节点上**，会遮住该目录原有内容。`/etc/fstab` 六个字段，设备位置强烈建议写 `UUID=`；改完必须先 `mount -a` 验证再重启。`defaults` 是七个选项的简写。

**`cd` 是 shell 内建命令**，因为外部进程无法改变调用者的当前目录；每个进程有独立的 cwd，可在 `/proc/PID/cwd` 里看到。

**`/proc`、`/sys`、`/dev`、`/run` 里没有真实数据**，都是内核动态生成的视图。`/proc` 反映内核实时状态，是排障第一手段；`/proc/sys` **可写**，这纠正了"`/proc` 只读"的常见误解。

**硬链接是同一 inode 的别名，符号链接是装着路径的普通文件。** 决定性差别在删除行为：硬链接删掉一个名字数据还在，软链删掉目标就变成断链。硬链接不能跨文件系统、不能指向目录。

---

## 4.10 动手实验：挂载、观察、再还原

> 环境：Ubuntu 24.04 LTS，Server 版亦可
> 耗时：约 20 分钟
> 权限：需要 `sudo`

### 目标

亲手做一次 bind mount，用 `/proc/mounts` 证明挂载确实发生过，然后干净地撤销，让系统回到实验前的样子。

### 步骤

**第 1 步：记录实验前的挂载状态**

这一步是**整个实验的关键**。先把基线存下来，后面要靠它证明"你确实还原了"。

```bash
$ cat /proc/self/mounts | wc -l
$ sudo cp /proc/self/mounts /tmp/mounts.before
```

```console
37
```

**第 2 步：造一个有内容的源目录**

```bash
$ mkdir -p /tmp/source /tmp/bindpoint
$ echo "我是源文件" > /tmp/source/hello.txt
$ ls -l /tmp/bindpoint
```

```console
total 0
```

挂载点目录是空的——这样挂载后出现的东西才 unmistakably 来自源目录。

**第 3 步：执行 bind mount**

```bash
$ sudo mount --bind /tmp/source /tmp/bindpoint
$ ls -l /tmp/bindpoint
```

```console
total 0
-rw-r--r-- 1 root root 13 Sep 12 10:40 hello.txt
```

**观察**：挂载点下出现了 `hello.txt`，而我们**没有复制任何文件**。

**第 4 步：从 `/proc/mounts` 证明它发生了**

```bash
$ grep bindpoint /proc/self/mounts
```

```console
412 26 0:44 /tmp/source /tmp/bindpoint rw,relatime shared:123 - ext4 /dev/sda4 rw,errors=remount-ro
```

**这一行的六个字段值得对照 4.3 节读一遍**：设备号 `0:44`、根 `/tmp/source`、挂载点 `/tmp/bindpoint`、选项 `rw,relatime`、传播标记 `shared:123`、最后是它实际来自哪个真实设备 `/dev/sda4`。

> **bind mount 的本质**：它是把**一个已有目录**再挂一次，`/proc/mounts` 里会出现新的一行，但**并没有消耗新的磁盘空间，也没有复制数据**。常用于把服务的数据目录"暴露"到另一个位置，方便访问。

**第 5 步：验证写入会穿透到源目录**

这是 bind mount 最实用的性质。

```bash
$ echo "从挂载点写入" > /tmp/bindpoint/from-bind.txt
$ cat /tmp/source/from-bind.txt
```

```console
从挂载点写入
```

两个路径现在看到的是**同一个目录**。

**第 6 步：检查 fstab 里并没有这一条**

```bash
$ grep bindpoint /etc/fstab
```

```console
```

**空输出**。bind mount 只存在于当前运行期，重启就没了。想让它开机自动挂载，必须自己往 `fstab` 加一行：

```text
/tmp/source  /tmp/bindpoint  none  bind  0  0
```

**第 7 步：卸载**

> ⚠️ `umount` 不会确认，也不会问你"确定要卸载这个吗"。如果某个进程正在挂载点里工作，卸载会失败（报 `target is busy`），**这不是 bug 是保护**——强制卸载会让那个进程继续往已经不属于它的文件系统里写数据，结果不可预测。先关掉用它的进程，或者用下面的 lazy 方式。

```bash
$ sudo umount /tmp/bindpoint
$ ls -l /tmp/bindpoint
```

```console
total 0
```

`hello.txt` 消失了，目录恢复成空的——但源目录那边一个文件都没少。

**第 8 步：用基线证明还原干净**

```bash
$ diff <(sort /tmp/mounts.before) <(sort /proc/self/mounts) && echo "挂载表已完全还原"
```

```console
挂载表已完全还原
```

### 验证

```bash
# 1. 确认挂载点已不在挂载表里
$ findmnt /tmp/bindpoint
$ echo "退出码=$?"

# 2. 确认源目录数据完好
$ ls -l /tmp/source

# 3. 确认你的目录没有任何多余挂载
$ findmnt -R /tmp
```

```console
退出码=1
total 4
-rw-r--r-- 1 root root 13 Sep 12 10:40 from-bind.txt
-rw-r--r-- 1 root root 13 Sep 12 10:40 hello.txt
```

`findmnt` 查不到目标时返回**退出码 1**（而不是报错）——这个行为在脚本里经常用到，可以用 `if findmnt /tmp/bindpoint > /dev/null; then` 判断"是否已挂载"。

### 思考

1. 第 4 步那行 `/proc/self/mounts` 的输出里，`0:44` 是什么？如果 `mount --bind` 的源是一个 NFS 上的目录，最后的 `-` 后面会显示什么？
2. 如果你在挂载状态下 `rm -rf /tmp/bindpoint`，会删掉 `hello.txt` 吗？如果会，那和直接删 `/tmp/source` 有什么本质区别？（提示：想想删的是哪个文件系统里的目录项）
3. bind mount 和第 14 章要讲的 LVM 快照挂载，在"数据是否被复制"这一点上分别是什么行为？
4. 如果 `/etc/fstab` 里挂载点那一栏写了一个不存在的目录，系统开机后会怎样？为什么这属于"配置写错但系统还能启动"的典型情况？
5. 试试 `sudo mount --bind /tmp/source /tmp/bindpoint` 之后，在挂载点里 `mount` 一下（如果你有权限），观察它报什么错。这个错误说明了挂载的什么特性？

### 清理

```bash
$ sudo umount /tmp/bindpoint 2>/dev/null
$ sudo rm -rf /tmp/source /tmp/bindpoint /tmp/mounts.before
$ findmnt /tmp/bindpoint || echo "已卸载干净"
```

```console
已卸载干净
```

> ⚠️ 顺手检查一遍你的 `/etc/fstab` 有没有被本实验影响：`grep bindpoint /etc/fstab` 应该是空的。如果不是，删掉那一行再 `sudo mount -a` 验证。

---

## 4.11 自测题

### 一、简答

1. "一切皆文件"这句话在 Linux 内核里具体由什么机制支撑？为什么它使管道成为可能？
2. 你要判断某个文件属于"配置"还是"运行时数据"，目录选择的标准是什么？举一个 `/etc` 和 `/var` 各一个的例子。
3. 为什么 `/etc/fstab` 里的设备位置应该写 `UUID=` 而不是 `/dev/sda4`？在什么情况下 `/dev/sda4` 这种写法会突然失效？
4. `cd` 为什么必须是 shell 内建命令而不能是外部程序？用"进程属性"来解释。
5. `/proc` 是只读的吗？给出一个可写的子目录和一条写入命令，并说明为什么这类修改重启后会失效。
6. `/dev/random` 和 `/dev/urandom` 有什么区别？为什么临时密码不能用前者？
7. 硬链接和符号链接在"原文件被删除"这个场景下的行为有什么不同？硬链接为什么不能跨文件系统、不能指向目录？这个差别在什么运维场景里会咬人？
8. `stat` 输出的三个时间戳 Access / Modify / Change 分别记录什么？`chmod` 一个文件会改动其中哪一个？

### 二、命令填空

1. 查某个挂载点实际生效的全部选项：________
2. 把 `/data` 挂到 `/mnt/data`：________
3. 校验改过的 fstab 有没有语法错误（不重启）：________
4. 展开路径里所有符号链接得到真实路径：________
5. 只打印某个文件/目录自己的 inode 编号：________
6. 只输出某个文件的大小（字节数）：________
7. 创建一个删除 `/etc/hosts` 后仍然有效的副本（同一文件系统内）：________
8. 只看某个进程的工作目录路径：________
9. 用一行命令生成 10MB 的零填充测试文件：________
10. 让 `findmnt` 查询不存在的挂载点时静默返回退出码而不打错误：________

### 三、故障分析

**案例 1**

> 现象：你按教程往 `/etc/fstab` 加了一行，挂载点写的是 `/mnt/mydata`（这个目录你还没建）。`sudo mount -a` 报了错，但你没在意就重启了。结果系统卡在一个维护模式提示符上，只显示 `An error occurred while trying to mount /mnt/mydata`，进不了图形界面。
> 1. 为什么这个配置错误会导致系统起不来？
> 2. 你现在已经进不去系统了，手上有另一台机器或一个启动 U 盘，怎么在不重装的情况下修好？
> 3. 报错的这一行和那个"不存在的目录"，各说明了一个不同的配置问题，对应 fstab 的第几个字段？

**案例 2**

> 现象：一条 Docker 相关的数据处理链路（运行中，稍后会展开）里，运维同事为了清理空间执行了：
> ```bash
> sudo rm -rf /var/lib/docker/overlay2/abc123
> ```
> 结果是所有正在运行的容器立刻不可用，`docker ps` 里显示容器还在但全部报错误。
> 1. 为什么删掉一个"看起来只是一个目录"的路径，会让所有容器失效？（提示：容器的可写层其实是这个目录）
> 2. 这和 4.7 节里"删除硬链接的一方"的差别在哪里？
> 3. 这个操作能不能用符号链接来做得更安全？说明你的方案以及它的问题。

**案例 3**

> 现象：有个服务启动后，日志文件一直为空。手工执行同样的命令却是正常的。
> 手工执行时：
> ```bash
> $ ./app --log /var/log/app/app.log
> $ cat /var/log/app/app.log
> ```
> 能看到内容。但服务方式运行（systemd，`Type=simple`）时 `/var/log/app/app.log` 一直是空的。
> 1. 提示：服务是用哪个身份运行的？服务能写 `/var/log/app/` 吗？
> 2. 除了权限，还有哪两种常见原因会导致这个现象？（提示：工作目录、路径解析）
> 3. 怎么用一条命令确认到底是权限问题（而不是程序没执行）？

**案例 4**

> 现象：你把一个符号链接指向的"共享库目录"删了。原路径是：
> ```bash
> $ ls -l /opt/myapp/current
> lrwxrwxrwx 1 root root 9 Sep 12 10:22 /opt/myapp/current -> /opt/myapp/releases/v1.2
> ```
> 现在 `/opt/myapp/current/` 变成 4096 空目录了，但 `/opt/myapp/releases/v1.2` 里的文件你确认都还在。
> 1. 你的操作具体是做了什么，才让一个符号链接变成了真实目录？
> 2. 如果改用硬链接或 `mv`，行为会不一样吗？
> 3. 这种"用符号链接做原子发布"的部署模式，还有什么需要注意的坑？（提示：`find` 的行为、第 5 章会讲的复制行为）

### 四、综合实践

1. 写一个 shell 脚本 `~/bin/mount-audit`，用它输出一份完整的挂载点审计报告，要求：
   - 列出所有挂载点、设备、类型、选项，一行一个，格式对齐
   - 单独标出所有启用了 `nosuid,nodev,noexec` 三个选项中**两个以上**的挂载点，并标注 `/tmp` 是否在内（用 `findmnt` 和 `awk`）
   - 标出所有 `defaults` 之外带特殊选项的挂载点，把选项列表原样列出
   - 统计挂载点总数，并输出使用到的文件系统类型的去重列表（提示：`sort -u`）
   - 如果发现 `/home` 没有设 `noexec`，在报告末尾给出一行建议
   - 用 `set -euo pipefail` 写，通过 ShellCheck 检查
   - **额外要求**：脚本要能在没有任何额外参数的情况下安全运行；输出重定向到文件时要保证不会被截断成半个输出（想想第 7 章的重定向）

2. 你要设计一套目录规范并写成一份《Ubuntu 服务器目录布局约定》，文档必须包含：
   - **配置与数据的划分**：给出 `/etc`、`/var`、`/opt`、`/srv`、`/home` 五个目录各自的准入规则（什么内容允许放、什么禁止放），每条规则都说明**为什么**
   - **自建服务的标准布局**：为一个第三方（非 apt 安装）服务设计目录树，说明每个子目录的用途、建议权限，以及哪些必须用符号链接
   - **文件系统与挂载策略**：哪些数据应该放独立分区？`/var`、`/var/log`、`/home` 各自的推荐挂载选项是什么，每个选项分别防住了什么攻击面
   - **`/etc/fstab` 规范**：你的团队 fstab 行的字段填写规范（每个字段的强制要求），以及禁止哪些写法
   - **危险操作红线**：列出至少 5 条"任何情况下都不许直接做的目录删除/挂载操作"，每条写清后果和替代做法
   - 一份"新人最常犯的三个目录错误"清单，每个写清现象、根因、正确做法

---

**下一章预告**：第 5 章《文件操作与归档压缩》——你会发现 `rm -rf` 为什么没有确认提示、`mv` 跨文件系统时背后真实发生的事（它其实是"复制加删除"）、`tar` 的 `z` 和 `J` 到底加在哪，以及 `rsync --delete` 在生产环境里一次手抖能造成多大范围的数据丢失。

---

*本章完。*