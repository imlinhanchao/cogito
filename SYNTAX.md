# 语法说明书

兼容 Harlowe 式轻量语法（支持常用宏、条件、变量、链接、导出与安全 HTML）。

## 快速说明
- 段落以 `:: 段落名` 开头，后续内容为段落正文。
- 变量以 `$` 开头。支持数值运算与字符串拼接。
- 条件使用 `(if: condition)[文本](else:)[文本]` 形式。
- 使用 `[[显示文字|段落名]]` 或 `[[段落名]]` 创建段落链接。
- 支持 `(set:)`、`(print:)`、`(display:)` 等基本宏。
- 允许嵌入 `style` 标签与安全的 HTML（事件属性会被移除）。

---

## 变量与赋值
示例：

```text
(set: $health to 10)
(set: $name to "小明")
(set: $score to $score + 1)
(set: $msg to $a + $b)
```

说明：全局变量以 `$` 开头，支持数值运算与字符串连接。

---

## 条件分支
示例：

```text
(if: $health > 5)[你很强壮]
(if: $hasKey)[门开了](else:)[门锁着]
(if: $score eq 0)[分数为零]
```

说明：支持比较操作：`>`、`<`、`>=`、`<=`，以及 `is`、`is not`、`eq`、`ne`、`contains` 这几个比较关键字。

---

## 链接与跳转
示例：

```text
[[去森林|Forest]]
[[去湖边]]
(link:"点击我")[(goto:"NextPassage")]
[[开门|Hall]](set: $doorOpen to true)
```

说明：
- `[[显示文字|段落名]]`：左侧为显示文字，右侧为目标段落名。
- 支持将动作附加到链接上，常见形式：
	- `[[文本|目标]](set: $x to 1)`：点击时先执行赋值再跳转（若存在目标）。
	- `(link:"点击我")[(set: $x to 2)]`：点击时执行赋值。
	- `[[文本]](call:"name" arg1 arg2)`：点击时调用已定义的 JS 函数 `name`，参数可为字符串、数字或 `$var` 变量引用。

示例（带动作）：

```text
[[拾取钥匙|Hall]](set: $hasKey to true)
[[打开宝箱|Treasure]](call:"openChest" $playerLevel)
```

---

## 显示与样式
示例：

```text
(display: "Intro")
(print: $health)
''粗体'' //斜体// ~~删除线~~ ^^上标^^ ,,下标,,
```

说明：可插入其他段落、打印变量值，并使用基础文本样式（粗体、斜体、删除线、上标/下标）。

---

## HTML 与样式
示例：

```html
<style>
.demo-callout { color: #1e3a8a; }
</style>
<div class="demo-callout" title="提示">支持安全的 HTML 内容</div>
```

说明：支持 `style` 标签与安全的 HTML 属性（如 `id`、`class`、`style`、`title` 等）。事件属性（如 `onclick`）会被忽略以保障安全。

---

## JS 函数

编辑器支持在故事中定义并调用轻量的 JS 函数，这在需要复杂计算或对全局变量 `vars` 进行自定义更新时很有用。

定义格式：

```text
(fn:"name")[
  <javascript code>
]
```

调用格式：

```text
(call:"name" arg1 arg2)
```

示例：

```text
(fn:"greet")[
  return 'Hello, ' + (args[0] || vars.name || '访客') + '!'
]
(call:"greet" "小红")

(fn:"incScore")[
  vars.score = (Number(vars.score)||0) + (Number(args[0])||1); 
  return vars.score
]
(call:"incScore" 5)
(set: $newScore to (call:"incScore" 2))
```

说明：
- `code` 以字符串形式存储并由 `new Function('vars','args', code)` 执行。
- 函数接收两个参数：`vars`（当前变量字典的引用，可读写）和 `args`（调用时传入的参数数组，所有参数会先尝试按表达式求值）。
- 支持在函数内部直接修改 `vars`（例如 `vars.score = ...`），并通过 `return` 返回值；可以使用 `(set: $x to (call:"name" ...))` 将返回值赋给变量。

安全提示：
- 该功能会执行任意 JS 代码，仅在受信任的编辑或本地测试环境使用。
- 若需在导出或不受信任环境中使用，建议限制函数能力或采用沙箱化策略（例如白名单 API 或仅允许无副作用的纯计算函数）。

---

## 兼容性与备注
- 本语法受 Harlowe 启发，但为轻量实现，某些高级 Harlowe 特性可能不完全兼容。
- 渲染流程包含宏替换、条件求值、占位符隔离与安全化（sanitize）等步骤，以避免嵌套替换破坏最终 HTML。
- 若需导出为独立 HTML，请使用编辑器中的导出功能，导出内容会包含必要的样式与脚本以维持播放时行为。
