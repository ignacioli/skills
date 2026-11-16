# `DS-PAGE-FLOW` 模板（放进 `components.md` §2，紧跟 `DS-BASE`）

页面上组件**之间**的距离，一种关系一个 token。组件内部的距离写在它自己的 §4 条目里；这张表只管页面在组件外面加的距离。距离按几何契约测量（值规范的几何契约小节）：文字取 token line box 并按中心对齐，单独图标按钮取 `<touch-min>` 见方，没有可见填充、描边或边框的容器取子元素并集。

## 怎么填（顺序不能换）

1. **先统计。** 用画板扫描（`scripts/board-scan/`，见 [../alignment.md](../alignment.md) §5）跑全部已批准画板，汇总里的 `relations` 就是每种关系的实际取值分布。把分布原样写进 `Measured` 列（`值 ×次数（出现在哪）`）。
2. **再由负责人选值。** 分布只有一个值、且和 token 规范一致的，标 `settled`。画板之间互相矛盾、或和 token 规范不一致的，列给负责人，由负责人选一个 token，标 `owner <日期> <决策 id>`。**取值是设计决定，agent 不得自行确定**，包括"取众数""取最接近的 token"这类看似机械的选法。
3. **不合的登记为例外。** 负责人决定保留的偏离写进「登记的例外」表，带理由和决策 id，并给它的范围写一条测试。不得为了消掉一条发现而放宽关系值或容差。
4. **改画板。** 其余偏离都在画板上改到表里的值，然后重新扫描，直到 0 条表外发现。

## 关系词表

扫描器只认下面这些关系 ID；项目可以删掉用不到的行，不要改 ID 的含义。新增关系需要同时改扫描器和它的测试。

| ID | 含义 |
|---|---|
| `page-side-margin` | 页面左右边距：满宽容器里的非满宽子元素到屏幕边 |
| `header-to-first` | 顶栏 → 第一个内容块 |
| `block-to-block` | 页面主体里块与块之间 |
| `section-title-to-content` | 分节标题 → 它的内容 |
| `section-to-section` | 上一节末尾 → 下一节标题 |
| `label-to-content` | 文字标签 → 它标注的内容 |
| `text-stack` | 标题 → 副标题或日期（两段文字上下叠） |
| `inline-siblings` | 一行里的小元素（chip、标签、元信息），高度 ≤ `inlineMaxHeight` |
| `row-siblings` | 一行里的大元素（输入框、按钮、图标 → 文字） |
| `tile-grid` | 宫格之间 |
| `list-row-pitch` | 列表行 → 列表行（通常为 0，行自带内边距和分隔线） |
| `content-end-to-bottom` | 内容末尾 → 页面底边或固定底栏 |
| `fixed-bottom-stack` | 固定底栏 → 固定底栏（例：主按钮行 → tab bar） |
| `sheet-top-to-first` | 面板顶边 → 第一个元素（grabber） |
| `sheet-stack` | 面板内元素之间 |
| `sheet-side` | 面板左右内边距 |

## 表格骨架（复制到 `components.md`）

扫描器按列位置读表：Relations 表第 2 列是 ID、第 4 列是 px；例外表的列顺序固定为 Rule | Where | Value | Reason | Decision。

```markdown
### 2.1 Page flow `DS-PAGE-FLOW`

<一句话说明测量方式，引用几何契约小节。>

Measured on <N> approved boards on <date> by `<scan command>`.

#### Relations

| Relation | ID | Token | px | Measured | Status |
|---|---|---|---|---|---|
| page side margin | `page-side-margin` | `<token>` | <px> | <值 ×次数（位置）> | settled |
| top bar → first block | `header-to-first` | `<token>` | <px> | <分布> | owner <date> <decision id> |
| … | … | … | … | … | … |

Not measured: <画板上没有出现的关系，以及由代码负责的部分（例如底部安全区）>.

#### Registered exceptions

| Rule | Where | Value | Reason | Decision |
|---|---|---|---|---|
| `<rule or relation id>` | `within=<component>` / `screen=<screen>; to=<layer prefix>` | <value or —> | <为什么保留> | <decision id> |
```

`Where` 里可以组合 `within=`（某组件内部）、`screen=`（某屏幕）、`to=`（关系的目标图层前缀），用分号分隔。`Value` 写 `—` 表示该范围内任意值。
