# WP:Sentinel-1B 字符级语言模型记忆泄漏审计

- 平台:DASCTF(http-ctf2 线上靶场)
- 日期:2026-09-25
- 类型:Web / ML(查表式 next-token 模型)

## 1. 题目信息

| 项 | 内容 |
|---|---|
| 类型 | Web / ML(查表式 next-token 模型) |
| 平台 | DASCTF(http-ctf2 线上靶场) |
| 考点 | 语言模型记忆泄漏(de-memorization)、蜜罐/canary 对抗、条件概率分析、BFS 解码 |
| 结果 | 还原被逐字记忆的原始数据,提交 `ok` |

## 2. 考点速览(新知识点)

- **查表式语言模型**:上下文分为固定长度(4 字符),概率完全由"上下文哈希 → 下一字符分布"决定,无泛化。因此**记忆是以 (context → next) 形式固化在分布里**的。
- **记忆泄漏的度量**:在敏感文档上微调后,对应上下文的下一字符概率被抬升,`p = softmax(base_logit + 记忆加成)`,其中 `base_logit` 是哈希决定的随机量 ∈ [-1,1]。
- **蜜罐(canary)**:训练数据里埋入的诱饵序列,被刻意调高记忆强度。启示:**"最自信的解码路径 ≠ 真实数据"**,必须用结构约束反推。
- **关键判别信号**:真实记忆链"可延续"(每步都有记忆加成);canary 往往"孤立"——看似高概率,后继立即退化为随机噪声。

## 3. 环境与接口

根路径是中文文档页;三个接口:

- `GET /model` → 元信息:

```json
{"model": "Sentinel-1B", "context_len": 4, "topk": 3, "prob_decimals": 3,
 "vocab": "!#$%&()*+,-./0123456789:;=?@ABCDEFGHIJKLMNOPQRSTUVWXYZ^_abcdefghijklmnopqrstuvwxyz{}~",
 "vocab_size": 85, "known_prefix": "CTF2", "terminator": "}", "canaries": 13,
 "notes": ["服务端只取 text 的最后 context_len 个字符作为上下文。", ...]}
```

- `GET|POST /predict {"text":"..."}` → top-3 下一字符及概率(3 位小数);**只取 text 最后 4 字符**。
- `GET|POST /submit {"flag":"..."}` → `ok` / `canary` / `wrong`(提交判定直接告诉你命中的是蜜罐还是真实串)。

## 4. 侦察:从概率分布识别"记忆区"

随机上下文(top-3 全为均匀噪声):

```
'abc'   => [v 0.031, I 0.031, W 0.030]
'WXYZ'  => [m 0.029, p 0.029, ) 0.028]
```

无记忆的基底概率 ≈ **0.025~0.03**(vocab 85 词,均匀费 1/85≈0.0118,top1 略高同理)。

而几个上下文出现**异常峰值**:

```
'CTF2'  => [X 0.88, { 0.034, = 0.002]
'TF2{'  => [3 0.674, J 0.009, a 0.008]
'F2{3'  => [d 0.401, D 0.016, e 0.016]
'2{3d'  => [* 0.387, e 0.260, C 0.009]
'{3de'  => [2 0.297, % 0.022, g 0.022]
'3de2'  => [9 0.397, } 0.017, C 0.017]
```

结论:**记忆仅存在于特定 4 字符上下文**,且可以逐字追踪。

## 5. 推理:识别 canary 与真实链

**线索一:最自信的路径是断头路。** `CTF2 → X(0.88)` 是全场最强信号,但继续 `'TF2X'` 时:

```
'TF2X'  => [d 0.026, q 0.025, ? 0.025]   <- 回到均匀噪声
```

`X` 之后失忆→是蜜罐插桩。

**线索二:真实入口被 canary 压制。** `CTF2` 下 `{` 只有 0.034(排在第三),但一旦进入,`'TF2{' → 3(0.674)` 的高记忆立刻接上。这正是"蜜罐记忆强度高于真实数据"的表现——真实字符存在但概率被压。

**线索三:真实链每一步都是"金属感"的高置信。** 沿 `{` 走下去:

```
TF2{ -> 3 (0.674)
F2{3 -> d (0.401)
2{3d -> e (0.260)     <- * 是假分支:2{3d -> *(0.387) 后 '3d*' 立即噪声化
{3de -> 2 (0.297)
3de2 -> 9 (0.397)
de29 -> 1 (0.121)     <- 4(0.656) 分支后噪声,取 1
...
```

每个假候选(如 `*`、`4`、`L`、`,`)的共同点:后继 top3 全部回到 ~0.025 噪声,即"无法延续";真实分支则一路 0.3~0.85。训练数据只有一份文档,因此真实链必然**以 `}` 闭合且全程有记忆**;蜜罐字符不会是 `}`。

## 6. 求解:自动推进与验证

策略:BFS,只扩展"带记忆"的边(p ≥ 0.05),任意节点若后继全为噪声则不再继续;每当遇到 `}`,就把整串交 `/submit`,`ok` 即命中(其余多为 `canary`/`wrong`)。

精简求解脚本(纯标准库,无依赖):

```python
import json, urllib.request, collections, sys
BASE = 'http://xxx.http-ctf2.dasctf.com'          # 脱敏
pred = lambda ctx: json.loads(urllib.request.urlopen(
    urllib.request.Request(BASE+'/predict',
        data=json.dumps({'text':ctx}).encode(),
        headers={'Content-Type':'application/json'}), timeout=10).read())
def submit_flag(fl):
    return urllib.request.urlopen(urllib.request.Request(BASE+'/submit',
        data=json.dumps({'flag':fl}).encode(),
        headers={'Content-Type':'application/json'}), timeout=10).read().decode()

Q = collections.deque([('CTF2{', [])]); seen = set()
while Q:
    pre, trail = Q.popleft()
    if len(trail) > 36: continue
    ctx = pre[-4:]
    if ctx in seen: continue
    seen.add(ctx)
    for c, p in pred(pre)['top']:
        if float(p) < 0.05: continue          # 剪枝掉噪声分支
        if c == '}':
            flag = pre + '}'
            print(flag, '->', submit_flag(flag))
            if 'ok' in submit_flag(flag): sys.exit()
        elif (pre+c)[-4:] not in seen:
            Q.append((pre+c, trail+[c]))
```

实际输出(节选,已确认命中):

```
NOISE_END 'CTF2{3d*'   ...            <- 假分支终止
CANDP 'CTF2{3de291e8-47c9-4159-9ad2-f41534caae4b}' -> {"status":"ok",
      "flag":"CTF2{3de291e8-47c9-4159-9ad2-f41534caae4b}",
      "msg":"正确!这就是被逐字记忆的原始数据。"}
```

## 7. Flag

```
CTF2{3de291e8-47c9-4159-9ad2-f41534caae4b}
```

## 8. 复盘与扩展

- **坑**:`CTF2→X(0.88)` —— 如果直接贪心解码,会拿到蜜罐假串且永远到不了 `}`。**判定标准应该是"链的延续性与闭合性",而不是单步置信度。**
- **更通用做法**:top-3 只暴露部分分布,若真实字符被压出 top-3 会漏;可对每步做 beam search(保留 top-k 路径,按累计 log-prob 排序),并结合 `/submit` 的 canary 反馈做判别式回溯。
- **与真实 LLM 的映射**:现代大模型的"逐字记忆"同样体现在特定上下文的高置信 logits;p(river) 与温度(T)、重复惩罚、采样策略相关,防御侧可用差分隐私、去重、显式遗忘训练缓解。本题是这一研究的查表式最小复现。
- 答案串含连字符分组,提交时注意保持原样。