# 09 · Shell 与脚本基础

---

# 第一部分 · Shell 本身

## bash / sh / dash / zsh — 用哪个

```bash
bash [选项] [脚本] [参数]
sh [选项] [脚本]
zsh [选项] [脚本]
```

| 选项 | 作用 |
|---|---|
| `-c 字符串` | **执行一段命令字符串** |
| `-s` | 从标准输入读命令 |
| `-x` | **打印每条执行过的命令（排错神器）** |
| `-n` | **只读不执行，检查语法** |
| `-v` | 打印读到的输入行 |
| `-e` | 命令失败就退出（也可以在脚本里 `set -e`） |
| `-u` | 引用未定义变量报错 |
| `-i` | 交互模式 |
| `-l` | 登录 shell（读 `/etc/profile`） |
| `--version` | 版本 |
| `--posix` | 严格 POSIX 模式 |

| Shell | 说明 |
|---|---|
| `bash` | **Ubuntu 24.04 默认**，GNU 扩展多 |
| `sh` | **Ubuntu 上是 `dash` 的软链接**，只支持 POSIX |
| `zsh` | 功能强，配置复杂 |
| `fish` | 语法完全不同，不兼容 POSIX |

```bash
$ bash --version | head -1
$ ls -l /bin/sh                    # sh -> dash
$ echo $0                          # 当前 shell 名

$ bash -c 'echo hi'
$ bash -n script.sh                # ⭐ 语法检查，不执行
$ bash -x script.sh                # ⭐ 打印执行过程
$ bash script.sh arg1 arg2         # 传参数

$ sh -c 'echo $0'                  # dash 下行为可能和 bash 不同
```

⚠️ **`#!/bin/sh` 的脚本不能用 bash 语法**（数组、`[[ ]]`、`source`、进程替换）。`sh` 在 Ubuntu 上是 dash，比 bash 更严格。**写脚本用 `#!/usr/bin/env bash`。**

⚠️ **`bash -n` 只查语法，查不出逻辑错误**。`if [ $x == 1 ]` 在 `x` 为空时会报语法错，`if [ $x -eq 1 ]` 能过语法但逻辑上不健壮。**逻辑问题靠 `set -u` 和 shellcheck。**

⚠️ **交互式 bash 里的 `-e` 行为不可靠**（很多命令返回非 0 是正常的）。**`set -e` 只在脚本里用。**

⚠️ **`bash -x` 的输出含所有变量值**，里面可能有密码。发日志给别人前先脱敏。

---

## 引号与展开 — Shell 的核心

```bash
'单引号'     # 原样，不做任何展开
"双引号"     # 展开 $变量 ${变量} $(命令) $((算术))
\反斜杠       # 转义下一个字符
$?           # 上一个命令的退出码
$!           # 上一个后台命令的 PID
$$           # 当前 shell 的 PID
$!           # 最后一个后台 PID
$0           # 脚本名
$#           # 参数个数
$1 $2 ...    # 位置参数
$@ $*        # 所有参数
```

| 展开 | 写法 | 说明 |
|---|---|---|
| 变量 | `$var` / `${var}` | **`${}` 形式边界更清楚** |
| 命令替换 | `$(cmd)` / 反引号 | **`$(...)` 比反引号好**（可嵌套、可读） |
| 算术 | `$((1+2))` | 只能在整数上算 |
| 花括号 | `{a,b}` | 组合，配合 `{1..5}` 生成序列 |
| 波浪 | `~` | 当前用户家目录 |
| `~user` | `~liu` | 指定用户家目录 |

```bash
var=hello
echo "$var"          # hello
echo '$var'          # ⭐ 字面量 $var
echo \$var           # $var（转义）

echo "目录：$(pwd)"   # ⭐ 命令替换
echo `pwd`           # 同上但不推荐（不好嵌套）
echo "和是 $((3+4))"  # 和是 7

echo /etc/{a,b,c}    # /etc/a /etc/b /etc/c
echo {1..5}          # 1 2 3 4 5
echo {01..03}        # 01 02 03（补零）

echo ~               # /home/liu
echo ~liu            # /home/liu
```

⚠️ **文件名含空格或特殊字符时，变量必须加双引号**：`rm "$file"` 而不是 `rm $file`。`$file` 未加引号会被拆成多个参数，等于删了别的文件。**这是 shell 脚本第一大 bug 来源。**

⚠️ **反引号里的内容不能嵌套同样的反引号**。用 `$(...)`。

⚠️ **`$@` 和 `$*` 的区别只在加引号时体现**：`"$@"` 是「每个参数一个独立项」，`"$*"` 是「所有参数拼成一个字符串」。**遍历参数一律用 `"$@"`。**

⚠️ **`$(cmd)` 的退出码不会被检查**，命令失败时 `$()` 只是空字符串。要检查得写 `if ! out=$(cmd); then ...`。

⚠️ **反斜杠在双引号里只对 `$ ` ` " \` 和换行有转义作用**，其他情况保留字面反斜杠。

---

## 变量

```bash
name=value                 # 赋值，= 两边不能有空格
export NAME=value          # 导出给子进程
readonly VAR=value         # 不可修改
unset VAR                  # 删除变量
declare -i n=10            # 整数
declare -a arr=(a b c)     # 数组
declare -A map=([k]=v)     # 关联数组
declare -r                 # 只读
declare -p                  # 打印变量及其属性
typeset                    # declare 的同义词
local x=1                  # 函数内局部变量
```

**Bash 特殊变量**

| 变量 | 含义 |
|---|---|
| `$0` | 脚本名 |
| `$#` | 参数个数 |
| `$1`…`${10}` | 位置参数（**10 以上要加花括号**） |
| `"$@"` / `"$*"` | 所有参数 |
| `$?` | 上一条命令退出码 |
| `$$` | 当前 shell PID |
| `$!` | 最后一个后台进程 PID |
| `$BASHPID` | 当前 bash 进程 PID |
| `$RANDOM` | 0-32767 随机数 |
| `$SECONDS` | shell 运行秒数 |
| `$LINENO` | 当前行号 |
| `$IFS` | 单词分隔符 |
| `$PWD` / `$OLDPWD` | 当前/上一个目录 |
| `$?`/`$PIPESTATUS` | 退出码 / 管道每段退出码 |

```bash
# 变量
name="liu"
age=18
readonly MAX=100
echo "$name $age $MAX"

# 导出（子进程可见）
export PATH="$PATH:/opt/bin"
export EDITOR=vim

# 默认值（未设置才用）
echo "${LOGDIR:-/var/log}"
echo "${LOGDIR:=/var/log}"        # 未设置则赋值并导出

# 数组
arr=(a b c)
echo "${arr[0]}" "${arr[1]}"
echo "${arr[@]}"                  # 所有元素
echo "${#arr[@]}"                 # 元素个数
arr+=(d)                         # 追加
echo "${arr[@]:1:2}"              # 从第 1 个取 2 个
for x in "${arr[@]}"; do echo "$x"; done

# 关联数组
declare -A conf
conf[host]=localhost
conf[port]=22
echo "${conf[host]}:${conf[port]}"

# 字符串操作
s="hello world"
echo "${s#hello }"                # ⭐ 删前缀
echo "${s%world}"                # ⭐ 删后缀
echo "${s/l/L}"                   # 替换第一个
echo "${s//l/L}"                  # 替换全部
echo "${#s}"                      # 长度
echo "${s^^}"                     # 转大写
echo "${s:0:5}"                   # 取子串
```

⚠️ **`export` 出去的变量只对之后启动的子进程有效**。已经在跑的 shell 里 `export` 不会影响它。

⚠️ **`${arr[@]}` 必须加双引号**，`for x in ${arr[@]}` 在元素含空格时会拆错。**永远写 `for x in "${arr[@]}"`。**

⚠️ **`$10` 是错的，要写 `${10}`**。bash 把 `$1` 后面的 `0` 当成另一个变量。

⚠️ **数组下标从 0 开始**。`${arr[@]:1:2}` 从下标 1（第二个元素）开始取 2 个。

---

## 测试与条件

```bash
test 表达式        # 返回码 0/1
[ 表达式 ]         # test 的语法糖
[[ 表达式 ]]       # ⭐ bash 语法，支持更多操作符
```

| test 运算符 | 含义 |
|---|---|
| `-e 文件` | 存在 |
| `-f` / `-d` | 普通文件 / 目录 |
| `-L` / `-h` | 符号链接 |
| `-r` / `-w` / `-x` | 可读 / 可写 / 可执行 |
| `-s` | 存在且非空 |
| `-b` / `-c` / `-u` | 块设备 / 字符设备 / setuid |
| `-z 字符串` | 空字符串 |
| `-n 字符串` | 非空字符串 |
| `= 字符串` / `==` | 相等 |
| `!=` | 不等 |
| `-eq` / `-ne` / `-lt` / `-le` / `-gt` / `-ge` | 数值比较 |

| `[[ ]]` 额外支持 | 作用 |
|---|---|
| `=~ 正则` | **正则匹配** |
| `&&` / `\|\|` | 逻辑与/或 |
| `<` / `>` | 字符串比较（不用转义） |
| 数组 | 展开数组 |

```bash
# test / [
if [ -f /etc/passwd ]; then echo "存在"; fi
if [ "$count" -gt 10 ]; then echo "大于10"; fi
[ -z "$empty" ] && echo "是空的"

# ⭐ [[ ]] —— bash 脚本首选
if [[ -d /var/log ]]; then echo "是目录"; fi
if [[ "$str" =~ ^[0-9]+$ ]]; then echo "纯数字"; fi
if [[ "$file" == *.log ]]; then echo "日志"; fi
if [[ -n $var ]]; then echo "非空"; fi

# ⭐ [[ ]] 里不用给变量加引号（bash 4.4+ 完全安全）
if [[ $x == "a b" ]]; then echo "含空格也正确"; fi

# 算术比较
if (( count > 10 )); then echo "大于10"; fi
(( count++ ))
(( count += 5 ))

# 三元
msg=$(( age >= 18 ? 1 : 0 ))
```

⚠️ **测试命令里变量一定要加双引号**：`[ -f "$file" ]`。不加时 `file=""` 会变成 `[ -f ]`（恒真，因为 `-f` 被当字符串参数判断）。**这个 bug 在 `[ ]` 里非常常见。**

⚠️ **`[ -f $file ]` 不加引号是经典漏洞**。变量为空时判断结果完全错。**`[ ]` 里一律加引号。**

⚠️ **`[[ ]]` 里不加引号才安全**（bash 自己处理），但**为了跨 bash 版本的 habit，一致加引号也无妨**（除了右侧含通配符或正则时）。

⚠️ **测试命令不能是命令的输出**：`[ $(ls) ]` 恒真，因为 `[ ]` 收到的是多个参数。多输出时要用数组或 `[[ -d $(...) ]]`（一个参数时才安全）。

⚠️ **数值的 `==` 在 `[ ]` 里是字符串比较**，`[ 010 == 10 ]` 结果随实现不同。**数值比较用 `-eq`。**

⚠️ **`[[ $x =~ 正则 ]]` 的正则不能加引号**，加了就变成字面匹配。

---

## 逻辑与短路

```bash
cmd1 && cmd2        # cmd1 成功才执行 cmd2
cmd1 || cmd2        # cmd1 失败才执行 cmd2
! cmd               # 取反
cmd1 && cmd2 || cmd3   # 常见写法：成功走 cmd2，失败走 cmd3
```

```bash
mkdir -p /tmp/dir && cd /tmp/dir
command -v git >/dev/null && git --version
[ -f /etc/fstab ] || echo "警告：fstab 不存在"
cp a.txt b.txt || { echo "失败"; exit 1; }

# 常见技巧
[ $? -eq 0 ] || { echo "上条命令失败"; exit 1; }
```

⚠️ **`&&` 的左侧必须真的会失败**。`grep` 找不到东西返回 1，`[ ... ]` 判断假返回 1。如果左侧用了 `false`/`grep -q`，右侧会跳过——**这通常正是想要的**。

⚠️ **`||` 右侧如果写成多行不带 `{}`，只有第一条受保护**。复杂逻辑用 `{ ...; }` 或 `if`。

⚠️ **`&&` / `||` 的优先级低于管道**，混用时加括号或换行写清楚。

---

## 流程控制

```bash
if 条件; then ... elif 条件; then ... else ... fi

for 变量 in 列表; do ... done
for ((i=0; i<n; i++)); do ... done

while 条件; do ... done
until 条件; do ... done

case 值 in
    模式1) 命令 ;;
    模式2|模式3) 命令 ;;
    *) 默认 ;;
esac
```

| 关键字 | 作用 |
|---|---|
| `break` / `break N` | 跳出循环（`N` 层） |
| `continue` / `continue N` | 跳到下一次循环 |
| `shift` | 参数左移一个 |
| `exit N` | 退出脚本（返回码 N） |
| `return N` | 从函数返回 |
| `read -r -p 提示 变量` | 读输入 |
| `:` | 空命令（占位） |

```bash
#!/usr/bin/env bash
set -euo pipefail

name="${1:-}"
[ -n "$name" ] || { echo "用法: $0 <名字>" >&2; exit 1; }

case "$name" in
    root|admin) echo "管理员";;
    guest|anon) echo "访客";;
    *)          echo "普通用户: $name";;
esac

for f in *.txt; do
    echo "处理 $f"
done

for ((i = 1; i <= 5; i++)); do
    echo "$i"
done

i=0
while read -r line; do
    ((i++))
    echo "$i: $line"
done < /etc/passwd

n=5
while [ "$n" -gt 0 ]; do
    echo "$n"
    n=$((n - 1))
done
```

⚠️ **`shift` 之后 `$@` 变了**。`while [ $# -gt 0 ]; do ... shift; done` 是处理位置参数的标准写法。**忘了 shift 就是死循环。**

⚠️ **`while read` 会吃掉循环体里 `read` 的输入**。需要保留 stdin 时在循环末尾写 `done < /etc/passwd 3<&0`，或在循环体里用 `read -u 0`。

⚠️ **`read` 不加 `-r` 会吞掉反斜杠**。`read -r` 是标准写法。

⚠️ **`for ((i=0; i<10; i++))` 里 `i++` 在 `set -e` 下首次为 0 时返回 1**（算术求值结果为 0）。在 `((i++))` 前加 `:` 或用 `((i+=1))` 返回非 0 时规避。

⚠️ **管道里的循环在子 shell 里跑**，里面 `cd`、`export`、变量赋值都不影响外层。要影响外层用 `while ... done < <(...)`（进程替换）。

---

## 函数

```bash
函数名() { 命令; }        # ⭐ POSIX 写法
function 函数名 { }        # bash 扩展，不用
```

```bash
# POSIX 兼容（推荐）
log() {
    local level="$1"
    shift
    printf '[%s] %s\n' "$level" "$*"
}

log INFO "启动完成"
log ERROR "失败: $?"

# 返回码
check() {
    if ping -c1 -W1 "$1" >/dev/null 2>&1; then
        return 0
    fi
    return 1
}

# 递归
fact() {
    [ "$1" -le 1 ] && return 1
    echo $(( $1 * $(fact $(( $1 - 1 ))) ))
}
```

⚠️ **`local` 只能在函数里用**。用了 `local x` 后 `x` 只在函数内可见，函数返回就消失——**这也是防止变量污染的手段**。

⚠️ **函数必须定义在使用之前**（bash 是顺序解释的，不像函数声明可提前）。

⚠️ **`$*` 和 `$@` 在函数里同样有引号区别**。**永远写 `"$@"`。**

⚠️ **函数返回码是最后一条命令的**。想显式控制就 `return N`。

---

## 参数处理与 getopts

```bash
./script.sh -v -f file.txt --out=result.log
```

```bash
#!/usr/bin/env bash

usage() {
    cat <<EOF
用法: $(basename "$0") -v -f 文件
  -v  详细模式
  -f  输入文件
  -h  显示帮助
EOF
}

verbose=false
input=""
while getopts ":vf:h" opt; do
    case "$opt" in
        v) verbose=true ;;
        f) input="$OPTARG" ;;
        h) usage; exit 0 ;;
        :) echo "选项 -$OPTARG 需要参数" >&2; exit 1 ;;
        \?) echo "未知选项: -$OPTARG" >&2; exit 1 ;;
    esac
done
shift $((OPTIND - 1))       # ⭐ 移走选项，剩下的是位置参数

echo "verbose=$verbose input=$input"
echo "剩余参数: $*"
```

⚠️ **选项串开头的 `:` 关闭错误输出**，才能在 `case` 里自己处理 `:` 和 `\?`。不开的话 `getopts` 会自己打印错误。

⚠️ **`shift $((OPTIND - 1))` 忘了写**，`$1` 还是选项而不是位置参数。

⚠️ **选项参数用 `-f值` 还是 `-f 值`**，取决于选项串里 `f` 后面有没有冒号。有冒号（`f:`）就要空格分隔。

⚠️ **`getopts` 只处理短选项**。长选项（`--output`）bash 没有内置解析，要么用 `case "$1"` 手写，要么依赖外部工具。

---

## 严格模式 set -euo pipefail

```bash
set -e          # 命令失败（返回码非 0）就退出
set -u          # 引用未定义变量就报错
set -o pipefail # 管道中任一段失败，整条管道就算失败
set -x          # 打印每条执行过的命令
set -v          # 打印读到的输入行
set +e          # 关闭
set -E          # ERR trap 被函数里的错误也触发
```

```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'
```

| 模式 | 防什么 | 例外 |
|---|---|---|
| `-e` | 命令失败被忽略 | `if cmd;`、`cmd \|\| true`、`! cmd`、管道非末段、`while` 条件 |
| `-u` | 变量名打错变成空字符串 | `"$@"`、`$1`（要 `${1:-}`） |
| `pipefail` | 管道里中间命令失败被吞 | — |
| `x` | 不知道哪步错了 | 会打印密码，慎用 |

⚠️ **`set -e` 有很多例外**：`if`/`while` 条件、`&&`/`||` 左侧、`! cmd` 的结果都不会触发退出。**`set -e` 保证不了所有错误都被抓到**，关键步骤还是要显式判断。

⚠️ **`set -u` 会让 `"$@"` 在旧 bash（<4.4）上报错**。Ubuntu 24.04 的 bash 5.2 没这个问题。

⚠️ **`set -e` 在 `if cmd; then` 里完全失效**。想在里面判断成败用 `if ! cmd; then`，别指望它自动退出。

⚠️ **`pipefail` 改变管道语义**：`false | true` 默认返回 0（只看最后一段），加 `pipefail` 后返回 1。这是**期望的行为**，但会让一些老脚本突然「失败」。

⚠️ **`set -x` 会把密码、token 打进日志**。排错完记得关，或先脱敏变量。

---

## 重定向与输入输出

| 符号 | 含义 |
|---|---|
| `>` | 覆盖写入 |
| `>>` | 追加 |
| `2>` | 错误输出 |
| `&>` / `>&2` | 合并到同一流 |
| `2>&1` | 把错误指到标准输出 |
| `1>&2` | 把输出指到错误 |
| `<` | 标准输入 |
| `<>` | 读写 |
| `\|` | 管道 |
| `<<<` | **here-string**（字符串当输入） |
| `n>` | 指定文件描述符 |

```bash
# 标准三流
ls -l > out.txt             # 只存 stdout
ls -l 2> err.txt            # 只存 stderr
ls -l > out.txt 2>&1        # 两个都存 out.txt
ls -l &> all.txt            # 同上（bash 4+）
ls -l 2>/dev/null           # 丢掉错误
ls -l 2> >(grep -i err)     # 错误走单独的处理

# 追加
echo "log" >> app.log

# here-string
grep root <<< "$content"
bc <<< "3.14 * 2"
read -r line <<< "a b c"

# here-doc（多行输入）
cat <<EOF
变量会展开：$USER，今天 $(date +%F)
EOF

cat <<'EOF'                  # ⭐ 引号包住定界符 = 完全不展开
这行里的 $USER 是字面量
EOF

cat <<-EOF                   # ⭐ - 号允许缩进用 tab
	缩进也能去掉（必须用 tab 不是空格）
	EOF

# 管道
ps aux | grep nginx | grep -v grep
ls | sort | uniq -c | sort -rn | head

# 文件描述符
exec 3< input.txt            # 开一个 fd 3
read -r line <&3
exec 3<&-

# 输入输出重定向到进程
exec > >(tee log.txt)       # 边写屏幕边写文件
```

⚠️ **`>` 会清空文件**。`echo x > file` 会删掉原有内容。要追加用 `>>`。**这是最常见的误操作之一。**

⚠️ **`2>&1` 和 `&>` 的位置不能换**。`2>&1 > out.txt` 是先把错误指向当前 stdout（终端），再把 stdout 指向文件——**错误还是会打到屏幕上**。正确写法是 `> out.txt 2>&1` 或 `&> out.txt`。

⚠️ **here-doc 的结束符前面不能有空格**（除非用 `<<-` 且用 tab 缩进）。很多编辑器把 tab 换成空格，`<<-` 就失效。

⚠️ **here-doc 内容默认会做变量展开**。要字面量就用 `<<'EOF'`（引号包住定界符）。**密码、模板内容一定要用引号形式。**

⚠️ **`exec > file` 会让后面所有输出都进文件**，包括 debug 输出。只想临时切换用 `{ ...; } > file`。

---

## 进程替换与并发

```bash
diff <(cmd1) <(cmd2)                  # ⭐ 比较两个命令的输出
while read -r l; do ...; done < <(cmd)
tee >(processor) < input.txt          # 一份输入两边处理
cmd1 & cmd2 &                          # 后台并行
```

```bash
# 比较两个服务的配置
diff <(sudo nginx -T 2>/dev/null) <(cat /etc/nginx/nginx.conf)

# ⭐ 在当前 shell 里处理命令输出（不进入子 shell）
while read -r line; do
    echo "行: $line"
done < <(find . -name '*.log')

# 顺序执行（等前一个结束）
for f in a b c; do echo "$f"; sleep 1; done

# 后台并行 + 等全部
for i in 1 2 3 4; do
    ( echo "任务 $i"; sleep 2 ) &
done
wait        # ⭐ 等所有后台任务结束
```

⚠️ **`<(...)` 需要 bash 或 ksh，不支持**。脚本要通用就别用。

⚠️ **`< <(cmd)` 比 `cmd | while` 好**，因为后者在子 shell 里跑，循环内的变量赋值会丢。这是 shell 脚本最隐蔽的 bug 之一。

⚠️ **后台任务的标准错误/输出会打进终端**，和你的提示符混在一起。脚本里重定向到日志文件。

⚠️ **`wait` 不带参数等所有后台任务**；带 PID 等特定的。**没有 `wait` 的脚本可能在任务没完成时就退出。**

---

## 任务控制

```bash
jobs          # 列出后台任务
fg            # 把后台任务调到前台
bg            # 让暂停的任务在后台继续
Ctrl+Z        # 暂停当前前台任务
Ctrl+C        # 中断（发 SIGINT）
wait          # 等待后台任务结束
disown        # 从 shell 脱离，退出登录也不被杀
nohup cmd &   # 忽略 SIGHUP
setsid cmd    # 新会话启动（更彻底）
```

```bash
$ sleep 100 &
$ jobs
[1] 12345 sleep 100

$ Ctrl+Z
[1]+  Stopped                 sleep 100
$ bg
[1] 12345 sleep 100

$ fg %1                        # 调到前台
$ kill %1                      # 杀 job 1
$ kill 12345                   # 杀 PID

# 关掉终端后继续跑
$ nohup ./long_task.sh > task.log 2>&1 &
$ disown -h %1                  # 或者 disown 脱离
$ setsid ./long_task.sh &      # 新会话，最彻底

# ⭐ 长任务用 tmux（推荐）
$ tmux new -s work              # 建会话
#   Ctrl+b d  脱离；tmux attach -t work 回来
```

⚠️ **SSH 断开时后台任务可能被 SIGHUP 杀掉**，除非用 `nohup`/`disown`/`setsid`。**长时间任务优先用 `tmux` 或 `screen`。**

⚠️ **`Ctrl+Z` 只是暂停不是终止**。忘了恢复会以 stopped 状态挂着占内存。`jobs` 看看，`bg` 或 `kill` 处理。

⚠️ **`kill` 默认发 SIGTERM（15），允许程序清理**。`-9` 是 SIGKILL，**不给清理机会**，可能留下半写文件。**先 `-TERM`，不行再 `-9`。**

⚠️ **`kill %1` 杀的是 job，`kill 12345` 杀的是 PID**。搞混会杀错进程。

---

## 排错工具

```bash
echo "$$"                  # 当前 shell PID
echo "$?"                  # 上一个退出码
echo "${PIPESTATUS[@]}"    # 管道每段的退出码
echo "$BASHPID"            # bash 进程 PID
echo "${FUNCNAME[0]}"      # 当前函数名
echo "${BASH_SOURCE[0]}"   # 当前脚本路径
echo "${LINENO}"           # 当前行号
trap 'echo "出错于第 $LINENO 行"' ERR
```

```bash
# 调试
$ bash -x script.sh 2> trace.log
$ bash -n script.sh              # 只查语法
$ shellcheck script.sh           # ⭐ 静态检查，最有用
$ PS4='+${LINENO}: ' bash -x script.sh   # 带行号

# 命令追踪
$ set -x
$ set +x
$ echo "${-}"            # 当前 set 了哪些选项

# 卡住了在哪
$ cat /proc/12345/wchan      # 内核函数名
$ cat /proc/12345/stack      # 内核栈（需 root）
$ ls -l /proc/12345/fd        # 打开的文件描述符
$ cat /proc/12345/status | grep -E 'State|Threads'
```

⚠️ **`shellcheck` 会报很多风格问题**（比如 SC2086 未加引号），**其中 SC2086 是真的 bug**。**优先看 `warning` 和 `error` 级别的，`info` 和 `style` 自行取舍。**

⚠️ **`$?` 紧跟在 `echo` 后就失效了**。`echo $?; ls; echo $?` 第一个是上上条的结果。任何命令（包括 `echo`）都会覆盖 `$?`。

⚠️ **`$?` 只保留最近一条**。中间失败会被后续命令覆盖，**连续检查多个命令要立刻保存**：

```bash
cmd1; rc1=$?
cmd2; rc2=$?
[ $rc1 -eq 0 ] && [ $rc2 -eq 0 ]
```

---

## 常用小工具

| 命令 | 用途 | 关键选项 |
|---|---|---|
| `type` | 判断命令是别名/内建/路径 | `-a` 显示全部 |
| `command -v` | 脚本里判断是否存在 | 返回路径 |
| `which` | 找路径 | **不判断别名和内建，不可靠** |
| `whereis` | 找程序和文档位置 | `-b` 只看二进制 |
| `alias` / `unalias` | 别名管理 | — |
| `hash` | 命令路径缓存 | `-r` 清空 |
| `env` / `printenv` | 环境变量 | `-i` 清空后运行 |
| `getent` | **查 passwd/group/hosts/services** | `getent hosts example.com` |
| `seq` | 生成序列 | `seq 1 2 10` `seq 0 0.5 1` |
| `yes` | 无限输出字符串 | `-n` 计数 |
| `sleep` | 等待 | `0.5` 支持小数 |
| `timeout` | **超时限制** | `-k` 强杀 |
| `mktemp` | **安全建临时文件/目录** | `-d` 目录 |
| `realpath` | 绝对路径 | `-e` 必须存在 |
| `ulimit` | 资源限制 | `-n` 文件数 |
| `umask` | 默认权限掩码 | `-S` 看符号形式 |
| `tty` | 是不是终端 | — |
| `stty` | **终端设置** | `-a` 全部 |
| `bind` | **readline 快捷键绑定** | `-l` / `-p` / `-x` |
| `trap` | 信号与退出时执行 | `'cmd' EXIT` |

```bash
# tty：输出终端名，不是终端就报错（脚本里判断有无 tty）
$ tty                         # /dev/pts/0
$ [ -t 0 ] && echo "有终端"
$ tty < /dev/null; echo $?    # 不是终端 → 1
$ script -c "tty" /dev/null   # 强制分配一个伪终端

# stty：看和改终端属性
$ stty -a                     # 全部设置
$ stty size                  # ⭐ 行×列
$ stty -echo                  # 关回显（输密码时用，完了记得 stty echo）
$ stty -icanon                # 关行缓冲（单字符响应，readline 用的）
$ stty rows 50 cols 120       # 设窗口大小
$ stty -a | grep -o '\-brkint' # 看有没有开 break

# bind：readline 快捷键（交互式 bash 才有效，写进 ~/.bashrc）
$ bind -p                     # 看所有绑定
$ bind -l                     # 看函数式绑定
$ bind -x '"\C-x\C-l": "clear\n"'   # Ctrl-X Ctrl-L 清屏
$ bind '"\C-w": backward-kill-word' # 改 Ctrl-W 行为
$ bind -r vi-mode-map         # 回到 vi 模式
```

⚠️ **`stty -echo` 之后忘了 `stty echo`**，终端会变成「打字没反应」，人也看不见。**脚本里用 `trap` 兜底恢复。**

⚠️ **`bind` 的快捷键只在交互式 bash 有意义**，写进脚本对非交互执行无效。它本质是改 readline 的键位表，和 `~/.bashrc` 里的配置是一回事。

⚠️ **`bind -x` 绑定的键在某些终端/SSH 连接下会失效**（终端不转发该组合键）。

⚠️ **`tty` 返回非 0 表示 stdin 不是终端**，这是脚本里区分「跑在终端」还是「跑在 cron/CI」的标准做法。

⚠️ **`trap ... EXIT` 里执行 `stty echo` / `cd -` / 清理临时文件是最常见的骨架代码**，别硬记每条命令。

⚠️ **`yes` 配 `head` 是老写法**：`yes | head -5`。现在 `seq 5` 或 `for i in {1..5}` 更好。

⚠️ **`yes`、`seq`、`sleep` 在脚本里都是可以用 bash 内建/arithmetic 替代的**（`sleep 5` 可以用 `read -t 5`）。追求极简启动时间时才需要。

---

```bash
# 命令判断（脚本里用 command -v，不用 which）
if command -v docker >/dev/null; then
    docker ps
fi
type -a ls

# 环境
$ env | grep -i path
$ env -i PATH=/usr/bin:/bin bash      # 干净环境运行（复现问题）
$ echo "$PATH" | tr ':' '\n' | head
$ getent passwd liu
$ getent group sudo
$ getent hosts example.com            # ⭐ 绕过 nsswitch 缓存的 DNS 查询

# 序列与等待
$ seq 1 5
$ seq 0 0.25 1
$ sleep 2.5
$ timeout 10 curl -sSf https://example.com   # ⭐ 给命令加超时
$ timeout -k 2 5 sleep 100                   # 5 秒后发 TERM，2 秒后 KILL

# 临时文件
$ tmp=$(mktemp)                  # ⭐ 安全（不会名字冲突）
$ dir=$(mktemp -d)
$ echo x > "$tmp"; rm -f "$tmp"

# 路径
$ realpath -e ./config.yaml
$ realpath -m ./notexist        # 只规范化，不要求存在

# 权限掩码
$ umask                # 0022 → 文件 644，目录 755
$ umask 077            # 更严：文件 600，目录 700
$ ( umask 077; touch f )      # 只在子 shell 里改

# 资源限制
$ ulimit -n                  # 最大打开文件数
$ ulimit -u                  # 最大进程数
```

⚠️ **`which` 不可靠**：它只查 PATH，**不认别名和 shell 内建命令**。脚本里判断命令是否存在用 `command -v`。

⚠️ **`mktemp` 必须在变量里用，不能预测文件名**。`mktemp` 直接输出路径，脚本里 `tmp=$(mktemp)`。**用可预测的 `/tmp/myfile` 会被符号链接攻击（TOCTOU）。**

⚠️ **`timeout` 送 SIGTERM，被管的程序可能忽略它**。要保证杀掉用 `-k` 加宽限期。

⚠️ **`ulimit` 改的是当前 shell 及其子进程**，改不了已经跑起来的进程。

⚠️ **`umask` 是「减」不是「等于」**。`umask 022` 表示 group/other 的相应权限被去掉。

---

## 一个完整脚本模板

```bash
#!/usr/bin/env bash
#
# 说明: 一句话说清这个脚本做什么
#
set -euo pipefail
IFS=$'\n\t'

readonly PROGNAME="${0##*/}"
readonly LOG_TAG="$PROGNAME"

# ---- 参数解析 ----
verbose=false
dry_run=false

usage() {
    cat <<EOF
用法: $PROGNAME [-v] [-n] <目录>

  -v  详细输出
  -n  只打印不执行（dry run）
  -h  显示本帮助
EOF
}

while getopts ":vnh" opt; do
    case "$opt" in
        v) verbose=true ;;
        n) dry_run=true ;;
        h) usage; exit 0 ;;
        :) echo "选项 -$OPTARG 需要参数" >&2; exit 2 ;;
        \?) echo "未知选项: -$OPTARG" >&2; exit 2 ;;
    esac
done
shift $((OPTIND - 1))

# ---- 参数校验 ----
target="${1:-}"
if [[ -z $target ]]; then
    echo "错误：缺少目录参数" >&2
    usage >&2
    exit 2
fi
if [[ ! -d $target ]]; then
    echo "错误：$target 不是目录" >&2
    exit 1
fi

# ---- 函数 ----
log()  { printf '[%s] %s\n' "$(date '+%F %T')" "$*" >&2; }
dbg()  { $verbose && log "DEBUG: $*" || true; }
run()  { dbg "运行: $*"; $dry_run || "$@"; }

# ---- 清理 ----
cleanup() {
    local rc=$?
    dbg "退出码 $rc"
    exit $rc
}
trap cleanup EXIT
trap 'echo "被中断" >&2; exit 130' INT TERM

# ---- 主逻辑 ----
log "开始处理 $target"
count=0
while IFS= read -r -d '' file; do
    count=$((count + 1))
    dbg "第 $count 个: $file"
    run du -sh "$file"
done < <(find "$target" -maxdepth 1 -type f -print0)

log "完成，共 $count 个文件"
```

⚠️ **`trap cleanup EXIT` 里的 `exit $rc` 会保留原始退出码**。这是让清理逻辑不掩盖退出码的标准写法。

⚠️ **信号 trap 里要显式 `exit`**，否则执行完 trap 还会继续往下跑。

⚠️ **`find -print0` 配 `read -d ''`** 是处理文件名的标准组合，能正确处理含空格和换行的文件名。

⚠️ **日志写 `>&2`**，这样 `script.sh > result.txt` 时日志不会污染结果文件。

---

## 小结

| 场景 | 命令/写法 |
|---|---|
| 脚本语法检查 | `bash -n script.sh` |
| 脚本静态检查 | `shellcheck script.sh` |
| 跟踪执行过程 | `bash -x script.sh` |
| 带行号跟踪 | `PS4='+${LINENO}: ' bash -x script.sh` |
| 判断命令是否存在 | `command -v cmd` |
| 看上一条退出码 | `echo $?` |
| 看管道每段退出码 | `echo "${PIPESTATUS[@]}"` |
| 在当前 shell 读命令输出 | `while read -r l; do ...; done < <(cmd)` |
| 严格模式 | `set -euo pipefail` |
| 字面量 heredoc | `cat <<'EOF'` |
| 合并 stdout+stderr | `cmd > f 2>&1` |
| 安全临时文件 | `tmp=$(mktemp)` |
| 给命令加超时 | `timeout 10 cmd` |
| 查 DNS | `getent hosts host` |
| 查用户/组 | `getent passwd liu` |
| 长任务脱离终端 | `tmux new -s work` 或 `nohup cmd & disown` |

**十五条铁律**

1. **shebang 用 `#!/usr/bin/env bash`**，别用 `#!/bin/sh` 然后写 bash 语法。
2. **变量用双引号包起来**：`rm "$file"`，不包可能删错文件。
3. **`[ ]` 里的变量必须加引号**，`[[ ]]` 里不加也安全。
4. **遍历参数一律用 `"$@"`**，不要用 `$*` 或 `${arr[@]}` 不加引号。
5. **脚本开头写 `set -euo pipefail`**，但要知道 `-e` 有很多例外。
6. **`getopts` 解析完要 `shift $((OPTIND - 1))`**。
7. **`>` 会清空文件**，追加用 `>>`。
8. **`2>&1` 必须写在重定向后面**（`> f 2>&1`），写前面无效。
9. **密码和模板用 `<<'EOF'`**，避免变量被展开。
10. **`cat file | cmd` 写成 `cmd < file`**，少一个进程。
11. **`while read ... done < <(cmd)` 代替 `cmd | while read`**，否则变量改动会丢。
12. **后台循环末尾要 `wait`**，否则任务没跑完脚本就退出了。
13. **SSH 断开会杀掉后台任务**，用 `tmux` 或 `nohup`。
14. **`kill` 先 `-TERM` 后 `-9`**，给程序清理的机会。
15. **脚本里判断命令存在用 `command -v` 不用 `which`**，临时文件用 `mktemp` 不要自己拼 `/tmp/xxx`。