# 第 1 章 Linux 是什么，以及你该选哪个发行版

> **本章目标**：读完后你能——
> 1. 说清楚"内核""发行版""桌面环境"三者的区别，不再被网上的说法绕晕
> 2. 讲出 Linux 发展史里那些真正影响了你日常操作的节点
> 3. 解释用户态程序发起一次文件读取时，内核到底做了什么
> 4. 面对任何一个新发行版，30 秒内判断它属于哪个家族、用什么包管理器
> 5. 说清楚 Ubuntu LTS 的版本节奏、仓库机制，以及它为什么适合当生产基线
>
> **前置知识**：无
>
> **预计耗时**：40 分钟

> **本书环境基线**：全程使用 **Ubuntu 24.04 LTS**（内核 6.8、systemd、apt/dpkg、AppArmor、nftables）。所有命令、配置文件路径、实验步骤都以此为准。涉及其他发行版时只做对比说明，不作演示环境。

想象一下这个场景：你花了两周时间配置好一台服务器，写了 20 个自动化脚本，一切正常。三个月后你要迁移，重装系统时发现——脚本里的 `service nginx restart` 报错了，`/etc/init.d/` 目录根本不存在，`ifconfig` 命令找不到，`apt-key` 已经废弃。三个月的工作，因为环境假设过时而全部要重做。

这一章存在的唯一目的：**让你在做任何事之前，先搞清楚你在什么地基上盖楼。** 后面 23 章的所有内容，都建立在这一章打下的认知之上。

---

## 1.1 先纠正一个流传最广的误解

几乎每个刚接触 Linux 的人都听过这句话：

> Linux 是一个操作系统。

这句话不算错，但它会让你在后面遇到无数困惑时无法自己找到答案。更准确的表述是：

> **Linux 只是一个内核（kernel）。而你平时用的"Linux 系统"，是内核 + 一大堆用户态软件拼装出来的发行版（distribution）。**

### 内核是什么

内核是操作系统里唯一有特权的部分，它只做五件事：

| 职责 | 通俗解释 |
|---|---|
| 进程调度 | 决定哪个程序占用 CPU、占用多久 |
| 内存管理 | 分配/回收物理内存，保证程序之间不互相踩踏 |
| 文件系统 | 把磁盘上的数据组织成目录树，并提供读写接口 |
| 设备驱动 | 让键盘、网卡、显卡这些硬件能被程序使用 |
| 系统调用（syscall） | 用户态程序请求内核服务的唯一入口 |

内核之外的一切——Shell、编译器、编辑器、浏览器、systemd——全都是普通用户态程序。它们没有特权，必须通过系统调用向内核请求服务。

这个区分不是学术洁癖，它直接决定了后面几件事：

- 为什么你不能随便 kill 掉别人的进程 → 权限检查在内核里
- 为什么 `ls` 一个目录会"卡一下" → 那是在做系统调用
- 为什么发行版换了内核版本，你装的某个工具就崩了 → 用户态和内核的 ABI 契约
- 为什么同一个 Debian 系的软件包能在所有 Debian 系上跑 → ABI 稳定
- 为什么 Alpine 上的软件经常编译失败 → 它的 libc 不是 glibc

### 命名之争：GNU/Linux 还是 Linux

GNU 项目的目标是做一个完全自由的操作系统。他们完成了编译器（GCC）、编辑器（Emacs）、Shell（Bash）、包管理工具等几乎所有组件，唯独缺一个内核。

1991 年 Linus Torvalds 写出了 Linux 内核，填补了这个空缺。于是有了完全由自由软件组成的操作系统。

Stallman 坚持认为它应该叫 **GNU/Linux**，因为 GNU 提供了除内核以外的全部部分；而"Linux"这个名字在商业上有商标争议。

- 主流发行版的官方叫法：绝大多数直接用 "Linux"（Ubuntu 的官方品牌名 2023 年起已简化为 "Ubuntu"）
- 老牌 GNU 用户：坚持 GNU/Linux
- 实际工程场景：用 Linux 就行，没人跟你争

本书统一用 **Linux**。这不是立场问题，是因为争论对理解技术没有任何帮助。

### 三个名词的关系

```
┌─────────────────────────────────────────────────────┐
│                   用户态（普通程序）                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────────┐  │
│  │  Bash  │ │  Vim   │ │ GCC    │ │ Nginx / sshd │  │
│  └────────┘ └────────┘ └────────┘ └──────────────┘  │
│                    ↓ 系统调用 ↓                       │
├─────────────────────────────────────────────────────┤
│                    Linux 内核                       │
│  调度器 │ 内存管理 │ VFS 文件系统 │ 驱动子系统 │ 网络栈 │
└─────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│                    硬件                             │
└─────────────────────────────────────────────────────┘
```

外层再包一层，就是发行版：

```
发行版 = 内核 + 用户态基础工具(coreutils)
       + 包管理器 + 桌面环境(可选) + 默认配置 + 默认软件仓库
```

Ubuntu Server 24.04 LTS 具体包含：Linux 6.8 内核 + glibc + GNU coreutils + GCC + Python 3 + systemd 259 + 一套预配置的 apt 仓库 + 默认的 sshd、cron、AppArmor 等系统服务。

**为什么 Ubuntu Server 不带桌面环境**：见 1.7 节。

---

## 1.2 历史：那些真正影响了你命令行的节点

这一节不是历史八卦。每个节点都解释了为什么你今天要敲某条特定命令。

### 1969 — Unix 诞生

Ken Thompson 和 Dennis Ritchie 在贝尔实验室写出 Unix。真正影响后世的是三件事：

**（1）"一切皆文件"**

Unix 只有一个抽象方式：文件。普通文件、目录、管道、socket、设备、伪终端全都是文件。读设备就是读文件，写 socket 就是写文件。

这条设计决定了你必须理解管道（`|`）、必须理解 `/dev/null`、必须理解文件描述符。它是第 7 章的主题。

**（2）小工具 + 组合**

Unix 不做"大而全"的程序，而是做很多单一职责的小工具，用管道拼起来完成复杂任务。

```bash
# 要找 /var/log 里最近 1 小时被修改过、且包含 "error" 的行，只打印文件名
find /var/log -mmin -60 -type f -print0 \
  | xargs -0 grep -l "error"
```

这条哲学是第 8 章的主题，也是你日常效率的分水岭。Windows 用户习惯找"一个能干这事的软件"，Linux 用户习惯找"几个能拼出这事的命令"。

**（3）C 语言重写（1973）**

把内核从汇编改成 C，使得 Unix 可以移植到不同硬件。这是整个开源软件运动能成立的技术前提。

### 1983 — GNU 项目启动

Richard Stallman 发布 GNU 宣言，宣布启动一个完全自由的操作系统。GNU 花了十几年做完了编译器、Shell、编辑器、各种工具，唯独内核一直空着。

**为什么这件事重要**：因为 GNU 工具全都遵循 POSIX 和 GNU 扩展惯例。你现在用到的 `grep -E`、`sed -r`、`tar -z`、`ls --color` 这些选项风格，都是 GNU 定的。BusyBox 那些模仿 GNU 接口的小工具，也是同一套传统。

### 1991 — Linux 内核发布

当时芬兰赫尔辛基大学的学生 Linus Torvalds 因为 Minix（一个简化教学用的类 Unix 系统）不够好，在业余时间写了个更好的内核，发布在 ftp 上。

关键的版本节点：

| 版本 | 时间 | 意义 |
|---|---|---|
| 0.01 | 1991-09 | 第一个公开版本，只能在 386 上跑 |
| 0.96 | 1991-12 | 进程调度、内存管理基本可用 |
| 1.0 | 1994-03 | 第一个正式稳定版，宣告 1.x API 稳定 |
| 2.0 | 1996-01 | 支持多处理器 |
| 2.6 | 2003-07 | 巨大的重写，引入预抢占内核，此后长期是 2.6.x |
| 3.0 | 2011-07 | 命名从 2.6.x 改为 3.x（只是为了避免版本号溢出） |
| 5.x / 6.x | 2019 / 2022 | 6.0 淘汰了长期分支机制，主版本号大约每 4 年涨一次 |

Linus 曾说过 Linux 是"自己写的 Unix 克隆"，但严格说它从 Unix 借的是**思想**（一切皆文件、小工具组合），实现完全是自己的。BSD 和 MINIX 也是独立实现。

### 1992–2004 — 发行版诞生

有了内核加上 GNU 工具，任何人都能拼出一个系统。1993 到 1995 年爆发了一批：

| 发行版 | 诞生 | 包管理 | 今天的后代 |
|---|---|---|---|
| Slackware | 1992 | 手工 tar | （已停） |
| Debian | 1993 | dpkg / apt | Ubuntu、Fedora 无关的一整片下游 |
| Red Hat | 1995 | rpm / yum | RHEL、CentOS Stream、Fedora |
| Gentoo | 2002 | portage / emerge | 自己仍在用 |
| Arch Linux | 2002 | pacman | Manjaro |
| Fedora | 2004 | dnf | RHEL 的上游试验田 |
| **Ubuntu** | **2004** | **dpkg / apt** | **本书基线；Debian 最成功的下游** |

**Debian 的关键决策**：只包含完全自由软件（Debian Free Software Guidelines），并且发行版代号全是《Toy Story》角色（buzz、wheezy、jessie、stretch、buster、bullseye、bookworm）。这是第 10 章的内容。

**Ubuntu 的关键决策**：站在 Debian 之上，但**不等 Debian**。Debian 的稳定版以"两年才发一次、发布即冻结"著称，很多新软件要等很久。Ubuntu 用更短的发布周期把这个节奏压到 6 个月，同时保持自己的仓库和 LTS 支持策略。这让它同时满足了"有社区驱动的更新速度"和"有商业支持的电话号码"两个通常互斥的需求。

### 2015 — systemd 统一江湖

在没有 systemd 的时代，每个发行版用不同的 init 系统：Debian 用 SysVinit，Ubuntu 用 Upstart，Arch 用 systemd，Gentoo 用 OpenRC。

2015 年起 Debian 8 和 Ubuntu 15.04 改用 systemd 作默认 init。**这一变化比任何内核更新都更能改变你的日常操作**，因为服务的启动、查看、日志全都换了工具：

```bash
# 旧世界
$ sudo service nginx start
$ sudo /etc/init.d/nginx restart
$ tail -f /var/log/nginx/error.log

# 新世界
$ sudo systemctl start nginx
$ sudo systemctl status nginx
$ journalctl -u nginx -f
```

如果一台老服务器上没有 `systemctl`，你基本可以断定它是 2015 年之前的 Debian/Ubuntu，或者是 CentOS 6、RHEL 6。

**注意上面前后两条的区别**：新世界不只是把 `service` 换成了 `systemctl`。日志从"每个服务写自己的文件"变成了"全部汇总进 journal"，这是排障方式的质变。**本书第 15 章会专门讲这个。**

### 2005 至今 — 容器与云

- **2005**：Alpine Linux 发布，用 musl libc + busybox，主打"小"
- **2013**：Docker 发布，Linux 容器进入主流
- **2015**：Kubernetes 发布
- **2019**：Ubuntu 20.04 引入 AppArmor 成为桌面默认 MAC 框架

容器能流行，是因为 Linux 内核提供了 namespace（隔离视野）、cgroups（限制资源）、overlayfs（分层文件系统）这三个原生能力。这些概念在第 20 章展开。

---

## 1.3 内核到底在做什么：跟踪一次 `read`

抽象讲了没用，我们跟一次真实的调用走一遍。这是本书后面理解权限、管道、性能的基础。

假设你敲了：

```bash
$ cat /etc/hostname
```

### 第一步：Shell 解析命令

Bash 读取你的输入，把 `cat` 解析成 PATH 里的 `/usr/bin/cat`，把 `/etc/hostname` 作为参数，然后 `fork()` 出一个子进程，把 `/usr/bin/cat` 作为目标程序 `exec()` 进去。

**注意 `cat` 此时已经是一个新的进程**，它对 `/etc/hostname` 还没有任何操作权，只有一段机器码。

### 第二步：cat 打开文件

`cat` 内部调用 `open("/etc/hostname", O_RDONLY)`。glibc 的 `open()` 最终会执行一条 `syscall` 指令。

在 x86-64 上，约定是：

- `rax` = 系统调用号（`__NR_openat`）
- `rdi`, `rsi`, `rdx`, `r10`, `r8`, `r9` = 参数
- `rcx`, `r11` 被破坏，返回值在 `rax`

这一步 CPU 从用户态切换到内核态（代价约几百纳秒，称为"陷入"）。

### 第三步：内核里的路径

内核接住这个调用后：

```
entry_SYSCALL_64
  └─ __x64_sys_openat      通用系统调用分发
      └─ do_sys_openat     处理 openat 语义
          └─ user_path_at  把用户空间的路径字符串转成内核路径对象
          └─ link_path_walk 逐级解析 /etc/hostname
              └─ inode 查找（ext4 的目录项、dentry 缓存）
          └─ do_dentry_open
              └─ f_op->open_iter（ext4 的具体实现）
          └─ alloc_file / fdget / fd_install   分配文件描述符
```

**文件描述符（file descriptor, fd）** 在这里产生：一个非负整数，实际上是当前进程 `files_struct` 数组的下标。`open()` 返回 3，通常是因为 0/1/2 已经被占了。

### 第四步：cat 读取

```c
read(3, buf, 4096);
```

内核路径：

```
entry_SYSCALL_64
  └─ __x64_sys_read
      └─ ksys_read → vfs_read
          └─ file->f_op->read_iter（ext4_file_read_iter）
              └─ generic_file_read_iter
                  └─ 文件系统页缓存查找 ext4_get_extent
                  └─ copy_to_user(buf, page, n)   ← 关键
```

`copy_to_user` 之后，数据在 `cat` 的用户态地址空间里了。整个过程中 `cat` 自己没有做任何内存管理，全靠内核。

### 第五步：显示

`cat` 把 buf 里的字节 `write(1, buf, n)` 到 fd 1，然后 `exit(0)`。内核回收它的地址空间和 fd。

### 从这次调用能看出什么

1. **"cat 读文件"其实是在读页缓存**，不是每次都打磁盘。所以第二次 `cat` 同一个文件会快得多
2. **路径解析靠 dentry 缓存**，所以 `cd` 到深层目录第一次慢、之后快
3. **fd 0/1/2 的存在解释了重定向**：`< file` 等于把 fd 0 指向文件，`> file` 等于把 fd 1 指向文件。管道 `|` 也是这么实现的
4. **系统调用是有代价的**，这解释了为什么 shell 循环处理数据比 Python 快几十倍（第 8 章会用一个实验验证这个量级）

---

## 1.4 发行版家族图谱

面对一个陌生系统，第一件事是判断它属于哪个家族——因为包管理器、配置文件位置、服务管理方式全都跟着家族走。

### 全景

```
Linux
├── Debian 系（dpkg + apt）          ← 本书主线
│   ├── Debian（社区最"纯粹"，发布慢但稳）
│   ├── ★ Ubuntu（商业支持，版本最快）
│   │   ├── Ubuntu Server / Desktop
│   │   ├── Ubuntu LTS（每两年，长期支持 5 年）
│   │   ├── Ubuntu 非 LTS（每 6 个月，支持 9 个月）
│   │   └── 桌面衍生：Linux Mint、Pop!_OS、Zorin
│   ├── Raspbian / Raspberry Pi OS（树莓派）
│   └── 安全/取证专用：Parrot OS、Tails、Whonix
│
├── RHEL 系（rpm + dnf）             ← 企业生产常见
│   ├── RHEL（企业订阅，服务器事实标准之一）
│   ├── CentOS Stream（RHEL 上游开发流）
│   ├── Fedora（最新最快，公认"折腾"）
│   ├── 复刻版：Rocky Linux、AlmaLinux、Oracle Linux
│   └── 国产分支：Anolis OS（龙蜥）、OpenCloudOS
│
├── Arch 系（pacman）
│   ├── Arch Linux（wiki 即文档）
│   └── Manjaro（更友好的滚动发行版）
│
├── SUSE 系（rpm + zypper）
│   ├── openSUSE Leap（稳定）
│   ├── openSUSE Tumbleweed（滚动）
│   └── SLES（企业订阅）
│
├── 源码系
│   ├── Gentoo（portage + emerge）
│   ├── NixOS（声明式，不可变）
│   └── Void（二进制 + xbps，滚动）
│
├── 嵌入式 / 极简
│   ├── Alpine（musl + busybox，容器首选）
│   ├── OpenWrt（路由器）
│   ├── Buildroot / Yocto（嵌入式构建系统）
│   └── Tiny Core Linux
│
└── BSD 系（不是 Linux，但常拿来比较）
    ├── FreeBSD（TCP/IP 血统，ZFS 支持最好）
    ├── OpenBSD（安全优先）
    └── NetBSD（可移植性最强）
```

**Debian 和 RHEL 是 Linux 的两个主分支。** Ubuntu 是 Debian 的下游，不是反过来；Rocky、AlmaLinux 才是 RHEL 系。搞清这个层级，你就理解了为什么会有"Ubuntu 装 RPM"这类问题——它们根本不是一个生态。

### 对照表

| 维度 | Debian 系 | RHEL 系 | Arch 系 | Alpine |
|---|---|---|---|---|
| 低层包管理 | dpkg | rpm | — | apk |
| 上层包管理 | apt / apt-get | dnf / yum | pacman | apk |
| 内核包名 | `linux-image-*` | `kernel-*` | `linux` | `linux-lts` |
| 强制访问控制 | **AppArmor** | **SELinux** | AppArmor（可选） | 无 |
| 防火墙 | **nftables**（ufw 为前端） | firewalld（nftables 后端） | nftables | iptables |
| 网络配置 | **netplan → systemd-networkd** | NetworkManager + nmcli | systemd-networkd | busybox ifupdown |
| 服务管理 | systemd | systemd | systemd | OpenRC |
| 文本编辑器 | `vi` → vim.tiny | `vi` → vim-minimal | vim 默认 | busybox vi |
| 容器基础镜像 | `ubuntu:24.04` ≈ 78MB | `rockylinux` ≈ 200MB | — | `alpine` ≈ 8MB |
| 适合 | 学习、开发、通用服务器 | 企业生产、合规 | 前沿折腾 | 容器、嵌入式 |

**两个 Ubuntu 上容易踩的点**：

**（1）`vi` 指向的是精简版**

Debian 系把 `/usr/bin/vi` 指向 `vim.tiny`，RHEL 系指向 `vim-minimal`。所以在 Ubuntu 上你敲 `vi` 得到的是精简版 vim，很多功能没有。想要完整的：

```bash
# Ubuntu / Debian 系
$ sudo update-alternatives --install /usr/bin/editor editor /usr/bin/vim 100
$ sudo update-alternatives --install /usr/bin/vi vi /usr/bin/vim 100
```

**（2）强制访问控制是 AppArmor，不是 SELinux**

这是 Debian 系和 RHEL 系最容易被网上文章搞混的地方。网上教程说 SELinux 报 `Permission denied` 时让你 `setenforce 0`，在 Ubuntu 上执行会报命令不存在。Ubuntu 用的是 AppArmor，配置文件在 `/etc/apparmor.d/`。**第 24 章会讲怎么排查它。**

---

## 1.5 选型：四个决策问题

不要问"哪个发行版最好"，这个问题没有答案。要问的是"我的约束条件是什么"。

### 决策树

```
你的主要用途是什么？
│
├─ 学习 Linux 本身 / 日常桌面
│   └─ Ubuntu Desktop 或 Linux Mint
│       理由：中文社区资料最多，出问题一搜就有答案
│
├─ 生产服务器 / 企业环境          ← 本书默认场景
│   └─ 你公司的标准是什么？
│       ├─ 已有 IT 规定 RHEL 系 → 用 Rocky / AlmaLinux
│       ├─ 云厂商原生镜像（最省事）→ 直接用厂商镜像
│       └─ 没有规定 → ★ Ubuntu Server LTS
│       理由：LTS 有 5 年安全更新，仓库稳定，文档齐全
│
├─ 开发 / 需要新工具
│   └─ Fedora Workstation
│       理由：Python、LLVM、内核总是最新，比 RHEL 快半年
│       代价：内核更新激进，偶尔要处理驱动问题
│
├─ 容器镜像 / CI
│   └─ Ubuntu slim 或 Alpine
│       ├─ 需要 glibc 兼容 → ubuntu:24.04（~78MB）
│       └─ 纯静态二进制 → alpine（~8MB）
│       理由：见 1.6 节的 musl 警告
│
├─ 渗透测试 / CTF 工具箱
│   └─ 专用发行版（Kali / Parrot / Tails 等）
│       理由：数百个安全工具预装并保持更新
│       ⚠️ 代价：滚动更新会坏，默认账户是公开演示用的弱口令，
│          预装工具本身是高危攻击面。
│          ⚠️ 因此本书不把它当演示环境——用干净的 Ubuntu 24.04，
│          需要工具时按需 apt install。这样你的学习环境是可复现的。
│
├─ 嵌入式设备 / 路由器
│   └─ OpenWrt / Buildroot / Yocto
│       理由：这几个是构建系统不是发行版，能产出几百 MB 甚至几十 KB 的镜像
│
├─ 想彻底理解系统是怎么组装的
│   └─ Arch Linux 或 Gentoo（虚拟机里）
│       理由：Arch 让你自己决定装什么，Gentoo 让你自己编译
│       代价：花的时间不成比例，只适合当学习环境
│
└─ 离线 / 极老硬件 / 嵌入式刷机
    └─ Alpine 或 Tiny Core
```

### 为什么本书选 Ubuntu 24.04 LTS

这是本书所有实验的环境，需要说清楚理由：

| 理由 | 说明 |
|---|---|
| **LTS 生命周期长** | 24.04 标准支持到 2029 年 4 月，不需要每两年重装一次 |
| **社区资料最多** | 中文技术资料里提到 Ubuntu 的频率远高于其他发行版，出问题容易搜到答案 |
| **云厂商原生支持** | AWS、Azure、GCP、阿里云、腾讯云全部提供 Ubuntu 官方镜像，装完就有厂商的优化和文档 |
| **软件源覆盖最全** | 主流数据库、中间件、安全产品几乎都优先提供 .deb |
| **包足够新但不激进** | 不像 Debian 那么保守，也不像滚动发行版那么容易坏 |

### 最重要的三个现实约束

**（1）你的同事/运维手册用的是什么**

这一条压倒其他所有技术考量。如果公司文档里全写着 `dnf install`，你装 Ubuntu 后每个问题都得自己翻译。这也是本书在关键位置标 `[RHEL]` 的原因。

**（2）软件源能不能访问**

装之前先确认你要用的软件在这个源里有没有：

```bash
$ apt-cache search 关键词
```

很多商业软件只提供 RPM 或只提供 DEB。不先查，装到一半发现没有包会很浪费时间。

**（3）要跑的程序用什么语言写的**

如果你的项目依赖某个语言生态，就查这个生态的官方支持矩阵。举例：

- 依赖 PyTorch 的某些 CUDA 版本 → 官方 wheel 只覆盖特定 glibc，Alpine 装不上
- 依赖 .NET → Alpine 有 musl 变体，但有些 NuGet 包不支持
- 依赖 Java → 基本都行，JVM 是纯用户态

### Ubuntu 24.04 的两个新变化

**（1）仓库配置换成 deb822 格式**

从 24.04 开始，Ubuntu 把 apt 源从传统的单行格式改成了 `deb822` 块格式。你会看到：

```bash
$ ls /etc/apt/sources.list.d/
ubuntu.sources
```

```bash
$ cat /etc/apt/sources.list.d/ubuntu.sources
Types: deb
URIs: http://archive.ubuntu.com/ubuntu/
Suites: noble noble-updates noble-backports
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
```

**如果你在老教程里看到让你编辑 `/etc/apt/sources.list`，那个文件在 24.04 上可能已经不存在了。** 这是升级旧脚本时最容易踩的坑。

**（2）AppArmor 是默认的 MAC 框架**

第 1.4 节已经提过。Ubuntu 不用 SELinux，权限被拒时的排查路径完全不同。

---

## 1.6 一个必须提前知道的坑：musl vs glibc

这一节看起来偏题，但它会导致你未来某天对着一个诡异的编译错误抓狂，所以提前说清楚。

### 两种 libc

Linux 系统调用只有内核提供的那一套约定，但用户态调用内核需要 C 库（libc）来封装。这个"翻译官"有好几个实现：

| 实现 | 用户量 | 说明 |
|---|---|---|
| **glibc** | 压倒性多数 | GNU 的，功能最全，最"重" |
| musl libc | 少 | 极简，Alpine 默认 |
| uClibc / dietlibc | 极少 | 嵌入式 |
| BSD libc | 少 | *BSD 默认 |

**Ubuntu 24.04 用的是 glibc**，这是本章最该记住的一句结论。

### 为什么会出问题

动态链接的程序在运行时需要加载 `libc.so.6`（glibc 的 soname）。Alpine 上是 `libc.musl-x86_64.so.1`。

所以：**你在 Ubuntu 上编译出的动态链接二进制，拿到 Alpine 上会直接报 `not found` 或者符号错误**。

```text
$ ./myprogram
./myprogram: /lib/x86_64-linux-gnu/libc.so.6: version `GLIBC_2.34' not found
```

### 三个解法

**（1）源码重新编译**（最正确）

```bash
# 在目标系统里编译，或者用对应平台的容器
docker run --rm -v "$PWD":/src -w /src alpine:latest sh -c \
  "apk add --no-cache build-base && ./configure && make"
```

**（2）静态链接 glibc**

```bash
gcc -static -o myprogram myprogram.c
```

注意：静态链接 glibc 有已知问题（NSS、`getaddrinfo` 在纯静态下无法工作），所以生产环境更推荐 musl 静态链接。

**（3）静态链接 musl**（容器里最常见）

```bash
musl-gcc -static -o myprogram myprogram.c
```

Go 和 Rust 的 静态链接二进制天生就没有这个问题，这也是 Go 在容器领域特别流行的原因之一。

### 怎么快速判断一个二进制能不能在 Alpine 跑

```bash
$ file ./myprogram
./myprogram: ELF 64-bit LSB executable, x86-64, dynamically linked, ...

$ ldd ./myprogram
	linux-vdso.so.1
	libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6
```

看到 `libc.so.6` 就是 glibc 依赖，Alpine 上跑不了。

---

## 1.7 桌面环境：你需要吗

### 两个概念

- **窗口管理器（WM）**：只负责窗口的移动、缩放、层叠。不画界面装饰
- **桌面环境（DE）**：一整套图形界面，包括 WM、面板、文件管理器、设置中心、快捷键方案

常见 DE：GNOME（Ubuntu/Fedora 默认）、KDE Plasma（Kubuntu/openSUSE 默认）、Xfce（轻量）、MATE、Cinnamon（Mint 默认）、LXQt（超轻）。

常见纯 WM：i3、awesome、dwm、bspwm、Hyprland。

### 服务器要不要装桌面

**不要。** 理由不是"占内存"这么简单：

1. **攻击面**：桌面环境带大量后台服务（通知、索引、蓝牙、polkit 授权代理）。你不需要它们，但它们在监听
2. **维护负担**：桌面环境的包更新会把一堆依赖拉进来，升级失败时更难排查
3. **一致性**：服务器行为要和文档一致。有 GUI 的机器上总有人会去点鼠标

需要图形界面时（跑 GUI 程序、看网页、VS Code 远程），用 **X11 转发**或 **VNC**，不要在服务器上装完整桌面：

```bash
# X11 转发：需要服务器装了 xauth，客户端装 X 服务器
$ ssh -X user@server 'firefox'
```

---

## 1.8 版本号里的玄机

### 内核版本号

格式是 `主版本.次版本.修订号`。

在 Ubuntu 上：

```bash
$ uname -r
6.8.0-50-generic
```

逐段解读：

| 段 | 含义 |
|---|---|
| `6` | 主版本号，架构级变化才动。大约每 4 年涨一次 |
| `8` | 次版本号。**偶数 = 稳定分支，奇数 = 开发分支**，生产环境必须用偶数 |
| `0` | 修订号。稳定分支的修订号恒为 0 |
| `50` | **发行版修订号**，Ubuntu 每次重新打包内核就 +1 |
| `generic` | **内核 flavour**，Ubuntu 提供多个变体 |

**`generic` 不是 LTS 标记**，网上很多文章说错了。Ubuntu 24.04 的可用 flavour：

| flavour | 用途 |
|---|---|
| `generic` | 默认通用版，绝大多数场景用这个 |
| `lowlatency` | 低延迟，针对音频处理和实时应用 |
| `aws` | 亚马逊云优化 |
| `azure` | Azure 云优化 |
| `gcp` | Google Cloud 优化 |

在云主机上默认装的往往已经是 `aws` 或 `azure` 了。**内核后面那两段（`-50-generic`）对日常运维基本不用关心，但你必须能看懂它，因为排障时 `dmesg` 和报错信息里会出现。**

**Ubuntu 24.04 的内核版本会随 HWE 更新前移**：24.04 初始发布带 6.8，Canonical 会通过 HWE（Hardware Enablement）栈持续提供更新的 LTS 内核。所以你今天装和半年后装，`uname -r` 可能不同——这不是坑，是设计。

### 发行版版本号

**Ubuntu**：`<年>.<月>`，每年 4 月和 10 月发布。

- 偶数年份（20.04、22.04、24.04）→ LTS，长期支持 5 年
- 奇数年份（23.10、25.04）→ 只支持 9 个月，适合尝鲜

**Ubuntu LTS 内部还有代号**：24.04 LTS 代号是 `noble`（ noble 指 noble class 的中世纪贵族），这就是上面 `Suites: noble` 那行的来历。

生产环境**永远选 LTS**。

**Debian**：代号。stable/testing/unstable。代号是《玩具总动员》角色。当前稳定版代号顺序：bookworm (12) → trixie (13)。

**RHEL**：大版本每三年，7 / 8 / 9。RHEL 8 底层是 4.18 内核，RHEL 9 是 5.14。

**这意味着 RHEL 9 上的内核比你本机旧一个大版本**，装某些新软件会缺内核特性。这是企业环境"用 RHEL 就得用 RHEL 认可的软件版本"的根本原因。

---

## 1.9 本章小结

1. **Linux 是内核，不是完整系统。** 你用的系统是发行版 = 内核 + 用户态工具 + 包管理器 + 配置 + 仓库。
2. **一切皆文件、小工具组合**，这两条 Unix 思想决定了 Linux 的所有使用习惯。
3. **systemd 在 2015 年统一了 init 世界**，日志从"每服务一个文件"变成"统一 journal"，这是排障方式的质变。
4. **发行版分两大主分支**：Debian 系和 RHEL 系。Ubuntu 属前者。选型先看家族。
5. **滚动 vs 定期发布**是选型的核心分野。滚动永远最新但可能坏，定期发布稳定但升级痛苦。
6. **本书基线是 Ubuntu 24.04 LTS**：glibc + systemd + apt + AppArmor + nftables + netplan。这五组词决定后面每一章的命令和路径。
7. **Alpine 用 musl 而非 glibc**，这会导致动态链接的二进制不兼容。容器镜像要按需选择。
8. **服务器上不要装桌面**，需要图形用 X11 转发或 VNC。
9. **识别发行版要查标志文件，不要猜。** `/etc/os-release` 是现代唯一标准。
10. **工具箱型发行版（Kali 等）不适合当学习环境**。用干净的 Ubuntu，需要工具时按需安装——环境可复现，问题可追因。

---

## 1.10 动手实验

### 实验 1：识别你的系统

> 环境：Ubuntu 24.04 LTS，Server 与 Desktop 版均可
> 耗时：约 15 分钟

### 目标

掌握识别发行版的标准方法，并能写出一个健壮的家族检测脚本。

### 步骤
**第 1 步：读标准信息文件**

```bash
$ cat /etc/os-release
```

```console
PRETTY_NAME="Ubuntu 24.04.1 LTS"
NAME="Ubuntu"
VERSION_ID="24.04"
VERSION="24.04.1 LTS (Noble Numbat)"
VERSION_CODENAME=noble
ID=ubuntu
ID_LIKE=debian
HOME_URL="https://www.ubuntu.com/"
SUPPORT_URL="https://help.ubuntu.com/"
BUG_REPORT_URL="https://bugs.launchpad.net/ubuntu/"
PRIVACY_POLICY_URL="https://www.ubuntu.com/legal/privacy-policy"
UBUNTU_CODENAME=noble
```

注意两行：`ID=ubuntu` 是发行版自己的 ID，而 `ID_LIKE=debian` 告诉你它声明自己属于 Debian 家族。**识别家族要看 `ID_LIKE`，不是 `ID`。**

**第 2 步：交叉验证其他标志文件**

```bash
$ cat /etc/debian_version
trixie/sid
```

```console
trixie/sid
```

Ubuntu 的 `/etc/debian_version` 内容是它当前跟踪的 Debian 上游代号，不是 Ubuntu 自己的版本——这是最容易看错的一行。

```bash
$ ls -la /etc/*release* /etc/*version* 2>/dev/null
```

```console
-rw-r--r-- 1 root root   173 Aug  8 10:33 /etc/debian_version
lrwxrwxrwx 1 root root    19 Feb 19 12:03 /etc/lsb-release -> /usr/lib/os-release
-rw-r--r-- 1 root root  1745 Aug  8 10:33 /etc/os-release
```

**第 3 步：看内核与架构**

```bash
$ uname -r
6.8.0-50-generic

$ uname -m
x86_64

$ hostnamectl
```

**第 4 步：确认包管理器与仓库格式**

```bash
$ ls /etc/apt/sources.list.d/
$ head -8 /etc/apt/sources.list.d/ubuntu.sources
```

**第 5 步：确认强制访问控制框架**

```bash
$ aa-status 2>/dev/null | head -3 || echo "AppArmor 未启用"
getenforce 2>/dev/null || echo "无 SELinux（本就不是 RHEL 系）"
```

### 验证
```bash
# 一条命令打出「家族 / 发行版 / 是否滚动」
. /etc/os-release && echo "ID=$ID  LIKE=${ID_LIKE:-none}"
```

```console
ID=ubuntu  LIKE=debian
```

### 思考
1. 如果 `ID=ubuntu` 但 `/etc/debian_version` 不存在，说明什么情况？（提示：想想源码编译安装的最小系统）
2. 你的项目里如果有脚本判断发行版，它应该读 `ID` 还是 `ID_LIKE`？分别会在什么情况下判断错误？
3. 第 5 步里 `getenforce` 报"命令不存在"是正常的还是异常？结合 1.4 节的表格解释。
4. 如果 `uname -r` 输出的是 `6.8.0-50-lowlatency`，这个系统的用途大概是什么？

### 清理
本实验全部是只读命令，无需清理。

---

### 实验 2：亲眼看清 glibc 与 musl 的鸿沟

> 环境：Ubuntu 24.04 LTS，需要 Docker
> 耗时：约 15 分钟

### 目标

理解为什么同一个二进制在 Ubuntu 上能跑、在 Alpine 上会崩，并掌握判断方法。

### 步骤
**第 1 步：编译一个动态链接的程序**

```bash
$ cat > /tmp/libc_test.c <<'EOF'
#include <stdio.h>
#include <string.h>

int main(void) {
    char buf[64];
    const char *home = getenv("HOME");
    snprintf(buf, sizeof(buf), "%s", home);
    printf("HOME=%s strlen=%zu\n", buf, strlen(buf));
    return 0;
}
EOF

$ gcc -o /tmp/libc_test /tmp/libc_test.c
```

**第 2 步：在 Ubuntu 上确认依赖**

```bash
$ ldd /tmp/libc_test
```

```console
	linux-vdso.so.1
	libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6
```

看到 `libc.so.6` —— 这是 glibc 的标志。

**第 3 步：拷进 Alpine 容器**

```bash
$ docker run --rm -v /tmp:/tmp alpine /tmp/libc_test
```

**观察**：报 `Error loading shared library: libc.so.6: No such file or directory`，或者直接报 `not found`（提示是动态链接器本身就不在）。这就是 musl/glibc 差异的直观体现。

**第 4 步：静态链接后再试一次**

```bash
$ gcc -static -o /tmp/libc_test_static /tmp/libc_test.c
$ file /tmp/libc_test_static
```

```console
/tmp/libc_test_static: ELF 64-bit LSB executable, x86-64, statically linked, not stripped
```

```bash
$ docker run --rm -v /tmp:/tmp alpine /tmp/libc_test_static
```

```console
HOME=/root strlen=5
```

跑通了。

**第 5 步：观察体积差异**

```bash
$ ls -lh /tmp/libc_test /tmp/libc_test_static
```

### 验证
```bash
$ docker run --rm -v /tmp:/tmp alpine sh -c 'ls -l /lib/ld-musl* 2>/dev/null; echo "---"; ls /lib/ | head'
```

### 思考
1. 为什么第 3 步的报错提示是 `No such file or directory` 而不是"缺少 libc"？这个误导性的提示你以前有没有遇到过？
2. 静态链接后体积涨了多少倍？为什么 Go 和 Rust 编译的静态二进制在容器里反而没有这个问题？
3. 如果你的服务依赖 DNS 解析，静态链接 glibc 会有什么问题？（提示：想想 NSS 模块）
4. 你现在选 Ubuntu 还是 Alpine 做容器基础镜像，取决于什么？

### 清理
```bash
$ rm -f /tmp/libc_test /tmp/libc_test_static /tmp/libc_test.c
```

---

## 1.11 自测题

### 一、简答

1. 为什么 Linux 上 `kill -9 1` 会得到"权限不足"，而 Windows 上你通常是管理员？用本章的视角解释。
2. `cat` 一个很大的文件和一个小文件，第二次都会快。这跟内核的哪个机制有关？
3. 你的运维同事发来一条命令 `dnf install nginx`，但你的机器是 Ubuntu。解释为什么这条命令不能直接用，以及该怎么改。
4. 为什么说"Ubuntu 是 Debian 的下游，不是反过来"？这个层级关系在实践中意味着什么？
5. `uname -r` 输出 `6.8.0-50-generic`，逐段解释每一部分代表什么。其中哪一段是 Ubuntu 特有的？
6. Ubuntu 24.04 的 `/etc/debian_version` 里写的是 `trixie/sid`，这和 `VERSION_ID="24.04"` 矛盾吗？为什么？
7. 强制访问控制框架，Ubuntu 和 RHEL 分别用什么？网上说"权限不足就关掉 SELinux"，在 Ubuntu 上照做会发生什么？

### 二、命令填空

1. 读现代发行版的标准信息文件：________（填路径）
2. 查看内核版本号：________
3. 查看 CPU 架构：________
4. 判断一个二进制是否依赖 glibc，用 ________ 命令，观察输出里的 ________
5. 在 Ubuntu 上把 `vi` 指向完整版 vim：________
6. 列出 `/etc` 下所有发行版标志文件：________
7. 静态链接一个 C 程序：________
8. 用一条 shell 命令判断 `/etc/apt/sources.list.d/` 下用的是传统格式还是 deb822 格式：________

### 三、故障分析

**案例 1**

> 现象：把一台 Ubuntu 20.04 服务器的 `/etc/apt/sources.list` 复制到新装的 Ubuntu 24.04 上，执行 `apt update` 报 `E: The repository ... does not have a Release file`。
> 1. 这个错误最可能的原因是什么？
> 2. Ubuntu 24.04 上这个文件的默认状态是什么？
> 3. 正确做法是什么？

**案例 2**

> 现象：一个 Go 程序在 `alpine:3.19` 容器里正常运行。换成 `ubuntu:24.04` 后报 `exec format error`。但你确认过 `go env GOARCH` 输出是 `amd64`，和镜像架构一致。
> 1. 这个现象为什么反直觉？
> 2. 列出三个可能的原因。
> 3. 用一条命令验证你的怀疑。

**案例 3**

> 现象：你在 Ubuntu 上 `ssh` 到一台服务器执行 `ifconfig`，提示 `command not found`。但服务器上明明配了网卡，网站能正常访问。
> 1. 最可能的原因是什么？
> 2. 用哪两个命令可以确认网卡确实是通的？
> 3. 为什么"能访问但命令不存在"是正常的？

**案例 4**

> 现象：你的同事说"RHEL 9 比 Ubuntu 24.04 更安全，因为它是企业版"。
> 1. 这个说法哪里不准确？
> 2. 各自的安全更新实际由谁提供？
> 3. 从"安全更新能持续多久"的角度，两者差别在哪？

### 四、综合实践

1. 写一个 shell 脚本 `sysinfo.sh`，接收一个可选参数：
   - 不带参数：打印发行版家族、发行版 ID、内核版本、架构、是否 LTS
   - 带 `-f`：额外打印 CPU 核心数、内存总量、磁盘使用率
   - 带 `-j`：额外以 JSON 格式输出（提示：`/etc/os-release` 本身接近 JSON，
     但需要处理值里的引号；也可以用 `python3 -c` 读 `json.load` 配合 `shlex`）

   要求：脚本开 `set -euo pipefail`，对非 Ubuntu 系统也能优雅降级。

2. 你要为公司内部写一份《服务器操作系统选型规范》，文档必须包含：
   - 为什么选 Ubuntu Server LTS 而不是 Debian Stable 或 Rocky Linux（各两条理由）
   - 为什么排除滚动更新发行版（至少三条具体风险，不要只说"不稳定"）
   - 滚动更新发行版在什么**具体场景**下反而是更优选择（至少两个场景）
   - 什么时候必须跟着公司已有标准走，即使它不是技术上最优的

---

**下一章预告**：第 2 章《安装 Ubuntu 24.04 LTS 与首次配置》——我们会真的动手装一台虚拟机，分区方案逐屏讲解，装完立刻做十件让后续省心的事：SSH 密钥登录、关闭密码登录、配置 nftables 防火墙、设置时区、配置国内镜像源、设置自动安全更新、配置 Swap、设置 ulimit、装好开发工具链、禁用不需要的服务。

---

*本章完。*