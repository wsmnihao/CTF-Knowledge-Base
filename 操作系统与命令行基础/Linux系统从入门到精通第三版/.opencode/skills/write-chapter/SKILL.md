---
name: write-chapter
description: Use when writing or continuing the 原创中文教材《Linux 系统从入门到精通》(K:\CTF-Knowledge-Base\操作系统与命令行基础\Linux系统从入门到精通第三版) — 写第N章、继续写书、下一章、章节正文、动手实验、自测题、book chapter writing. Loads PLAN.md for the chapter outline, STYLE.md for format, BANNED.md for outdated-tech constraints, and enforces the 24-chapter / 5-part structure on Ubuntu 24.04 LTS.
---

# 写章节工作流

本书路径（绝对路径，所有工具调用都用它）：

```
K:\CTF-Knowledge-Base\操作系统与命令行基础\Linux系统从入门到精通第三版\
```

## 0. 每次开工先读三份文件

按顺序，**不要跳过**：

1. `PLAN.md` — 目标章的大纲、必讲点、实验方向、依赖章
2. `STYLE.md` — 章节骨架、语气、代码格式、实验与自测题模板、文件名表
3. `BANNED.md` — 禁用清单与替代方案

本文件（SKILL.md）里的规则优先级最高，与 PLAN/STYLE 冲突时以本文件为准。

## 1. 硬规则（不可协商）

1. **基线是 Ubuntu 24.04 LTS**，内核 6.x，systemd，apt/dpkg，AppArmor，nftables。
   **绝不**把 Kali 当演示环境。Kali 只在第 20、24 章作为渗透工具来源一句话提及。
2. **不写任何过时技术**。命中 `BANNED.md` 第一节的项一律不写；第二节的项只能一句话带过并指向替代。
3. **原创**。禁止逐字转录或近似改写任何已出版教材。原书与教学 PPT 只作结构参考，不作内容来源。读起来像从某本书复制的句子，一律重写。
4. **内容写全，不给大纲、不给省略号占位**。宁可拆两次交付，也不写「此处略」。
5. **命令必须真能跑**。写之前对照 `BANNED.md` 第六节核查事实，不要编版本号。
6. **实验必须可自证**：给出预期输出 + 验证命令 + 清理步骤 + 思考题。
7. **自测题正文不给答案**，答案统一放附录 C。
8. **危险命令**（删除、覆盖、重启、改网络）首次出现加 ⚠️ 并说明后果。
9. **不要重复问已定的事**：发行版、结构、篇目、风格、字数、路径都已确定，直接做。

## 2. 写一章的完整步骤

### Step 1 — 定位

读 PLAN.md 里目标章的条目，确认：篇幅、前置章、核心小节、必须讲到、实验方向。

如果 PLAN 里这一章不存在（用户要写计划外的章节），**先补 PLAN.md 条目再写正文**。

### Step 2 — 检查前置章已存在

```powershell
Get-ChildItem -LiteralPath "K:\CTF-Knowledge-Base\操作系统与命令行基础\Linux系统从入门到精通第三版" -Filter "ch*.md" | Select-Object -ExpandProperty Name
```

前置章文件不存在时，在正文里**不要**引用它尚未定稿的内容做详细铺垫；改为在本章内用两三句话给出够用的最小说明，并保持原计划的前置章不变。

### Step 3 — 写正文

按 `STYLE.md` 第三节的固定骨架，从章节头写到 `## N.x 本章小结`。

写作时对照 `STYLE.md` 第十一节的自检清单逐条落实，不要写完再回头大改。

### Step 4 — 写实验

按 `STYLE.md` 第六节格式。六个部分缺一不可：目标 / 步骤 / 验证 / 思考 / 清理。

实验必须在干净 Ubuntu 24.04 LTS 上成立。不依赖外部靶场、不需要付费、不需要申请。

### Step 5 — 写自测题

按 `STYLE.md` 第七节格式，四类配比：简答 5–8、填空 3–5、故障分析 3–5、综合 1–2。

### Step 6 — 更新两处进度

**`README.md`** — 把该章状态从「未开始」改为「✅ 已完成」（或「🔄 写作中」），并在下方加一行字数统计。

**`AGENTS.md`** — 更新「当前进度」小节：`最后完成：第 N 章`、`已完成：N/24`、`下一篇：第 N+1 章`。

### Step 7 — 汇报

输出一段简短汇报：本章文件路径、篇幅、各部分是否齐全、遗留项（如果有）。

不要在汇报里粘贴整章内容，文件已经落盘了。

## 3. 篇幅与拆分

| 章类型 | 篇幅 | 交付 |
|---|---|---|
| 概念/命令/原理章 | 6000–8000 字 | 一次写完 |
| 综合章 | 8000–12000 字 | 视情况拆两段 |
| 代码密集章（8/14/15/18/20/21/24） | 10000 字+ | **必须拆两段** |

拆两段时：第一段写章节头到 `## N.x 本章小结`，文件末尾留
`<!-- TODO: 动手实验与自测题 -->`，汇报时明确说这是第一段。
第二段补完实验与自测题，删掉该 TODO。

## 4. 文件命名

严格按 `STYLE.md` 第十节的表：

```
ch01-linux-is-what.md          ch13-disks-and-filesystems.md
ch02-install-ubuntu.md         ch14-lvm-and-backup.md
ch03-terminal-and-shell.md     ch15-systemd-and-troubleshoot.md
ch04-filesystem-and-dirs.md    ch16-networking-and-tcpdump.md
ch05-file-ops-and-archive.md   ch17-ssh.md
ch06-permissions-and-sudo.md   ch18-dns-and-nginx.md
ch07-streams-pipes-redirect.md ch19-database-and-cache.md
ch08-grep-sed-awk.md           ch20-docker.md
ch09-vim.md                    ch21-bash-scripting.md
ch10-apt-and-dpkg.md           ch22-regex.md
ch11-users-and-groups.md       ch23-c-gcc-gdb.md
ch12-processes-and-jobs.md     ch24-git-perf-security.md
```

交叉引用必须用相对路径链接到真实存在的文件名。

## 5. 参考资料

`K:\Linux从入门到精通（第3版）\` 与 `K:\Linux从入门到精通（第3版）\教学PPT\`

**仅用于确认主题覆盖顺序与章节划分。禁止复制其中的正文、例句、实验步骤。**

需要查某个命令的准确语法时，优先查本机 `man` 页：

```powershell
bash -lc "man <cmd> | head -50"
```