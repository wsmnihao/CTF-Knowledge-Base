# Linux 系统从入门到精通（原创教材）

> **原创声明**：本项目为独立撰写的原创中文 Linux 教材，内容结构参考了同类主题的知识递进顺序，但所有文字解释、类比、示例代码、实验步骤与自测题均为原创编写，非任何已出版教材的复制或改写。书名中的「第三版」指本原创项目的第三次结构修订，与市售同名书籍无关。

## 读者定位

- 有 Windows / macOS 使用经验，**零 Linux 基础**
- 目标：读完后能独立运维一台生产服务器、能写运维脚本、能看懂系统底层发生了什么
- 全书以 **Ubuntu 24.04 LTS** 为唯一演示环境

## 体例约定

| 项 | 约定 |
|---|---|
| 每章结构 | 章节头（目标 / 前置 / 耗时）→ 正文小节 → 本章小结 → 动手实验 → 自测题 |
| 篇幅 | 6000–12000 字，代码密集章拆两段 |
| 代码 | 可直接复制运行，不写伪代码冒充 |
| 提示符 | `user@ubuntu:~$` / `root@ubuntu:~#`，提示符本身不输入 |
| 输出 | 单独 `console` 代码块，供读者自查 |
| 危险命令 | 加 ⚠️ 并说明后果 |
| 自测题 | 正文不给答案，答案见附录 C |
| 发行版差异 | 仅在必要时标 `[Debian/Ubuntu]` `[RHEL]` `[Arch]` |

## 目录

### 第一篇 快速上手

| 章 | 标题 | 状态 |
|---|---|---|
| 01 | [Linux 是什么，以及你该选哪个发行版](ch01-linux-is-what.md) | ✅ 已完成 |
| 02 | [安装 Ubuntu 24.04 LTS 与首次配置](ch02-install-ubuntu.md) | ✅ 已完成 |
| 03 | [终端、Shell 与命令基础](ch03-terminal-and-shell.md) | ✅ 已完成 |
| 04 | [文件系统与目录结构](ch04-filesystem-and-dirs.md) | ✅ 已完成 |

### 第二篇 命令行基本功

| 章 | 标题 | 状态 |
|---|---|---|
| 05 | [文件操作与归档压缩](ch05-file-ops-and-archive.md) | ✅ 已完成 |
| 06 | [权限模型与 sudo](ch06-permissions-and-sudo.md) | ✅ 已完成 |
| 07 | [文本流：管道与重定向](ch07-streams-pipes-redirect.md) | ✅ 已完成 |
| 08 | [grep / sed / awk 三剑客](ch08-grep-sed-awk.md) | ✅ 已完成 |
| 09 | [vi / vim](ch09-vim.md) | ✅ 已完成 |

### 第三篇 系统管理

| 章 | 标题 | 状态 |
|---|---|---|
| 10 | [apt / dpkg：软件包管理](ch10-apt-and-dpkg.md) | ✅ 已完成 |
| 11 | [用户、组与身份管理](ch11-users-and-groups.md) | ✅ 已完成 |
| 12 | [进程、作业与服务管理](ch12-processes-and-jobs.md) | 未开始 |
| 13 | [磁盘、分区与 ext4 / btrfs](ch13-disks-and-filesystems.md) | 未开始 |
| 14 | [LVM 逻辑卷与备份恢复](ch14-lvm-and-backup.md) | 未开始 |
| 15 | [systemd 深入与故障排查](ch15-systemd-and-troubleshoot.md) | 未开始 |

### 第四篇 网络与服务

| 章 | 标题 | 状态 |
|---|---|---|
| 16 | [网络基础与 tcpdump](ch16-networking-and-tcpdump.md) | 未开始 |
| 17 | [SSH 与远程运维](ch17-ssh.md) | 未开始 |
| 18 | [DNS、Web 与 Nginx](ch18-dns-and-nginx.md) | 未开始 |
| 19 | [数据库与缓存](ch19-database-and-cache.md) | 未开始 |
| 20 | [Docker 容器化](ch20-docker.md) | 未开始 |

### 第五篇 进阶与精通

| 章 | 标题 | 状态 |
|---|---|---|
| 21 | [Bash 脚本编程实战](ch21-bash-scripting.md) | 未开始 |
| 22 | [正则表达式与文本处理进阶](ch22-regex.md) | 未开始 |
| 23 | [C 语言、gcc 编译与 gdb 调试](ch23-c-gcc-gdb.md) | 未开始 |
| 24 | [Git、性能调优、自动化与安全加固](ch24-git-perf-security.md) | 未开始 |

### 附录

| 附录 | 内容 | 状态 |
|---|---|---|
| A | 命令速查表（按主题分页） | 待写 |
| B | 故障排查决策树 | 待写 |
| C | 自测题参考答案 | 待写 |
| D | Ubuntu 24.04 与 RHEL 9 命令对照 | 待写 |

## 配套文件

写作流程与规范放在 skill 里，触发「写第 N 章」时自动加载：

| 文件 | 作用 |
|---|---|
| `AGENTS.md` | 常驻硬规则与当前进度 |
| `.opencode/skills/write-chapter/SKILL.md` | 写章节工作流与硬规则 |
| `.opencode/skills/write-chapter/PLAN.md` | 24 章逐章大纲 |
| `.opencode/skills/write-chapter/STYLE.md` | 语气、格式、实验与自测题模板、文件名表 |
| `.opencode/skills/write-chapter/BANNED.md` | 过时技术禁用清单 + 替代方案 + 事实核查清单 |
| `命令手册/` | **派生命令手册**：ch01–ch11 提取的 226 条命令速查（10 个领域文件） |

## 命令手册

正文讲原理，手册讲用法。想直接查命令怎么写，看 [`命令手册/README.md`](命令手册/README.md)：

| 文件 | 内容 |
|---|---|
| `命令手册/01-文件与目录.md` | ls / cp / rm / find / xargs 等 23 条 |
| `命令手册/02-文本查看与处理.md` | cat / less / sort / cut / man 等 22 条 |
| `命令手册/03-检索与替换.md` | grep / rg / sed / awk / shellcheck 5 条 |
| `命令手册/04-压缩备份与同步.md` | tar / gzip / rsync / sha256sum 8 条 |
| `命令手册/05-权限用户与组.md` | chmod / useradd / sudo / visudo / ACL 等 31 条 |
| `命令手册/06-软件包管理.md` | apt / dpkg / gcc / add-apt-repository 15 条 |
| `命令手册/07-系统进程与日志.md` | ps / systemctl / journalctl / ssh / docker 33 条 |
| `命令手册/08-磁盘网络与时间.md` | lsblk / mount / ip / curl / nft / chrony 32 条 |
| `命令手册/09-Shell与脚本基础.md` | 条件 / 循环 / 严格模式 / 排错 50 条 |
| `命令手册/10-文本编辑器.md` | nano / vim / vimdiff / sudoedit 15 条 |

每条命令都是「用途 → 语法 → 完整选项表 → 可复制示例 → ⚠️ 坑」，每个文件末尾有速查表和铁律清单。

## 使用方式

```bash
# 写某一章
/chapter 3

# 或直接说
写第 3 章
继续写书
下一章

# 查看进度
/book-status
```

## 环境基线

| 项 | 值 |
|---|---|
| 发行版 | Ubuntu Server / Desktop 24.04 LTS |
| 内核 | 6.8 系列 |
| init | systemd |
| 权限 | AppArmor |
| 包管理 | apt / dpkg |
| 防火墙 | nftables（ufw 为可选前端） |
| 网络 | netplan + systemd-networkd（Server）/ NetworkManager（Desktop） |
| Shell | bash（Dash 用于 POSIX 兼容对比） |
| 编辑器 | vim（nano 备用） |

**Kali 使用边界**：仅第 20、24 章作为渗透测试工具来源提及，不作为全书演示环境。