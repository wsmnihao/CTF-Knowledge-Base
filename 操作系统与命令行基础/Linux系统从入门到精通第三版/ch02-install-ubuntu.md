# 第 2 章 安装 Ubuntu 24.04 LTS 与首次配置

> **本章目标**：读完后你能——
> 1. 说出 Ubuntu Server 与 Ubuntu Desktop 在安装体积、软件栈、运维方式上的实质差异，并据此为场景选型
> 2. 在虚拟化、双系统、云镜像三条安装路线里，为一个具体场景选出合适的那条并说明理由
> 3. 独立完成一次 Ubuntu 24.04 安装，能讲清每一屏安装器在问什么、你为什么这么选
> 4. 手动画出一套分区方案，并解释 `/boot`、`/`、`/home`、swap 各自该不该独立
> 5. 装完 30 分钟内完成首次配置清单，知道每一项在防什么坑
> 6. 避开 UEFI 双系统安装里最常见的三个致命操作
>
> **前置知识**：第 1 章《Linux 是什么，以及你该选哪个发行版》
>
> **预计耗时**：90 分钟（含装系统）

大多数人的第一次 Linux 安装，结局是这样的：卡在分区界面二十分钟，因为不知道该选第几项；装完发现连不上网；`apt update` 报一串 404；过了三个月才发现当初选错了文件系统格式，想改又不敢。

这一章的目标只有一个：**让每一步都是你做出来的决定，而不是照着教程点"下一步"。** 安装是本书唯一一个"一次做错就要重装"的环节，值得多花时间。

---

## 2.1 第一件事：Server 还是 Desktop

打开 Ubuntu 官网下载页面，你会在同一个位置看到三个镜像：

```
Ubuntu 24.04.1 LTS  (PC 64-bit)     ← 这个文件约 3 GB
Ubuntu 24.04.1 LTS  (Server 64-bit) ← 这个文件约 78 MB
```

不是 Desktop 的某个"精简模式"，是**两个完全独立的镜像、两个不同的软件栈**。先把这个选择想清楚，能省掉后面一大堆麻烦。

### 两种镜像的实质差异

| 维度 | Server | Desktop |
|---|---|---|
| **ISO 体积** | ~78 MB | ~3 GB |
| **安装后占用** | ~1.5–2 GB | ~8–12 GB |
| **图形界面** | 无（纯终端） | GNOME |
| **启动默认进入** | tty1（字符终端） | 图形会话 |
| **包管理策略** | 只装你 `apt install` 的东西 | 一套预选的桌面应用全家桶 |
| **cloud-init** | ✅ 预装，云环境靠它初始化 | ❌ 不装 |
| **无人值守自动更新** | ✅ 预装 `unattended-upgrades` | 部分安装 |
| **OpenSSH 服务端** | ✅ 预装 | 需手动装 |
| **磁盘分区默认值** | LVM（有 swap） | ext4 直排 |

**三个真正重要的差别**（其余都是次要的）：

**（1）Server 带 cloud-init，Desktop 不带**

`cloud-init` 是云厂商用来在机器第一次开机时"注入"配置的组件——SSH 公钥、主机名、软件源、数据盘挂载点，全靠它。云服务器上你能直接用密钥登录，本地装的 Desktop 镜像没这个能力。如果你以后要把自己机器的初始化逻辑做成脚本，`cloud-init` 值得提前熟悉。

**（2）Server 默认装无人值守安全更新**

Server 镜像预装并启用了 `unattended-upgrades`，它会在后台自动下载并安装安全补丁。Desktop 默认不这么做。**"生产服务器为什么无人值守自己打补丁"这个问题，在 Server 上答案是默认开的，在 Desktop 上答案是没开。**

**（3）安装体积差 40 倍**

3 GB 的 ISO 装完占 12 GB，其中大部分是你暂时用不上的图形环境、影音解码器、办公套件、浏览器。这在笔记本上无所谓，在只有 20 GB 的云主机上就是灾难。

### 怎么选

```
你的目的是什么？
│
├─ 学命令行 / 运维 / 服务器 / 云主机
│   └─ ★ Server
│
├─ 日常桌面主力机，要图形界面办公
│   └─ Desktop
│
├─ 笔记本，想学 Linux 又不想天天开虚拟机
│   └─ Desktop（双系统，见 2.2）
│
│   小技巧：也可以装 Desktop 再卸载图形，
│   但那是绕远路，不如直接装 Server + 按需装 GUI
│
└─ 学习分区/LVM/多系统这些底层操作
    └─ Server，而且建议装在虚拟机里（可随时快照回滚）
```

> **一个实用建议**：学习本书的全程，用 **Server 镜像装在虚拟机里**。理由有三条——可以随便折腾（本书第 14 章要建 LVM 做破坏性实验）、装完 20 分钟能用（你不用等半小时）、随时能快照回滚。虚拟机不占你实体机的空间，而实体机双系统一旦装坏，修复的时间成本能抵消所有便利。

---

## 2.2 装在哪：三条安装路线

### 路线 A：虚拟机（本书默认）

在现有系统里跑一个隔离的完整计算机。

**主流虚拟化软件**

| 软件 | 许可 | 适合 |
|---|---|---|
| **VirtualBox** | 开源免费 | 门槛最低，跨平台（Win/macOS/Linux） |
| **VMware Workstation Pro** | 商业 / 有免费个人版 | 性能更好，快照功能更强 |
| **Hyper-V** | Windows 专业版内置 | Windows 用户免装，且性能好 |
| **QEMU + KVM** | 开源免费 | Linux 宿主机上性能最好，命令式 |

**建虚拟机时这几个参数别乱填**：

```bash
# 内存：给 2 GB 足够装 Server；装 Desktop 给 4 GB 起
# 硬盘：给 20 GB 起步（Server 装完约 2 GB，留足扩展空间）
# CPU 核数：1 核能装能跑，2 核体验明显好
# 网络：选 NAT 模式最省事，虚拟机直接拿到宿主机的局域网地址
```

**NAT vs 桥接**，第一次用的人一定会搞混：

| 模式 | 虚拟机拿到的地址 | 能访问外网 | 局域网其他机器能访问虚拟机 |
|---|---|---|---|
| **NAT** | 宿主机的内部网段（独立） | ✅ | ❌ |
| **桥接** | 和宿主机同一个网段的真实地址 | ✅ | ✅ |

学 Linux 期间**默认选 NAT**，省事且不污染局域网。等第 17 章要练 SSH 远程登录时，再切桥接或配 NAT 端口转发。

> **快照是这个模式最大的价值**。装好系统、更新完、装完开发工具链之后，立刻打一个快照叫"干净基线"。之后任何折腾都能一键回滚，不用重装。第 14 章要做 LVM 快照实验时你会深刻感谢这个决定。

### 路线 B：双系统

在你现有的 Windows/macOS 上开一个启动菜单，选进哪个系统。

**代价要先想清楚**：

1. **引导分区会共享**。UEFI 模式下 Windows 和 Ubuntu 共用同一个 EFI System Partition。谁的引导坏了都可能连累对方。
2. **休眠和快速启动要关掉**。Windows 的休眠文件（`hiberfil.sys`）和快速启动会把内存状态写进磁盘，Linux 挂载那个 NTFS 卷时读不懂，会导致 NTFS 只读甚至拒绝挂载。
3. **UEFI 和 BIOS 模式不能混**。Windows 10/11 通常是 UEFI 模式装的，Ubuntu 必须用 UEFI 模式装，否则双系统基本做不成。
4. **改分区有风险**。需要手动分区（见 2.5 和 2.8）。

**适合**：你确实需要同一台机器上随时切换、且愿意花一晚上处理引导问题。

### 路线 C：WSL2（Windows 用户的第三条路）

Windows 10/11 内置的 Linux 子系统，架构上是一个轻量虚拟机，但体验接近本机程序。

```powershell
# 查看已安装的发行版
wsl --list --verbose

# 安装 Ubuntu 24.04
wsl --install -d Ubuntu-24.04

# 更新
wsl --update
```

**WSL2 能做什么、不能做什么，必须分清**：

| | WSL2 | 真虚拟机 | 裸机/云主机 |
|---|---|---|---|
| 完整 Linux 用户空间 | ✅ | ✅ | ✅ |
| systemd 服务管理 | ✅（24.04 默认已启用） | ✅ | ✅ |
| 完整 init 启动流程 | ❌（Windows 代替 PID 1） | ✅ | ✅ |
| 内核模块、定制内核 | ❌ | ✅ | ✅ |
| 文件系统格式 | ext4 但通过 9p 暴露给 Windows | ext4 独占 | ext4 独占 |
| 内核版本 | WSL 自己的一套 | 跟随发行版 | 跟随发行版 |
| 文件 IO 性能 | 跨系统访问慢，放 `/` 下的 Linux 目录 | 正常 | 正常 |
| 网络配置 | 受 Windows 限制 | 独立 | 独立 |

**结论**：WSL2 适合"我想在写代码的间隙敲 Linux 命令"和"跑 Python/Go/Node 项目"。但它**不适合本书**，因为本书要讲 systemd 分层启动、内核模块、磁盘分区、LVM 双系统——这些在 WSL2 里要么看不到，要么被屏蔽了。

**第 16 章会专门讲 WSL2 的网络坑**（`/etc/resolv.conf` 被 Windows 覆盖、localhost 互通行为差异），那部分内容在 WSL2 上做才有意义。

### 我的建议

```
本书学习路径：虚拟机 + Server 镜像           ← 唯一推荐
日常开发：   WSL2（省事，但要接受它的限制）
真正上生产： 云厂商的 Ubuntu 官方镜像（省去分区和配置）
只有一台笔记本且必须双系统：路线 B（做好花一晚上的准备）
```

---

## 2.3 制作启动介质

### 下载与校验

从**官网**下载，避开各种"中文站"和镜像站的二次打包：

```bash
$ wget https://releases.ubuntu.com/24.04/ubuntu-24.04.1-live-server-amd64.iso
```

**必须校验**。ISO 文件 2 GB 多，下载过程中损坏或被中间人替换都很常见，而且损坏的 ISO 可能装到一半才失败：

```bash
$ sha256sum ubuntu-24.04.1-live-server-amd64.iso
```

```console
9e6ec7c0d2adf1d6e2c9d1a3b7e5f8c4a1d0e9b3c7a5f2e8d1b4c6a9f3e7d21  ubuntu-24.04.1-live-server-amd64.iso
```

然后和官网 `SHA256SUMS` 文件里的值比对：

```bash
$ grep server-amd64.iso SHA256SUMS | sha256sum -c -
```

```console
ubuntu-24.04.1-live-server-amd64.iso: OK
```

**看到 `OK` 才继续。** 这是本章成本最低、收益最高的一个动作。

### 写进 U 盘

U 盘容量 8 GB 以上（ISO 本身就要 2~3 GB）。

| 系统 | 工具 | 要点 |
|---|---|---|
| Windows | **Rufus** 或 balenaEtcher | Rufus 需要选分区模式 GPT / UEFI |
| macOS / Linux | balenaEtcher | 图形界面，点两下 |

**Rufus 的两个选项别乱选**：

- **写入模式**：选 **ISO 镜像模式**。不要选 DD 模式，除非你确认 Rufus 直写这块盘（有些老主板 UEFI 只认 DD 写法）。
- **分区类型**：BIOS 机器选 MBR，UEFI 机器选 **GPT**。

> ⚠️ 这一步会**清空整个 U 盘**。里面还有别的文件的话，先备份。

---

## 2.4 安装器逐屏讲解

把 U 盘插上，重启，进 BIOS/UEFI（开机时狂按 `F2`、`F12`、`Delete` 或 `Esc`，看主板品牌），选 U 盘启动。

如果成功，你会看到 Ubuntu 的紫色启动菜单：

```
┌──────────────────────────────────────────────┐
│   ┌──────────────────────────────────────┐   │
│   │         Try or Install Ubuntu        │   │
│   │     Install Ubuntu                   │   │
│   │     Install Ubuntu (safe graphics)   │   │
│   │     OEM install                      │   │
│   │     Advanced options                 │   │
│   └──────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

- **Try or Install Ubuntu**：先进试运行环境，不写盘。用来确认硬件兼容性（无线网卡、显卡、声音）。**这一步值得花五分钟。**
- **Install Ubuntu**：直接安装
- **safe graphics**：装了但开机黑屏时用这个
- **OEM install**：预装在笔记本上的版本，会自动装厂商驱动，代价是配置不如原版干净

> **先 Try 一下是本章最省时间的建议**。等进到分区界面才发现无线网卡不工作，只能退出去装驱动，白等半小时。

以下按 Ubuntu 24.04 安装器（Subiquity）的默认流程逐屏走。

### 屏幕 1 — 语言

选语言会同时决定三件事：安装界面语言、**默认键盘布局**、新建用户的默认语言环境。

如果你将来要处理中文文件名、排查编码问题，建议选中文界面但保持键盘布局为 English (US)——中文输入法下 `/` 和 `?` 的位置和英文布局不同，装完改布局很麻烦。

### 屏幕 2 — 键盘布局

- 选 **English (US)**（即使你是中文用户，键盘布局按物理键位选，别按输入法选）
- 右上角有 **"Detect Keyboard Layout"**，点一下随便敲几个键自动检测

### 屏幕 3 — 网络

这里有个**很多人会踩的坑**。

- 选第一个网卡（`Wired connection 1`）
- **IPv4 Method 选 `Use DHCP`**（默认）——让路由器分配 IP
- 点进 `Configure`，`Use this connection` 打勾
- **这一步不要动 IPv6，不要动代理**

⚠️ 如果这一步网络不通，**装完之后就没有网络了**，你会面对一个没有 apt 源的离线系统。所以：

> **在 Try 环境里先 `ping` 一下确认网络通。** 不通的话，这一步要手工填 IP。

手工填的字段（家用路由器常见值）：

| 字段 | 常见值 |
|---|---|
| Address | `192.168.1.100`（避开路由器 DHCP 池，通常 .100 以上） |
| Netmask | `255.255.255.0` |
| Gateway | `192.168.1.1` |
| DNS | `223.5.5.5` `119.29.29.29` |

> `ping` 不通但浏览器能上的话，试 `curl -I http://example.com`。有些网络禁 ICMP 但放通 TCP。

### 屏幕 4 — 存储与分区（详见 2.5）

### 屏幕 5 — 个人与主机信息

| 字段 | 怎么填 | 说明 |
|---|---|---|
| 你的名字 | 真实姓名 | 会进 `/etc/passwd` 的 GECOS 字段，不影响登录 |
| 计算机名 | 主机名 | **见下面的注意事项** |
| 用户名 | 全小写、无空格 | ⚠️ 见下面 |
| 密码 | 强密码 | |
| 登录方式 | 密码登录 | 装完改成密钥，第 17 章 |

**主机名的三个坑**：

1. 只能用 `a-z`、`0-9`、`-`，**不能有下划线**。这是 DNS 标签规则。
2. 不要用默认值 `ubuntu`。公司网络里多台机器都叫 `ubuntu`，排查问题时你会疯掉。用 `web-01`、`db-prod-01` 这种能看出用途的名字。
3. 改名之后，`/etc/hostname` 和 `/etc/hosts` 要手动同步，只改一个会出问题。

**用户名的两个坑**：

1. **全小写**。Linux 用户名区分大小写，`Ubuntu` 和 `ubuntu` 是两个用户，但很多脚本和服务会假设小写。
2. **别用 `admin`、`root`、`test`、`user`**。`admin` 在 Ubuntu 上是组名不是用户名；`test` 会被某些工具误当成测试模式。

**密码**：Ubuntu 默认不允许 root 直接登录，只能 sudo。这意味着**你的普通用户密码就是系统的第一道防线**，别设成 `123456`。

### 屏幕 6 — 加密（可选）

24.04 安装器提供 LUKS 全盘加密选项，在支持的硬件上还可能提供基于 TPM 的自动解锁。

**取舍说清楚**：

| | 开 | 关 |
|---|---|---|
| 防盗：机器被物理搬走 | ✅ 硬盘数据拿不出来 | ❌ 拆下来就能读 |
| 代价 | 忘记密码 = 数据永久丢失 | 无 |
| 性能 | 有轻微开销（TPM 存在时几乎无感） | 无 |
| 云主机 | 一般由云厂商做，不在安装器里开 | 默认 |
| 虚拟机 | **基本不用开**（宿主机的磁盘加密已经覆盖了虚拟磁盘） | ✅ |

> **虚拟机的场景下不要开全盘加密**。它给你带来的唯一好处是防止别人拷走你的虚拟磁盘文件，而代价是你调试问题时多一层解密、快照管理变麻烦。

**如果你开了 TPM 自动解锁**：务必确认你还记不记得那个恢复密钥（TPM 自动解锁失败时要用）。这是 TPM 唯一的兜底，也是最容易被忽略的细节。

### 屏幕 7 — OpenSSH（Server 镜像独有）

24.04 的 Server 安装器多了一屏 OpenSSH 配置：

```
[x] Install OpenSSH server
    [ ] Allow root login
    [ ] Port: 22
```

**在虚拟机里就装上，并且现在填好你的 SSH 公钥**（如果安装器界面提供了 `Import SSH key` 的选项）。

理由：装完之后你在宿主机终端里就能 `ssh` 进来干活，不用每次切窗口。而填公钥这一步放太晚会忘。

**勾选 `Allow root login` 的建议**：不勾。保持"普通用户登录 + sudo"这条路径，第 6 章和第 17 章会详细讲它的理由。

### 屏幕 8 — 重启

装完重启，会拔掉或提示拔掉 U 盘。第一次进入系统的流程见 2.6。

---

## 2.5 磁盘分区方案

这一屏是新手卡住最久的地方。先建立三个概念，后面所有选择都从它们推出来。

### 概念 1：分区 vs 挂载点

Linux 上"分区"是物理概念（把一块磁盘切成几块），"挂载点"是把某个分区挂到目录树的某个位置。**分区本身没有路径，挂了才有。**

```
磁盘 sda 分成 3 个分区：
  sda1  → 挂到 /boot      → 你在 /boot 看到的就是 sda1 的内容
  sda2  → 挂到 /          → 你在 / 看到的是 sda2 加上其他所有挂载的内容
  sda3  → 挂到 /home      → 你在 /home 看到的是 sda3
```

### 概念 2：为什么 / 下面可以继续有挂载

因为 `/` 本身也是一个挂载点。分区 2 挂到 `/` 之后，你在 `/home` 创建的文件落在 sda2 上。但如果你又把 sda3 挂到 `/home`，那么 `/home` 这个位置的读写就转到 sda3 去了。**这是 Linux 的设计：目录树是逻辑结构，分区是物理存储，两者解耦。**

### 概念 3：LVM 是什么

LVM 在物理分区之上加一层抽象：

```
硬盘分区(sda2)  →  物理卷 PV  →  卷组 VG  →  逻辑卷 LV  →  文件系统  →  挂载点
                   (一个分区)   (磁盘池)     (可动态切分)    (ext4)
```

好处是**在线扩容**：VG 里有剩余空间时，你可以随时给 LV 加大，然后 `resize2fs` 扩展文件系统，全程不停机。这是第 14 章的主题。

### 三套方案对比

#### 方案一：单分区（最简）

```
sda1  →  ext4  →  /        （整块盘，含 swap 文件）
```

| 优点 | 缺点 |
|---|---|
| 什么都不用想 | 只能再加硬盘重装 |
| 安装最快 | `/home` 满会影响系统 |

**什么时候选**：临时测试机、跑容器的节点、不需要长期存放数据的机器。

#### 方案二：标准分区（Server 默认思路）

```
sda1  →  ext4  →  /boot     1–2 GB
sda2  →  ext4  →  /         剩余空间
sda3  →  swap              2–8 GB
```

| 优点 | 缺点 |
|---|---|
| 直观、可控 | 扩容要挂载别的盘 |
| `/boot` 独立后内核升级不会写满根分区 | swap 只能是分区（不能像文件那样动态加） |

**为什么要单独给 `/boot`**：内核更新会把新内核写进 `/boot`。如果 `/boot` 还在根分区上，一个写满 `/boot` 的系统可能连单用户模式都进不去，因为 `/boot` 里的 vmlinuz 就是启动要读的东西。给它 1–2 GB 就够放几十个内核版本。

> `apt autoremove --purge-remove` 清理旧内核，或者 `/etc/apt/apt.conf.d/00autoremove` 里设自动清理，能防止 `/boot` 被塞满。这是生产服务器的常见事故，第 10 章会展开。

#### 方案三：LVM

```
sda1  →  ext4  →  /boot/efi   512 MB（仅 UEFI 机器需要）
sda2  →  LVM    →  VG
                      ├─ LV-root  →  ext4  →  /       40 GB
                      ├─ LV-swap  →  swap          4 GB
                      ├─ LV-home  →  ext4  →  /home   剩余
                      └─ LV-var   →  ext4  →  /var/log 10 GB
```

**本书记得这个方案**，因为它支撑了第 14 章的所有内容。

Ubuntu Server 24.04 的安装器在"使用整块磁盘"路径下会提供 LVM 选项（具体措辞随版本略有差异，你屏幕上看到什么就以什么为准）。核心区别是：**标准分区在安装时就把空间定死了，LVM 是先做一个磁盘池，之后随时从池子里切逻辑卷出来。**

### 安装器上怎么选

```
Use an entire disk:  [选择 sda]  →  用整块盘，最省事

然后在存储类型上二选一：
  ○ Use LVM          磁盘池，可在线扩容     ← 想要灵活性选这个
  ○ Standard         直接分区，简单可预测   ← 求稳选这个
```

如果要自己划，就选 **`Other options` / `Manual partitioning`** 进入分区编辑器。

> ⚠️ **手动分区是最容易出错的路径**。它意味着你要负责：每个分区的挂载点、文件系统类型、是否格式化。少设一个挂载点，那个目录的内容就存到了根分区；忘记格式化，装完重启直接进救援模式。

### 一个不推荐的做法

有些教程会教你单独划一个 `/usr`。**本书不建议**。理由是 `/usr` 在现代发行版上不再适合单独分区（它不再是只读的），单独划分带来的好处远小于它增加的复杂度。如果确实要把 `/var` 独立出来（比如日志和数据库要分开配额），那是有明确理由的；`/usr` 没有。

---

## 2.6 首次启动

装完重启，拔掉 U 盘。第一次进入系统有几件事需要知道。

### tty 切换

Linux 的虚拟终端（tty）：

| 组合键 | 内容 |
|---|---|
| `Ctrl` + `Alt` + `F1` ~ `F6` | 切换到 tty1–tty6 |
| `Ctrl` + `Alt` + `F1`（或 `F7`/`F12`，看发行版） | Desktop 上切回图形界面 |

Server 版只有 tty1–tty6，**全是字符终端**。

**这是最实用的排障技巧**：图形界面崩了、黑屏了、卡死了，切到 tty2 用纯终端登录：

```bash
$ ssh user@server
# 或者 Ctrl+Alt+F2
```

图形界面的问题（桌面进程崩了、显示驱动挂了）经常只在图形层，底下的系统完全正常。**这是 Server 不装桌面的一个隐藏好处——你永远有一条退路。**

### UEFI 与 BIOS

开机时主板 firmware 加载引导程序，有两种模式：

| | BIOS（Legacy） | UEFI |
|---|---|---|
| 分区表 | MBR（最多 4 个主分区） | **GPT（支持128 个分区）** |
| 引导方式 | MBR 里的引导代码 | 独立的 EFI System Partition |
| 32 位限制 | 无 | 无 |
| 启动速度 | 慢（要逐个探测硬件） | 快 |
| Secure Boot | 无 | 有 |

**Ubuntu 24.04 只支持 UEFI**。你装之前要确认：

- Windows 是不是 UEFI 模式（`msinfo32` 里看 `BIOS 模式`）
- 安装时启动 U 盘是不是 UEFI 模式启动的（启动菜单里一般有 `UEFI: <U盘名>` 和不带 UEFI 两个条目，**选带 UEFI 的那个**）

双系统时两边模式不一致是最难修的问题之一，所以要在装之前就查清楚。

### Secure Boot

Secure Boot 是 UEFI 的固件级签名验证机制：只允许启动有合法签名的引导程序。

- **Ubuntu 24.04 支持 Secure Boot**，用的是 Canonical 自己的 shim 引导器 + 微软签名的密钥链
- 开着它不影响正常使用
- **什么时候需要关它**：你装了需要自己签名的第三方内核模块（DKMS 模块），或某些老主板的 UEFI 实现有 bug

不要一上来就关。看到引导失败再回来处理。

### 第一个登录

```bash
# 用你屏幕 5 设的用户名和密码登录

ubuntu@ubuntu-server:~$
```

现在你在 **tty1**，一个字符终端。第 3 章会从这里开始讲 Shell。

---

## 2.7 首次配置清单

装完到能用，中间还有一堆活。下面十件事按优先级排序——**排在前面的不先做，后面会出问题**。

### 1. 更新系统（立刻做）

```bash
$ sudo apt update
$ sudo apt full-upgrade
$ sudo reboot
```

**为什么排在第一位**：镜像是在**构建日**（通常是发布前的某个快照）打出来的。装完这一刻，你手上是一个带着已知 CVE 的旧版本。不先更新就往下走，等于在已知漏洞上搭环境。

> ⚠️ `apt full-upgrade` 会**安装新内核**，所以必须重启才生效。新旧内核在 `/boot` 里并存，第 2.5 节说过 `/boot` 要留够空间。

> `apt update` 和 `apt full-upgrade` 的顺序不能反。`full-upgrade` 依赖 `update` 拉下来的索引，索引不更新就是拿着过期的依赖关系去装东西。

### 2. 重启并确认内核

```bash
$ uname -r
6.8.0-50-generic
```

和你重启前看到的是同一个版本吗？不一样就说明新内核没装上，回第 1 条重做。

### 3. 设置时区

```bash
$ timedatectl
```

```console
               Local time: Wed 2025-09-10 14:22:31 CST
           Universal time: Wed 2025-09-10 06:22:31 UTC
                 RTC time: Wed 2025-09-10 06:22:31
                Time zone: Etc/UTC (UTC, +0000)
System clock synchronized: yes
              NTP service: active
          RTC in local TZ: no
```

**默认是 `Etc/UTC`**，不是你的本地时区。这会导致日志时间对不上你看的监控系统。

```bash
$ sudo timedatectl set-timezone Asia/Shanghai
```

时区设置有两个层次，`timedatectl` 只管了第一个：

| 层 | 管什么 | 怎么配 |
|---|---|---|
| **系统时区**（`/etc/localtime`） | 日志、文件时间戳显示 | `timedatectl set-timezone` |
| **硬件时钟**（RTC） | 断电重启后读回的时间 | `timedatectl set-local-rtc` |

一般保持 RTC 用 UTC 就行（`RTC in local TZ: no`，这是默认值，也更推荐）。

### 4. 设置主机名

```bash
$ hostnamectl set-hostname web-01
```

**同步改另外两处**，否则 sudo 报警告：

```bash
$ sudo vim /etc/hostname
$ sudo vim /etc/hosts
```

```
127.0.0.1   localhost
127.0.1.1   web-01
::1         localhost ip6-localhost ip6-loopback
```

**`127.0.1.1` 这一行一定要改**，改完主机名才能自己解析自己。不改的话 `hostname -f` 会报错，apt 会提示 `WARNING: apt does not have a stable CLI interface`。

### 5. 配置国内软件源（如果需要）

国内直连 Ubuntu 官方源速度可能很慢。24.04 用的是 deb822 格式（第 1.5 节讲过），配置路径是：

```
/etc/apt/sources.list.d/ubuntu.sources
```

⚠️ **别去找 `/etc/apt/sources.list`**——24.04 上那个文件可能压根不存在，改它没有任何效果。这是升级旧脚本时最常见的失败点。

改之前先备份：

```bash
$ sudo cp /etc/apt/sources.list.d/ubuntu.sources{,.bak}
```

⚠️ **换源之后先别急着 `apt update`**，先确认 `dnsutils` 之类依赖它的包没被卡住——换错源会让 apt 处于半坏状态。

### 6. 装常用工具

```bash
# 系统管理基础包（推荐新手直接装这个，它会带出一套合理的集合）
$ sudo apt install ubuntu-server-minimal

# 开发工具链
$ sudo apt install build-essential git curl wget vim tree htop

# 网络排查工具（第 16 章会大量用）
$ sudo apt install net-tools dnsutils iputils-ping traceroute mtr-tc tcpdump
```

**装完 `vim` 后立刻做一件事**——把 `vi` 指向完整版（Ubuntu 默认 `vi` 是 vim.tiny，第 1.4 节讲过）：

```bash
$ sudo update-alternatives --install /usr/bin/vi vi /usr/bin/vim 100
```

### 7. 配置 SSH（如果安装器没装）

```bash
$ sudo apt install openssh-server
$ systemctl enable --now ssh
```

**然后立刻去装第 2 章后半段该做的事**：配置密钥登录、关密码登录、防火墙。这三件事必须一起做，只做一半就是给自己开一个不锁的后门。完整流程见第 17 章。

### 8. 配置防火墙

```bash
# 看当前有什么规则
$ sudo nft list ruleset

# 看 AppArmor 状态
$ sudo aa-status
```

Ubuntu 默认防火墙是**放行所有入站**的（第 16 章会解释这背后的取舍）。至少要做两件事：

- 明确知道默认策略是什么
- 如果这台机器要暴露 SSH，把 22 端口显式允许进来

**不要在还没配好密钥登录之前就先开防火墙限 SSH**，否则你可能把自己关在门外——所以顺序上第 7 条要先做完。

### 9. 检查 Swap

```bash
$ swapon --show
$ free -h
```

```console
NAME      TYPE  SIZE USED PRIO
/swapfile file    4G   0B   -2
```

24.04 默认用 swap 文件（Server + LVM 方案下）。4 GB 的 swap 在物理内存够用时基本用不到它的"扩展内存"作用，它的真实用途是**给内核一个缓冲，避免突发内存分配直接触发 OOM Killer**。

### 10. 记录一份基线

把上面所有配置记下来。这是本书反复出现的主题——**没有文档的系统等于没有系统**：

```bash
$ mkdir -p ~/docs
$ { echo "=== 安装日期 ==="; date
    echo "=== 版本 ==="; cat /etc/os-release | head -3
    echo "=== 内核 ==="; uname -a
    echo "=== 分区 ==="; lsblk -f
    echo "=== 手动装的包 ==="
    grep -h '^Commandline:' /var/log/apt/history.log* 2>/dev/null | head -30
  } > ~/docs/system-baseline.txt
```

把这份文件放进 Git（第 24 章），以后每次变更都提交一次。**三个月后你重建同样一台机器，照着它跑一遍就行。**

---

## 2.8 UEFI 双系统的三个致命陷阱

如果你选了 2.2 的路线 B，这节的内容是专门给你的。三个操作，每一个都会让你打不开 Windows 或 Ubuntu。

### 陷阱 1：格式化了 Windows 的 EFI System Partition

**原理**：UEFI 模式下，系统的启动程序存放在一个独立的 FAT32 分区里，叫 EFI System Partition（ESP），通常 100–500 MB，在 Windows 里表现为"EFI 系统分区"。**Windows 和 Ubuntu 共用它。**

Windows 分三个层次启动：

```
BIOS/UEFI 固件
   ↓  读 EFI 变量（存放在 ESP 上）
EFI 引导管理器（\EFI\Microsoft\Boot\bootmgfw.efi）
   ↓  加载
Windows 引导管理器
   ↓
系统
```

ESP 上有**两套**引导程序：`\EFI\Microsoft\` 和 `\EFI\ubuntu\`。你在 UEFI 里看到的"启动菜单"是固件读取 ESP 目录后生成的。

**所以**：手动分区时，如果你在 Ubuntu 的分区编辑器里选了那个 512 MB 的 FAT32 分区并勾了"格式化"，Windows 的引导程序就被抹掉了。重启后固件找不到任何引导项，**Windows 和 Ubuntu 都进不去**。

**正确做法**：手动分区时，那个 ESP 分区的 **Format 复选框不要勾**，Mount point 选 `/boot/efi`。不勾格式化就是挂载复用，不破坏已有内容。

### 陷阱 2：Windows 的休眠和快速启动没关

**原理**：Windows 的快速启动（Fast Startup）本质上是**休眠**，会把内存状态以压缩形式写进硬盘。休眠文件 `hiberfil.sys` 和 `pagefile.sys` 通常和 NTFS 主分区在同一个卷上。

**后果**：Linux 挂载这个 NTFS 卷时，识别到卷处于"休眠未完全唤醒"状态，出于数据保护会**拒绝挂载或者强制只读**。

Ubuntu 24.04 对 NTFS 有改进，但也可能遇到 `mount: /mnt/windows: ntfs3: failed to load $Bitmap`。而且即使挂载成功，往里写也可能损坏 Windows 的休眠状态。

**关闭方法**（Windows 侧，`管理员权限` PowerShell 或 CMD）：

```cmd
powercfg /h off
```

这会同时关闭休眠和快速启动，并删除 `hiberfil.sys`。如果你需要休眠，用 `powercfg /h on type reduced` 只开休眠不开快速启动。

### 陷阱 3：两块硬盘但只装了一个系统的 EFI 变量

**原理**：UEFI 的启动顺序（NVRAM 里的 `BootOrder`）是**跨所有磁盘**的。多个磁盘各有自己的 ESP 时，固件按顺序尝试。

**后果**：装完双系统，重启直接进了 Windows 的菜单，看不到 Ubuntu 选项——因为固件的 BootOrder 里只有 Windows 的引导路径。Windows 的引导管理器优先级更高，它自己不显示 Linux 选项。

**排查**：

```bash
# 从 Linux 里看当前引导项
$ efibootmgr -v
```

```console
BootCurrent: 0007
Timeout: 0 seconds
BootOrder: 0007,0000,0001,0002,0003
Boot0007* ubuntu    HD(1,GPT,abc123...)/File(\EFI\ubuntu\shimx64.efi)
Boot0000* Windows Boot Manager  HD(1,GPT,def456...)/File(\EFI\Microsoft\Boot\bootmgfw.efi)
```

**修复**（在 Linux 上执行，写 EFI 变量需要 efivarfs 可写）：

```bash
# 卸载 efivarfs 再重挂，让它可写（Ubuntu 的常见做法）
$ sudo umount /sys/firmware/efi/efivars
$ sudo mount -o umask=000 /sys/firmware/efi/efivars
```

或者进 Windows 的管理员 PowerShell：

```cmd
bcdedit /enum firmware
```

**更省事的方法**：装完双系统后在 Windows 里以管理员身份运行 `bcdboot C:\Windows /s /f UEFI`，它会重建 NVRAM 里的引导项。

### 顺手一个知识：GPT 的备份表

上一节说 UEFI 用 GPT 分区表。这里补一个很多人不知道的机制，它能救你一次。

MBR 分区表只有一份，写在磁盘第一个扇区里。GPT 把它放在磁盘**开头和结尾各一份**。

这意味着：**如果磁盘开头那一份分区表损坏了，固件会自动去读结尾那份。**

这就是 GPT 比 MBR 抗损坏的原因。MBR 没有这种冗余，开头一坏，整块盘要重新初始化、数据分区全丢。

GPT 还有一个自描述头，里面记录了 CRC 校验和备份分区的位置。所以"分区表坏了"在 GPT 上通常是可恢复的，在 MBR 上通常是灾难性的。

> **代价**：GPT 需要 ESP 才能引导。所以一块用 GPT 分区但没有 ESP 的硬盘，插到 UEFI 机器上是引导不起来的——即使数据完好。这类盘需要用 MBR 分区表，或者手动建 ESP。

---

## 2.9 本章小结

1. **Server 和 Desktop 是两个镜像，不是同一个的两种模式。** Server 更小、带 cloud-init 和无人值守更新、不装图形环境。学习和运维用 Server。
2. **学习本书用虚拟机 + Server。** 快照能让你随便折腾而不怕搞坏。WSL2 不适合本书，因为它屏蔽了 systemd、内核、磁盘这些要学的东西。
3. **ISO 必须校验 sha256sum。** 两分钟的操作，能省掉装到一半失败的半小时。
4. **安装时先 Try 一下**，确认硬件（尤其无线网卡）能用再动手。
5. **网络那一步先 `ping` 通。** 这一屏不通，装完就是离线系统。
6. **`/boot` 单独分区 1–2 GB**，避免内核更新写满根分区导致系统起不来。
7. **LVM 的价值是"以后能改"**。标准分区简单可预测，LVM 灵活可扩容。本书选 LVM 是因为第 14 章要用。
8. **首次更新必须第一个做。** 镜像是构建日打的快照。
9. **24.04 用 deb822 格式**，`/etc/apt/sources.list` 可能不存在，换源改 `/etc/apt/sources.list.d/ubuntu.sources`。
10. **图形界面卡死时按 `Ctrl+Alt+F2` 切 tty 拿纯终端。** 这是 Server 不装桌面的隐藏好处。
11. **双系统三大陷阱**：不格式化 ESP、关 Windows 快速启动、注意 EFI 启动项优先级。

---

## 2.10 动手实验

### 实验 1：验证你的分区方案

> 环境：刚装好的 Ubuntu 24.04 LTS（虚拟机，Server 镜像）
> 耗时：约 20 分钟

### 目标

掌握 `lsblk` / `lsblk -f` / `findmnt` 的读法，能从一块装好的系统反推出当时选的分区方案。

### 步骤
**第 1 步：不带参数的 `lsblk`，看磁盘结构树**

```bash
$ lsblk
```

**第 2 步：加 `-f` 看文件系统类型和挂载点**

```bash
$ lsblk -f
```

**第 3 步：读 `/proc/mounts`**

```bash
$ cat /proc/mounts | grep -E '^/(dev|proc|sys)'
```

**第 4 步：确认 LVM 情况（如果你选的是标准分区会报"未安装 lvm2"）**

```bash
$ sudo pvs 2>/dev/null
$ sudo vgs 2>/dev/null
$ sudo lvs 2>/dev/null
```

**第 5 步：看真正的块设备拓扑**

```bash
$ ls -l /dev/disk/by-id/ | head
$ sudo fdisk -l /dev/sda
```

**第 6 步：对比"分区 vs 挂载点"两个视角**

```bash
$ findmnt /
$ findmnt /boot
$ df -hT /
```

### 验证
一条命令输出"逻辑卷 → 文件系统 → 挂载点"的完整链路：

```bash
$ findmnt -no SOURCE,FSTYPE,TARGET /
```

```console
/dev/sda2[/root]  ext4  /
```

### 思考
1. 你的 `df -hT /` 输出的 SOURCE 里如果有 `[/root]` 这样的方括号，它表示什么？说明你的分区方案是什么？
2. 如果 `lsblk` 里 `/boot` 的挂载点显示为 `[BOOT]`，和它是一个独立分区有关吗？
3. `df -h` 显示已用 40%，但 `du -sh /home/*` 加起来只有 5%，剩下的在哪？（提示：读第 13 章之前先自己想一想）
4. 如果你的方案是标准分区，想给 `/home` 加 20 GB，可能性有几种？分别要做什么？

### 清理
本实验全是只读命令，无需清理。

---

### 实验 2：装完后的基线体检

> 环境：同上
> 耗时：约 20 分钟

### 目标

用一组命令确认系统的关键配置都是对的，并顺手产出一份可复现的基线文档。

### 步骤
**第 1 步：基础信息体检**

```bash
$ {
    echo "### 发行版";  . /etc/os-release; echo "$PRETTY_NAME (ID=$ID LIKE=$ID_LIKE)"
    echo "### 内核";    uname -r
    echo "### 架构";    uname -m
    echo "### 主机名";  hostname -f
    echo "### 时区";    timedatectl show -p Timezone -p NTPSynchronized
    echo "### 启动模式"; [ -d /sys/firmware/efi ] && echo UEFI || echo BIOS
    echo "### 磁盘";    lsblk -o NAME,SIZE,FSTYPE,MOUNTPOINT
    echo "### Swap";    swapon --show
    echo "### AppArmor"; sudo aa-status 2>/dev/null | head -1 || echo "未启用"
  } 2>&1 | tee ~/docs/baseline.txt
```

**第 2 步：验证第一次更新真的生效了**

```bash
$ uname -r
$ apt list --upgradable 2>/dev/null | grep -c upgradable
$ sudo apt update && apt list --upgradable 2>/dev/null | grep -c upgradable
```

**思考**：两个数字如果不一样，说明什么？哪个是"应该"的数字？

**第 3 步：确认软件源配置格式**

```bash
$ ls -la /etc/apt/sources.list 2>/dev/null || echo "传统 sources.list 不存在（24.04 预期如此）"
$ ls /etc/apt/sources.list.d/
$ head -6 /etc/apt/sources.list.d/ubuntu.sources
```

**第 4 步：检查 SSH 服务状态**

```bash
$ systemctl is-enabled ssh
$ systemctl is-active ssh
$ ss -tlnp | grep :22
```

**第 5 步：检查默认防火墙策略**

```bash
$ sudo nft list ruleset
```

**第 6 步：确认 `vi` 指向完整版 vim**

```bash
$ readlink -f $(which vi)
$ vi --version | head -1
```

### 验证

```bash
# 一条命令对照第 1 步的预期
$ systemd-detect-virt        # 虚拟机会输出 vmware / kvm / oracle 等
$ systemd-detect-virt -c qemu  # 容器里为 1
```

### 思考
1. `systemd-detect-virt` 在你机器上输出什么？如果是 `none`，说明什么？
2. `systemctl is-enabled ssh` 返回 `disabled` 意味着什么？和 `inactive` 有什么区别？
3. `nft list ruleset` 输出为空说明了什么安全问题？这个默认值是设计选择还是疏漏？（第 16 章会深入讲）
4. 如果 `vi --version` 显示 `tiny`，第 6 章要用的某些 vim 功能会缺哪些？

### 清理
```bash
$ rm -f ~/docs/baseline.txt
```

> 提示：这个文件其实**建议留着**。它是你 2.7 节第 10 条说的基线文档的起点，以后每次变更都提交一次。

---

## 2.11 自测题

### 一、简答

1. Ubuntu Server 镜像安装后大约占多少空间？Desktop 呢？差的这 10 GB 主要花在哪几块？
2. 为什么 Ubuntu 24.04 上 `/etc/apt/sources.list` 可能不存在？配置文件挪到哪了？用哪种格式？
3. `/boot` 单独分区能防住什么具体故障？为什么 1–2 GB 够用？
4. 标准分区和 LVM 的核心区别是什么？说出一条标准分区做不到、LVM 能做到的事。
5. Ubuntu Server 自带 cloud-init，它在云服务器上具体负责哪几件事？
6. 你要给一台跑 PostgreSQL 的数据库服务器分区。`/var/lib/postgresql` 有没有理由单独划一个分区？说出你的取舍。
7. 为什么安装时建议先选 "Try or Install Ubuntu" 试运行？
8. `timedatectl` 设置的是哪一层的时区？系统里还有哪一层时区配置？断电重启后时间从哪里来？

### 二、命令填空

1. 校验 ISO 的完整性：________
2. 查看磁盘分区树（设备 / 尺寸 / 文件系统 / 挂载点）：________
3. 查看指定挂载点的底层来源：________
4. 查看当前所有块设备的物理拓扑：________
5. 设置系统时区为上海：________
6. 查看系统时间同步状态（时间 / 时区 / NTP 是否同步）：________
7. 把 `vi` 指向完整版 vim：________
8. 查看当前机器是否运行在虚拟机里：________
9. 查看 UEFI 启动项列表：________
10. 列出所有需要更新的软件包：________

### 三、故障分析

**案例 1**

> 现象：装完 Ubuntu 重启后，网卡状态显示 `DOWN`，`ping` 不通，DNS 也解析不了。安装时网络那一步你是手动填的 IP。
> 1. 列出四个可能原因，按排查概率排序。
> 2. 用哪三条命令依次确认你的怀疑？
> 3. 如果 `ping 192.168.1.1` 通但 `ping 8.8.8.8` 不通，说明问题出在哪一层？
> 4. 如果 `ping 8.8.8.8` 通但 `ping baidu.com` 不通呢？

**案例 2**

> 现象：`apt update` 报：
> ```
> E: The repository 'http://archive.ubuntu.com/ubuntu noble Release' does not have a Release file.
> ```
> 同时 `ls /etc/apt/sources.list.d/` 显示 `ubuntu.sources` 存在，而 `/etc/apt/sources.list` 不存在。
> 1. 报错里的 "Release file" 指的是什么文件？
> 2. 结合上一条信息，你怀疑是哪一类问题？
> 3. 你搜到一篇教程让你编辑 `/etc/apt/sources.list` 换阿里云源，按它做会怎样？
> 4. 正确做法是什么？

**案例 3**

> 现象：装完系统 `df -h` 显示根分区 100% 满，但 `du -sh /home/*` 什么都没有。重启后卡在启动画面，进不了登录界面。
> 1. 结合第 2.5 节的内容，你怀疑根分区里有什么撑满了？
> 2. 如果这台机器刚做过 `apt full-upgrade` 但没重启，问题更可能是哪个？
> 3. 你已经无法登录了，还有哪两种救援手段？

**案例 4**

> 现象：装完双系统，重启直接进了 Windows，在 Windows 的重启菜单里按 F12 也能选到 Ubuntu，唯独进 Ubuntu 时黑屏，Secure Boot 报 `Verification failed`。
> 1. 黑屏是 Secure Boot 引起的吗？给出一个判断方法。
> 2. 如果确认是 Secure Boot 引起，你会怎么处理？处理完的长期代价是什么？
> 3. 反过来，如果症状是"完全看不到 Ubuntu 启动项"而不是黑屏，那问题出在 2.8 节的哪个陷阱？

**案例 5**

> 现象：你在 Ubuntu 里挂载了 Windows 的 D 盘（`/mnt/d`），能读到文件，但往里拷一个文件时报 `Read-only file system`。
> 1. 用 `mount | grep /mnt/d` 看输出，`ntfs3` 还是 `fuseblk`？两者说明什么？
> 2. 结合 2.8 节，这个现象最可能的根因是什么？
> 3. 给出修复命令。

### 四、综合实践

1. 为一台配置为 **4 核 / 8 GB 内存 / 100 GB SSD / 需要跑 PostgreSQL 15 和 Redis** 的服务器设计分区方案，写出：
   - 完整分区表（设备 / 大小 / 文件系统 / 挂载点 / 是否格式化）
   - 每一项的理由，特别是你为什么把它独立出来或合并进去
   - swap 设多大，依据是什么
   - 三年后磁盘满了，你的扩容路径是什么（每一步命令）

2. 你要给团队里 10 个人各配一台开发环境，写一份**安装清单文档**，要求包含：
   - 虚拟机资源配置（内存 / CPU / 磁盘 / 网络模式），每项给出理由
   - 安装时每一屏怎么选，包括分区方案
   - 装完后的 10 项配置，按执行顺序排列，并说明**为什么是这个顺序**（哪一步做早了会出事）
   - 一条"基线快照"的记录流程，让新人能复现出和你完全一样的环境
   - 至少三条"不要这么做"的警告，以及不这么做的具体后果

---

**下一章预告**：第 3 章《终端、Shell 与命令基础》——你会第一次真正用 bash 干活：提示符每一段代表什么、`man` 的五个节怎么导航、`$PATH` 是怎么决定你敲 `ls` 时系统去哪找的、以及为什么你永远要敲带引号的变量名。

---

*本章完。*