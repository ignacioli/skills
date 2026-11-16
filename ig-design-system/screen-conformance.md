# Screen conformance：核心屏的机器验收和基线锁

[SKILL.md](SKILL.md) 的 L0–L3 管"组件做对一次、页面抽样"。这个分支补下游：核心屏（每个里程碑 1～3 个，在 `implementation-map.md` 里点名）怎样由机器证明和批准的设计等价，负责人怎样只看一次，看过之后怎样锁住不再漂。前提：画板已经扫描干净（[alignment.md](alignment.md)），测量方式按同一份几何契约（[templates/geometry-contract.md](templates/geometry-contract.md)）。

## 1. 分层防守：每类缺陷只由一层负责

一类缺陷由两层同时负责，结果就是两层都录基线、两层都要维护，出了问题还互相推。下表每一行只有一个负责层；其他层看到了也不重复断言。

| 缺陷类 | 负责层 | 证据形式 | 不做什么 |
|---|---|---|---|
| token 值错、对比度不够、图标集缺项 | **L0 token 校验** | 值和对比度的单元测试 | 不截图 |
| 组件结构错：缺部件、顺序错、状态缺失、点击区不够、该填满宽度却没填、变更入口只能长按 | **L1 组件合同测试** | 结构断言（组件树、语义节点、尺寸关系），每条 automatable invariant 一条测试 | **不录 PNG**，不为每个状态录截图 |
| 页面组合错：组件之间距离、对齐、位置、文字内容、颜色和设计不一致；设计图层没有对应实现 | **核心屏设计几何比对** | `layers.json` + `map.json` + `capture.json` → `report.json`，±容差，MISSING 为 0 | 不比像素；不对非核心屏做 |
| 已批准的核心屏发生了没人批准的像素变化 | **核心屏哈希锁** | 基线 manifest + `baseline-check.mjs` 非零退出 | 不判断"变化好不好"，只判断"有没有变" |
| 渲染环境变了（渲染器、字体、设备 profile、字号缩放） | **环境 canary**（1～2 张组件 PNG） | 和核心屏一样进 manifest 的 `environment` 段 | 不用它验收组件本身 |
| 只有人能判断的：可读性、手感、新设计决定 | **L3 人工** | 按 SKILL.md 的 L3 触发条件 | 不用人去找机器能找到的漂移 |

L2 的入口和布局表（entry and layout map）照旧：它管"有没有可见入口、谁负责填满宽度"，可以由组件合同测试或平台 UI 测试强制执行。

## 2. 基线厚度

- **PNG 和哈希只给核心屏。** 不给组件的各个状态录 PNG：一个组件几十个状态 × 每次 token 微调 = 上百张基线的批量重录，没人真的看，锁就成了橡皮图章。组件状态由 L1 的结构断言负责。
- **环境 canary 至多两张**，只用来确认渲染环境没变。canary 变了，先处理环境，再看核心屏的差异；核心屏差异此时可能是环境造成的，不是 UI 变化。
- **有意改动时只看哈希变了的屏。** `baseline-check.mjs --actual … --changed-out changed.json` 列出变了的屏，`compare-page.mjs` 只给这些屏生成「设计 | 实现 | 差异」对照页。负责人看一次，整批批准或驳回。
- **manifest 记录哈希、批准日期和决策 id**（schema：[schemas/baseline-manifest.schema.json](schemas/baseline-manifest.schema.json)）。决策 id 必须能在决策日志里找到（`--decisions <log>` 检查）。
- **agent 不得自行批准。** agent 不改 manifest 里的哈希、日期、决策 id，不覆盖基线 PNG。对照页最后给出的是"负责人批准后要记录的内容"，不是批准本身。基线 PNG 被覆盖而 manifest 没变，`baseline-check.mjs` 会失败。
- **哈希必须可复现。** 同一 fixture 渲染两次，字节完全相同才能锁（`--actual2` 检查）；不可复现就先修渲染（固定时间、动画、随机数、字体加载），不能放宽成"相似度阈值"。

**反例：只把哈希写在文档里不算锁定。** 文档里的一串哈希没有任何命令去比对，渲染变了也不会有人知道。锁定 = manifest + 一条在门禁命令里实际运行、变了就非零退出的检查。

## 3. 平台无关契约

四份 JSON，各有 schema；比对器、适配器、对照页之间只通过它们交换数据。

| 文件 | 由谁产生 | 内容 | schema |
|---|---|---|---|
| `layers.json` | 设计导出（一次，随画板版本） | 画板 viewport、每个可见图层的 path、类型、盒子、颜色、文字、字体、组件 tag | [schemas/layers.schema.json](schemas/layers.schema.json) |
| `map.json` | 人写，随屏幕实现一起评审 | fixture id、容差、图层 path → accessibility identifier；忽略项和例外都带理由，例外带决策 id | [schemas/map.schema.json](schemas/map.schema.json) |
| `capture.json` | 平台适配器 | 渲染出的元素 bounds 和文字（同一单位、同一原点）、PNG 路径、渲染器信息 | [schemas/capture.schema.json](schemas/capture.schema.json) |
| `report.json` | 比对器 | mapped / missing / ambiguous / failed / exceptions 计数、每条检查的期望值和实际值、结果 | [schemas/report.schema.json](schemas/report.schema.json) |

示例（虚构数据）在 [examples/conformance/](examples/conformance/)。`node scripts/contract/validate.mjs <schema> <file>` 可以检查任何一份文件。

选择器一律用 accessibility identifier（Compose `testTag`、SwiftUI `accessibilityIdentifier`、Web `data-testid`），不用视图树下标或 CSS class：它同时是 L2 入口表里的那一列，也是 UI 测试的定位方式。标识符打在**可见几何**上，不打在外扩的触控区上；否则比对量到的是点击区而不是视觉盒。没有标识符的文字图层按精确文字、阅读顺序匹配；重名、并列或观测不足时报 AMBIGUOUS，不随便取第一个。

### 平台适配器只做一件事

**按 fixture 在指定 viewport 渲染，输出 PNG 和 `capture.json`。** 不比对、不判断、不改基线。fixture 的内容和设计画板相同（同样的名字、数字、条目数），只用虚构数据。

**Compose / Robolectric（JVM）**

```kotlin
@RunWith(AndroidJUnit4::class)
@Config(qualifiers = "w360dp-h800dp-xhdpi", sdk = [<sdk>])
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class HomeCaptureTest {
    @get:Rule val rule = createComposeRule()

    @Test fun capture() {
        rule.setContent { AppTheme { HomeScreen(state = Fixtures.homeDefault) } }
        rule.waitForIdle()
        val root = rule.onRoot()
        root.captureToImage().asAndroidBitmap().writePng("build/conformance/home.png")
        val density = rule.density.density
        val elements = rule.onAllNodes(hasTestTag() or hasText()).fetchSemanticsNodes().map { n ->
            val b = n.boundsInRoot          // px → dp
            Element(id = n.config.getOrNull(SemanticsProperties.TestTag), text = n.config.getOrNull(SemanticsProperties.Text)?.joinToString(),
                x = b.left / density, y = b.top / density, w = b.width / density, h = b.height / density)
        }
        writeCapture("build/conformance/home.capture.json", screen = "home", fixture = "home-default", platform = "android-compose", elements)
    }
}
```

`hasTestTag()` 是项目里一个简单的 `SemanticsMatcher`。动画和时钟由测试规则固定（`mainClock.autoAdvance = false`），保证两次渲染字节相同。

**SwiftUI / XCTest**

```swift
final class HomeCaptureTests: XCTestCase {
    func testCapture() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-fixture", "home-default", "-disableAnimations"]
        app.launch()                               // 模拟器机型与画板 viewport 一致
        let png = app.windows.firstMatch.screenshot().pngRepresentation
        let elements = app.descendants(matching: .any).allElementsBoundByIndex
            .filter { !$0.identifier.isEmpty || !$0.label.isEmpty }
            .map { e in Element(id: e.identifier.nilIfEmpty, text: e.label.nilIfEmpty, frame: e.frame) }  // pt
        try write(png: png, capture: Capture(screen: "home", fixture: "home-default", platform: "ios-swiftui", elements: elements))
    }
}
```

不想跑 UI test 时，也可以在单元测试里用 `ImageRenderer` 渲染视图，配合视图里的 `GeometryReader` + `PreferenceKey` 收集带标识符元素的 frame。无论哪种，都要说明它是不是真机的代理。

**Web / Playwright**

```ts
test('capture home', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 2 })
  await page.goto('/?fixture=home-default')
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: 'out/home.png', animations: 'disabled' })
  const elements = await page.$$eval('[data-testid], body *', (els) => els
    .filter((e) => e.getAttribute('data-testid') || (e.childNodes.length === 1 && e.firstChild?.nodeType === 3))
    .map((e) => { const r = e.getBoundingClientRect(); return { id: e.getAttribute('data-testid') ?? undefined, text: e.getAttribute('data-testid') ? undefined : e.textContent?.trim(), x: r.x, y: r.y, w: r.width, h: r.height } }))
  writeFileSync('out/home.capture.json', JSON.stringify({ screen: 'home', fixture: 'home-default', platform: 'web', viewport: { w: 360, h: 800, scale: 2 }, png: 'out/home.png', elements }))
})
```

### 比对器

比对器读 `layers.json` + `map.json` + `capture.json`，按几何契约测量，写 `report.json` 和差异图。通常检查：尺寸、相邻间距、内边距、对齐（±容差，delta 按固定步长取整）；绝对坐标给一个粗上限；颜色精确；文字精确（不间断空格按空格处理）；图层全部映射（MISSING = 0）；例外比例有上限。

**比对器本身不做成通用工具。** 理由：目前只有一个真实样本，而且它带着大量项目特有的规则（平台图标映射、原点偏移、遮挡处理、图标像素比对、派生画板……）。从一个样本里抽象，抽出来的是那个项目的形状，而不是通用的形状。等第二个项目真正需要时，对照两份实现再抽取；在那之前，契约（四份 schema）就是共享的部分，各项目按契约写自己的比对器。

## 4. 脚本

| 脚本 | 作用 | 退出码 |
|---|---|---|
| [scripts/baseline/baseline-check.mjs](scripts/baseline/baseline-check.mjs) | 校验 manifest（schema、重复 id、决策 id 在日志里）；锁定的基线 PNG 必须匹配它的哈希；`--actual` 时新渲染必须匹配锁定哈希；`--actual2` 检查两次渲染一致；`--changed-out` 输出变了的屏 | 0 全部锁住；1 有变化或缺失；2 用法错误、manifest 无效、渲染不可复现 |
| [scripts/baseline/compare-page.mjs](scripts/baseline/compare-page.mjs) | 读 `changed.json`，生成一页自包含 HTML：每个变了的屏一行「设计 \| 实现 \| 差异」，图片内嵌；有比对器差异图就用它，否则在页面里逐像素算；末尾列出负责人批准后要记进 manifest 的内容 | 0 |
| [scripts/contract/validate.mjs](scripts/contract/validate.mjs) | 用 schema 检查契约文件（无依赖，只支持 schema 用到的子集） | 0 有效；1 无效；2 用法错误 |

测试：`node --test '<skill>/scripts/**/*.test.mjs'`。

### 门禁命令写法

在项目里把下面这条写进门禁（CI 或本地 gate 脚本），而不是写进文档：

```bash
node <skill>/scripts/baseline/baseline-check.mjs \
  --manifest <repo>/<baseline-dir>/baselines.json \
  --decisions <repo>/<decision-log>.md \
  --actual <render-out-1> --actual2 <render-out-2> \
  --changed-out <render-out-1>/changed.json
```

失败时，若是有意改动：

```bash
node <skill>/scripts/baseline/compare-page.mjs --changed <render-out-1>/changed.json --out <render-out-1>/compare.html
```

把 `compare.html` 交给负责人。负责人批准后，由负责人（或负责人明确指示下）更新 manifest 的哈希、日期和决策 id，再跑一次门禁。

## 5. 模型审阅：每屏每次改动一次，带清单

- **禁止「截图 → 判断 → 修改 → 再截图」循环**，用任何工具都一样。发现自己在重复截图，说明方法错了：立即停下，做一次复盘，回到几何比对报告找原因。
- 允许的是：每个核心屏、每次改动，**一次**带清单的模型审阅。每个清单项必须给出证据（报告里的哪一条、哪一个元素），不给证据的"看起来没问题"不算。
- 调试一个已经定位的具体视觉问题时，少量手动截图可以。

清单骨架（按项目补充）：

```text
屏幕 / fixture / 设计版本 / 实现 commit：
1. report.json：mapped、missing（须为 0）、failed（须为 0）、例外比例（≤ 上限）。
2. 例外：每条都有理由和决策 id；本次是否新增例外，新增的是否已问负责人。
3. 文字：截断、省略号、裁切（最大字号下也要看报告或结构测试，不靠目测）。
4. 设计里有、几何比对覆盖不到的元素（插画、图表、渐变）：逐项说明由哪一层负责。
5. 对照页差异图里的成片红色区域：逐块对应到报告条目，或说明是环境 canary 造成的。
结论：PASS / FAIL / 需要负责人看（列出具体疑问）。
```

## 完成标准

- 防守表在项目文档里，每类缺陷只有一个负责层；
- 核心屏有 `layers.json` / `map.json`，适配器输出的 `capture.json` 通过 schema；
- `baseline-check.mjs` 在门禁命令里实际运行，manifest 每条都有哈希、日期和决策 id；
- 组件 PNG 至多两张，只作环境 canary；
- 有意改动只生成哈希变了的屏的对照页，负责人一次批准，agent 没有自行批准。
