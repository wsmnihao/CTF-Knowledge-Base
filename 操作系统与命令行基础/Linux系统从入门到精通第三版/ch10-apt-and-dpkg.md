# 第 10 章 apt / dpkg：软件包管理

> **本章目标**：读完后你能——
> 1. 说清 apt 和 dpkg 各自负责什么，以及一次 `apt install` 背后到底发生了什么
> 2. 解释 `apt update` 更新的是什么、为什么它一个包都不会装，以及为什么 `update` 必须放在 `upgrade` 前面
> 3. 分清 `remove`、`purge`、`autoremove`、`autopurge` 四个卸载动词的差别；说清为什么 `purge nginx` 常常"什么都没删"，以及怎么查出配置到底归哪个包
> 4. 用 `apt-cache policy` 读懂一个包的"已装版本 / 候选版本 / 来源"，用 `dpkg -l` 读懂 `ii`、`rc`、`iU`、`hi` 这些状态码
> 5. 处理 `dpkg -i` 留下的未配置依赖（`apt -f install`），并知道 `apt install ./xxx.deb` 是更省事的写法
> 6. 用 `apt-mark hold` 锁住版本，并说清它的适用边界和它不能干什么
> 7. 手工安装一个 `.deb` 包，并彻底卸载、逐项验证"无残留"
> 8. 按信任链的标准添加第三方源和 GPG 密钥，解释 PPA 到底在信任谁
> 9. 说清 snap 和 flatpak 为什么不是 apt 的一部分，以及它们在服务器上意味着什么
>
> **前置知识**：第 3 章《终端、Shell 与命令基础》、第 4 章《文件系统与目录结构》
>
> **预计耗时**：90 分钟

服务器上装一个软件，通常敲的是这一行：

```bash
$ sudo apt install nginx
```

但这一行背后发生了四件事：**找到候选版本 → 下载并校验签名 → 解包到文件系统 → 配置（写配置、注册服务、建用户）**。这四件事分属两个工具：`apt` 干前三件，`dpkg` 干第四件。

理解这个分工，你就理解了本章所有命令存在的理由——**每个命令要么在管理"索引"，要么在管理"安装状态"，要么在处理这两个之间的裂缝。**

---

## 10.1 apt 架构：谁负责什么

### 分层看

```text
┌─────────────────────────────────────────────┐
│ 前端（你敲的）  apt      apt-get   aptitude │
├─────────────────────────────────────────────┤
│ apt 核心                                  │
│   ① 读 sources.list 知道去哪些仓库拿        │
│   ② 读 /var/lib/apt/lists 里的索引          │
│   ③ 版本比较、依赖求解（APT 的核心算法）    │
│   ④ 下载、校验 GPG 签名                    │
├─────────────────────────────────────────────┤
│ 后端  dpkg                                  │
│   ⑤ 解包文件到 /                           │
│   ⑥ 执行 postinst / postrm 等维护脚本       │
│   ⑦ 写 /var/lib/dpkg/status               │
└─────────────────────────────────────────────┘
```

**一句话分工：`apt` 管"该装哪个版本"，`dpkg` 管"把文件放到哪并执行脚本"。**

`apt` 和 `apt-get` 用的是同一个 apt 核心，区别只在交互体验：`apt` 带进度条、警告"这个 CLI 不稳定，不要在脚本里用"；`apt-get` 的参数从 Ubuntu 6.04 起就没变过，脚本里应该用它。

顺带一个实战经验：**`apt update` 的退出码不可靠**——`apt`(8) 的手册页在 BUGS 一节里就写明了它"never gives a useful exit code"，不像 `apt-get` 那样用退出码表达失败。所以写自动化脚本时判断更新是否成功，要用 `apt-get update` 的退出码。

```console
$ man apt | grep -A3 '^BUGS'
   BUGS
       apt(8) never gives a useful exit code, in contrast to apt-get(8).
       For this reason, apt(8) is specified to always exit with 0.
```

### 你会碰到的目录

```bash
$ ls /etc/apt/
```

```console
apt.conf.d    preferences.d    sources.list.d    trusted.gpg.d
sources.list  keyrings         auth.conf.d
```

| 路径 | 作用 | 你会改吗 |
|---|---|---|
| `/etc/apt/sources.list` | 一行一条源的**旧格式**文件 | 添加官方源时 |
| `/etc/apt/sources.list.d/*.sources` | **deb822** 格式的多字段源文件 | 加第三方源时 |
| `/etc/apt/sources.list.d/*.list` | 一行一条源的源文件 | 加第三方源时 |
| `/etc/apt/keyrings/` | 第三方源的 GPG 密钥 | 加第三方源时 |
| `/etc/apt/preferences.d/` | 版本优先级（pinning） | 极少 |
| `/etc/apt/apt.conf.d/` | apt 行为配置 | 极少 |
| `/etc/apt/trusted.gpg.d/` | 旧式密钥目录，**新版本已弃用** | 不该再往里放东西 |
| `/var/lib/apt/lists/` | **索引缓存**（`apt update` 更新的就是这里） | 不用管 |
| `/var/cache/apt/archives/` | 下载下来的 `.deb` 缓存 | 用 `apt clean` 清 |
| `/var/lib/dpkg/status` | **dpkg 的状态库**，已安装包的权威记录 | 绝不要手改 |

### Ubuntu 24.04 的默认源长什么样

24.04 默认用 **deb822** 格式（多字段），内容在 `/etc/apt/sources.list.d/ubuntu.sources`：

```text
Types: deb
URIs: http://archive.ubuntu.com/ubuntu/
Suites: noble noble-updates noble-backports
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg

Types: deb
URIs: http://security.ubuntu.com/ubuntu/
Suites: noble-security
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
```

字段含义：

| 字段 | 含义 |
|---|---|
| `Types` | `deb` 二进制包，`deb-src` 源码包 |
| `URIs` | 仓库地址 |
| `Suites` | 发布代号（codename）或代号组合 |
| `Components` | 组件分区，见下表 |
| `Signed-By` | **用哪个密钥验证这个源的签名** |

Suites 的四个代号：

| 代号 | 含义 |
|---|---|
| `noble` | 24.04 LTS 基础版本 |
| `noble-updates` | 稳定修复 |
| `noble-security` | 安全更新 |
| `noble-backports` | 从更新版本**倒灌**的新软件，可能引入新依赖 |

Components 的四个分区：

| 分区 | 放什么 | 要不要装 |
|---|---|---|
| `main` | 官方维护的开源软件 | 默认 |
| `universe` | 社区维护的开源软件 | 需要时加 |
| `restricted` | 闭源驱动（显卡、无线网卡） | 装桌面/服务器常用 |
| `multiverse` | 非自由且与自由软件冲突的包（如字体） | 按需 |

`noble-backports` 有个重要特性：**它允许引入新的依赖链，可能把 `main` 里的包一起升级**。所以"只装一个 backports 的新版本"经常导致比预期更大的升级动作。

### 旧格式 vs deb822

旧格式（`.list` 文件）一行一个源：

```text
deb [signed-by=/usr/share/keyrings/ubuntu-archive-keyring.gpg] http://archive.ubuntu.com/ubuntu/ noble main restricted universe multiverse
```

两种格式 apt 都认。**你自己加第三方源时，优先用 deb822 的 `.sources` 文件**，因为签名路径和目标仓库写在一起，不容易配错。

### 自动更新是谁在做

```bash
$ systemctl list-timers apt-daily.timer apt-daily-upgrade.timer
```

Ubuntu 24.04 用 systemd 定时器做自动更新（早期版本用 `/etc/apt/apt.conf.d/periodic` + cron）。想关掉自动升级：

```bash
$ sudo systemctl disable --now apt-daily-upgrade.timer
```

或者保留定时器但禁用实际的自动安装：

```bash
$ sudo dpkg-reconfigure --priority=low unattended-upgrades
```

⚠️ 服务器上关自动更新之前先想清楚：安全补丁是你自己负责，还是让机器负责？答案因环境而异，但**必须是主动决定，不是默认没想过**。

---

## 10.2 `apt update` 与 `apt upgrade`：顺序不能反

### ⚠️ `apt update` 一个包都不会装

这是最高频的误解。`apt update` 只做一件事：**把仓库里的"索引"下载到本地**。

```bash
$ sudo apt update
Hit:1 http://archive.ubuntu.com/ubuntu noble InRelease
Hit:2 http://archive.ubuntu.com/ubuntu noble-updates InRelease
Get:3 http://archive.ubuntu.com/ubuntu noble/main amd64 Packages [3059 kB]
Reading package lists... Done
```

看输出里的 `Packages`——那是**索引文件**，里面有"这个包叫什么名字、什么版本、多大、依赖什么"。

索引刷新完之后，你再看软件列表：

```bash
$ apt list --upgradable
Listing... Done
nginx/jammy-updates 1.18.0-6ubuntu14.4 amd64 [upgradable from: 1.18.0-6ubuntu14.3]
```

**刷新前查和刷新后查，结果完全不同。**这就是 `update` 的全部意义：让 apt 知道"现在最新的是哪个版本"。

### `apt upgrade` 用索引决定动作

```bash
$ sudo apt upgrade
```

它读本地索引，比较已安装版本和候选版本，然后：下载 → 解包 → 配置。**索引旧，它就不知道有新版。**

### 为什么顺序不能反

```bash
# 错误：索引可能已经过期几周了
$ sudo apt upgrade        # 按旧索引决定版本，甚至拿到已被仓库删除的版本号 → 404

# 正确
$ sudo apt update
$ sudo apt upgrade
```

**顺序反了不会立刻报错，而是"静默地什么都没做"**——这是最难受的失败方式：

```bash
$ sudo apt upgrade
0 upgraded, 0 newly installed, 0 to remove and XX not upgraded.
```

明明有新版，却说"没有可升级的"。原因就是索引太旧，甚至候选版本指向的 `.deb` 已经从仓库里被移除，apt 会直接跳过并给出 `N:` 提示。

### `upgrade` 与 `full-upgrade`

| 命令 | 允许安装新依赖 | 允许删除已装包 |
|---|---|---|
| `apt upgrade` | ✅ | ❌ |
| `apt full-upgrade` | ✅ | ✅ |
| `apt-get upgrade` | ❌（除非加 `--with-new-pkgs`） | ❌ |
| `apt-get dist-upgrade` | ✅ | ✅ |

什么时候需要 `full-upgrade`？**内核升级**。内核 metapackage 的依赖逻辑要求删掉旧内核包，`upgrade` 遇到这种情况会拒绝并提示你用 `full-upgrade`。

```bash
$ sudo apt full-upgrade
```

⚠️ `full-upgrade` 能删包，执行前**务必**先看清清单：

```bash
$ sudo apt full-upgrade --dry-run     # 只演一遍，不实际执行
$ sudo apt full-upgrade -s             # 同上，-s 是简写
```

⚠️ 更稳的做法是用 `-o Dpkg::Options::=--force-confold`（保留你的配置）而不是 `--force-confnew`（用包里的新配置覆盖你改过的）。如果你改过 `/etc/ssh/sshd_config` 或 `/etc/fstab`：

```bash
$ sudo apt full-upgrade -o Dpkg::Options::=--force-confold
```

`--force-confold` 的含义是：**配置文件有本地修改时，保留旧文件，不弹交互提问。**服务器批量升级时特别有用。

### 每天/每周的固定流程

```bash
$ sudo apt update && sudo apt full-upgrade
```

写进定时任务时注意两点：

1. 用 `apt-get` 而不是 `apt`（退出码可靠）；
2. 加 `-y` 前先加 `--dry-run` 人工看一遍，或接受"无人值守自动应用"的语义。

```bash
$ sudo apt-get -y --dry-run full-upgrade    # 看要干什么
$ sudo apt-get -y full-upgrade             # 确认无误后执行
```

---

## 10.3 卸载的四个动词：remove、purge、autoremove、autopurge

### 配置文件的去留：先问"这个文件归谁管"

Debian/Ubuntu 的包把文件分成两类：

| 类型 | 例子 | `remove` | `purge` |
|---|---|---|---|
| **conffile**（配置） | `/etc/nginx/nginx.conf`、`/etc/ssh/sshd_config` | **保留** | 删除 |
| **普通文件** | `/usr/sbin/nginx`、`/usr/share/doc/...` | 删除 | 删除 |

这就是 `remove` 和 `purge` 的**全部**差别。但要正确使用它，你得先接受一个更基础的事实：

> **`remove` / `purge` 作用于"包"，配置文件属于"拥有它的那个包"。你以为的包名，很可能不是真正的拥有者。**

#### 一个真实的陷阱：`nginx` 其实是三个包

```bash
$ apt install nginx
```

这句命令装进来的**不是一个**包，而是一组：

| 包 | 架构 | 提供什么关键文件 |
|---|---|---|
| `nginx` | amd64 | 几乎没有文件，只是一张"依赖清单"，叫**元包**（metapackage） |
| `nginx-common` | all | `/etc/nginx/nginx.conf`、`/etc/nginx/sites-available/` 等**全部配置** |
| `nginx-core` | amd64 | `/usr/sbin/nginx` 这个二进制、`/lib/systemd/system/nginx.service` |

用 `dpkg -S` 一查就清楚：

```console
$ dpkg -S /usr/sbin/nginx
nginx-core: /usr/sbin/nginx
$ dpkg -S /lib/systemd/system/nginx.service
nginx-core: /lib/systemd/system/nginx.service
$ dpkg -S /etc/nginx/nginx.conf
nginx-common: /etc/nginx/nginx.conf
```

于是：

```bash
$ sudo apt remove nginx
```

```console
Removing nginx (1.24.0-2ubuntu7) ...
```

**只有元包被摘掉了。**`nginx-core` 和 `nginx-common` 还在，因为没人要求把它们删。此时：

```bash
$ ls /etc/nginx
```

```console
nginx.conf   sites-available  sites-enabled  conf.d  modules-enabled  mime.types  fastcgi_params  ...
```

配置**一个不少**——但原因不是"conffile 被保留了"，而是**拥有配置的包根本没被卸载**。服务也还在：

```bash
$ systemctl status nginx
```

服务单元来自 `nginx-core`，它还在，所以 `systemctl status nginx` 依然有输出。**这就是"卸载了 nginx 却还能用"的标准答案。**

如果你这时候只 `purge` 元包，也一样不解决问题：

```bash
$ sudo apt purge nginx
$ ls /etc/nginx
```

配置仍然在。要真正删干净，得把三个包一起交给 apt：

```bash
$ sudo apt purge nginx nginx-common nginx-core
```

```console
Purging nginx-common (1.24.0-2ubuntu7) ...
Purging nginx-core (1.24.0-2ubuntu7) ...
Removing nginx (1.24.0-2ubuntu7) ...
$ ls /etc/nginx
ls: cannot access '/etc/nginx': No such file or directory
```

⚠️ **`purge` 不问你一声。**如果你改过 `/etc/nginx/nginx.conf`（加了虚拟主机、调了端口），`purge` 会连它一起删掉。而元包 `nginx` 自己一个配置文件都不提供，所以**只 purge 它等于什么都没做**——这是新手最常见的"我 purge 了怎么还在"。

```bash
# 安全做法：purge 之前先备份
$ sudo cp -a /etc/nginx ~/nginx.conf.bak-dir
$ sudo apt purge nginx nginx-common nginx-core
```

⚠️ 记一条通用准则：**卸载任何东西之前，先 `dpkg -S` 问清楚文件归谁管。**你以为在卸载 A，实际删的是 A 的一个依赖；你备份了"主包"的配置，真正被删的可能是另一个包的 conffile。

### `dpkg -l` 里的状态码

`remove` 之后，包并没有完全消失，它变成 `rc` 状态：

```bash
$ dpkg -l nginx
```

```console
Desired=Unknown/Install/Remove/Purge/Hold
|| Status=Not/Inst/Conf-files/Unpacked/halF-conf/Half-inst/trig-aWait/Trig-pend
||/ Name           Version      Architecture Description
ii  nginx          1.24.0-2u... amd64        small, powerful, scalable web server

rc  nginx          1.24.0-2u... amd64        small, powerful, scalable web server
```

前两列的含义：

| 码 | 含义 | 正常吗 |
|---|---|---|
| `ii` | installed，完好 | ✅ 正常 |
| `rc` | removed, **config-files remain** | ✅ `remove` 之后的正常状态 |
| `hi` | hold, installed | ✅ 锁版本后的正常状态 |
| `iU` | installed, **not configured** | ❌ 解包了但配置失败 |
| `iF` | **half-configured** | ❌ 配置到一半失败 |
| `iR` | 需要重装 | ❌ |
| `un` | unknown | ❌ 包记录损坏 |

**看到 `iU` / `iF` 就是"依赖没满足或配置脚本报错"的信号**，处理方法是：

```bash
$ sudo apt -f install
```

### autoremove：清理"当初为别人而装的"包

你装 `nginx` 时，它拉进来一堆依赖（`nginx-core`、`nginx-common`，以及 `libnginx-mod-*` 这些 recommended 包）。`apt remove nginx` 只摘掉元包，**这些依赖还在，而且还在正常工作**——这正是上面那个陷阱的来源。`autoremove` 才负责收尾：

```bash
$ apt-mark showauto | grep nginx
libnginx-mod-http-geoip2
libnginx-mod-http-image-filter
libnginx-mod-http-xslt-filter
nginx-common
nginx-core
```

```bash
$ sudo apt autoremove --dry-run      # 先看会删什么
The following packages will be REMOVED:
  libnginx-mod-http-geoip2 libnginx-mod-http-image-filter libnginx-mod-http-xslt-filter
  nginx-common nginx-core
0 upgraded, 0 newly installed, 5 to remove and 0 not upgraded.
```

注意这里**没有 `nginx`**：元包是你手动装的，属于 `manual`，`autoremove` 永远不碰它。

```bash
$ sudo apt autoremove
```

⚠️ **`autoremove` 的判断依赖标记**：包被标记为 `auto`（"我是被依赖拉进来的"）还是 `manual`（"我是你主动装的"）。逻辑是——某个包如果现在只被 `auto` 包依赖，而它自己也是 `auto`，它就可以被自动清理。

这条逻辑有个实际后果：**如果你 `apt install` 了一个包让它的某个依赖从 `auto` 变成 `manual`，那个依赖以后就不会被自动清理。**这也是为什么"autoremove 删不掉某些包"——它们被标记为手动安装过了。

查看和修改标记：

```bash
$ apt-mark showauto                       # 列出所有 auto 包
$ apt-mark showmanual                     # 列出所有手动安装的包
$ sudo apt-mark auto <包名>               # 标记为「自动安装的」
$ sudo apt-mark manual <包名>             # 标记为「手动安装的」
```

**"autopurge" = autoremove --purge**（既清理依赖又删它们的配置）：

```bash
$ sudo apt autopurge
```

### 四个动词对照表

| 命令 | 删程序 | 删配置 | 删不再需要的依赖 |
|---|---|---|---|
| `apt remove 包` | ✅ | ❌ | ❌ |
| `apt purge 包` | ✅ | ✅ | ❌ |
| `apt autoremove` | ✅ | ❌（依赖的） | ✅ |
| `apt autopurge` | ✅ | ✅ | ✅ |
| `apt autoremove --purge` | ✅ | ✅ | ✅ |

⚠️ **`autoremove` 永远不会删 `manual` 包。**这是设计上的安全措施，也是它"删不干净"的原因。

⚠️ 上表每一行都隐含一个前提：**你传进去的包名，是真正拥有那些文件的包。**套到 `nginx` 上，正确顺序是 `purge nginx nginx-common nginx-core` 或者先 `remove` 再 `autoremove`，只写 `purge nginx` 谁也删不掉。

---

## 10.4 查询：apt-cache 与 apt list

### `apt-cache policy`：看版本和来源

```bash
$ apt-cache policy nginx
nginx:
  Installed: 1.24.0-2ubuntu7
  Candidate: 1.24.0-2ubuntu7
  Version table:
     1.24.0-2ubuntu7 500
        500 http://archive.ubuntu.com/ubuntu noble/main amd64 Packages
        100 /var/lib/dpkg/status
     1.24.0-2ubuntu6 100
        100 http://archive.ubuntu.com/ubuntu noble/main amd64 Packages
```

这张表是排查包问题的**第一工具**，四行分别告诉你：

| 行 | 含义 |
|---|---|
| `Installed` | 现在装的版本 |
| `Candidate` | apt 认为"应该装"的版本（候选） |
| 版本表里的数字 | **优先级**（pin priority），越大越优先 |
| 来源行 | 这个版本从哪个仓库哪个组件来 |

三个必须会看的场景：

**场景一：装不上新版本。**

```bash
Installed: 1.24.0-2ubuntu7
Candidate: 1.24.0-2ubuntu7      # 候选没变
```

候选版本没变 → 你的索引太旧（回去 `apt update`）、或你在 hold、或你把源限制了。

**场景二：源优先级导致的意外。**

```bash
     1.25.0-1 500
        500 http://third-party.example.com/ubuntu noble/main amd64 Packages   ← 500 优先
     1.24.0-2ubuntu7 100
        100 http://archive.ubuntu.com/ubuntu noble/main amd64 Packages
```

同一个包有多个来源，**优先级数字大的赢**。想看某个包的候选版本来自哪里，也可以用：

```bash
$ apt-cache policy 包名 | grep -A1 Candidate
```

**场景三：源坏了。**如果某个源的整行是空的，或者某个版本后面没有来源行，说明它已经不被任何启用的源提供。

### `apt-cache` 常用子命令

| 命令 | 用途 |
|---|---|
| `apt-cache policy 包名` | 版本、候选、来源、优先级 |
| `apt-cache madison 包名` | 所有可用版本及来源（排查版本问题最有用） |
| `apt-cache show 包名` | 完整元数据：描述、依赖、冲突、作者、主页 |
| `apt-cache showpkg 包名` | 包与包之间的反向关系（依赖/被依赖） |
| `apt-cache depends 包名` | 直接依赖 |
| `apt-cache rdepends 包名` | 谁依赖它（卸载前必查！） |
| `apt-cache search 关键词` | 搜索 |
| `apt-cache pkgnames 包名前缀` | 按名字前缀列出所有包 |
| `apt-cache stats` | 索引统计信息 |

⚠️ **`rdepends` 在卸载前一定要查。**删掉一个库包，可能让几十个程序同时坏掉：

```bash
$ apt-cache rdepends libssl3 | grep -v '^libssl3' | head
```

`apt-cache show` 的输出里有两个字段值得注意：

```text
Depends: libc6 (>= 2.34), libssl3 (>= 3.0.0), zlib1g (>= 1:1.1.4)
Conflicts: nginx
```

`Conflicts` 字段意味着这两个包不能同时装。

### `apt list`：直接列系统状态

```bash
$ apt list --installed | head
$ apt list --upgradable               # 有哪些可升级
$ apt list --all-versions nginx       # 所有可用版本
$ apt list 'nginx*'                   # 通配符
$ apt list --installed | grep -i nginx
```

### `dpkg -S`：反向查找——这个文件属于哪个包

```bash
$ dpkg -S /usr/sbin/nginx
nginx-core: /usr/sbin/nginx
$ dpkg -S /etc/nginx/nginx.conf
nginx-common: /etc/nginx/nginx.conf
```

注意结果：**不是 `nginx`，是 `nginx-core` 和 `nginx-common`。**下一节会解释这件事，以及它为什么会让"卸载 nginx"变得比想象中麻烦。

这是**卸载残留检查的利器**。⚠️ 它的输出可能包含多个包（同一个文件被多个包声明），只有当**所有**包都被卸载后，你才能放心删这个文件。

⚠️ 别名和软链接查不出来：`dpkg -S` 找的是**包清单里记录的路径**，不是磁盘上真实存在的东西。第 5 章的手动创建文件、`ln -s` 做的软链接，它都不知道。

---

## 10.5 依赖解析：apt 比 dpkg 好在哪

### 一个真实的安装过程

```bash
$ sudo apt install nginx
Reading package lists... Done
Building dependency tree... Done
The following NEW packages will be installed:
  nginx nginx-common nginx-core
The following additional packages will be upgraded:
  ...
0 upgraded, 3 newly installed, 2 to upgrade and 0 not upgraded.
Need to get 12.4 MB of archives.
After this operation, 8.7 MB of additional disk space will be used.
Do you want to continue? [Y/n] y
```

关键在 `0 upgraded, 3 newly installed, 2 to upgrade`——**这一行是 apt 的核心价值**：它在告诉你"为了满足你的一个请求，我需要动其他 5 个包"。你能提前看到副作用。

然后才是：

```bash
Get:1 http://archive.ubuntu.com/ubuntu noble/main amd64 nginx-core amd64 [117 kB]
Get:2 http://archive.ubuntu.com/ubuntu noble/main amd64 nginx-common all [26.9 kB]
Get:3 http://archive.ubuntu.com/ubuntu noble/main amd64 nginx all [569 kB]
Fetched 12.4 MB in 3s (4,123 kB/s)
Selecting previously unselected package nginx-common.
(Reading database ... 1470 files and directories currently installed.)
Preparing to unpack .../nginx-common_1.24.0-2ubuntu7_all.deb
Unpacking nginx-common (1.24.0-2ubuntu7) ...
Setting up nginx-common (1.24.0-2ubuntu7) ...
```

**这就是 apt 和 dpkg 的边界**：上面全部是 apt 在做。下一节你会看到，dpkg 只出现在最后一步。

### 依赖解析做了什么

当你说 `apt install nginx` 时，apt 要解决一个**带约束的优化问题**：

- nginx 需要 libssl3 某个版本以上；
- libssl3 又需要 libc6 某个版本以上；
- 但你本地已装的其他软件需要某个包的旧版本；
- 那个旧版本可能已经被安全更新删除了。

apt 用一套自己的版本比较算法解决它。这就是为什么 `apt install` 可能连带升级一堆看起来无关的包——**不是它乱动，而是依赖链真的连着**。

⚠️ 这也意味着：`apt install 某个旧版本的老包` 经常触发"无法降级"的报错。真要降级，得配合 `apt-mark hold` 其他包，或者用 `apt install 包=版本` 明确指定并接受连带动作。

---

## 10.6 dpkg 底层：真正动文件的那个

`dpkg` 是 Debian 包数据库的唯一管理者。**它的设计目标很低：只管解包和配置，不做任何依赖求解。**

这是它最重要的性质，也是它最容易出事的根源。

### 安装与卸载

```bash
$ sudo dpkg -i package.deb          # install（等价 --unpack + --configure）
$ sudo dpkg -r nginx-common         # remove：删程序，留配置（注意不是元包 nginx）
$ sudo dpkg -P nginx-common         # purge：连配置一起删
$ sudo dpkg -r --force-depends      # ⚠️ 无视依赖强行卸载
$ sudo dpkg -P --force-all          # ⚠️⚠️ 强制 purge，连配置一起删
```

⚠️ 同样地，`dpkg -r nginx` 只摘掉元包；`dpkg -P nginx` 也不会删掉 `/etc/nginx/nginx.conf`。**参数后面跟的必须是真正拥有文件的包。**

`-i` 等于两步：

```bash
$ sudo dpkg --unpack package.deb   # 只解包：把文件放到磁盘上
$ sudo dpkg --configure package.deb  # 只配置：跑维护脚本、建用户、注册服务
```

分开写很有用——排错时你可以只解包不配置，看到"文件都到位了但没生效"的状态。

### 查询

```bash
$ dpkg -s nginx                     # status：装没装、什么版本
Package: nginx
Status: install ok installed
Priority: optional
Section: web
Installed-Size: 60108
Maintainer: Ubuntu Developers <x-devel@lists.ubuntu.com>
Architecture: amd64
Version: 1.24.0-2ubuntu7
...
```

```bash
$ dpkg -l | head                   # 列出全部包（-l = list）
$ dpkg -l 'nginx*'                 # 通配符过滤
$ dpkg -l nginx                    # 精确指定
$ dpkg -L nginx                    # 这个包装了哪些文件
$ dpkg -S /usr/sbin/nginx           # 这个文件属于哪个包
```

`dpkg -l` 比 `apt list --installed` 更底层、更快、更完整——**排查 dpkg 自身问题时用 `dpkg -l`**。

### 校验与审计

```bash
$ sudo dpkg -V nginx                # 校验已安装文件的校验和（找出被改过的文件）
$ sudo dpkg -C                      # 找出半安装/半配置/缺文件的包
$ sudo dpkg --audit                 # 同上，显示更多信息
$ dpkg --verify                     # 校验全部已安装包（慢）
```

`dpkg -V` 很有用：它能发现"有人手改了 `/usr/bin/` 下的二进制"。⚠️ 但注意它**不检查配置文件**（配置本来就该被改）。

### 备份已安装的包列表

```bash
$ dpkg --get-selections > ~/pkglist.txt
$ dpkg --set-selections < ~/pkglist.txt
$ sudo apt-get dselect-upgrade       # 第二步：根据列表安装缺失的包
```

这是"新机器重建"的实用套路：

```bash
$ dpkg --get-selections | grep ^install | awk '{print $2}' > ~/pkglist.txt
```

⚠️ 这种方式重建的环境**版本很新**，且不包含手工编译安装的东西、`/etc` 下的配置、也不是全部（比如 `apt` 自己）。生产环境的正确做法是 Ansible 之类的配置管理工具，不是手敲命令。

---

## 10.7 手动处理依赖：`apt -f install`

### 问题从哪来

```bash
$ sudo dpkg -i htop.deb
```

```console
Selecting previously unselected package ...
Unpacking htop ...
Setting up htop (3.3.0) ...
```

```bash
$ apt list --installed | grep htop
```

```console
iU  htop    3.3.0                             # Unpacked, not configured!
```

`iU` = **文件已经在磁盘上了，但配置脚本没跑**。原因：`htop` 依赖 `libncursesw6`，你机器上没有。

**为什么？**因为 `dpkg` 完全不解析依赖——它只管解包。遇到不满足的依赖，它把包标记成"未配置"然后退出。

### 处理

```bash
$ sudo apt -f install
```

`-f` 是 `--fix-broken` 的简写。它扫描所有状态不正常的包，补齐缺失的依赖，然后把没配置完的包配置上：

```bash
$ sudo apt -f install
Reading package lists... Done
Building dependency tree... Done
The following NEW packages will be installed:
  libncursesw6 libtinfo6
The following packages have unmet dependencies:
  htop
Setting up libtinfo6 ...
Setting up libncursesw6 ...
Setting up htop (3.3.0) ...
```

`iU` 变成 `ii`。完。

### ⚠️ `-f` 有破坏性的一面

如果依赖关系本身坏了（比如你强行 `--force-depends` 装了个冲突包），`-f` 会选择**删除有问题的包**来解决冲突：

```bash
The following packages will be REMOVED:
  some-other-package
```

⚠️ **`apt -f install` 在执行前一定要读那个 REMOVED 清单。**它可能在修复失败时采取"把相关包删掉"的策略。在生产机上，先 `--dry-run`。

### 更好的做法：不要用 `dpkg -i`

现代 Ubuntu 上装本地 `.deb`，**首选 `apt install ./`**：

```bash
$ sudo apt install ./htop_3.3.0-1_amd64.deb
```

注意是 `./` 或绝对路径，不是包名。这个写法让 apt 接手，从官方源补齐依赖——**一步到位，不需要 `-f install`**。

⚠️ 如果你写成 `sudo apt install htop.deb`，apt 会认为这是一个**仓库里的包名**（仓库里根本没有叫 `htop.deb` 的东西）：

```text
E: Unable to locate package htop.deb
```

这个报错很常见，`./` 就是答案。

---

## 10.8 `apt-mark hold`：锁住版本

### 用法

```bash
$ sudo apt-mark hold nginx
nginx set to hold.

$ apt-mark showhold
nginx

$ sudo apt-mark unhold nginx
nginx set to install.
```

或者临时：

```bash
$ sudo apt-mark hold
# 交互选择
```

### hold 之后会发生什么

```bash
$ sudo apt full-upgrade
The following packages have been kept back:
  nginx
```

**`kept back` = 被 hold 住的包没动。**这是你最需要的行为。

⚠️ 但 hold 是**单边锁**：

- 它锁住的是**这个包自己**，不是它的依赖；
- apt 仍然可以升级它的依赖；
- 依赖被升级后，旧版 nginx 可能就跑不起来了；
- 长期 hold 一个包，而它的依赖持续前进，最终必然出问题。

⚠️ **hold 会导致"无法修复"的情况。**如果你 hold 了一个关键包，然后 `apt install` 其他东西时报：

```text
E: Unable to correct problems, you have held broken packages.
```

这时先看 hold 列表：

```bash
$ apt-mark showhold
```

处理二选一：`unhold`（如果你 hold 的理由不重要了），或者 `--allow-change-held-packages`（本次放行，明确知道自己在做什么）：

```bash
$ sudo apt install --allow-change-held-packages <包名>
```

### hold 的适用边界

| 场景 | hold 合适吗 |
|---|---|
| 某个包的新版本在你环境里有 bug，观察几天 | ✅ 合适 |
| 锁定内核版本，防止意外重启 | ⚠️ 可以，但要知道内核会有安全风险 |
| "我就想一直用某个版本" | ❌ 不合适，应该看 pinning |
| 锁住一堆包防止系统动 | ❌ 危险，会让未来所有升级都失败 |

hold 是**临时的、单包的、应急的**手段。长期版本管理应该用 pinning：

```bash
$ sudo apt install nginx=1.24.0-2ubuntu7    # 明确装某个版本
```

或者在 `/etc/apt/preferences.d/` 里写 pin 规则：

```text
Package: nginx
Pin: version 1.24.*
Pin-Priority: 1001
```

`Pin-Priority > 1000` 表示"允许降级"，等于"只要 1.24 系列的还在源里，就优先用它"。

---

## 10.9 `.deb` 包的手动安装完整流程

### 流程图

```text
拿到 .deb
    │
    ├─▶ dpkg -I xxx.deb          看清楚：版本、依赖、维护脚本警告
    ├─▶ dpkg -c xxx.deb | head   看清楚：会往磁盘哪些路径写
    │
    ├─▶ sudo apt install ./xxx.deb     ← 首选，自动解依赖
    │   （失败则）sudo dpkg -i xxx.deb; sudo apt -f install
    │
    └─▶ dpkg -s xxx.deb | grep Status   验证：ii
         systemctl status <服务>          验证：服务起来了
```

### 逐步拆解

**第 1 步：装之前先看，这是最重要的习惯。**

```bash
$ dpkg -I xxx.deb
 new Debian package, version 1.2.3.
 Architecture: amd64
 Version: 1.2.3
 Depends: libc6 (>= 2.34), libssl3 (>= 3.0.0)
 Maintainer: Someone <someone@example.com>
 Description: short description
  Long description.
```

⚠️ 看 `Depends`：如果依赖不在你的源里，apt 也救不了你。

```bash
$ dpkg -c xxx.deb | head -20
```

```console
drwxr-xr-x root/root       0 2026-01-01 00:00 usr/bin/xxx
-rw-r--r-- root/root  12345 2026-01-01 00:00 usr/share/doc/xxx/changelog.gz
```

⚠️ 看它会写哪些路径。**一个正常的包应该只写 `/usr`、`/etc`、`/lib`、`/var` 下的自己的文件。**如果它要往 `/usr/bin` 里放和别的包同名的东西，说明有问题。

⚠️ `Maintainer` 字段和"这是官方包吗"要交叉验证——`.deb` 文件名和签名能帮你判断来源。

**第 2 步：拿签名验证来源。**如果厂商提供了签名或校验和：

```bash
$ gpg --verify vendor-signature.asc xxx.deb      # 有签名
$ sha256sum xxx.deb                              # 对比官网给的校验和
```

⚠️ 从第三方网站下 `.deb` 等于**让那个网站拥有你机器的 root**。这没有夸张：`postinst` 脚本是以 root 身份运行的。

**第 3 步：安装。**

```bash
$ sudo apt install ./xxx_1.2.3_amd64.deb
```

**第 4 步：验证。**

```bash
$ dpkg -s xxx.deb | grep Status
Status: install ok installed

$ which xxx
/usr/bin/xxx

$ sudo systemctl enable --now xxx    # 如果它是服务
```

**第 5 步：彻底卸载。**这是本章实验的重点。

```bash
$ sudo cp -a /etc/xxx.conf ~/xxx.conf.bak     # 先备份你改过的配置
$ sudo apt purge xxx
$ dpkg -l xxx
# 无输出 = 包记录也没了
$ dpkg -S /usr/bin/xxx
dpkg-query: no path found matching pattern /usr/bin/xxx
```

⚠️ 但 `purge` **不会**删这些地方的数据，因为它们不属于包的受管理文件：

| 位置 | 典型内容 |
|---|---|
| `/var/lib/<包名>` | 数据库、状态文件、缓存 |
| `/var/log/<包名>` | 日志 |
| `/var/www` 或文档根 | 网站数据 |
| `~/.<包名>` | 用户配置 |
| `/etc` 下手工建的文件 | 你自己加的，不是包提供的 |
| systemd 服务单元 + 已注册的 socket/timer | purge 不一定删干净 |
| `dpkg-divert` 重定向的文件 | 特殊机制，见下 |

**dpkg-divert：purge 也可能删不掉的机制**

`dpkg-divert` 让某个包把自己的文件"让位"给其他文件：

```bash
$ dpkg-divert --list | grep -i xxx
 diversions by 'xxx'
  diversions by 'xxx' from: /etc/xxx.conf
  diversions by 'xxx' to:   /etc/xxx.conf.distrib
```

意思是 `/etc/xxx.conf` 现在归你自己管，包装的是 `/etc/xxx.conf.distrib`。**purge 之后 diversions 还可能留在 dpkg 数据库里**，成为下次装同包的障碍：

```bash
$ sudo dpkg-divert --list --package xxx       # 查这个包的所有 diversion
$ sudo dpkg-divert --remove --rename --package xxx /etc/xxx.conf   # 手动清
```

这就是"装过某个包、又卸了、又装不上"的经典原因之一。排查任何"重装报奇怪的错"时，先查 diversion：

```bash
$ dpkg-divert --list | head -20
```

---

## 10.10 第三方源与 `add-apt-repository`

### 为什么第三方源需要额外小心

官方源（`archive.ubuntu.com`）的包由 Ubuntu 团队签名，密钥在 `/usr/share/keyrings/`，**你不需要额外信任任何东西**。

第三方源意味着：**某个组织（或某个人）获得了"往你机器上放软件"的权限。**加源之前必须问三个问题：

1. **这个源是谁的？**公司内部镜像？软件厂商官方？某个 GitHub 用户的个人源？
2. **他们的构建过程能被信任吗？**包是通过 CI 从源码自动构建的，还是手工打的？如果源被入侵，你装的所有东西都是攻击者的代码。
3. **签名密钥从哪来、怎么验证？**从源自己的网站 HTTPS 下载的密钥，**和源本身是同一个信任级别**——网站被攻破，密钥和包一起沦陷。

### 标准做法：四步

**第 1 步：装工具。**

```bash
$ sudo apt install -y curl gnupg
```

**第 2 步：放密钥。**

```bash
$ curl -fsSL https://example.com/repo/archive-keyring.asc \
    | sudo tee /etc/apt/keyrings/example.asc > /dev/null
```

⚠️ 三个细节：

- 放**第三方**密钥到 `/etc/apt/keyrings/`，不要放 `/usr/share/keyrings/`（那是系统目录，属于发行版自己）；⚠️ **绝对不要放 `/etc/apt/trusted.gpg.d/`**，那个目录的机制已被弃用，apt 会警告。
- 如果拿到的是二进制 `.gpg`，先转成 armored：
  ```bash
  $ curl -fsSL https://example.com/repo/repo.gpg \
      | sudo gpg --dearmor -o /etc/apt/keyrings/example.gpg
  ```
- ⚠️ **绝对不要用 `sudo curl -o /etc/apt/keyrings/...`**（省掉管道）——这样写会先创建一个空文件、然后往里写，如果中途失败，你会留下一个坏密钥文件，且旧的正常密钥被覆盖。管道 + `tee` 至少在语义上更清楚。

**第 3 步：写源文件。**deb822 格式：

```text
# /etc/apt/sources.list.d/example.sources
Types: deb
URIs: https://example.com/repo/ubuntu/
Suites: noble
Components: main
Signed-By: /etc/apt/keyrings/example.asc
```

或一行格式：

```text
deb [signed-by=/etc/apt/keyrings/example.gpg] https://example.com/repo/ubuntu/ noble main
```

⚠️ `Suites:` 的值必须和源服务器上真实存在的目录一致。写错了典型报错是：

```text
E: The repository 'https://example.com/repo/ubuntu/ noble Release' does not have a Release file.
```

`noble` 写错了通常就是这种报错，不是网络问题。

**第 4 步：更新索引。**

```bash
$ sudo apt update
$ apt-cache policy <包名>       # 确认新源的包出现了
```

### `add-apt-repository`：方便但更黑箱

```bash
$ sudo apt install -y software-properties-common
$ sudo add-apt-repository ppa:user/ppa-name
$ sudo apt update
$ sudo add-apt-repository --remove ppa:user/ppa-name
```

⚠️ **PPA 的信任模型必须说清楚**：PPA 是 Launchpad 上的个人软件源，**任何人都能创建，不需要审核**。你执行 `add-apt-repository ppa:某人/某源` 时，实际发生的是：

1. 从 keyserver 下载**这个人**的公钥，装进你的 trusted keyring；
2. 在你的 `/etc/apt/sources.list.d/` 加一个源；
3. **从此，这个人的构建脚本可以以 root 权限在你的机器上运行。**

这不是"用了官方 Ubuntu 源的等价物"。PPA 常用于测试版软件（比如还没进正式仓库的工具），适合开发者的桌面机，**不适合直接用在生产服务器上**。

⚠️ 还要知道 PPA 的**可用性风险**：PPA 作者随时可以删掉自己的源，然后你的 `apt update` 就开始天天报错（404 或 Release file 缺失）。生产环境的源必须是组织自己维护的。

⚠️ 另外注意：`add-apt-repository` 在 24.04 上默认会写成 **deb822 的 `.sources` 文件**。这本身是好事（格式更清晰），但如果你在老文档里看到 `/etc/apt/sources.list.d/` 下新增 `.list` 文件，那是旧版本行为。

---

## 10.11 GPG 签名密钥

### 签名在验证什么

每个 Debian/Ubuntu 软件包仓库里都有两个密钥文件：

| 文件 | 内容 |
|---|---|
| `InRelease` | 元数据（包列表）+ **内嵌签名** |
| `Release.gpg` | 元数据的**分离签名** |

apt 下载索引后，用你信任的公钥验证这个签名。**签名验证的作用是：确认"这些包确实来自这个源，没有在路上被改过"。**

它验证的**不是**"包是安全的"，而是"包来自签名者"。签名者可能是 Ubuntu 团队，也可能是某个 PPA 作者——**签名只证明来源，不证明善恶。**

### 密钥在哪

```bash
$ ls /usr/share/keyrings/
$ ls /etc/apt/keyrings/
$ gpg --list-keys                     # gpg 自己信任的密钥（用户级）
```

⚠️ **gpg 的 keyring 和 apt 的 keyring 是两套独立系统。**`apt-key` 曾经试图统一它们，但因为设计混乱已在 Ubuntu 22.04+ 被弃用、Debian 12 起移除。

⚠️ **不要用 `apt-key`。**如果文档或教程里出现 `apt-key add`，那条命令是过时的。现代做法就是把密钥文件放进 keyring 目录，然后在源里用 `Signed-By:` 指明。

### 验证密钥指纹

```bash
$ gpg --show-keys --with-fingerprint /etc/apt/keyrings/example.asc
```

```console
pub   rsa4096 2023-04-01 [SC]
      ABCD 1234 5678 9ABC DEF0 1234 5678 9ABC DEF0  Example Inc <admin@example.com>
```

⚠️ **指纹必须从独立渠道核对**——比如厂商官网的文档、或者线下/邮件。如果你是从 `example.com/repo/archive-keyring.asc` 下载的，又从 `example.com` 页面核对指纹，那么网站一旦被入侵，密钥和指纹页面会一起被改，你完全发现不了。

真正的信任锚是：**厂商的签名密钥指纹应该通过另一个渠道公开**（比如 HTTPS 之外的渠道、或者印在文档里）。

### 签名相关报错的含义

```text
N: Updating from such a repository cannot be done securely, and is therefore disabled by default.
```

意思：这个源签名有问题，apt **拒绝**用它更新索引——这是**保护**，不是错误。常见原因：

| 原因 | 表现 |
|---|---|
| 源没配 `Signed-By` | 提示需要密钥 |
| 密钥过期 | `KEYEXPIRED` |
| 密钥不对（换了密钥没通知你） | `BADSIG` / `NO_PUBKEY` |
| 下载不完整（代理/网络问题） | `NODATA` |

⚠️ 新手最常见的错误解法是加 `[trusted=yes]` 或 `allow-insecure=yes`。**这是把签名验证整个关掉，等于放弃供应链安全。**正确做法是修好签名配置。

### `apt update` 报 404 的完整排查

这是运维里最常见的 apt 故障，按这个顺序查：

**第 1 步：看清是哪一行报的错。**

```bash
$ sudo apt-get update
```

```console
E: Failed to fetch http://old-releases.ubuntu.com/ubuntu/  404  Not Found
```

**第 2 步：这个源是谁、从哪来的？**

```bash
$ grep -rn . /etc/apt/sources.list /etc/apt/sources.list.d/
```

**第 3 步：这个源还需要吗？**404 的三个典型原因：

| 原因 | 判断 | 处理 |
|---|---|---|
| 源所属的发行版已 EOL，仓库被下线 | 版本代号（如 `jammy`）不在支持列表 | 升级系统到受支持的 LTS |
| URL 拼错或镜像站搬了家 | 域名不对 | 改成正确 URL |
| Suite 名对不上 | `Suites:` 值和服务器目录不一致 | 查源服务器实际有哪些目录 |

**第 4 步：直接验证 URL 是否可达。**

```bash
$ curl -I http://archive.ubuntu.com/ubuntu/dists/noble/InRelease
HTTP/1.1 200 OK
```

返回 404 就说明源服务器确实没有这个路径——问题在源配置或源本身，不在你的网络。

**第 5 步：临时禁用问题源。**

⚠️ 注释掉（`#` 开头）或移走那个文件，然后 `apt update`。别用 `trusted=yes` 绕过。

```bash
$ sudo mv /etc/apt/sources.list.d/broken.list /root/broken.list.disabled
$ sudo apt update
```

**第 6 步：如果怀疑是网络/代理问题，开调试。**

```bash
$ sudo apt-get -o Debug::Acquire::http=true update 2>&1 | grep -i '404\|proxy\|connect'
```

⚠️ 服务器在企业网络里时，`/etc/apt/apt.conf.d/` 里可能配了代理：

```bash
$ sudo apt-config dump | grep -i proxy
Acquire::http::Proxy "http://proxy.corp:3128";
```

代理配置错误也会表现为各种奇怪的下载失败。

---

## 10.12 snap 与 flatpak 简述

### 它们不是 apt 的一部分

| | apt | snap | flatpak |
|---|---|---|---|
| 包格式 | `.deb` | `.snap`（squashfs） | `.flatpak` / OCI |
| 数据库 | `/var/lib/dpkg` | `/var/lib/snapd` | `/var/lib/flatpak` |
| 依赖管理 | 共享系统库 | **自带所有依赖** | **自带所有依赖** |
| 隔离 | 无 | 有 confinement（部分） | 有 sandbox |
| 离线可用 | 是 | 是 | 是 |
| 系统库一致 | 是 | 否 | 否 |

**核心差别：snap 和 flatpak 的包里打包了各自的依赖副本**，所以它们在系统里是自成一体的一堆文件，不和 apt 的世界共享库。

### 服务器上先想清楚要不要用

```bash
$ snap list
$ snap info htop
$ snap install htop
$ snap refresh
$ snap remove htop
```

⚠️ 服务器上的关键问题不是"snap 好不好用"，而是**磁盘和内存**：snap 把整套依赖重复存一份，一个 snap 包常见几百 MB 到 1 GB。装三五个 snap 就能吃掉几 GB 根分区空间。

⚠️ 更重要的是 **confinement 机制**。snap 默认是 `strict`  confinement（沙箱），很多服务类 snap 装完起不来，需要 `--classic` 关闭隔离。关闭隔离等于放弃了 snap 的安全优势，那为什么不直接用 apt。

⚠️ snap 的更新由 `snapd` 自己管，**不经过 apt，也不经过你的 `apt-mark hold`**。你 hold 了某个包，snap refresh 照样动它。

⚠️ 如果你压根不需要 snap，可以在**安装系统时**就阻止它装上（`/etc/nosnap.conf`），也可以事后：

```bash
$ sudo systemctl disable --now snapd.service snapd.socket snapd.seeded.service
$ sudo apt purge snapd
```

⚠️ 删 snapd 之前先确认没有 snap 包在跑——`snap list` 看到的才是真相。

### flatpak 简述

```bash
$ sudo apt install flatpak
$ flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
$ flatpak remote-ls
$ flatpak install flathub org.gnome.Calculator
$ flatpak list
```

flatpak 更偏桌面应用，官方推荐在**用户级安装**（`~/.local/share/flatpak`），不需要 root。

⚠️ 同样有系统级 vs 用户级两套数据库（`/var/lib/flatpak` 和 `~/.local/share/flatpak`），`flatpak list --user` 和 `--system` 要分清——"我明明装了"通常就是这个原因。

⚠️ flatpak 会往 `$HOME/.var/app/<应用ID>/` 写配置和缓存，卸载应用不会删这个目录。

**服务器上的结论**：这两个系统主要是为桌面应用设计的。服务器软件（web 服务器、数据库、监控代理）应该用 apt，或者官方提供的静态二进制、或者 Docker（见第 20 章）。

---

## 10.13 本章小结

| 主题 | 关键点 |
|---|---|
| 分工 | `apt` 管版本选择与依赖求解，`dpkg` 管解包与执行脚本 |
| 源配置 | `/etc/apt/sources.list`（旧格式）+ `sources.list.d/*.sources`（deb822）；`Suites` `Components` `Signed-By` |
| ⚠️ `apt update` | 只更新 `/var/lib/apt/lists` 索引，**一个包都不装**；不先 update 就 upgrade，会静默什么都不做 |
| 顺序 | `apt update` → `apt upgrade`；内核等需要删包时用 `full-upgrade`，先 `--dry-run` |
| conffile | `remove` 保留、`purge` 删除；但**配置归"拥有它的包"**，purge 前先用 `dpkg -S` 查清是谁 |
| ⚠️ 元包 | `nginx` 只是依赖清单：`purge nginx` 谁也删不掉，要 `purge nginx nginx-common nginx-core`；`remove nginx` 后服务仍在跑 |
| 状态码 | `ii` 正常、`rc` remove 后残留配置、`hi` hold、`iU` 未配置（依赖缺失）、`iF` 半配置 |
| autoremove | 只清理 `auto` 标记且无人需要的包；`autopurge` = autoremove + purge |
| 查询 | `apt-cache policy` 看候选和来源、`madison` 看所有版本、`rdepends` 卸载前必查、`dpkg -S` 反查文件 |
| dpkg | 不解依赖；`iU` 用 `apt -f install` 修（⚠️ 先读 REMOVED 清单） |
| 装本地包 | 首选 `sudo apt install ./xxx.deb`（不是 `xxx.deb`），一步解依赖 |
| hold | `apt-mark hold` 锁单包版本，`full-upgrade` 显示 kept back；⚠️ 不锁依赖，长期会坏 |
| 残留 | purge 不删 `/var/lib`、`/var/log`、`~/.xxx`；`dpkg-divert --list` 查 diversion |
| 第三方源 | 密钥放 `/etc/apt/keyrings/`，源里用 `Signed-By:`；⚠️ 不要 `trusted=yes`，不要用 `apt-key` |
| PPA | Launchpad 上任何人可建，你在信任一个陌生人的构建脚本；PPA 可能随时消失 |
| 签名 | 签名证明**来源**不证明**安全**；指纹必须走独立渠道核对 |
| 404 排查 | 看报错行 → 查源配置 → 判断是否 EOL → `curl -I` 验证 → 禁用源 → 开 `Debug::Acquire::http` |
| snap/flatpak | 自带依赖、不受 apt 管理、吃磁盘；服务器上优先 apt 或 Docker |

---

## 10.14 动手实验：装一个 `.deb`，然后彻底卸载并验证无残留

### 目标

1. 用 `apt-get download` 把一个 `.deb` 拿到本地（不直接安装）；
2. 用 `dpkg -I` / `dpkg -c` 在安装前看清它会做什么，并用 `dpkg -S` 查清关键文件**真正归谁管**；
3. 用 `apt install ./` 安装本地包，观察依赖自动补齐；
4. 记录安装后的完整"足迹"：配置文件、服务、状态码、依赖；
5. 分别用 `remove` 和 `purge` 卸载，体会"元包 / 依赖包 / conffile 拥有者"三者的区别；
6. 逐项验证"无残留"，并说清哪些残留是包管理器**故意不管**的；
7. 理解 conffile 备份为什么必须在 purge 之前做。

### 步骤

> ⚠️ 本实验会装一个真实的 web 服务器并把它卸载。请在**练习用机器或虚拟机**上做，不要在有生产流量的服务器上做。
>
> ⚠️ 如果你改过 `/etc/nginx/nginx.conf`（它属于 `nginx-common`），`purge nginx-common` 会删掉它。第 6 步就是为它准备的。
>
> 本实验故意把 `remove` → `purge` → `autoremove` 分成三步慢慢来，因为**只 `remove nginx` 或只 `purge nginx` 都不会删掉任何配置或二进制**——原因见 10.3。

**1. 准备工作目录**

```bash
$ mkdir -p ~/apt-lab && cd ~/apt-lab
$ pwd
/home/你的用户名/apt-lab
```

**2. 只下载，不安装**

```bash
$ apt-get download nginx
```

```bash
$ ls -lh *.deb
-rw-r--r-- 1 wang wang 569K 2026-09-28 09:41 nginx_1.24.0-2ubuntu7_amd64.deb
```

⚠️ 注意 `apt-get download` 和 `apt install` 的区别：**`download` 只把文件放到当前目录，不动系统。**这一步让你有机会在不安装的前提下先检查。

**3. 安装前看清楚**

```bash
$ dpkg -I nginx_*.deb
 new Debian package, version 1.24.0-2ubuntu7.
 Architecture: amd64
 Depends: libc6 (>= 2.34), libssl3 (>= 3.0.0), zlib1g (>= 1:1.1.4)
 Maintainer: Ubuntu Developers <x-devel@lists.ubuntu.com>
 Description: small, powerful, scalable web server
```

```bash
$ dpkg -c nginx_*.deb
```

```console
drwxr-xr-x root/root     0 2026-07-10 09:31 ./
drwxr-xr-x root/root     0 2026-07-10 09:31 ./usr/
drwxr-xr-x root/root     0 2026-07-10 09:31 ./usr/share/
drwxr-xr-x root/root     0 2026-07-10 09:31 ./usr/share/doc/
-rw-r--r-- root/root  4233 2026-07-10 09:31 ./usr/share/doc/nginx/copyright
-rw-r--r-- root/root   941 2026-07-10 09:31 ./usr/share/doc/nginx/changelog.Debian.gz
```

⚠️ **盯住这个输出：里面一个 `./etc/` 都没有。**`nginx` 是个**元包**，除了版权说明和变更日志几乎什么都不提供——没有二进制，没有配置，没有服务单元。

如果你在这里看到 conffile 就开始"备份 `nginx.conf` 以防 purge 删掉"，那备份的直觉对、对象却错了。真正拥有它的是 `nginx-common`。所以先问一句"谁拥有"，再动手：

```bash
$ apt-cache depends nginx | head -6
```

```console
nginx
  Depends: nginx-core
  Depends: nginx-common
|libnginx-mod-http-geoip2
  Depends: nginx-core
  ...
```

对照着把两个真正干活的包也下载下来看一眼：

```bash
$ apt-get download nginx-common nginx-core
$ dpkg -c nginx-common_*.deb | grep '\./etc/nginx/nginx.conf'
-rw-r--r-- root/root 1447 2026-07-10 09:31 ./etc/nginx/nginx.conf
$ dpkg -c nginx-core_*.deb | grep -E 'nginx.service|sbin/nginx'
-rwxr-xr-x root/root 1266440 2026-07-10 09:31 ./usr/sbin/nginx
-rw-r--r-- root/root    417 2026-07-10 09:31 ./lib/systemd/system/nginx.service
```

**记住这三行归属关系**，后面每一步卸载验证都靠它：

| 文件 | 属于 |
|---|---|
| `/etc/nginx/nginx.conf` | `nginx-common` |
| `/usr/sbin/nginx` | `nginx-core` |
| `/lib/systemd/system/nginx.service` | `nginx-core` |

**这就是 conffile——但它属于 `nginx-common`，不属于你敲的那个 `nginx`。**

**4. 记录安装前的基线**

```bash
$ dpkg -l 'nginx*' 2>&1 | tail -3
```

```bash
$ ls -d /etc/nginx /var/lib/nginx /var/log/nginx 2>&1
```

```bash
$ systemctl list-unit-files 'nginx*' 2>&1 | head -5
```

把这三段输出留着，最后要拿它们对比。

**5. 安装**

```bash
$ sudo apt install ./nginx_*.deb
```

注意 `./`。这一步 apt 会从官方源把 `libssl3`、`zlib1g` 等依赖一起处理掉：

```bash
Reading package lists... Done
Building dependency tree... Done
The following NEW packages will be installed:
  nginx nginx-common nginx-core
Need to get 12.4 MB of archives.
Setting up nginx-common ...
Setting up nginx-core ...
Setting up nginx (1.24.0-2ubuntu7) ...
```

**6. 验证安装，并备份配置**

```bash
$ dpkg -s nginx | grep -E 'Status|Version'
Status: install ok installed
Version: 1.24.0-2ubuntu7
```

```bash
$ systemctl is-active nginx
active
```

```bash
$ curl -sI http://localhost | head -1
HTTP/1.1 200 OK
```

**现在做备份，这一步不能省：**

```bash
$ sudo cp -a /etc/nginx/nginx.conf ~/apt-lab/nginx.conf.bak
$ ls -l ~/apt-lab/nginx.conf.bak
```

顺便改一处配置，证明 conffile 确实被 dpkg 跟踪：

```bash
$ sudo sed -i 's/#worker_processes  auto;/worker_processes  4;/' /etc/nginx/nginx.conf
$ sudo nginx -t && sudo systemctl reload nginx
```

**7. 看依赖和"手动/自动"标记**

```bash
$ apt-cache policy nginx
```

```bash
$ apt-mark showauto | grep -E 'libnginx|nginx' 
```

```bash
$ apt list --installed 'nginx*'
```

⚠️ 注意 `nginx` 是 `manual`（你主动装的），`nginx-common` / `nginx-core` 是 `auto`（依赖）。这个区别决定了后面 `autoremove` 会不会动它们。

**8. 体验 hold**

```bash
$ sudo apt-mark hold nginx
nginx set to hold.
```

```bash
$ apt-mark showhold
nginx
```

```bash
$ sudo apt-get -s full-upgrade | grep -A2 'kept back'
The following packages have been kept back:
  nginx
```

```bash
$ sudo apt-mark unhold nginx
nginx set to install.
```

**9. `remove`：只摘掉元包，什么都没真删**

```bash
$ sudo apt remove nginx
```

```console
Removing nginx (1.24.0-2ubuntu7) ...
```

**注意输出里只有一行。**apt 没有碰 `nginx-core` 和 `nginx-common`，因为它们是被依赖拉进来的 `auto` 包，apt 默认不会顺手清理。

```bash
$ dpkg -l 'nginx*' | tail -4
```

```console
rc  nginx           1.24.0-2ubuntu7    amd64    small, powerful, scalable web server
ii  nginx-common    1.24.0-2ubuntu7    all      small, powerful, scalable web server - common files
ii  nginx-core      1.24.0-2ubuntu7    amd64    small, powerful, scalable web server - core
```

三种状态同时出现，非常典型：

| 包 | 状态 | 含义 |
|---|---|---|
| `nginx` | `rc` | 元包已摘除，配置文件仍保留 |
| `nginx-common` | `ii` | **完好安装**，配置归它管 |
| `nginx-core` | `ii` | **完好安装**，二进制和 unit 归它管 |

**服务还在跑。**因为 `nginx.service` 是 `nginx-core` 提供的：

```bash
$ systemctl is-active nginx
active
$ curl -sI http://localhost | head -1
HTTP/1.1 200 OK
```

⚠️ 这就是本章最该记住的现场：**"我明明 `apt remove nginx` 了，怎么服务还在跑？"**因为你只删了那张依赖清单，真正干活的包原封不动。你还得写一行 `systemctl stop nginx` 才能让服务停下来——apt 也不替你做。

顺手确认配置的归属没变：

```bash
$ dpkg -S /etc/nginx/nginx.conf
nginx-common: /etc/nginx/nginx.conf
```

**10. `purge`：只 purge 元包，依然删不掉配置**

```bash
$ sudo apt purge nginx
```

```console
Purging nginx (1.24.0-2ubuntu7) ...
$ ls -d /etc/nginx
/etc/nginx
```

**目录还在，配置还在，`rc` 也还在。**因为你 purge 的是元包，而 `nginx.conf` 根本不归它管。

```bash
$ dpkg -l nginx
```

```console
rc  nginx          1.24.0-2u... amd64        small, powerful, scalable web server
```

⚠️ 初学者在这一步通常会以为 apt 出 bug 了。其实要记住上一节的结论：**`purge` 只对"拥有 conffile 的那个包"有意义。**元包自己一个 conffile 都没有，purge 它等于什么都没做。

**11. `autoremove`：真正把活干完的是它**

```bash
$ sudo apt autoremove --dry-run
The following packages will be REMOVED:
  libnginx-mod-http-geoip2 libnginx-mod-http-image-filter libnginx-mod-http-xslt-filter
  nginx-common nginx-core
0 upgraded, 0 newly installed, 5 to remove and 0 not upgraded.
```

⚠️ 先读这个清单，确认没有你认识的重要东西——`autoremove` 的判断基于标记，误判不罕见。清单里没有 `nginx`，因为它是你手动装的 `manual` 包。

这一步执行前，服务还在跑。**apt 会自动停掉被删除包提供的服务**，但先自己确认一下是更稳的习惯：

```bash
$ systemctl is-active nginx
```

```bash
$ sudo apt autoremove
```

```console
Removing nginx-common (1.24.0-2ubuntu7) ...
Removing nginx-core (1.24.0-2ubuntu7) ...
```

现在服务单元和二进制都没了：

```bash
$ systemctl status nginx
Unit nginx.service not found.
$ dpkg -l 'nginx*'
# 无输出
```

⚠️ `/etc/nginx` 还在，因为 `autoremove` 默认等同于 `remove`，**只保留 conffile**。想连配置一起清，就用 `autopurge`，或者按下面的方式显式 purge 真正的拥有者：

```bash
$ sudo apt purge nginx-common nginx-core
```

```bash
$ ls -d /etc/nginx
ls: cannot access '/etc/nginx': No such file or directory
```

**12. 逐项检查残留——本章的重点**

```bash
$ dpkg -S /usr/sbin/nginx
dpkg-query: no path found matching pattern /usr/sbin/nginx
```

```bash
$ dpkg-divert --list | grep -i nginx
```

```bash
$ ls -d /etc/nginx /var/lib/nginx /var/log/nginx 2>&1
ls: cannot access '/etc/nginx': No such file or directory
ls: cannot access '/var/lib/nginx': No such file or directory
ls: cannot access '/var/log/nginx': No such file or directory
```

**这里的结果因环境而异**——有的包会在 `purge` 时清掉数据目录，有的不会。上面的结果只说明"你的这个版本清了"，不能推广。

**13. 最终验证：一条命令串起来**

```bash
$ { dpkg -l | grep -i nginx; dpkg -S /etc/nginx 2>&1; dpkg-divert --list | grep -i nginx; ls -d /etc/nginx /var/lib/nginx /var/log/nginx 2>&1; } | grep -v '^$' || echo "无残留"
```

这条命令把四个检查点串起来，全空才输出"无残留"。**把这种检查做成一个函数或脚本，就是生产环境卸载前的标准动作。**

**14. 清理**

```bash
$ cd ~
$ rm -rf ~/apt-lab
```

```bash
$ apt clean           # 清空 /var/cache/apt/archives
$ apt autoclean       # 只清缓存里已过期、源里已没有的版本
```

⚠️ `apt clean` 是安全的（只是清缓存，下次装会重新下载）。但如果你在做离线安装准备，**先别清**——缓存里的 `.deb` 是你唯一的离线来源。

### 验证

| 检查项 | 期望结果 |
|---|---|
| `dpkg -s nginx \| grep Status`（安装后） | `Status: install ok installed` |
| `apt-mark showhold`（hold 后） | `nginx` |
| `apt-get -s full-upgrade`（hold 期间） | 出现 `kept back: nginx` |
| `dpkg -l 'nginx*'`（remove 后） | `rc nginx` + `ii nginx-common` + `ii nginx-core` |
| `systemctl is-active nginx`（remove 后） | `active`（**元包被删不代表服务停了**） |
| `dpkg -S /etc/nginx/nginx.conf`（安装后） | `nginx-common: /etc/nginx/nginx.conf` |
| `dpkg -l nginx`（purge 元包后） | 仍是 `rc nginx`，`/etc/nginx` 仍在 |
| `apt autoremove --dry-run`（remove 后） | 列出 `nginx-common`、`nginx-core` 等 auto 包 |
| `systemctl status nginx`（autoremove 后） | `Unit nginx.service not found.` |
| `purge nginx-common nginx-core` 后 | `ls /etc/nginx` → No such file or directory |
| `ls ~/apt-lab/nginx.conf.bak`（全程之后） | 仍然存在 |
| `dpkg -S /usr/sbin/nginx`（清完后） | `no path found` |
| 最终串检命令 | 输出 `无残留` |
| apt 缓存 | `apt clean` 后 `/var/cache/apt/archives` 为空 |

### 思考

1. 第 9 步 `apt remove nginx` 之后，`systemctl is-active nginx` 仍然是 `active`。请解释为什么"包被 remove 了但服务还活着"，以及你要用什么命令自己把服务停掉。如果在这一步直接 `rm -rf /etc/nginx`，下次 `apt install nginx` 会发生什么？conffile 的"残留"到底是在保护你还是在坑你？
2. `autoremove` 删掉了 `nginx-common`，但 `nginx` 是你手动装的。更根本的问题是：包的"自动/手动"标记由什么决定——由你安装时敲的命令决定，还是由别的什么决定？如果 `nginx-common` 已被标成 `manual`，`autoremove` 还会动它吗？
3. 你在第 8 步 hold 了 nginx，然后需要装一个必须依赖新版 nginx 的包。会发生什么？`--allow-change-held-packages` 解决了什么问题、没解决什么问题？
4. `apt -f install` 在什么情况下会删除包而不是修复包？在本章这个实验里，如果第 5 步改用 `sudo dpkg -i nginx_*.deb`（而不是 `apt install ./`），第 6 步会看到什么？下一步该怎么修？
5. 第 6 步你备份了 `/etc/nginx/nginx.conf`，但它属于 `nginx-common`，你备份的时机对不对？如果当时你只备份了"你以为会被 purge 的那个包"提供的东西，会漏掉什么？用一条 `dpkg -S` 命令说明你怎么在 purge 前找出所有需要备份的 conffile。
6. `dpkg-divert` 的存在是为了解决什么问题？为什么它会让"装过又卸了再装"的流程变复杂？在什么场景下你会需要它？
7. 如果这台机器上没有网络，`apt install ./nginx.deb` 还能成功吗？需要额外做什么准备？生产环境做离线升级时，正确的工作流是什么（提示：想想 `apt-get download` 和 `/var/cache/apt/archives`）？

### 清理

```bash
$ cd ~
$ rm -rf ~/apt-lab
$ sudo apt autoremove
$ apt clean
```

确认没有残留的 nginx 相关文件：

```bash
$ find / -xdev -iname '*nginx*' -not -path '*/proc/*' 2>/dev/null
```

⚠️ ⚠️ **这一步是在整个根文件系统上搜索。**在真实生产机上永远不要直接跑无参数的 `rm -rf`——上面这条 `find` 是**只读的**（只列出来，不删除），你可以先看清楚，再逐条决定删不删。真正删除时请逐个明确路径：

```bash
$ sudo rm -rf /var/lib/nginx /var/log/nginx    # ⚠️ 只删你确认过的具体路径
```

---

## 10.15 自测题

### 一、简答

1. `apt` 和 `dpkg` 各自负责什么？为什么说 `dpkg` "不做依赖求解"是它的设计目标而不是缺陷？
2. `apt update` 到底更新了什么？为什么"先 `upgrade` 后 `update`"不会报错、但也什么都没做？
3. `remove` 和 `purge` 的差别具体体现在哪一类文件上？为什么 dpkg 要这样设计？你在什么时候会后悔选了 `remove`？为什么"我 purge 了 `nginx` 但配置还在"完全不算 bug？
4. `dpkg -l` 里的 `ii`、`rc`、`iU`、`hi` 分别代表什么状态？`iU` 是怎么产生的、怎么修？
5. `autoremove` 删包的判断依据是什么？为什么它"删不干净"某些包？`autopurge` 是什么？
6. `apt-cache policy` 的输出里，`Installed`、`Candidate`、版本后面的数字、来源行分别告诉你什么？如果 `Candidate` 和你期望的版本不一致，你会依次检查哪几件事？
7. `dpkg -i` 装完出现 `iU` 状态的根本原因是什么？`apt -f install` 做了什么？它有什么需要警惕的副作用？
8. 为什么 `sudo apt install ./xxx.deb` 比 `sudo apt install xxx.deb` 和 `sudo dpkg -i xxx.deb` 都好？那个 `./` 到底改变了什么语义？
9. `apt-mark hold` 锁的是什么、不锁什么？为什么长期 hold 一个包最终会出问题？`Pin-Priority` 比 hold 好在哪？
10. 添加第三方源时，密钥应该放在哪个目录？为什么不能放 `/etc/apt/trusted.gpg.d/`？为什么不能加 `trusted=yes` 绕过签名错误？

### 二、命令填空

1. 刷新包索引（写脚本时用退出码可靠的那个版本）：________
2. 查看系统有哪些包可升级：________
3. 升级全部包，但允许删除旧内核包：________
4. 升级所有包，但保留你修改过的配置文件（不交互提问）：________
5. 查询 nginx 的已装版本、候选版本和来源：________
6. 列出所有可用的 nginx 版本：________
7. 查看哪些包依赖 libssl3（卸载前必查）：________
8. 卸载 nginx 但保留配置文件：________
9. 把 nginx **连同二进制、服务单元和配置**一起彻底删掉（注意不止一个包）：________
10. 清理不再需要的依赖（先看看会删什么）：________
11. 把 nginx 的版本锁住不让它升级：________
12. 修复依赖不满足导致的未配置包：________
13. 把本地 nginx.deb 安装到系统（自动解依赖）：________
14. 这个文件属于哪个包提供的：________

### 三、故障分析

**案例 1**

> 现象：`sudo apt update` 反复报错：
> ```
> E: Failed to fetch http://old-releases.ubuntu.com/ubuntu/ jammy/main amd64 Packages
>    404  Not Found
> ```
> 但机器上明明还有其他源正常，`apt install` 也能用。
> 1. 404 在这里说明的是网络问题还是配置问题？具体是哪种配置问题？
> 2. 列出你的排查顺序（至少四步，每步给出具体命令）。
> 3. 如果你决定"这个源先不要了"，正确的处理动作是什么？为什么不应该用 `trusted=yes` 或加随机参数来绕过？
> 4. 如果这台机器是生产环境，你在做这个动作前还应该确认什么？

**案例 2**

> 现象：你在生产机上执行 `sudo apt install some-new-tool`，得到：
> ```
> E: Unable to correct problems, you have held broken packages.
> ```
> 你想起来上周为了防止某包被升级，跑过 `apt-mark hold`。
> 1. 这条报错和 hold 有什么关系？apt 想做什么、为什么做不到？
> 2. 你要先跑哪条命令来确认是不是这个原因？
> 3. `apt install --allow-change-held-packages some-new-tool` 能解决什么？它引入的风险是什么？
> 4. 如果 hold 的那个包确实不能升级，还有别的路吗？`apt install some-new-tool=版本号` 这种做法有什么局限？

**案例 3**

> 现象：某同事发给你一个 `myapp_2.1.0_amd64.deb`，让你装到测试机。你执行 `sudo apt install myapp_2.1.0_amd64.deb`，得到 `E: Unable to locate package myapp_2.1.0_amd64.deb`。你换成 `sudo dpkg -i myapp_2.1.0_amd64.deb`，包"装上了"，但运行时报错缺库。
> 1. 第一条命令为什么失败？`apt` 是怎么理解 `myapp_2.1.0_amd64.deb` 的？
> 2. 第二条命令为什么能装上却不能运行？`dpkg -i` 到底做了什么、没做什么？
> 3. 正确的写法是什么？
> 4. ⚠️ 更重要的问题：在你敲任何安装命令之前，你其实应该先做什么？这个 `.deb` 文件本身带来的是什么级别的信任风险？给出至少三个安装前的检查动作。

**案例 4**

> 现象：生产机上一个调优了半年的 nginx，你执行了 `sudo apt purge nginx` 想彻底重装。装完之后发现两件事：`ls /etc/nginx` 里的老配置**还在**，而 `apt install nginx` 时报一堆 `nginx.service` 冲突错误。你完全想不通——purge 不是"彻底删除"吗？
> 1. `dpkg -S` 查一下 `/etc/nginx/nginx.conf` 和 `/usr/sbin/nginx` 分别属于哪个包。为什么 `purge nginx` 两者都没删到？
> 2. 要真正删干净，正确的命令怎么写？写完之后 `ls /etc/nginx` 应该是什么结果？
> 3. 如果配置里是你手工加的虚拟主机（不属于任何 conffile），上面那条命令会删掉它吗？你应该先做什么？
> 4. 你后来在日志里读到 `nginx.service` 冲突的完整报错。那个"冲突"具体是谁和谁在冲突？它为什么会出现在"purge 之后"？

**案例 5**

> 现象：一台机器上之前装过某个包，后来卸载了，现在重新安装时报一个莫名其妙的错，提示某些文件"被 diversions 占用"。你 `ls` 发现那些文件明明不存在。
> 1. `diversions` 是什么机制？解决的是什么问题？
> 2. 为什么"文件不存在"这个事实没有让 diversion 自动消失？
> 3. 给出清理某个包全部 diversion 的命令。
> 4. 除 diversion 之外，还有哪两类"卸载后重装会遇到奇怪问题"的状态需要检查？

### 四、综合实践

1. 写一份《Ubuntu 软件包管理值班手册》，要求：
   - **安装决策树**：给你一个需求（"我要装 X"），列出你依次会执行的命令和每一步的判断依据，包括"从官方源 / 从本地 deb / 从第三方源 / 从源码"四种来源分别怎么走
   - **查询速查表**：至少 8 条查询命令，每条写明"什么情况下你会需要它"和"输出里最该看哪个字段"
   - **状态码对照表**：至少 6 个 `dpkg -l` 状态码，每个写"含义 + 是否正常 + 怎么处理"
   - **卸载与残留清理 SOP**：一份可以照着念的清单，包含至少 8 个检查动作，并说明每个动作在查什么；必须包含 `purge` 前的备份步骤和 diversion 检查
   - **故障速查**：至少 5 类常见故障（404、签名被拒、held broken packages、`iU` 状态、重装报 diversion 错），每类给出"症状 → 3 步以内的排查 → 最可能的根因"
   - **风险提示清单**：至少 5 条"不要这样做"，每条写清后果
   - **第三方源准入清单**：至少 6 条"允许添加这个源之前必须确认的事"，包含信任链说明
   - 附加要求：手册不得依赖任何在线链接，所有判断必须基于本地可执行命令；并明确写出一条"这个手册不覆盖什么"（比如源码编译安装的部分依赖）

2. 完成一次**完整的软件生命周期演练**，全程留下可复核的证据：
   - **阶段 A（获取与验证）**：从网络获取一个真实的 `.deb` 到本地（不要直接 `apt install`），用 `dpkg -I`、`dpkg -c` 记录它的依赖和文件清单；计算它的校验和并与官方公布的值比对，说明"校验和从哪来、怎么才算独立渠道"
   - **阶段 B（安装）**：先用 `dpkg -i` 装，观察状态码；用 `apt -f install` 修复，记录修复过程；然后 `purge` 掉重来一次，这次用 `apt install ./` 完成，**对比两次的依赖处理过程有什么不同**
   - **阶段 C（状态快照）**：记录安装后的"足迹"——`dpkg -s` 输出、`dpkg -l 'X*'`、conffile 清单、服务状态、依赖清单（哪些是 auto）、占用的磁盘空间
   - **阶段 D（卸载）**：先 `remove`，对比快照确认哪些东西变了、哪些没变；再 `purge`，再对比一次；然后 `autoremove --dry-run` 并逐条判断是否该删
   - **阶段 E（残留审计）**：写出一个**可复用的审计脚本**（不是一串手敲命令），检查：包记录、文件归属、diversion、`/var/lib`、`/var/log`、`/etc`、`~/.X`、systemd 单元、`/var/cache/apt/archives` 里的残留 `.deb`；脚本要在"有残留"和"无残留"两种情况下都给出明确的结论，并且**只读不删**
   - **阶段 F（复盘）**：写一段说明：这个包在它的生命周期里，哪些数据是包管理的、哪些是包不管的；如果要把这个软件彻底从一台机器上抹干净，你需要人工处理哪些东西，为什么软件无法替你做
   - 附加要求：整个过程必须留下可重复执行的命令记录（写进一个 `.md` 或 `.sh`），别人照着跑一遍应该得到同样的结论；所有删除操作前必须有一次显式确认（`ls` 或 `du`），并标 ⚠️

---

**下一章预告**：第 11 章《用户、组与身份管理》——`/etc/passwd` 里那个 34 个字符的第三段到底是什么、`useradd` 和 `adduser` 为什么会给出两套完全不同的默认值、一个删掉的账号为什么还能被 `ls` 显示出来、umask 和用户组如何决定新文件的属主，以及 sudo 里那个 `%sudo ALL=(ALL:ALL) ALL` 拆开看是四个意思。

---

*本章完。*