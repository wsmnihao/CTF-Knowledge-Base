# 写作计划：24 章 / 5 篇

> 本文件是 `/chapter N` 和「写第 N 章」的唯一大纲来源。
> 写任何一章之前先读本文件对应条目，**不要临场重新设计结构**。
> 结构如需调整，先改本文件，再动正文。

## 环境基线（全书统一，不得漂移）

| 项 | 值 |
|---|---|
| 发行版 | Ubuntu Server 24.04 LTS / Ubuntu Desktop 24.04 LTS |
| 内核 | 6.8（Ubuntu 24.04 默认） |
| init | systemd（PID 1） |
| 权限模型 | AppArmor（非 SELinux） |
| 包管理 | apt / dpkg |
| 防火墙 | nftables（ufw 作为可选前端，非主线） |
| 网络 | systemd-networkd / netplan（服务器）/ NetworkManager（桌面） |
| 文本编辑器 | vim（nano 备用） |
| Shell | bash（Dash 用于 POSIX 兼容对比） |

发行版差异标注约定：`[Debian/Ubuntu]` `[RHEL]` `[Arch]`。只在真正有差异时标。

**Kali 的使用边界**：仅第 20、24 章在讨论渗透测试工具时作为工具来源提及，不得作为全书演示环境。

---

## 第一篇 快速上手（1–4）

### 第 1 章 Linux 是什么，以及你该选哪个发行版 ✅ 已完成

| 项 | 值 |
|---|---|
| 篇幅 | 8000 字（已成稿） |
| 依赖 | 无 |
| 文件 | `ch01-linux-is-what.md` |

**待改写项（交付前必须处理）**
- 删除所有「以 Kali 为默认环境」的表述，改为 Ubuntu 24.04 LTS
- 发行版家族那段补 systemd 259 / AppArmor / nftables 的现状
- 保留「为什么选发行版」的决策树，但把 Kali 移到安全工具的正确位置
- 补一句全书的原创声明（见 README），避免与《Linux 从入门到精通（第 3 版）》混淆

**核心小节**：1.1 从 Unix 血统说起 / 1.2 内核与发行版的关系 / 1.3 常见发行版家族 / 1.4 如何选一个 / 1.5 Linux 能干什么 / 1.6 学习路线图

---

### 第 2 章 安装 Ubuntu 24.04 LTS 与首次配置

| 项 | 值 |
|---|---|
| 篇幅 | 8000–10000 字 |
| 依赖 | 第 1 章 |
| 状态 | ✅ 已完成 |

**核心小节**
- 2.1 确定版本：Server 还是 Desktop
- 2.2 虚拟机 vs 双系统 vs WSL2（按场景给决策建议）
- 2.3 制作启动介质与校验（`sha256sum`）
- 2.4 安装向导逐屏讲解：语言 / 键盘 / 网络 / 磁盘分区 / 用户 / OpenSSH
- 2.5 磁盘分区方案：全盘、LVM、双系统共存的具体点击步骤
- 2.6 首次启动：BIOS/UEFI、Secure Boot、tty 切换
- 2.7 首次配置清单：更新、时区、主机名、locale、额外软件
- 2.8 卸载 UEFI 模式下的 GPT 分区陷阱

**必须讲到**：`lsblk` 看分区结果、LVM 与标准分区的区别、SSH 安装位置、首次更新的必要性

**实验**：在虚拟机装一台 Server 版，用 `lsblk` 验证分区方案，再用 `ip a` 确认网络

**自测方向**：分区方案选择、Server vs Desktop 差异、为什么必须在装完立刻更新

---

### 第 3 章 终端、Shell 与命令基础

| 项 | 值 |
|---|---|
| 篇幅 | 6000–8000 字 |
| 依赖 | 第 2 章 |
| 状态 | ✅ 已完成 |

**核心小节**
- 3.1 终端、shell、伪终端三者的区别
- 3.2 登录流程：tty → login → shell → 提示符
- 3.3 提示符每一段什么意思（`user@host:cwd$`）
- 3.4 命令的三段式结构：`选项 参数 命令`
- 3.5 `--help` 与 `man`：查文档的两条路
- 3.6 `man` 五大节导航：1 用户命令 / 5 文件格式 / 8 管理命令
- 3.7 历史记录与快捷键：`↑` `Tab` `Ctrl+R` `Ctrl+A/E` `Ctrl+W`
- 3.8 通配符与引号：`*` `?` `[]` `' '` `" "` `\`
- 3.9 环境变量与 `$PATH`
- 3.10 退出码 `$?` 与命令链 `&&` `||` `;`

**必须讲到**：`Tab` 补全的分三类行为、引号何时必须用单引号、`$?` 在脚本里的意义

**实验**：不用鼠标只用键盘完成一串文件操作，全程用 `man` 查生僻选项

**自测方向**：`PATH` 机制、引号与通配符优先级、`&&` 与 `;` 的区别

---

### 第 4 章 文件系统与目录结构

| 项 | 值 |
|---|---|
| 篇幅 | 6000–8000 字 |
| 依赖 | 第 3 章 |
| 状态 | ✅ 已完成 |

**核心小节**
- 4.1 一切皆文件：为什么 `/dev/sda1` 也能被 `cat`
- 4.2 FHS 目录树：`/etc` `/var` `/home` `/usr` `/opt` `/tmp` `/proc` `/sys`
- 4.3 `mount` 与挂载点：`/etc/fstab` 逐字段讲解
- 4.4 绝对路径 / 相对路径 / `cd -` / `~` / `..`
- 4.5 虚拟文件系统：`/proc`、`/sys`、`/dev`、`/run` 怎么用
- 4.6 `stat`、`file`、`readlink` 看文件真实属性
- 4.7 符号链接与硬链接的本质区别
- 4.8 特殊文件：设备文件、`/dev/null`、`/dev/urandom`

**必须讲到**：为什么 `/home` 单独分区、fstab 的 `defaults` 展开、`/proc` 是内核的窗口

**实验**：把一个真实目录 bind mount 到 `/mnt`，观察 `/proc/mounts` 变化，再卸载

**自测方向**：`/etc/fstab` 六字段、软硬链接删除行为差异、`/proc` 的只读性

---

## 第二篇 命令行基本功（5–9）

### 第 5 章 文件操作与归档压缩

| 项 | 值 |
|---|---|
| 篇幅 | 6000 字 |
| 依赖 | 第 4 章 |
| 状态 | ✅ 已完成 |

**核心小节**
- 5.1 `cp` 的危险：`-i` `-r` `-a` 与覆盖行为
- 5.2 `mv` 跨文件系统的真实代价
- 5.3 `rm -rf` 的破坏力与安全习惯
- 5.4 `mkdir -p` 与 `rmdir`
- 5.5 通配符批量操作的正确姿势
- 5.6 `tar`：-cvf / xvf / zJvf / --exclude
- 5.7 `gzip` / `bzip2` / `xz` 的压缩率与速度权衡
- 5.8 `zip` 与 `unzip`（跨平台兼容场景）
- 5.9 `rsync -avz --delete` 与 scp 的区别
- 5.10 `find` 基础：`-name -type -size -mtime -exec -delete`
- 5.11 `locate` / `updatedb` 与 find 的取舍

**必须讲到**：`tar` 自动压缩的 `z/J` 写法、`rsync` 的 `--delete` 危险、`find -exec {} +`

**实验**：用 `rsync` 做本地镜像备份，再用 `--delete` 验证删除同步

**自测方向**：`tar` 与 `zip` 适用场景、`find -exec` 与 `xargs` 的差异、恢复误删文件

---

### 第 6 章 权限模型与 sudo

| 项 | 值 |
|---|---|
| 篇幅 | 6000–8000 字 |
| 依赖 | 第 4 章 |
| 状态 | ✅ 已完成 |

**核心小节**
- 6.1 三类用户：root / 普通用户 / 系统服务账号
- 6.2 文件权限位 `rwx` 的十进制解读
- 6.3 `chmod` 符号法与八进制法
- 6.4 `chown` / `chgrp` 与属主属组分离
- 6.5 umask：新文件的默认权限是怎么来的
- 6.6 特殊权限位：setuid / setgid / sticky
- 6.7 为什么 `/etc/shadow` 是 `640 root:shadow`
- 6.8 sudo 的原理：setuid 程序 + sudoers
- 6.9 sudoers 的语法与 `visudo` 的必要性
- 6.10 `sudo -l`、`sudo -u`、`sudo -i` 的区别
- 6.11 提权边界：root 能做什么、容器能做什么

**必须讲到**：setuid 为什么危险、umask 为什么决定新文件权限、sudoers 语法易错点

**实验**：给自己配置一条免密 sudo 规则，用 `visudo` 校验，然后撤销

**自测方向**：`777` 为什么危险、setuid 程序被利用的后果、sudo 与 su 的差异

---

### 第 7 章 文本流：管道与重定向

| 项 | 值 |
|---|---|
| 篇幅 | 6000 字 |
| 依赖 | 第 5 章 |
| 状态 | ✅ 已完成 |

**核心小节**
- 7.1 文件描述符 0/1/2
- 7.2 `>` `>>` `2>` `2>&1` `&>` `2>/dev/null`
- 7.3 `<<` heredoc 与 `<<EOF` 变量展开
- 7.4 管道的本质：内核缓冲区
- 7.5 管道的退出状态：`pipefail`
- 7.6 `tee` 为什么存在
- 7.7 `sort -u` `uniq -c` 与管道组合统计
- 7.8 `cut` `tr` `paste` `column` `nl`
- 7.9 `xargs` 的并行与空输入保护 `-r`
- 7.10 `/dev/stdin` 与 `/dev/fd`

**必须讲到**：`2>&1` 的顺序为什么不能颠倒、`pipefail` 在脚本里的作用、`xargs -r`

**实验**：把 `dmesg` 输出清洗成一列内核错误，并用管道统计出现频次

**自测方向**：`>file` 与 `>>file`、管道与 `&&` 的组合顺序、`xargs` 空输入的行为

---

### 第 8 章 grep / sed / awk 三剑客

| 项 | 值 |
|---|---|
| 篇幅 | 实际 6,844 中文字 / 91 代码块 |
| 依赖 | 第 7 章 |
| 状态 | ✅ 已完成 |

**核心小节**
- 8.1 grep：`-i -v -c -n -w -x -E -r --include -A/-B/-C`、`-o`、`-F`，以及退出码
- 8.2 为什么 `grep -r` 慢，rg 是什么
- 8.3 sed 替换：`s/a/b/g`、分隔符自定义、删除与整行操作
- 8.4 sed 寻址：`/start/,/end/d` 闭区间与三个坑、`1~3`
- 8.5 sed 的 `-i` 编辑与备份后缀（`.bak` 跨平台陷阱）
- 8.6 sed 非交互脚本文件写法
- 8.7 awk：骨架、内置变量、自动数字转换、分组统计 `count[$1]++`、`print` 与 `printf`、`NR==FNR`（原计划 8.7–8.10 合并）
- 8.8 三者如何配合：grep 筛选 → sed 变形 → awk 聚合（原 8.11）
- 8.9 本章小结 / 8.10 动手实验 / 8.11 自测题

**必须讲到**：`-i` 直接改文件的不可回退风险、`sed` vs `awk` 的选择标准（简单替换用 sed、字段处理用 awk）

**实验**：写一个 shell 脚本，从 `/var/log/syslog` 里提取所有 sudo 提权记录，按用户统计次数

**自测方向**：`sed` 寻址的边界语义、awk 字段切分、grep 返回码对脚本的影响

---

### 第 9 章 vi / vim

| 项 | 值 |
|---|---|
| 篇幅 | 实际 9,614 中文字 / 73 代码块（PLAN 原定 6000；内容为逐节技术讲解，无注水，故保留） |
| 依赖 | 第 3 章 |
| 状态 | ✅ 已完成 |

**核心小节**（按正文实际）
- 9.1 为什么服务器上还是 vi：`vi` → `vim.tiny` 的 alternatives 关系、vim 比 vi 多了什么
- 9.2 三种模式与心智模型：数量 + 动词 + 宾语、`showmode`、卡在插入模式的两种现象
- 9.3 打开文件：`+行号` `+/pattern` `-R` 与 `-r` 的坑 `-M -b -u NONE -n`、交换文件与 E325、`sudoedit`
- 9.4 光标移动：`hjkl 0 ^ $ gg G :{n}`、`w W b B e`、`{}`、`Ctrl+d/u/f/b/e/y`、`HML`、`zz`、`Ctrl+o/i`
- 9.5 编辑：`i a o I A O`、`x dd D C`、text object（`diw daw ciw ci( dip`）、`u` 是命令级、撤销树、`:earlier`
- 9.6 查找替换：`/ ? n N * #`、`\< \>`、`\v \V`、`:s///g` 的 `%` 与 `g` 分工、`:s///gc` 确认键、`&` `:s//new/g`、`:g/p/d` 与 `:g/p/normal`
- 9.7 复制剪切与寄存器：yank 与 delete 同源、`"a` `"0` `"1` `"+`、`:reg`、⚠️`~/.viminfo` 泄露与 `chmod 600`
- 9.8 `.` 重复与宏：`qa`/`q`/`@a`/`@@`/`5@a`、录宏四条纪律、`:g` + `:normal` 优先于宏、`:normal`
- 9.9 多文件：缓冲区 / 参数列表 / 窗口三者正交、`:e` `:args` `:n` `:ls` `:bn` `:bd`、`set laststatus=2`、`:sp :vsp`、vim vs grep 的分工
- 9.10 保存退出：`:w :q :q! :wq :x :qa :cq`、`E37` 是保护、`:x` 不改 mtime 的实际后果、`set backup`
- 9.11 最小 `.vimrc`（服务器用）：保守三原则、逐行解释、明确不装的东西、`:verbose set` 与 `vim -u NONE` 排错、`vimtutor`
- 9.12 nano 快速应急：必会六键、`~/.nano.conf`、何时用哪个
- 9.13 本章小结 / 9.14 动手实验 / 9.15 自测题

**必须讲到**：`:q!` 与 `:q` 的区别、`:x` 只在有改动时写、`.vimrc` 服务器保守配置

**实验**：用 `q` 宏给 100 行文本批量加行首前缀和行尾后缀

**自测方向**：`:w` 与 `:wq`、宏录制原理、搜索后换行继续搜索

---

## 第三篇 系统管理（10–15）

### 第 10 章 apt / dpkg：软件包管理

| 项 | 值 |
|---|---|
| 篇幅 | 实际 9,822 中文字 / 133 代码块 |
| 依赖 | 第 3 章 |
| 状态 | ✅ 已完成 |

**核心小节**（按正文实际）
- 10.1 apt 架构：`apt` vs `apt-get` 的取舍（脚本用 `apt-get`，因为 `apt update` 退出码不可靠）、会碰到的目录清单、24.04 默认 deb822 `ubuntu.sources` 的 `Suites` `Components` `Signed-By`、`noble-backports` 会引入新依赖、自动更新由 `apt-daily*.timer` 负责
- 10.2 `apt update` 只刷索引不装包、顺序反了会静默什么都不做、`upgrade` vs `full-upgrade`（内核需要删包）、`--dry-run`、`--force-confold`
- 10.3 conffile 概念与 `remove`/`purge`/`autoremove`/`autopurge` 对照、`dpkg -l` 状态码 `ii rc hi iU iF iR un`、`autoremove` 只清 `auto` 标记、`apt-mark auto/manual`
- 10.4 `apt-cache policy madison show depends rdepends search`、候选版本来自哪个源、pin priority 数字、`dpkg -S` 的局限（别名/软链接查不到）
- 10.5 一次 `apt install` 的真实输出逐行解读、依赖求解是带约束优化问题
- 10.6 `dpkg -i -r -P -l -L -S -s -V -C --audit --unpack --configure`、`--force-depends`、deb-selections 备份
- 10.7 `dpkg -i` 留下 `iU` 的原因、`apt -f install` 的修复与破坏性、⚠️首选 `apt install ./xxx.deb`（`./` 才是本地文件）
- 10.8 `apt-mark hold/unhold/showhold`、`kept back` 的含义、hold 是单边锁、`--allow-change-held-packages`、`Pin-Priority > 1000` 与 pinning 的区别
- 10.9 `.deb` 手动安装五步流程（`dpkg -I` → `dpkg -c` → `apt install ./` → `dpkg -s` → purge 验证）、签名与校验和、purge 不管的六类位置、`dpkg-divert` 重装障碍
- 10.10 第三方源的三个信任问题、标准四步（`/etc/apt/keyrings/` + `Signed-By:`）、⚠️不落盘式 curl 的坏处、`add-apt-repository` 与 PPA 信任模型、PPA 可能消失
- 10.11 签名验证的是"来源"不是"安全"、gpg keyring 与 apt keyring 是两套系统、⚠️不要用 `apt-key`、指纹必须独立渠道核对、签名类报错含义、`apt update` 404 六步排查
- 10.12 snap / flatpak 与 apt 的差别（自带依赖、不受 hold 管、吃磁盘）、confinement、`snapd` 彻底移除、flatpak 用户级 vs 系统级
- 10.13 本章小结 / 10.14 动手实验 / 10.15 自测题

**实验**：从源码或 `.deb` 安装一个软件，然后彻底卸载并验证无残留

**自测方向**：`apt update` 报 404 怎么排查、hold 的作用、第三方源的签名验证

---

### 第 11 章 用户、组与身份管理

| 项 | 值 |
|---|---|
| 篇幅 | 6000 字 |
| 依赖 | 第 6 章 |
| 状态 | 未开始 |

**核心小节**
- 11.1 `/etc/passwd` / `/etc/shadow` / `/etc/group` 三件套
- 11.2 UID 与 GID 的分配规则与冲突风险
- 11.3 `useradd` 常用选项：`-m -s -G -c`
- 11.4 `usermod` 改组、`groupadd` / `gpasswd`
- 11.5 批量建用户：从 CSV 或脚本生成
- 11.6 家目录迁移与孤儿文件
- 11.7 服务账号的创建规范（`nologin` shell）
- 11.8 时间与时区：`timedatectl` / `chrony`
- 11.9 主机名与 `/etc/hosts`
- 11.10 locale 与字符集：`LANG` `LC_ALL`
- 11.11 账号安全：密码策略、`chage`

**必须讲到**：用户注销后进程为何还在（`nologin` 的实际作用）、家目录权限漂移、`LC_ALL` 的陷阱

**实验**：创建一个受限的运维账号并配置 sudo 白名单，验证它无法登录 root

**自测方向**：`useradd -m` 的必要性、修改 UID 后的属主问题、`nologin` 的行为

---

### 第 12 章 进程、作业与服务管理

| 项 | 值 |
|---|---|
| 篇幅 | 6000–8000 字 |
| 依赖 | 第 3 章 |
| 状态 | 未开始 |

**核心小节**
- 12.1 进程 vs 程序 vs 线程
- 12.2 `ps` 的 UNIX 风格选项 `-ef` `-u`
- 12.3 `top` / `htop` / `uptime` / `free` / `vmstat` / `iostat`
- 12.4 进程状态：D R S T Z 与僵尸进程成因
- 12.5 `kill` 的信号：`TERM` `KILL` `HUP` `STOP` `CONT`
- 12.6 `kill -9` 为什么是最后手段
- 12.7 `nohup` `setsid` 与终端断连
- 12.8 `jobs` `bg` `fg` `Ctrl+Z`
- 12.9 `lsof` `fuser` 找占用
- 12.10 `strace` `perf` 的入门用法
- 12.11 `renice` `nice` 优先级

**必须讲到**：僵尸进程必须被 wait 回收、`SIGTERM` 给程序清理机会、终端断连的 SIGHUP 链路

**实验**：写一个 fork 僵尸的最小复现，然后用 `strace -f` 观察系统调用

**自测方向**：`kill -9` 的副作用、僵尸 vs 孤儿、`nice` 与实时优先级

---

### 第 13 章 磁盘、分区与 ext4 / btrfs

| 项 | 值 |
|---|---|
| 篇幅 | 8000 字 |
| 依赖 | 第 4 章 |
| 状态 | 未开始 |

**核心小节**
- 13.1 块设备与 `lsblk` `blkid` `fdisk -l`
- 13.2 分区表：GPT 与 MBR，GPT 的备份分区机制
- 13.3 `fdisk` 交互式分区实战
- 13.4 `partprobe` / `udevadm settle` 让内核重读分区表
- 13.5 格式化：`mkfs.ext4 -m 0` 与 `mkfs.btrfs`
- 13.6 挂载选项：`noatime` `nodiratime` `discard` `errors=remount-ro`
- 13.7 ext4 特性：journal、在线扩容 `resize2fs`
- 13.8 btrfs 特性：snapshot、subvolume、checksum、`btrfs balance`
- 13.9 ext4 与 btrfs 的选型对比
- 13.10 inode 耗尽：磁盘没满却写不进去
- 13.11 `du` 与 `df` 不一致的常见原因
- 13.12 磁盘空间排查实战

**必须讲到**：GPT 备份表为什么救了你一次、inode 耗尽如何诊断、btrfs subvolume 与 LVM 的边界

**实验**：创建一个 512M loop 设备，格式化 btrfs，拍快照，写入，再回滚快照验证

**自测方向**：`du` 与 `df` 差异、inode 耗尽诊断、GPT vs MBR 的适用场景

---

### 第 14 章 LVM 逻辑卷与备份恢复

| 项 | 值 |
|---|---|
| 篇幅 | 10000 字（代码密集，拆两段） |
| 依赖 | 第 13 章 |
| 状态 | 未开始 |

**核心小节**
- 14.1 LVM 三层模型：PV / VG / LV 的结构图
- 14.2 为什么需要 LVM：在线扩容、快照
- 14.3 创建 PV：`pvcreate`
- 14.4 创建 VG：`vgcreate`，PE 与 VG 的关系
- 14.5 创建 LV：`lvcreate -L` vs `-l`（PE 数）
- 14.6 `pvs` `vgs` `lvs` 速查
- 14.7 在线扩容流程：`lvextend` → `resize2fs`
- 14.8 快照：`lvcreate -s` + 只读挂载做一致性备份
- 14.9 LVM 精简卷：`thinpool` / `thinvolume`
- 14.10 RAID 与 LVM 的组合
- 14.11 vg 改名与 pv 找回：`vgcfgbackup`
- 14.12 备份策略：完整 / 增量 / 差异
- 14.13 `tar` 备份、`rsync` 增量、`borgbackup` / `restic` 快照
- 14.14 **恢复演练**：从备份还原到裸机
- 14.15 rsync 备份脚本与 systemd timer

**必须讲到**：快照不等于备份、LVM 元数据丢失怎么救、恢复演练为什么必须做

**实验**：完整跑一遍「创建 LVM → 快照 → 破坏数据 → 从快照回滚」

**自测方向**：快照与备份的本质差异、备份不演练等于没备份、VG 丢失的后果

---

### 第 15 章 systemd 深入与故障排查

| 项 | 值 |
|---|---|
| 篇幅 | 10000 字（代码密集，拆两段） |
| 依赖 | 第 10、11、12 章 |
| 状态 | 未开始 |

**核心小节**
- 15.1 为什么 PID 1 不能崩：init 的历史包袱
- 15.2 unit 类型：service / socket / timer / target / mount / path
- 15.3 `systemctl` 常用动词全解
- 15.4 unit 文件的加载优先级与搜索路径
- 15.5 `[Unit] [Service] [Install]` 三段逐字段
- 15.6 `Type=simple` `forking` `oneshot` `notify` 的区别
- 15.7 `Restart=` 策略与 `StartLimitBurst` 死循环
- 15.8 依赖关系：`After=` `Requires=` `Wants=` `BindsTo=`
- 15.9 `systemd-analyze blame` 开机慢分析
- 15.10 `journalctl` 全家桶：`-u -f -b -p --since`
- 15.11 `systemd-analyze verify` 与 `systemd-analyze cat-config`
- 15.12 临时/持久化 override：`/etc/systemd/system/*.d/override.conf`
- 15.13 `daemon-reload` 与 `preset`
- 15.14 **故障排查方法论**：从症状到定位的决策树
- 15.15 `systemd-run` 临时服务、`strace` 启动过程
- 15.15 案例：Nginx 起不来的 5 个原因

**必须讲到**：`After=` 不等于「需要」（那是 `Requires=`）、`daemon-reload` 何时必需、`journalctl -b -1` 看上一次启动

**实验**：手写一个 `oneshot` unit 跑备份脚本，配 timer 每天执行，然后故意写错依赖验证 `systemctl` 报错

**自测方向**：`After` 与 `Requires` 的区别、服务反复重启的排查、开机卡启动的定位

---

## 第四篇 网络与服务（16–20）

### 第 16 章 网络基础与 tcpdump

| 项 | 值 |
|---|---|
| 篇幅 | 8000 字 |
| 依赖 | 第 3 章 |
| 状态 | 未开始 |

**核心小节**
- 16.1 分层模型在实践中怎么用
- 16.2 网卡命名：enp3s0 vs eth0，命名规则
- 16.3 `ip a` `ip link` `ip route` 取代 ifconfig
- 16.4 netplan 配置文件结构（`/etc/netplan/*.yaml`）
- 16.5 systemd-networkd vs NetworkManager
- 16.6 DNS 解析：resolv.conf 与 systemd-resolved
- 16.7 `ping` `traceroute` `mtr` `dig` `nslookup`
- 16.8 端口与监听：`ss -tlnp` 取代 netstat
- 16.9 防火墙：nftables 基础与 ufw 的位置
- 16.10 tcpdump 抓包入门
- 16.11 Wireshark 读 pcap
- 16.12 **排障案例**：访问不了网站，逐层定位
- 16.13 MTU 与 ping 通但网页打不开
- 16.14 NAT 与 Docker 端口映射原理

**必须讲到**：`ss` vs `lsof` 的取舍、MTU 问题的现象特征、netplan 改完要 `netplan apply`

**实验**：tcpdump 抓一次 DNS 查询并用 Wireshark 解读，构造一个 MTU 问题并解决

**自测方向**：网络不通的分层排查顺序、监听端口没被绑定的原因、MTU 问题的识别

---

### 第 17 章 SSH 与远程运维

| 项 | 值 |
|---|---|
| 篇幅 | 8000 字 |
| 依赖 | 第 16 章 |
| 状态 | 未开始 |

**核心小节**
- 17.1 SSH 解决的三件事：认证、加密、通道
- 17.2 密码认证到密钥认证的演进
- 17.3 `ssh-keygen` 参数与 ed25519 选择
- 17.4 `ssh-copy-id` 与手动写 `authorized_keys`
- 17.5 `~/.ssh/config` 主机别名与跳板机
- 17.6 `ProxyJump` 链式跳板
- 17.7 `ssh -L` 本地转发、`-R` 远程转发、`-D` SOCKS 代理
- 17.8 scp / sftp / rsync -e ssh 的取舍
- 17.9 **sshd 安全加固全清单**
- 17.10 `PasswordAuthentication no` 前的准备（防把自己锁在外面）
- 17.11 `fail2ban` 防爆破
- 17.12 密钥吊销与多密钥管理
- 17.13 `~/.ssh` 权限为什么必须是 700
- 17.14 VS Code Remote SSH
- 17.15 `systemd` 里跑长任务的坑（`KillUserProcesses`）

**必须讲到**：先开密钥再关密码的顺序、`~/.ssh` 权限 700 的原因、端口转发在内网横向中的用途

**实验**：配置密钥登录 + 二跳跳板 + 一个本地端口转发，然后按加固清单改 `sshd_config` 并验证

**自测方向**：隧道原理、加固项的优先级、sshd 改错导致连不上的自救

---

### 第 18 章 DNS、Web 与 Nginx

| 项 | 值 |
|---|---|
| 篇幅 | 10000 字（代码密集，拆两段） |
| 依赖 | 第 15、16 章 |
| 状态 | 未开始 |

**核心小节**
- 18.1 一次 Web 请求的完整链路
- 18.2 DNS 记录类型：A AAAA CNAME MX TXT NS
- 18.3 权威 vs 递归 DNS，`dig +trace`
- 18.4 DNS 污染与 DoH/DoT
- 18.5 Nginx 的角色：反向代理 / 负载均衡 / 静态服务
- 18.6 安装与 systemd 集成
- 18.7 `server` `location` `root` `alias` 匹配规则
- 18.8 `try_files` 与常见 404 配法
- 18.9 反向代理到后端：`proxy_pass` 的路径拼接坑
- 18.10 upstream 负载均衡与健康检查
- 18.11 TLS：Let's Encrypt + certbot 自动续期
- 18.12 证书链与 `curl -v` 排查
- 18.13 访问日志分析
- 18.14 限流 `limit_req` / `limit_conn`
- 18.15 安全响应头与常见加固
- 18.16 与 Apache 的历史差异（简述，不展开）
- 18.17 **案例**：502/504 的成因与排查

**必须读到**：`root` 与 `alias` 的路径差、`proxy_pass` 结尾斜杠、证书续期失败的排查

**实验**：Nginx 反代到两个后端做轮询，开 TLS，配限流，然后用 `curl -v` 验证每个环节

**自测方向**：502 与 504 的区别、location 优先级、证书续期失败的排查步骤

---

### 第 19 章 数据库与缓存

| 项 | 值 |
|---|---|
| 篇幅 | 8000 字 |
| 依赖 | 第 15、18 章 |
| 状态 | 未开始 |

**核心小节**
- 19.1 关系模型与表结构直觉
- 19.2 安装 PostgreSQL 或 MySQL：选型说明
- 19.3 初���化与远程访问配置
- 19.4 配置文件位置与日志
- 19.5 用户、库、权限三级模型
- 19.6 连接池与长连接问题
- 19.7 备份：`pg_dump` / `mysqldump` / 物理备份
- 19.8 主从复制原理简述
- 19.9 Redis 数据结构与内存模型
- 19.10 Redis 持久化：RDB vs AOF
- 19.11 缓存三大问题：穿透、击穿、雪崩
- 19.12 缓存与数据库一致性的常见策略
- 19.13 `EXPLAIN` 看执行计划
- 19.14 慢查询日志定位
- 19.15 索引失效的几种写法

**必须讲到**：索引最左前缀、缓存一致性取舍、`pg_dump` 与物理备份的差异

**实验**：搭 PostgreSQL + Redis，做一次索引优化前后 `EXPLAIN` 对比，再写一个缓存穿透复现与修复

**自测方向**：索引失效场景、缓存一致性方案、逻辑备份与物理备份取舍

---

### 第 20 章 Docker 容器化

| 项 | 值 |
|---|---|
| 篇幅 | 10000 字（代码密集，拆两段） |
| 依赖 | 第 15、16 章 |
| 状态 | 未开始 |

**核心小节**
- 20.1 容器解决什么问题：与虚拟机的本质差异
- 20.2 namespace 与 cgroup 两件套
- 20.3 Docker Hub 与镜像源（国内）
- 20.4 `docker run` 常用参数
- 20.5 镜像与容器的关系
- 20.6 `docker commit` 与镜像分层
- 20.7 **Dockerfile 五个核心指令**：`FROM` `RUN` `COPY` `CMD` `ENTRYPOINT`
- 20.8 构建缓存与 `.dockerignore`
- 20.9 多阶段构建瘦身
- 20.10 `docker-compose` 的编排语义
- 20.11 数据卷与 bind mount 的区别
- 20.12 网络：`bridge` `host` `none` 与自定义网络
- 20.13 容器日志与 `docker logs`
- 20.14 资源限制 `--memory` `--cpus`
- 20.15 安全：非 root 运行、只读根文件系统
- 20.15 镜像瘦身：alpine vs slim
- 20.16 用 systemd 管容器的坑
- 20.17 容器里的 systemd 能不能跑
- 20.18 在 CTF 场景里怎么用容器隔离环境
- 20.19 **Kali 工具链在容器中的使用边界**

**必须讲到**：容器不是虚拟机（没有内核）、bind mount 覆盖代码导致容器起不来、volume vs bind 的取舍

**实验**：手写 Dockerfile 部署一个 Nginx + PHP 应用，多阶段构建压到最小，再用 compose 加 Redis

**自测方向**：容器为什么快、volume 与 bind 的差异、生产不用容器的三个理由

---

## 第五篇 进阶与精通（21–24）

### 第 21 章 Bash 脚本编程实战

| 项 | 值 |
|---|---|
| 篇幅 | 10000 字（代码密集，拆两段） |
| 依赖 | 第 7、8、9、10 章 |
| 状态 | 未开始 |

**核心小节**
- 21.1 为什么要会写脚本：运维的实际场景
- 21.2 shebang 与可执行位
- 21.3 变量：本地/全局/只读/默认赋值
- 21.4 参数：`$1` `$@` `$*` `$#` `$?`
- 21.5 条件：`test` 与 `[[ ]]` 的差异
- 21.6 循环：`for` `while` `until` `case`
- 21.7 函数与返回值
- 21.8 数组
- 21.9 `set -euo pipefail` 严格模式
- 21.10 `trap` 信号与清理
- 21.11 命令替换 `$(...)` 与反引号
- 21.12 here-doc 生成多行文件
- 21.13 `getopts` / `getopt` 处理参数
- 21.14 临时文件与 `mktemp`
- 21.15 日志函数与彩色输出
- 21.16 flock 防止并发冲突
- 21.17 脚本调试：`bash -x -v` 与 `set -e` 的陷阱
- 21.18 ShellCheck 静态检查
- 21.19 实战一：批量部署脚本
- 21.20 实战二：日志轮转 + 磁盘告警

**必须讲到**：脚本必须加 `set -euo pipefail`、`trap` 清理临时文件、`[[ ]]` 防注入

**实验**：写一个带 `--help`、参数校验、日志、错误处理的完整部署脚本，通过 ShellCheck

**自测方向**：未加引号变量的坑、`$*` 与 `$@`、退出码陷阱

---

### 第 22 章 正则表达式与文本处理进阶

| 项 | 值 |
|---|---|
| 篇幅 | 6000 字 |
| 依赖 | 第 8 章 |
| 状态 | 未开始 |

**核心小节**
- 22.1 BRE / ERE / PCRE 三方言
- 22.2 字符类与边界：`^ $ . * [] [^] \b \B`
- 22.3 贪婪 vs 非贪婪
- 22.4 分组与反向引用
- 22.5 零宽断言：前瞻后顾
- 22.6 `grep -P` 的 PCRE 支持
- 22.7 `sed -E` 与 `sed -r`
- 22.8 `awk` 中的正则
- 22.9 用正则提取 IP、MAC、邮箱、URL
- 22.10 用正则批量改配置文件的实战
- 22.11 嵌套正则的可读性问题

**必须讲到**：方言差异导致同一表达式行为不同、正则的可维护性成本

**实验**：从一份 nginx 日志里提取所有客户端 IP 和状态码，生成 CSV

**自测方向**：贪婪匹配的后果、PCRE 与 ERE 的差异、在 shell 里引号与正则的冲突

---

### 第 23 章 C 语言、gcc 编译与 gdb 调试

| 项 | 值 |
|---|---|
| 篇幅 | 8000 字 |
| 依赖 | 第 12 章 |
| 状态 | 未开始 |

**核心小节**
- 23.1 为什么运维要懂一点 C
- 23.2 编译流程：预处理 → 汇编 → 链接
- 23.3 gcc 常用参数：`-Wall -Wextra -g -O0 -O2 -static`
- 23.4 头文件与库的链接
- 23.5 Makefile 的规则与变量
- 23.6 编译错误的分类
- 23.7 链接错误：undefined reference 的成因
- 23.8 `ldd` `nm` `objdump` `readelf` 看二进制
- 23.9 `gdb` 基础：`break` `run` `print` `bt`
- 23.10 观察栈帧与变量
- 23.11 core dump 与 `ulimit -c`
- 23.12 `strace` 系统调用跟踪
- 23.13 内存错误长什么样：段错误入门
- 23.14 写一个 `strace` 小工具
- 23.15 编译常见库时的坑

**必须讲到**：`static` 链接的取舍（体积 vs 可移植）、段错误的定位路径、core dump 开启

**实验**：编译一个带内存 bug 的程序，用 gdb + core dump 定位到出错行，再修好它

**自测方向**：undefined reference 的排查顺序、动态库找不到的修复、段错误的典型原因

---

### 第 24 章 Git、性能调优、自动化与安全加固

| 项 | 值 |
|---|---|
| 篇幅 | 10000 字（代码密集，拆两段） |
| 依赖 | 第 13、15、21 章 |
| 状态 | 未开始 |

**核心小节**
- 24.1 Git 基础：工作区 / 暂存区 / 仓库
- 24.2 分支模型与合并
- 24.3 `rebase` vs `merge`
- 24.4 `.gitignore` 与大文件
- 24.5 tag 与发布流程
- 24.6 冲突解决的实操
- 24.7 把配置当代码：GitOps 思路
- 24.8 性能指标：负载、IO wait、上下文切换
- 24.9 `iostat` `sar` `pidstat` 定位瓶颈
- 24.10 systemd timer / cron 做定时任务
- 24.11 Ansible 快速上手（幂等概念）
- 24.12 监控告警：日志 vs 指标
- 24.13 安全基线检查：更新 / 账号 / 端口 / 权限
- 24.14 AppArmor 简介
- 24.15 最小权限原则落地
- 24.16 密钥与凭据管理
- 24.17 日志审计与入侵痕迹识别
- 24.18 **CTF 视角**：从防守视角回看前面的知识
- 24.19 学习路线：下一步读什么

**必须讲到**：性能排查先看指标再动手、幂等与自动化、`[RHEL]` 与 `[Debian]` 加固差异

**实验**：写一个 cron/systemd timer 巡检脚本，覆盖 CPU/内存/磁盘/服务状态并输出告警；用 Git 管理这些运维脚本

**自测方向**：负载高的排查顺序、自动化脚本的幂等要求、常见入侵痕迹

---

## 附录规划

| 附录 | 内容 | 依赖 |
|---|---|---|
| 附录 A | 命令速查表（按主题分类，一页一主题） | 全书完成 |
| 附录 B | 故障排查决策树（服务起不来 / 网络不通 / 磁盘满 / 变慢） | 第 12、15、16 章 |
| 附录 C | 自测题参考答案 | 各章自测题 |
| 附录 D | Ubuntu 24.04 与 RHEL 9 命令对照表 | 全书完成 |

---

## 章节依赖图

```
ch01 ──► ch02 ──► ch03 ──┬──► ch04 ──► ch05 ──► ch06
                         │         └──► ch07 ──► ch08 ──► ch09
                         └──► ch11
ch06 ──► ch11
ch03 ──┬──► ch10 ──┬──► ch15 ──► ch19
       │           ├──► ch20 ──► ...
       ├──► ch12 ──┤
       ├──► ch16 ──┼──► ch17 ──► ch18
       │           └──► ch23
       └──► ch13 ──► ch14
ch05 ──► ch21 ──► ch24
ch08 ──► ch22
ch13 ──► ch24
```

**写作顺序建议**（不等依赖完全满足，按难度递进）：
`1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 16 → 17 → 15 → 18 → 14 → 19 → 20 → 21 → 22 → 23 → 24`