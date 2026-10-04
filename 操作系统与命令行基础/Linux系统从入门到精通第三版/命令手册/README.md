# Linux 命令手册

> 从《Linux 系统从入门到精通》ch01–ch11 的正文与实验里提取整理，覆盖 **164 个源命令**，
> 加上补齐可用性所需的 **62 个配套命令**（`ip`、`less`、`htop`、`visudo`、`ssh-keygen` 等），
> 共 **226 条命令**，分 10 个领域文件。
>
> **这本手册只讲「实际怎么用」**：语法、完整常用选项、可直接复制的示例、以及会咬人的坑。
> 概念和原理请回原书。
>
> 基线：**Ubuntu 24.04 LTS** / GNU coreutils / GNU grep-sed-awk / APT / systemd。

---

## 怎么用这本手册

| 你想做的事 | 去哪查 |
|---|---|
| 列目录、拷贝、删除、找文件、批量处理 | [01-文件与目录.md](01-文件与目录.md) |
| 看文件内容、排序、统计、转换、查手册 | [02-文本查看与处理.md](02-文本查看与处理.md) |
| 找内容、正则替换、批量改、脚本静态检查 | [03-检索与替换.md](03-检索与替换.md) |
| 打包、压缩、同步、校验、销毁数据 | [04-压缩备份与同步.md](04-压缩备份与同步.md) |
| 权限、用户、组、sudo、ACL、文件能力 | [05-权限用户与组.md](05-权限用户与组.md) |
| 装包、卸包、查包、源码、第三方源 | [06-软件包管理.md](06-软件包管理.md) |
| 看进程、日志、服务、SSH、容器 | [07-系统进程与日志.md](07-系统进程与日志.md) |
| 磁盘、挂载、网络、时间、字符集 | [08-磁盘网络与时间.md](08-磁盘网络与时间.md) |
| 写脚本、条件判断、严格模式、排错 | [09-Shell与脚本基础.md](09-Shell与脚本基础.md) |
| 改文件、vim、nano、安全改系统配置 | [10-文本编辑器.md](10-文本编辑器.md) |

**每条命令的结构**：`用途 → 语法 → 完整选项表 → 可复制示例 → ⚠️ 坑`
**每个文件末尾**：`场景速查表` + `N 条铁律`。

---

## 高频 32 命令速查

这一页是每天真正常用的。学会了能覆盖八成日常操作。

| 命令 | 一句话 | 最常用写法 |
|---|---|---|
| `ls` | 列目录 | `ls -lh` |
| `cd` | 切目录 | `cd -` 回去 |
| `pwd` | 当前目录 | `pwd -P` 解析符号链接 |
| `cp` | 拷贝 | `cp -a src/ dst/` 保留属性 |
| `mv` | 移动 / 改名 | `mv a b` |
| `rm` | 删除 | ⚠️ `rm -r -- "$f"` 加 `--` 防参数注入 |
| `mkdir` | 建目录 | `mkdir -p a/b/c` |
| `ln` | 建链接 | `ln -s 目标 名字` |
| `cat` | 整个文件打出 | `cat -n` 带行号 |
| `head` / `tail` | 头 / 尾 | `tail -f` 实时跟踪 |
| `less` | ⭐ 分页看长文件 | `less +G file`（`q` 退出，`/搜索`） |
| `grep` | 找文本 | `grep -rn "pat" dir/` |
| `find` | 找文件 | `find . -name "*.log"` |
| `xargs` | 管道转参数 | ⚠️ `find -print0 \| xargs -0` |
| `sed` | 流式改文本 | `sed -i.bak 's/a/b/'` |
| `awk` | 按列处理 | `awk -F: '{print $1}'` |
| `sort` / `uniq` | 排序 / 去重 | `LC_ALL=C sort \| uniq -c \| sort -rn` |
| `cut` | 切列 | `cut -d: -f1` |
| `wc` | 计数 | `wc -l` 行数 |
| `tr` | 字符替换 | `tr 'a-z' 'A-Z'` |
| `tee` | 分流输出 | `cmd \| tee log \| wc -l` |
| `chmod` | 改权限 | `chmod 644 f` / `chmod u+x f` |
| `chown` | 改属主 | `sudo chown user:group f` |
| `du` / `df` | 目录大小 / 磁盘占用 | `du -sh *` / `df -h` |
| `tar` | 打包 | `tar -czf a.tar.gz dir/` |
| `ps` | 看进程 | `ps aux --sort=-%cpu \| head` |
| `kill` | 杀进程 | `kill -TERM PID` → 确认还在才 `kill -9` |
| `systemctl` | 服务管理 | `systemctl status nginx` |
| `journalctl` | 看日志 | `journalctl -u nginx -f` |
| `apt` | 装卸包 | `sudo apt update && sudo apt install pkg` |
| `dpkg` | 查已装包 | `dpkg -S /path`（⭐ 最有用的一条） |
| `ip` / `ss` | ⭐ 看 IP / 看端口 | `ip -br addr` / `ss -tlnp` |
| `curl` | HTTP 全能 | `curl -sS -o /dev/null -w '%{http_code}\n' URL` |
| `man` | 查手册（本手册的最后一站） | `man 5 fstab` / `man -k 关键词` |

---

## 全命令索引（226 条）

<details>
<summary>按字母展开</summary>

**A** `aa-status` `add-apt-repository` `adduser` `alias` `apropos` `apt` `apt-cache` `apt-config` `apt-get` `apt-mark` `awk`


**B** `bash` `bg` `bind` `bc` `borg` `bzip2` `bunzip2`


**C** `cat` `cd` `chage` `chgrp` `chmod` `chown` `chpasswd` `chrony` `chronyc` `chronyd` `cloud-init` `code` `column` `command` `cp` `cpio` `curl` `cut`

**D** `dash` `date` `dd` `declare` `df` `diff` `disown` `dmesg` `docker` `dpkg` `dpkg-divert` `dpkg-reconfigure` `du` `duplicity`

**E** `echo` `ed` `efibootmgr` `emacs` `env` `eval` `ex` `exec` `exit` `export` `expr`

**F** `faillock` `fdisk` `fg` `file` `find` `findmnt` `finger` `flatpak` `free` `fuser`

**G** `gcc` `gedit` `getcap` `getent` `getfacl` `getopts` `gpasswd` `gpg` `grep` `groupadd` `groupdel` `groupmod` `gunzip` `gzip`

**H** `hash` `head` `hostname` `hostnamectl` `htop` `hwclock`

**I** `iconv` `id` `install` `ip`

**J** `jobs` `journalctl` `jq`

**K** `kill`

**L** `ldd` `less` `ln` `local` `locale` `locale-gen` `locate` `ls` `lsblk` `lsof` `lvs`

**M** `man` `mkdir` `mktemp` `mount` `mtr` `mv`

**N** `nano` `newgrp` `nft` `nginx` `nl` `nohup`

**O** `od` `openssl`

**P** `pam_faillock` `parted` `passwd` `paste` `pax` `pgrep` `ping` `pkill` `podman` `printenv` `printf` `ps` `pvs` `pwconv` `pwd`

**R** `read` `readlink` `readonly` `realpath` `reboot` `restic` `return` `rg` `rm` `rmdir` `rsnapshot` `rsync`

**S** `sed` `select-editor` `seq` `service` `set` `setcap` `setsid` `sh` `sha256sum` `shellcheck` `shift` `shred` `shutdown` `sleep` `snap` `sort` `ss` `ssh` `ssh-add` `ssh-copy-id` `ssh-keygen` `sshd` `stat` `stty` `su` `sudo` `sudoedit` `swapoff` `swapon` `sysctl` `systemctl` `systemd-detect-virt`

**T** `tail` `tar` `tee` `test` `timedatectl` `timeout` `tmux` `top` `touch` `tr` `traceroute` `trap` `trash-put` `tree` `tty` `type`

**U** `ulimit` `umask` `umount` `unalias` `uname` `uniq` `unset` `unxz` `unzip` `update-alternatives` `update-rc.d` `updatedb` `uptime` `useradd` `userdel` `usermod`

**V** `vgs` `vi` `view` `vim` `vimdiff` `vimtutor` `visudo` `vmstat`

**W** `wait` `watch` `wc` `wget` `whatis` `whereis` `which` `who` `whoami`

**X** `xargs` `xclip` `xxd` `xz`

**Y** `yes`

**Z** `zip` `zsh` `zstd`

</details>

### 各文件命令数

| 文件 | 命令数 | 文件 | 命令数 |
|---|---|---|---|
| 01-文件与目录 | 23 | 06-软件包管理 | 14 |
| 02-文本查看与处理 | 22 | 07-系统进程与日志 | 33 |
| 03-检索与替换 | 8 | 08-磁盘网络与时间 | 32 |
| 04-压缩备份与同步 | 20 | 09-Shell与脚本基础 | 50 |
| 05-权限用户与组 | 31 | 10-文本编辑器 | 15 |

> 合计 234 > 226，因为 `lsof`、`ss`、`kill`、`seq`、`getent`、`umask`、`readlink`、
> `update-alternatives`、`diff`、`gunzip`、`less`、`zsh`/`sh`/`dash` 等在多个文件出现。

---

## 关于准确性

本手册刻意**不写死版本号**。凡是随版本变化的内容——服务名、默认配置、包归属、
unit 文件名、内核版本串、源优先级数字——正文里都写成占位符（`<版本号>`、`6.8.0-<N>-generic`）
并标注「以你的机器输出为准」。

几条已核实的 24.04 事实：

- **OpenSSH 的服务名是 `ssh`，不是 `sshd`。** 用 `systemctl reload ssh`；
  写 `sshd.service` 会报 `Unit sshd.service not found`。
- **Ubuntu 22.10 起 sshd 用 socket 激活**（`ssh.socket` + `ssh.service`）。
  改完 `sshd_config` 里的 `Port` / `ListenAddress` 后要 `daemon-reload` + `restart ssh.socket`。
- **Ubuntu 24.04 默认源格式是 deb822**（`/etc/apt/sources.list.d/*.sources`），
  不是一行一个的老 `.list` 格式。
- **`apt-key` 已废弃**，新做法是每个源一个 keyring 文件 + 源的 `Signed-By`。
- **`/etc/debian_version` 在 24.04 上是 `trixie/sid`**（Ubuntu 的上游代号就是 sid）。
- **最小安装里 `vi` 可能指向 `vim.tiny`**，功能少、没有语法高亮。要用就用 `vim`。
- **`iptables` 是 nftables 的兼容层**（`iptables-nft`），新配置直接写 nftables。
- **改配置前先验证语法**：`nginx -t`、`sshd -t`、`visudo -cf`、`nft -c -f`。

**手册查不到就上 `man`**（见 [02-文本查看与处理.md](02-文本查看与处理.md) 末尾），
上游文档是最终仲裁，本手册不替代它。