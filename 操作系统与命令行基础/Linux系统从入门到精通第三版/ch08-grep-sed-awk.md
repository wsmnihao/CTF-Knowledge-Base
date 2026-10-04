# 第 8 章 grep / sed / awk 三剑客

> **本章目标**：读完后你能——
> 1. 在十秒内判断一个文本处理需求该交给 grep、sed 还是 awk，并说出判断依据
> 2. 写出带上下文（`-A/-B/-C`）、带包含控制（`--include`）的递归 grep，并解释它为什么慢
> 3. 用 sed 完成替换、删除、按行号或按模式定位的批量改写，并说清 `-i` 的风险和备份后缀的用法
> 4. 用 awk 按字段切分并做分组统计（`count[$1]++`），解释 `print` 与 `printf` 的差别
> 5. 正确判断 `grep` 的三个退出码，并写出一个不会因为「没匹配到」而误报失败的脚本
> 6. 把三者串成「grep 筛选 → sed 变形 → awk 聚合」的流水线
>
> **前置知识**：第 7 章《文本流：管道与重定向》
>
> **预计耗时**：90 分钟

服务器上每天产生几个 GB 的日志。你要回答的问题通常长这样：**哪个 IP 在反复撞 SSH？哪个用户在滥用 sudo？昨天有多少次登录失败？**

这些问题不需要写程序。用三个命令就能解决——它们叫**三剑客**：

| 工具 | 一句话定位 | 输入单位 |
|---|---|---|
| **grep** | **筛选**符合条件的行 | 行 |
| **sed** | **逐行改写**文本 | 行 |
| **awk** | **按字段处理**并**聚合统计** | 字段 |

本章的核心不是背选项，而是学会**判断该用哪个**。选择标准只有一条：

> **只是挑行 → grep。只是在行内替换/删除文字 → sed。需要拆列、算总数、分组 → awk。**

---

## 8.1 grep：筛出你要的行

### 基础与最常用的选项

```bash
$ grep "error" 日志.txt
$ grep -i "error" 日志.txt           # -i 忽略大小写
$ grep -v "debug" 日志.txt           # -v 反选：只留**不含** debug 的行
$ grep -c "error" 日志.txt          # -c 输出**行数**
$ grep -n "error" 日志.txt          # -n 带行号
$ grep -o "错误码=[0-9]*" 日志.txt  # -o 只输出匹配部分，不输出整行
$ grep -q "error" 日志.txt          # -q 静默，只看退出码（脚本用）
```

### ⚠️ `-c` 数的是行数，不是匹配次数

这是 grep 最容易被误读的行为：

```bash
$ printf 'a a a\nb a\n' > /tmp/demo.txt
$ grep -c a /tmp/demo.txt
```

```console
2
```

```bash
$ grep -o a /tmp/demo.txt | wc -l
```

```console
4
```

**`-c` 输出 2，`-o | wc -l` 输出 4。** 因为 `-c` 统计的是「有多少行至少含一个匹配」。要数出现次数必须用 `grep -o ... | wc -l`。

### `-w` 整词与 `-x` 整行

```bash
$ printf 'error\nerrors\nerror_code\n' > /tmp/w.txt
$ grep "error" /tmp/w.txt
```

```console
error
errors
error_code
```

```bash
$ grep -w "error" /tmp/w.txt
```

```console
error
```

`-w` 要求匹配两侧是**非单词字符**（字母、数字、下划线之外）。它等价于正则的 `\b`，但更简单。

`-x` 更严格：要求**整行**完全等于该模式，没有额外字符。

### 递归搜索与包含控制

```bash
# -r 递归搜索目录
$ grep -rn "TIMEOUT" /etc/

# --include 只搜特定类型的文件
$ grep -rn --include="*.conf" "TIMEOUT" /etc/

# 排除某些文件
$ grep -rn --include="*.py" --exclude-dir="venv" "import" .
```

**`-r` 和 `-R` 的区别**：`-r` **不跟随**符号链接进入目录，`-R` **跟随**。搜一个含大量软链的系统目录时，`-R` 可能绕成环。

### 上下文：`-A` / `-B` / `-C`

```bash
$ grep -n -A2 "ERROR" /var/log/syslog
```

```console
12:Sep 12 11:20:03 ubuntu sshd[1234]: ERROR: 认证失败
13-Sep 12 11:20:03 ubuntu sshd[1234]: 尝试用户 admin
14-Sep 12 11:20:03 ubuntu sshd[1234]: 连接来自 203.0.113.45
```

`-A2` 是匹配行**之后** 2 行，`-B2` 是之前，`-C2` 是前后各 2 行。**排查故障时 `-C` 是最常用的**——它能让你不用 `head`/`tail` 反复试位置。

### `-E`：扩展正则

不加 `-E`（或 `-P`）时 grep 用的是**基本正则（BRE）**，语法更严格：

```bash
# BRE：+ ? { } | 都要转义
$ grep "^user[0-9]\+@example" 文件

# ERE：不用转义，可读性好很多
$ grep -E "^user[0-9]+@example" 文件
```

| 元字符 | 含义 |
|---|---|
| `.` | 任意一个字符 |
| `*` | 前一个重复 0 次或多次 |
| `[abc]` `[a-z]` `[^a-z]` | 字符集合 / 范围 / 取反 |
| `^` `$` | 行首 / 行尾 |
| `\+` `?` `\|` | BRE 里需要转义的量词和或 |
| `()` `(a\|b)` | BRE 里的分组和或 |

**建议：默认就用 `-E`。** BRE 的转义规则只会浪费你的时间。第 22 章会完整讲三种正则方言。

固定字符串用 `-F`（等价于 `fgrep`），**它不做正则解释，因此更快，也不怕你的模式里有 `*` `.`**：

```bash
$ grep -F "config.get(" 文件      # 括号和点不会被当正则
```

### ⚠️ 退出码：脚本里最容易忽略的坑

grep 的三个退出码有明确语义：

| 退出码 | 含义 |
|---|---|
| **0** | 找到了匹配 |
| **1** | **没有匹配**（这不是错误！） |
| **2** | 真正的错误（文件不存在、权限不足、正则语法错） |

问题来了。脚本里这样写：

```bash
if grep "磁盘已满" /var/log/syslog; then
    告警 "发现磁盘告警"
fi
```

`grep` 返回 1 时 `if` 判定为假，**不告警——这是对的**。但很多人会写成：

```bash
grep "磁盘已满" /var/log/syslog && 发告警
```

这在**没有告警时**返回 1，如果这段在一个开了 `set -e` 的脚本里且不是最后一条命令，**整个脚本会在这里退出**。第 21 章会正式讲 `set -e` 与命令链的交互，但现在就要建立习惯：

```bash
$ grep -c "ERROR" /var/log/syslog || true
$ grep -q "ERROR" /var/log/syslog || echo "没有发现错误"
```

**区分「没找到」和「出错了」的正确写法：**

```bash
$ if grep -q "ERROR" 日志; then
      echo "有错误"
  else
      rc=$?
      if [ "$rc" -eq 1 ]; then echo "干净"; else echo "grep 本身出错了"; fi
  fi
```

脚本里如果只关心「有没有」，加 `-q` 并**把 1 当成正常分支**处理掉。

---

## 8.2 为什么 `grep -r` 慢，以及 rg 是什么

`grep -r pattern /大目录` 慢，原因有三个，都是结构性的：

1. **单线程**。grep 一次只搜一个文件，而现代机器有 8 到 64 个核。
2. **每个文件都要 `stat()`**。判断"这是文件还是目录""要不要跳过"需要系统调用，几十万个文件就是几十万个系统调用。
3. **不跳过无用文件**。`.git` 目录里的对象库、`node_modules`、二进制文件全都会被打开、读、判断，**然后大部分被判定为"不匹配"**。

### ripgrep（rg）

```bash
$ apt install ripgrep
$ rg "TIMEOUT" /etc/          # 默认就是递归，不用 -r
$ rg -i "timeout"             # 默认遵守 .gitignore
$ rg -g "*.conf" "TIMEOUT"    # -g 相当于 --include
$ rg -g "!.git" -g "!venv"    # -g 支持 ! 取反
$ rg -A2 "ERROR"              # 上下文选项和 grep 一样
$ rg -c "ERROR"               # 统计（rg 的 -c 也是数行）
```

**rg 的四个实质改进**：

- **多核并行**，这是速度差距的主要来源
- **默认遵守 `.gitignore`**，自动跳过构建产物和依赖目录——这往往比并行带来的收益还大
- **自动跳过二进制文件**
- **默认输出彩色高亮**（管道里会自动关闭）

**选择规则**：

- **交互式探索、日常搜索 → 用 `rg`**，快一个数量级，而且不用自己排除目录
- **脚本里、需要绝对可移植（目标机没装 rg）→ 用 `grep`**
- **需要严格按正则方言行为 → 两个都要测**，rg 默认用 Rust 正则引擎，语法和 GNU grep 并不完全一致（第 22 章讲）

---

## 8.3 sed：在行内改写

sed 的模型是**读一行、改一行、打印一行**（默认行为）。它的 `-n` 参数可以关掉自动打印，让它只做你要求的动作。

### 替换 `s`

```bash
# s/查找/替换/ —— 第三个标志是 g（global），不加只替换每行第一个
$ sed 's/旧/新/'       文件
$ sed 's/旧/新/g'      文件
$ sed 's/旧/新/2'      文件      # 只替换每行第二个
```

```bash
$ printf 'a-b-c\nx-y-z\n' > /tmp/s.txt
$ sed 's/-/_/' /tmp/s.txt
```

```console
a_b-c
x_y-z
```

```bash
$ sed 's/-/_/g' /tmp/s.txt
```

```console
a_b_c
x_y_z
```

**不给 `g` 只换第一个**，这是 sed 最常见的意外。

### 自定义分隔符：路径和 URL 的救星

路径里有 `/`，用 `/` 当分隔符就得转义成一团。**换个分隔符**：

```bash
$ sed 's|/usr/local|/opt|g'       文件      # 用 |
$ sed 's,/usr/local,/opt,g'       文件      # 用 ,
$ sed 's#/etc/default#/etc/myapp#g' 文件    # 用 #
```

**规则：模式里出现最多的那个字符，就换掉分隔符。**

### 替换里的三个特殊符号

```bash
# & 代表「整个匹配」——加前缀神器
$ sed 's/^/> /' /tmp/s.txt
```

```console
> a_b_c
> x_y_z
```

```bash
# \1 到 \9 是反向引用，需要 () 分组
$ sed -E 's/([0-9]{4})-([0-9]{2})-([0-9]{2})/\3\/\2\/\1/' 文件
```

```console
25/12/2024
```

```bash
# 反向引用在搜索侧用 -E（或 BRE 的 \(\)）
$ sed -E 's/[[:space:]]+/ /g' 文件        # 把连续空白压成一个空格
```

### 删除与整行操作

```bash
$ sed '/^#/d'              文件     # d 删除匹配的行（最常用）
$ sed '/^$/d'              文件     # 删除空行
$ sed '1,5d'               文件     # 删除第 1 到 5 行
$ sed '$d'                 文件     # 删除最后一行
$ sed '/DEBUG/,/INFO/d'    文件     # 删除 DEBUG 到 INFO 之间的所有行（含两端）
$ sed '3i\
这是插入到第 3 行之前的内容'  文件
```

### 常用选项

```bash
$ sed -n '/ERROR/p' 文件        # -n 关闭自动打印，只在匹配处 p
$ sed -n '10p' 文件             # 只打印第 10 行（比 head -10 | tail -1 好）
$ sed -e 's/a/b/' -e 's/c/d/'   # -e 串多个命令
$ sed 's/x/y/' 文件 | wc -l     # 统计替换了多少行
```

`-n` 和 `p` 的组合是 sed 的核心用法：**它让 sed 从「自动输出所有行」变成「按需输出」**，这样才能实现 grep 之外的筛选逻辑。

---

## 8.4 sed 寻址：范围语义的三个坑

### 四种寻址方式

| 语法 | 含义 |
|---|---|
| `5` | 第 5 行 |
| `/regex/` | 所有匹配 regex 的行 |
| `$` | 最后一行 |
| `0~3` | 第 1、4、7… 行（步长） |

```bash
$ sed -n '0~2p' /tmp/s.txt        # 打印第 1、3 行
```

### 坑一：范围是**闭区间**

```bash
$ sed -n '/BEGIN/,/END/p' 文件
```

**`BEGIN` 行和 `END` 行都会被打印。** 很多人以为是从 BEGIN 的下一行开始。**如果你想排除边界行，必须显式写：**

```bash
$ sed -n '/BEGIN/,/END/{ /BEGIN/d; /END/d; p }' 文件
```

### 坑二：找不到结束标记时，范围一直延伸到文件末尾

```bash
# 文件里有 BEGIN 但没有 END
$ sed -n '/BEGIN/,/END/p' 日志
```

**结果是从 BEGIN 一直到文件结尾的所有行都被打印**，sed 不报错。

这在日志处理里是真实的事故：某天日志被截断（磁盘满、进程被 kill），末尾缺少 `END` 标记，你以为在提取一段，实际提取了几百 MB。

### 坑三：多次匹配时范围会重复

```bash
# 日志里 BEGIN/END 出现了三段
$ sed -n '/BEGIN/,/END/p' 日志
```

sed 会**每次**遇到 `BEGIN` 就重新开始一个范围，所以三段都会被打印（这是**正确**行为）。但如果你写 `/BEGIN/,/END/d`（删除），三段都会被删掉。**重复匹配会重复执行动作**，设计脚本时必须考虑。

---

## 8.5 ⚠️ `sed -i`：本章最危险的操作

### `-i` 直接改原文件，没有回收站

```bash
$ sed -i 's/旧/新/' 配置.conf      # ⚠️ 直接覆盖原文件
```

**没有任何确认，没有备份。** 如果模式写错，你得到的是一个被破坏的文件，而且**第 5 章说过它不进回收站**。

sed 没有 `rm -i` 那种确认选项，因为它无法预览结果——所以责任完全在你。

### 正确流程：先不带 `-i` 看结果

```bash
# 1. 先看效果（输出到屏幕，什么都没改）
$ sed 's/旧/新/g' 配置.conf

# 2. 满意之后，带备份改原文件
$ sed -i.bak 's/旧/新/g' 配置.conf
$ diff 配置.conf 配置.conf.bak     # 3. 确认改了什么
$ rm 配置.conf.bak                 # 4. 确认无误再删备份
```

### `.bak` 后缀的跨平台陷阱

```bash
$ sed -i.bak 's/a/b/' 文件      # ✅ 后缀是 .bak，改之前先复制一份
$ sed -i '' 's/a/b/' 文件       # macOS/BSD 必须给 -i 一个空参数
```

**GNU sed（Ubuntu/Linux）的 `-i` 不需要参数，`-i.bak` 里的 `.bak` 才是后缀。BSD sed（macOS）的 `-i` 必须跟后缀，`-i` 后面跟的字符串会被当成后缀。**

所以 `sed -i 's/a/b/' 文件` 在 Ubuntu 上正常工作，在 macOS 上会把文件**改名成 `'s/a/b/'`**（创建一个名字很长的文件）。

**可移植写法是显式给后缀**：`sed -i.bak 's/a/b/' 文件`。在两边行为一致。

### 批量改配置文件的安全模式

```bash
# 只改匹配特定条件的行，且限定文件范围
$ find /etc/nginx -name "*.conf" -type f -exec \
      sed -i.bak 's/^\(listen \)80;/\18080;/' {} +

# 改完立刻校验语法，出错立刻回滚
$ sudo nginx -t && echo "语法 OK" || echo "有问题，检查 *.bak"
```

`find -exec {} +` 在这里是正确选择（第 5 章讲过它比 `{} \;` 快一到两个数量级），配合 `.bak` 和语法校验才构成完整的安全措施。

---

## 8.6 把 sed 脚本写进文件

命令长了就该存起来。`sed -f` 从文件读命令：

```bash
$ cat > /tmp/清理规则.sed << 'EOF'
/^[[:space:]]*#/d
/^[[:space:]]*$/d
s/[[:space:]]*$//
s/  \+/ /g
EOF

$ sed -f /tmp/清理规则.sed 原文件 > 清理后文件
```

**注意 `<< 'EOF'` 里的单引号**（第 3 章讲过）——它阻止 shell 展开 `$` 和反引号，所以 sed 的 `\1`、`\s` 会被原样保留。如果不加引号，shell 会先把它们处理掉。

这个"清理规则文件"是配置文件去噪的标准手段，效果相当于：

- 删掉所有注释行
- 删掉所有空行和纯空白行
- 删掉行尾多余空白
- 把行内连续空格压成一个

**改配置文件之前先跑这个，你能在肉眼层面看清这个文件到底配置了什么。**

---

## 8.7 awk：按字段处理并聚合

awk 是三个里最强的，也最容易被当成"awk 一行搞定一切"的黑盒。它值得学。

### 骨架：模式 { 动作 }

```bash
$ awk '模式 { 动作 }' 文件
```

| 部分 | 作用 |
|---|---|
| `BEGIN { }` | 读第一行**之前**执行一次 |
| `END { }` | 读完最后一行**之后**执行一次 |
| 模式 | 什么时候执行动作（可以是正则、表达式、条件） |
| `{ 动作 }` | 做什么 |

**模式和动作都可以省略**，两个都省就是 `awk '{print}'`（打印每一行，等于 `cat`）。

### 内置变量

| 变量 | 含义 |
|---|---|
| `$0` | 当前**整行** |
| `$1` `$2` … | 第 1、第 2 个字段 |
| `$NF` | **最后一个字段** |
| `NR` | 已读的总行数 |
| `NF` | 当前行的字段数 |
| `FS` | 输入字段分隔符（默认空白） |
| `OFS` | 输出字段分隔符（默认单个空格） |
| `RS` | 输入记录分隔符（默认换行） |
| `ORS` | 输出记录分隔符（默认换行） |

```bash
$ echo "user:x:1000:1000:用户,,/home/user:/bin/bash" | awk -F: '{print $1, $NF}'
```

```console
user /bin/bash
```

```bash
$ echo "同上" | awk -F: 'NF>1 {print "字段数:" NF}'
```

```console
字段数:7
```

### ⚠️ awk 的自动数字转换

```bash
$ echo "007 10" | awk '{print $1 + 1}'
```

```console
8
```

**awk 看到像数字的字符串会转成数字**，所以 `"007"` 变成了 `7`，前导零丢失。同理，日期 `20240101` 和数字混用时也可能出问题。

```bash
$ echo "007 10" | awk '{print $1 "\x22" $2}'
```

```console
007 10
```

**做字符串操作时用字符串拼接（`"\x22"` 之类的技巧，或直接用 `print $1, $2` 保持字符串）**，避免被隐式转换。这是 awk 最隐蔽的坑之一。

### 分组统计：`count[$1]++`

这是 awk 不可替代的核心能力。

```bash
$ awk '{count[$1]++} END {for (用户 in count) print 用户, count[用户]}' /var/log/auth.log
```

```console
user 42
admin 3
deploy 17
```

原理分三步：

1. `count[$1]` 是**以 `$1` 的值为键的数组**——awk 的数组是哈希表，`$1` 每次不同就是不同的键
2. `++` 后置自增：第一次遇到时值是 0，`++` 之后变 1；第二次遇到还是 1，变 2
3. `for (用户 in count)` 遍历所有键

**再加上排序就完整了**（awk 本身不排序，借用管道）：

```bash
$ awk '{count[$1]++} END {for (u in count) print count[u], u}' 日志 | sort -rn
```

```console
42 user
17 deploy
3 admin
```

注意 **`print count[u], u`** 里顺序是「先次数后用户」——这样 `sort -rn` 才排得对。**这是本章最值得记住的组合拳**，第 21 章写脚本时会大量用到。

### `print` 与 `printf`

```bash
$ awk '{print $1}' 文件              # print 自动加换行、自动转数字
$ awk '{printf "%s\n", $1}' 文件      # printf 不加换行、要自己写 \n
$ awk '{printf "%-20s %5d\n", $1, $2}' 文件    # 格式化对齐
```

```console
user                    1000
nginx                    33
```

**`print` 用 OFS 分隔字段并自动加 ORS；`printf` 完全按格式串输出，什么都不自动加。** 做表格对齐必须用 `printf`，否则数字列会因为字符串长度不一而歪掉。

### 其他常用动作

```bash
$ awk 'NR==1 {print "表头:" $0; next} {print}' 文件     # 跳过表头
$ awk '{sum += $2} END {print "总和:", sum}' 文件        # 求和
$ awk 'END {print NR}' 文件                             # 总行数
$ awk '{print length($0)}' 文件                          # 每行长度
$ awk 'length($0)>100' 文件                              # 超过 100 字符的行
$ awk '{print substr($0,1,50)}' 文件                     # 每行前 50 字符
$ awk 'BEGIN {OFS="\t"} {print $1,$2}' 文件              # 用 Tab 分隔输出
$ awk '{print $0 >> "输出文件"}' 文件                    # 输出到文件（>> 追加）
```

> 注意 `>>` 和 `>`：awk 里 `>` **每次运行都会截断文件**，`>>` 是追加。写成 `>` 意味着 awk 每处理一条记录就把之前的输出清掉，最后只剩一行——这是一个反复出现的 bug。

### 两文件处理的陷阱

```bash
$ awk 'NR==FNR {a[$1]; next} {print in a[$1]}' 文件1 文件2
```

`NR==FNR` 是「还在读第一个文件」的惯用判断。但它**有个陷阱**：如果第一个文件是空的，awk 永远不会读到第二个文件，`NR==FNR` 恒为真，第二段的代码永远不执行。

更稳的写法是用 `ARGIND`（gawk 特有）或 `FILENAME` 判断：

```bash
$ awk 'FILENAME==ARGV[1] {next} {print}' 文件1 文件2
```

---

## 8.8 三者如何配合

实际工作中很少只用一个工具。典型流水线：

### 案例一：找出最常见的错误类型

```bash
$ grep "ERROR" /var/log/syslog \
  | sed -E 's/.*ERROR: *//' \
  | awk '{print $1}' \
  | sort | uniq -c | sort -rn | head -5
```

```console
    142 连接超时
     87 认证失败
     23 磁盘不足
     11 DNS解析错误
      4 证书过期
```

逐段读这个链条：

1. **grep** 筛出所有含 `ERROR` 的行
2. **sed** 剥掉前面的时间戳和 `ERROR:` 前缀
3. **awk** 取第一个字段（错误类型）
4. `sort | uniq -c` 统计（第 7 章讲过）
5. `sort -rn | head` 取前五

### 案例二：从日志里提取并格式化

```bash
$ grep "sshd" /var/log/auth.log \
  | sed -E 's/^([A-Za-z]+ +[0-9]+ [0-9:]+).*Failed password for (invalid user )?(\S+).*/\3 | \1/' \
  | awk -F'|' '{printf "%-16s %s\n", $1, $2}' \
  | sort | uniq -c | sort -rn | head -10
```

```console
    45 admin           Sep 12 11:20:03
    38 root            Sep 12 09:14:55
     7 oracle          Sep 11 22:03:11
```

**这个例子体现了分工**：`sed` 做正则提取和重组（它擅长字符串手术），`awk` 做字段对齐（它擅长排版）。

### 选择决策表

| 需求 | 用 |
|---|---|
| 找出含某词的行 | `grep` |
| 找出**不含**某词的行 | `grep -v` |
| 统计含某词的行数 | `grep -c` |
| 在行内替换文字 | `sed 's///'` |
| 删除符合条件的行 | `sed '/re/d'` |
| 只打印第 N 行 | `sed -n 'Np'` |
| 改原文件（带备份） | `sed -i.bak` |
| **取第 k 个字段** | `awk '{print $k}'` |
| **求和 / 求平均** | `awk '{s+=$k} END {print s/NR}'` |
| **按字段分组计数** | `awk '{c[$k]++} END {for(i in c) print i, c[i]}'` |
| 对齐成表格 | `awk 'printf'` |
| 条件过滤 + 聚合 | `awk 'NR==FNR{a[$1];next} ...'` |

**一条好用的判断**：如果你需要 `$3` 这个字段，awk。如果你需要把 `ERROR:` 换成 `警告`，sed。如果你只是要挑行，grep。

---

## 8.9 本章小结

**三剑客的分工是按「处理粒度」划分的**：grep 处理**行**，sed 处理**行内的文字**，awk 处理**字段并能聚合**。判断标准是「我需要的是挑行、改字，还是拆列算数」。

**grep 的 `-c` 数的是行数不是匹配次数**，要数出现次数用 `grep -o | wc -l`。`-w` 是整词、`-x` 是整行、`-F` 关掉正则（更快也更安全）。`-A/-B/-C` 提供上下文，`-C` 排查故障时最常用。默认就该用 `-E`，BRE 的转义只会浪费时间。

**grep 的退出码有明确语义：0 找到、1 没找到、2 出错。** 「没找到」不是错误，但脚本里如果没处理 1，在 `set -e` 下会意外退出——这是本章最实用的知识点之一。

**`grep -r` 慢是因为单线程、每个文件都 stat、不跳过无用文件。** rg 用多核并行 + 默认遵守 `.gitignore` + 自动跳二进制，快一个数量级。交互式探索用 rg，脚本里需要可移植性用 grep。

**sed 默认只替换每行第一个匹配**，不加 `g` 是最常见的意外。**分隔符可以随便换**（`s|...|...|`、`s#...#...#`），规则是「模式里出现最多的字符就换掉」。`&` 代表整个匹配，`\1` 是反向引用。

**sed 的范围寻址是闭区间**（两端都包含）、**找不到结束标记会延伸到文件末尾**、**多次匹配会重复执行动作**。后两条在处理可能被截断的日志时是真实事故源。

**`sed -i` 直接覆盖原文件，没有回收站**（第 5 章原则）。正确流程是**先不带 `-i` 看结果，再用 `-i.bak` 改，配合语法校验**。`.bak` 后缀还有个跨平台意义：GNU sed 的 `-i` 不吃参数，BSD sed 吃，显式给后缀两边行为一致。

**sed 脚本用 `-f` 存文件**，配合 `<< 'EOF'` 单引号防止 shell 吃掉反斜杠。"去噪规则文件"（删注释、删空行、压空白）在改配置文件前跑一遍，能让你肉眼看清文件实际内容。

**awk 的核心是 `模式 { 动作 }` 和 `count[$1]++` 分组统计**，再配 `| sort -rn` 就是完整的排行分析。`$NF` 是最后字段，`NR`/`NF`/`FS`/`OFS` 是最常用的内置变量。

**awk 会把像数字的字符串自动转成数字**（`"007"` 变 `7`），做字符串操作时要小心。`print` 自动加分隔符和换行，`printf` 什么都要自己写，**做表格对齐只能用 printf**。awk 里 `>` 是截断、`>>` 是追加，写错会只剩一行。

**`NR==FNR` 判断第一个文件有陷阱**（第一个文件为空时第二段代码永不执行），改用 `FILENAME==ARGV[1]` 更稳。

**典型流水线是 grep 筛选 → sed 变形 → awk 聚合 → sort/uniq 统计**。

---

## 8.10 动手实验：写一个 sudo 提权审计脚本

> 环境：Ubuntu 24.04 LTS，Server 版亦可
> 耗时：约 30 分钟

### 目标

写一个可复用的 shell 脚本，从日志里提取所有 sudo 提权记录，按用户统计次数，并按命令统计排行。过程中会用到 grep 筛选、sed 正则提取、awk 分组聚合三者的完整配合。

### 步骤

**第 1 步：先看清日志长什么样**

不要凭想象写正则。**先看真实数据。**

```bash
$ sudo grep "sudo:" /var/log/auth.log | head -3
```

```console
Sep 12 11:20:03 ubuntu sudo: user : TTY=pts/0 ; PWD=/home/user ; USER=root ; COMMAND=/usr/bin/apt update
Sep 12 11:28:41 ubuntu sudo: user : TTY=pts/0 ; PWD=/home/user ; USER=root ; COMMAND=/usr/bin/systemctl restart nginx
Sep 12 14:02:10 ubuntu sudo: deploy : TTY=pts/1 ; PWD=/home/deploy ; USER=root ; COMMAND=/bin/bash
```

**记下三个字段的位置**：`sudo: ` 后面是**发起用户**，`COMMAND=` 后面是**实际执行的命令**。这两处是 `:` 和 `=` 分隔的，这就是后面正则的依据。

> 如果你机器上 `sudo` 活动少，可以先自己制造几条记录（`sudo -k` 会强制重新输密码，产生日志），或者直接用第 3 步造的样本文件继续。

**第 2 步：造一个可控的样本文件**

真实日志随时间变化，不利于调试。先造一份固定的：

```bash
$ cat > /tmp/sudo.log << 'EOF'
Sep 12 11:20:03 ubuntu sudo: user : TTY=pts/0 ; PWD=/home/user ; USER=root ; COMMAND=/usr/bin/apt update
Sep 12 11:28:41 ubuntu sudo: user : TTY=pts/0 ; PWD=/home/user ; USER=root ; COMMAND=/usr/bin/systemctl restart nginx
Sep 12 14:02:10 ubuntu sudo: deploy : TTY=pts/1 ; PWD=/home/deploy ; USER=root ; COMMAND=/bin/bash
Sep 12 14:05:22 ubuntu sudo: deploy : TTY=pts/1 ; PWD=/home/deploy ; USER=root ; COMMAND=/bin/bash
Sep 12 14:09:01 ubuntu sudo: deploy : TTY=pts/1 ; PWD=/home/deploy ; USER=root ; COMMAND=/bin/bash
Sep 12 15:11:44 ubuntu sudo: admin : TTY=pts/2 ; PWD=/home/admin ; USER=root ; COMMAND=/usr/bin/apt upgrade
Sep 12 15:30:00 ubuntu sudo: user : TTY=pts/0 ; PWD=/home/user ; USER=root ; COMMAND=/usr/bin/systemctl restart nginx
EOF
$ wc -l /tmp/sudo.log
```

```console
7 /tmp/sudo.log
```

**第 3 步：grep 筛选**

```bash
$ grep "sudo:" /tmp/sudo.log | wc -l
```

```console
7
```

先确认筛选没有漏也没有多。

**第 4 步：sed 提取发起用户**

```bash
$ grep "sudo:" /tmp/sudo.log | sed -E 's/.*sudo: (\S+) :.*/\1/'
```

```console
user
user
deploy
deploy
deploy
admin
user
```

**正则拆解**：

| 部分 | 含义 |
|---|---|
| `.*sudo: ` | 匹配到 `sudo: ` 为止（`.*` 贪婪但因为后面有固定串，会匹配到**最后一个** `sudo: `） |
| `(\S+)` | 捕获一个非空白串 = 用户名 |
| ` :.*` | 吃掉后面的分隔符 |

`(...)` 是分组，`\S` 是非空白字符。

**第 5 步：awk 分组统计**

```bash
$ grep "sudo:" /tmp/sudo.log | sed -E 's/.*sudo: (\S+) :.*/\1/' \
  | awk '{c[$1]++} END {for (u in c) print c[u], u}' | sort -rn
```

```console
3 deploy
3 user
1 admin
```

**注意 `print c[u], u` 的顺序是「次数 用户」**——这样 `sort -rn` 才能按数字倒序排。**如果写成 `print u, c[u]`，`sort -rn` 会按用户名排。**

**第 6 步：把「次数」和「用户名」分开输出**

```bash
$ ... | awk '{printf "%-8s %s\n", $1, $2}'
```

```console
3        deploy
3        user
1        admin
```

用 `printf` 而不是 `print` 才能对齐——这正是 8.7 节讲的差异。

**第 7 步：按命令统计（换一个提取目标）**

```bash
$ grep "sudo:" /tmp/sudo.log | sed -E 's/.*COMMAND=//' \
  | awk '{c[$1]++} END {for (cmd in c) print c[cmd], cmd}' | sort -rn
```

```console
3 /bin/bash
2 /usr/bin/systemctl
1 /usr/bin/apt
1 /usr/bin/apt
```

`sort` 只按整行排序，所以 `/usr/bin/apt update` 和 `/usr/bin/apt upgrade` 各自算一条。**这是有意的**——完整命令才是审计需要的粒度。

**第 8 步：识别危险信号**

```bash
$ grep "sudo:" /tmp/sudo.log | sed -E 's/.*sudo: (\S+) :.*COMMAND=(\S*).*/\1 \2/' \
  | awk '$2 == "/bin/bash" || $2 == "/bin/sh" || $2 == "/bin/su" {print "警告:" $1 " 执行了 " $2}'
```

```console
警告: deploy 执行了 /bin/bash
警告: deploy 执行了 /bin/bash
警告: deploy 执行了 /bin/bash
```

**`awk` 的条件动作**：`$2 == "/bin/bash"` 这样的表达式写在 `{ }` 前面就是一个「模式」，只对满足条件的行执行动作。**这就是 grep -v 加管道在 awk 里的原生表达**，不需要多条命令。

**第 9 步：写成完整脚本**

```bash
$ cat > ~/bin/sudo-audit << 'EOF'
#!/bin/bash
# 审计 sudo 提权记录：按用户和按命令统计，并标记高危操作
set -uo pipefail

LOG="${1:-/var/log/auth.log}"

if [ ! -r "$LOG" ]; then
    echo "无法读取日志文件：$LOG" >&2
    exit 1
fi

extract_users() {
    grep "sudo:" "$LOG" | sed -E 's/.*sudo: (\S+) :.*/\1/'
}

extract_commands() {
    grep "sudo:" "$LOG" | sed -E 's/.*COMMAND=//'
}

total=$(grep -c "sudo:" "$LOG" || true)
if [ "$total" -eq 0 ]; then
    echo "$LOG 中没有 sudo 记录"
    exit 0
fi

echo "=== sudo 提权记录共 $total 条 ==="
echo
echo "--- 按用户统计 ---"
extract_users | awk '{c[$1]++} END {for (u in c) print c[u], u}' | sort -rn

echo
echo "--- 按命令统计（前 10）---"
extract_commands | awk '{c[$1]++} END {for (k in c) print c[k], k}' | sort -rn | head -10

echo
echo "--- 高危操作（拿到 shell）---"
extract_users | paste - <(extract_commands) \
    | awk '$2 ~ /^\/(bin|usr\/bin)\/(ba)?sh$/ || $2 == "/bin/su" {print "  " $1 " -> " $2}'
EOF
$ chmod +x ~/bin/sudo-audit
```

**几个要点**：

- `set -uo pipefail` 但**故意不加 `-e`**——因为 `grep -c` 在没有匹配时返回 1，加了 `-e` 脚本会提前退出（这正是 8.1 节讲的退出码问题）
- `grep -c ... || true` 显式处理"没找到"
- `extract_users | paste - <(extract_commands)` 用 `paste`（第 7 章）把两个流按行对齐，从而同时拿到用户和命令。**这是把两个 grep 结果关联起来的技巧**
- `<< 'EOF'` 保证 `$1`、`${...}` 不被 shell 提前展开

**第 10 步：运行并验证**

```bash
$ ~/bin/sudo-audit /tmp/sudo.log
```

```console
=== sudo 提权记录共 7 条 ===

--- 按用户统计 ---
3 deploy
3 user
1 admin

--- 按命令统计（前 10）---
3 /bin/bash
2 /usr/bin/systemctl
1 /usr/bin/apt
1 /usr/bin/apt

--- 高危操作（拿到 shell）---
  deploy -> /bin/bash
  deploy -> /bin/bash
  deploy -> /bin/bash
```

再对真实日志验证一次：

```bash
$ ~/bin/sudo-audit
```

### 验证

```bash
# 1. 统计结果必须和原始行数一致（这是审计脚本的核心不变式）
$ echo "原始行数: $(grep -c 'sudo:' /tmp/sudo.log)"
$ echo "用户总数: $(~/bin/sudo-audit /tmp/sudo.log | awk '/按用户统计/{f=1;next} /^$/{f=0} f{s+=$1} END{print s}')"

# 2. 脚本在空日志上不能报错也不能输出假数据
$ : > /tmp/empty.log && ~/bin/sudo-audit /tmp/empty.log

# 3. 不存在的文件要干净退出
$ ~/bin/sudo-audit /tmp/nonexistent.log; echo "退出码=$?"

# 4. 通过 ShellCheck（如果装了）
$ shellcheck ~/bin/sudo-audit
```

```console
原始行数: 7
用户总数: 7
/tmp/empty.log 中没有 sudo 记录
无法读取日志文件：/tmp/nonexistent.log
退出码=1
```

**第一个验证是关键**：用户统计的总数必须等于原始记录数。**如果不等，说明 grep 或 sed 漏了记录，审计结果就是不可信的。** 这个"总数不变式"是所有审计脚本都应该有的一条断言。

### 思考

1. 第 4 步的正则里 `.*` 是贪婪匹配。如果一行里出现两次 `sudo: `（比如用户输入里含这串），`\S+` 会捕获到哪一个？怎样改才能保证捕获第一个？
2. 第 5 步为什么必须写 `print c[u], u` 而不是 `print u, c[u]`？如果改成后者，`sort -rn` 会输出什么？
3. 第 9 步的脚本为什么用 `set -uo pipefail` 但不加 `-e`？如果加了 `-e`，会在哪一行、以什么方式退出？
4. `extract_users | paste - <(extract_commands)` 这个写法有隐患：如果两次 grep 的结果行数不一致（比如中间某个命令出错），`paste` 会怎么补齐？这种情况可能发生吗？
5. 脚本只在日志里找 `sudo:`。真实的提权行为还有哪几种不会产生这种日志？（提示：想想 `su`、直接登录 root、setuid 程序）
6. 如果日志轮转导致 `/var/log/auth.log` 里只有今天的记录，脚本会给出什么误导性的结论？要让它更可靠，需要什么额外信息？

### 清理

```bash
$ rm -f ~/bin/sudo-audit /tmp/sudo.log /tmp/empty.log
```

> ⚠️ 本实验全程只读取 `/var/log/auth.log`，**没有修改任何系统配置，也没有创建任何 sudo 规则**（ch06 实验已撤销）。清理只需要删掉自己造的文件。

---

## 8.11 自测题

### 一、简答

1. grep、sed、awk 的处理粒度分别是什么？你判断一个需求该用哪个的标准是什么？
2. `grep -c` 和 `grep -o | wc -l` 在一个"每行有两个匹配"的文件上分别输出什么？为什么？
3. 什么是 grep 的"没找到"退出码？为什么它在 `set -e` 的脚本里是个陷阱？正确处理方式是什么？
4. `grep -r` 慢的三个结构性原因是什么？ripgrep 用哪一项改进带来了最大的实际收益？
5. sed 不加 `g` 标志时替换行为是什么？为什么这是个高频意外？
6. sed 的分隔符能换成什么字符？选择替换分隔符的规则是什么？
7. sed 的范围寻址 `/start/,/end/d` 有哪三个容易出错的语义？如果日志被截断（缺少 end 标记），会发生什么？
8. 为什么 `sed -i` 必须配备份后缀？`.bak` 后缀在 GNU sed 和 BSD sed 上分别起什么作用？
9. awk 的 `count[$1]++` 是什么原理？为什么 awk 能做 grep 和 sed 都做不到的事？
10. awk 里的 `>` 和 `>>` 有什么区别？写错会有什么现象？
11. `print` 和 `printf` 在分隔符、换行、数字转换三方面各有什么差别？什么时候必须用 `printf`？
12. `NR==FNR` 这个惯用写法在什么情况下会失效？更可靠的替代是什么？

### 二、命令填空

1. 在文件里统计**行数**中含 "error" 的行：________
2. 统计 "error" 一共**出现了多少次**：________
3. 递归搜索但只限于 `.log` 文件、排除 `node_modules`：________
4. 显示匹配行及其后 3 行：________
5. 用固定字符串匹配（不解释正则里的 `.`）：________
6. 只输出匹配到的部分而不是整行：________
7. 在行首加上 `> ` 前缀：________
8. 把 `/usr/local` 全局替换成 `/opt`，且不与分隔符冲突：________
9. 删除所有以 `#` 开头的行：________
10. 在**原文件**上做替换，并保留一份 `.bak`：________
11. 打印当前行最后一个字段：________
12. 按第一个字段分组统计并按次数倒序：________
13. 把第一列右对齐到 10 字符宽度：________
14. 用表达式做条件，只输出第二列等于 `/bin/bash` 的行的第一列：________

### 三、故障分析

**案例 1**

> 现象：一个监控脚本这样判断服务是否异常：
> ```bash
> #!/bin/bash
> set -e
> if ! systemctl is-active nginx | grep -q "active"; then
>     发告警 "nginx 状态异常"
> fi
> ```
> 现象是 nginx **明明正常**，监控却偶尔发出告警，而且脚本在告警前就退出了。
> 1. `grep -q` 在两种情况下返回什么？这两种情况分别对应这里发生了什么？
> 2. `set -e` 在这里扮演了什么角色？（提示：注意管道的位置）
> 3. 改写成可靠版本，并保持「nginx 挂了要告警、nginx 正常要静默」的语义。

**案例 2**

> 现象：想批量修改 Nginx 配置里的端口：
> ```bash
> $ sed -i 's/listen 80;/listen 8080;/' /etc/nginx/sites-available/*
> ```
> 结果是所有文件内容没变，但 `/etc/nginx/sites-available/` 下多出了几个名字很长的奇怪文件，且原来的配置一个都没改。
> 1. `s/listen 80;/listen 8080;/` 这个模式有什么语法问题？为什么没报错但也没生效？
> 2. 多出来的那些"奇怪文件"是什么？怎么确认？
> 3. 写出正确的命令，并说明为什么必须加备份后缀。

**案例 3**

> 现象：一段提取日志段落的 sed 脚本产出了几百 MB 输出，而预期只有 20 行：
> ```bash
> $ sed -n '/START-SECTION/,/END-SECTION/p' /var/log/app.log
> ```
> 1. 用 sed 的范围语义解释这个现象。
> 2. 怎么确认日志里是否真的缺少 `END-SECTION`？
> 3. 写出两个改进：一个是防止这个现象，一个是保证即使截断也不产出错误结果。

**案例 4**

> 现象：一个统计脚本输出的人数总是比预期少 3 个左右，而且**每次运行结果都不一样**。
> ```bash
> $ grep "登录成功" /var/log/app.log | sed -E 's/.*用户 (\S+) 登录.*/\1/' \
>   | awk '{c[$1]++} END {for (u in c) print c[u], u}' | sort -rn
> ```
> 1. 提示：`awk` 的 `for...in` 遍历顺序是不确定的。问题出在哪一步？
> 2. 怎么改成稳定输出？
> 3. 还有一个疑点：为什么人数会「少 3 个左右」而不是固定少？如果是 grep 的问题，退出码是多少？

**案例 5**

> 现象：用 awk 处理一批日志时发现 `007` 变成了 `7`，日期 `20240101` 和别的字段拼接后顺序也乱了。
> 1. 这两个现象的共同原因是什么？awk 在什么情况下会做这件事？
> 2. 给出三种规避写法。
> 3. 什么时候你反而**希望** awk 做这个转换？（提示：求和场景）

### 四、综合实践

1. 写一个脚本 `~/bin/access-audit`，分析 Nginx 访问日志，要求：
   - 用法：`access-audit 日志文件 [TopN]`，N 默认 10；文件不存在或不可读时报错退出
   - 统计并按降序输出：TopN IP、TopN 访问路径、TopN 状态码、TopN User-Agent
   - 单独统计并输出：4xx 和 5xx 的请求各自占比
   - 识别并单独列出可疑访问：`/wp-admin`、`/.env`、`/../`、`SELECT ` / `UNION `（SQL 注入探测特征）
   - 识别「单个 IP 在短时间内大量 401/403」这一爆破特征并告警
   - 所有排序输出必须**稳定可复现**（次数相同时按名称排）
   - 用 `set -uo pipefail` 写，且通过 ShellCheck 检查
   - **额外要求**：输出里必须包含一行「总请求数」和一行「本次分析的日志行数」，且两者必须能对上；并要求脚本在处理超大文件（几个 GB）时不要把整个文件读进内存——用管道处理而不是 `$(cat 文件)`

2. 你要写一份《文本处理规范》，必须包含：
   - **工具选择规范**：给出一张决策表，说明什么场景必须用 grep、什么场景必须用 sed、什么场景必须用 awk，以及三条判断口诀
   - **正则规范**：默认用 `-E` 还是 BRE（说明理由）、什么情况下用 `-F`、什么情况下用 `-P`，以及正则可读性差的应对办法
   - **sed 安全规范**：什么时候可以用 `-i`、备份后缀为什么强制、批量改配置文件的三个必要步骤（预演、备份、校验）
   - **退出码规范**：grep 的三个退出码在脚本里分别该怎么处理，为什么默认要加 `-q`，`set -e` 和 grep 的交互陷阱
   - **awk 规范**：什么时候用 `print`、什么时候必须用 `printf`、`>` 与 `>>` 的区别、`NR==FNR` 陷阱的规避方式
   - **可审计性要求**：日志分析脚本必须包含哪三条不变式校验（提示：至少包括"处理总数 == 输入总数"）
   - 一份"新人最容易写出错的三类 sed/awk 脚本"清单，每类写清现象、根因、正确写法
   - 至少两条"我们团队不这么写，因为……"的团队特有规定，并说明理由

---

**下一章预告**：第 9 章《vi / vim》——服务器上明明有 nano 为什么还要学 vi、`i` 和 `a` 和 `o` 到底差在哪、`:q!` 和 `:wq` 丢数据的方式完全不同，以及一个 `q` 宏加上 `@` 能把改 100 行文件的时间从十分钟压到三秒。

---

*本章完。*