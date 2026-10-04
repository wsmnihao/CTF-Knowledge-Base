# 禁用清单：过时技术与其替代

> 本文件是硬性约束。写作时命中左栏任何一项，**必须**使用右栏替代。
> 若某项因教学需要必须提及，只允许「一句话说明它已废弃 + 指向替代方案」，不允许展开讲解。

## 一、彻底不写（已无人使用，讲了是误导读者）

| 禁用项 | 原因 | 替代 |
|---|---|---|
| **ReiserFS** | 2000 年代产物，早已退出主流，最后稳定版 3.6 | ext4（默认）/ btrfs / XFS |
| **xinetd** | 已被 systemd socket activation 取代，RHEL 7 起移除 | systemd `.socket` unit |
| **dump / restore（备份命令）** | 2008 年后基本被淘汰，restore 跨版本不兼容 | `rsync` / `restic` / `borgbackup` / 商业方案 / LVM 快照 |
| **`/etc/init.d/` + `service` 命令 + `chkconfig`** | SysV init 时代，systemd 起不再维护 | `systemctl` |
| **`/etc/inittab`** | SysV init 配置文件，systemd 下无意义 | `systemd` target / `systemctl set-default` |
| **`upstart`** | 早已停止维护 | systemd |
| **SysV init 运行级别（runlevel 0-6）** | 已废弃 | systemd targets（`multi-user.target` / `graphical.target`） |
| **`.bash_profile` 里的 `export PATH=...` 覆盖写法** | 覆盖而非追加，破坏系统 PATH | `~/.local/bin` 已在默认 PATH，或追加式 `export PATH="$PATH:..."` |
| **32 位系统 / i386 架构安装** | Ubuntu 官方已停更 32 位 | amd64 / arm64 |
| **`ftp` / `telnet` 明文协议做常规运维** | 明文传输凭据 | `sftp` / `ssh`；传输走 HTTPS |
| **`rsh` / `rlogin`** | 明文，无加密 | ssh |
| **Apache 的手工编译安装（`./configure` + `make install`）** | 覆盖系统文件、升级地狱 | 发行版仓库包；或改用 Nginx |

## 二、原则上不写主线，必须提及才写，且要标注

| 项 | 现状 | 处理方式 |
|---|---|---|
| **Kali Linux** | 渗透测试专用发行版，滚动更新，不适合当学习环境 | 只在第 20、24 章作为「渗透工具来源」一句话提及。**绝不能作为全书的演示环境** |
| **ifconfig / route / netstat** | 已废弃（net-tools 包），`ip`、`ss`、`ip route` 取代 | 主线只用 `ip a` / `ip link` / `ip route` / `ss -tlnp`。可加一句「老教材里见过 ifconfig，现在用 ip」，然后**立刻给新命令**，不展开 |
| **`iptables`** | 仍可用但 nftables 是后继，Ubuntu 24.04 默认 nftables | 主线 nftables。iptables 仅作兼容说明 |
| **`ufw`** | 前端简化工具，可用，但生产多直接写 nftables 规则 | 第 16 章作为「快速上手」提及，第 24 章加固用 nftables |
| **`firewalld`** | RHEL 系默认，Debian 系不用 | 仅在 `[RHEL]` 差异标注中出现 |
| **`systemctl restart` 一切** | 不是所有配置热加载，不同 unit 类型行为不同 | 需要具体说明哪些能 `reload`，哪些必须 `restart`，哪些连 `restart` 都不够（要 `daemon-reload`） |
| **`chmod 777`** | 安全反模式 | 只在「反面教材」语境出现，紧跟后果说明 |
| **`chmod +x` 后 `./script`** | 正常用法，但需说明内核如何处理 shebang | 正常写，但要解释一次机制 |
| **`apt install` 不做 `apt update`** | 会装旧版本 | 正常写流程时必须包含 update |

## 三、命令与参数的默认值变更提醒

写这些命令时，按 **Ubuntu 24.04 LTS 实际默认值**写，不要照抄老教材：

| 命令 | 老教材写法 | 24.04 实际 | 备注 |
|---|---|---|---|
| `man` | `man nc`（老 nc 手册） | `nc.openbsd-netcat` 或 `ncat` | 包名不同 |
| `pip` | `pip install x` | `pip3 install x` | 系统 Python3 不含 pip |
| `python` | `python script.py` | `python3 script.py` | `python` 命令不存在 |
| `ssh` | `ssh -X` 启用 X11 | 仍可用但默认不转发 | 说明 X11 的性能代价 |
| `gpg` | `gpg --keyserver hkp://...` | `gpg --keyserver hkps://keys.openpgp.org` | hkp 端口被封 |
| `apt-key` | `apt-key add` | 已废弃，改用 `/etc/apt/keyrings/*.gpg` | `apt-key` 在 24.04 有 deprecation 警告 |
| `add-apt-repository` | 用于第三方源 | 仍可用，新写法推荐 `deb822` | 两种都要提，新写法更规范 |
| `service` / `init.d` | `service nginx restart` | `systemctl restart nginx` | 别混用 |
| `useradd` | `useradd john` | `useradd -m john` | 不加 `-m` 无家目录 |
| `tar` | `tar xvf`（旧解包自动解压） | `tar xf`（明确指定 `-z`/`-J`） | bzip2 不再自动识别 |

## 四、网络与安全相关的过时方案

| 禁用 | 原因 | 替代 |
|---|---|---|
| **用 `iptables -A` 直接改规则做长期配置** | 重启丢失、不原子 | nftables 规则文件 / `ufw` |
| **`sshd` 的 `Protocol 1` / `Protocol 2` 指令** | 该指令早已移除，写了报 `Unsupported option` | 直接省略，SSH 2 是唯一协议 |
| **`ssh-rsa`（SHA-1）主机密钥算法** | SHA-1 已弱化，部分客户端禁用 | `ssh-ed25519` / `rsa-sha2-512` |
| **`telnet` 测端口** | 端口多数已不发 banner，无意义；明文 | `nc -zv` / `nmap` / `curl` |
| **`DNS 递归查询用 8.8.8.8` 作为唯一方案** | 国内可达性差 | 系统默认 DNS + 可选 DoH（`cloudflare-dns` / `dnscrypt-proxy`） |
| **关闭 DNS 泄露 / 改 hosts 指向** | 现代系统走 NSS + resolved，hosts 优先级易踩坑 | `resolvectl status` 确认实际生效的 DNS |
| **用 `wget` 当默认下载器** | 仍可用，但 curl 更通用 | `curl`（同时标注 wget 场景） |
| **`mysql` 默认安装 MySQL** | Ubuntu 24.04 默认是 `mariadb-server` | 写明区别，或显式 `apt install mysql-server` 并说明 Oracle 仓库策略 |

## 五、章节特定约束

### 第 13 章（磁盘）
- **不写 ReiserFS 作为「第三选择」**
- LVM 快照必须紧跟「快照 ≠ 备份」的说明
- 讲 `dump` 时只能说「这个命令已废弃，现代方案见第 14 章」

### 第 15 章（systemd）
- 不讲 SysV init 转 systemd 的兼容层脚本
- 不用 `service` / `chkconfig` 做任何示例

### 第 16 章（网络）
- `ifconfig` / `netstat` 不作为主线命令出现
- 防火墙主线用 nftables，ufw 只作「省事选项」提及

### 第 18 章（Nginx）
- 不对比 Apache 的安装步骤（只一句历史说明）
- 配置示例用 `sites-available` + `sites-enabled` 软链的 Ubuntu 标准布局

### 第 20 章（Docker）
- 不写 `-v /var/run/docker.sock:/var/run/docker.sock` 而不给安全警告
- 不把「容器能跑 systemd」写成推荐做法（必须标注不推荐 + 原因）
- 镜像源部分必须提国内可用性，给 `registry-mirrors` 配置

### 第 24 章（安全加固）
- 加固命令区分 `[Debian/Ubuntu]` 与 `[RHEL]`，不混用
- 提到 Kali 工具时，定位是「防守方视角的威胁认知」，不是「教你攻击」

## 六、事实性核查清单（写作时对照）

写完后自查这几点，这些是最容易写错的：

- [ ] Ubuntu 24.04 默认内核是不是 6.8 系列
- [ ] systemd 版本号不要瞎写具体数字
- [ ] `xargs -r` 是 GNU 扩展（BSD/macOS 没有）
- [ ] `find -exec {} +` 与 `-exec {} \;` 的行为差异（批量 vs 逐个）
- [ ] `sed -i` 在 GNU sed 上直接备份写的是 `-i.bak`，不是 BSD 的裸 `-i`
- [ ] `grep -P` 依赖 PCRE，可能未编译进去
- [ ] `tar` 的 `-J` 是 xz 不是 zip
- [ ] `nft` 和 `iptables-nft` 的兼容层关系
- [ ] `systemd-analyze verify` 能查出哪些错误
- [ ] btrfs 需要较新的内核，Ubuntu 24.04 支持没问题但要在 loop 设备上演示才安全
- [ ] PostgreSQL 主流版本与 Ubuntu 24.04 仓库版本（不要写具体版本号）
- [ ] Redis 7 之后 ACL 的变化
- [ ] `set -e` 在 `if` 条件里不生效这个坑

## 七、版权边界（最高优先级）

- **禁止**：逐字转录、近似改写、或按原文段落顺序与例句照抄任何已出版教材
- **允许**：沿用知识主题与递进顺序；用自己写的类比、解释、实验、代码
- **判定标准**：如果一句话读起来「像从某本书里复制的」，就重写
- 原书（`K:\Linux从入门到精通（第3版）`）与教学 PPT 仅作**结构参考**，不作为内容来源
- 本书开头需有明确原创声明，见 `README.md`