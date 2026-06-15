# Content / Mode 分离设计

> 状态：设计讨论中，未实现

## 问题

当前 Mode 同时负责 **获取数据** 和 **渲染内容**，两者耦合：

```typescript
// 现状：Mode.render 里 fetch + render 混在一起
render(ctx) {
  fetch(`/${path}`).then(r => r.text()).then(content => {
    ctx.container.innerHTML = marked.parse(content)  // fetch 和 render 耦合
  })
}
```

这导致：
- 每个新 Mode 都要重复写 fetch 逻辑
- 切换 Mode 需要重新请求数据
- 加缓存、加载状态、权限检查时每个 Mode 都要改
- 无法实现"同一份内容用不同 Mode 查看"

## 目标

1. **Buffer 持有内容** — 数据获取、缓存、生命周期归 Buffer
2. **Mode 只管渲染** — 拿到已有数据，画 DOM
3. **Mode 可自由切换** — 同一 Buffer 切换 Mode 不重新请求
4. **任何内容都有 fallback** — 不拒绝显示，降级总比空白好

## 架构

### 数据流

```
打开文件
  → Buffer.load(path)         ← 根据路径判断 fetch 文本还是二进制
  → Buffer.content = data     ← 持有原始数据
  → Mode.render(buffer.content)  ← 纯渲染
```

对比现状：

```
打开文件（现状）
  → Mode.render(ctx)
  → Mode 内部 fetch + 渲染   ← 耦合
```

### Buffer 改造

```typescript
class Buffer {
  path: string
  mode: Mode
  state: Record<string, any>

  // 新增：内容层
  content: string | Blob | ArrayBuffer | null
  contentReady: boolean       // 是否已加载
  loading: boolean            // 是否加载中

  // 新增：统一加载
  async load(): Promise<void> {
    if (this.contentReady) return
    this.loading = true
    // 根据扩展名判断 fetch 方式
    if (isBinary(this.path)) {
      this.content = await fetchBinary(this.path)
    } else {
      this.content = await fetchText(this.path)
    }
    this.contentReady = true
    this.loading = false
  }

  // 新增：切换 Mode 不重新 fetch
  switchMode(mode: Mode): void {
    this.mode = mode
    // 触发重新渲染，但不重新 fetch
  }
}
```

### Mode 接口改造

```typescript
interface Mode {
  name: string

  // 匹配：路径 + 内容类型
  match(path: string): boolean

  // 新增：能处理到什么程度
  canHandle(content: string | Blob | ArrayBuffer): 'full' | 'degraded' | 'none'

  // 改造：content 从 ctx 传入，不再自己 fetch
  render(ctx: ModeContext): void

  renderToolbar?(container: HTMLElement, buffer: Buffer, app: App): void
}
```

### ModeContext 改造

```typescript
interface ModeContext {
  buffer: Buffer              // 通过 buffer.content 拿数据
  pane: Pane
  container: HTMLElement
  openFile: (path: string) => void
  saveFile: (path: string, content: string) => Promise<void>
  app: App
}
```

`ctx.buffer.content` 就是已加载的数据，Mode 不需要自己 fetch。

## Mode 选择机制

### 优先级

```
1. 用户手动指定（切换 Mode）    ← 最高，永远尊重
2. 扩展名匹配                   ← match(path)
3. 内容类型匹配                 ← canHandle(content)
4. raw mode fallback            ← 兜底
```

### canHandle 三级

| 级别 | 含义 | 示例 |
|------|------|------|
| `full` | 完美渲染 | markdown mode 渲染 .md 文件 |
| `degraded` | 能显示但不理想 | markdown mode 显示 .zip 的 hex dump |
| `none` | 无法处理 | directory mode 处理 .md 文件 |

### raw mode — 永远可用的兜底

```typescript
const rawMode: Mode = {
  name: 'raw',
  match: () => true,  // 匹配任何文件
  canHandle: (content) => {
    if (typeof content === 'string') return 'full'
    return 'degraded'  // 二进制显示 hex dump
  },
  render: (ctx) => {
    const content = ctx.buffer.content
    if (typeof content === 'string') {
      ctx.container.textContent = content
    } else {
      // 二进制 → hex dump
      ctx.container.textContent = toHexDump(content)
    }
  }
}
```

raw mode 的 `canHandle` 永远返回 `full` 或 `degraded`，永远不返回 `none`。

## Mode 分层复用

### 分类

```
文本类 Mode（共享文本处理基础）
├── MarkdownMode
├── CodeMode
└── RawMode

目录类 Mode（共享树形结构交互）
├── DirectoryMode
└── ArchiveMode

二进制类 Mode（共享 Blob 处理）
├── ImageMode
├── PdfMode
└── VideoMode
```

### 组合优于继承

```typescript
// 基础能力可以抽取为 mixin 或工具函数
const textMixin = {
  renderLoading: (c) => { c.textContent = '加载中...' },
  renderError: (c, e) => { c.textContent = `错误: ${e.message}` },
  renderHexDump: (c, data) => { /* hex dump 逻辑 */ },
}

// Mode 组合使用
const markdownMode: Mode = {
  name: 'markdown',
  match: (p) => p.endsWith('.md'),
  canHandle: (c) => typeof c === 'string' ? 'full' : 'degraded',
  render: (ctx) => {
    if (typeof ctx.buffer.content !== 'string') {
      textMixin.renderHexDump(ctx.container, ctx.buffer.content)
      return
    }
    ctx.container.innerHTML = marked.parse(ctx.buffer.content)
  }
}
```

## 链接导航

### 现状

Markdown 链接 → `fixLinks` 转成 `#/file/...` → 点击 → `app.openFile(path)`

问题：目录链接、二进制文件链接都无法正确处理。

### 目标

```
点击链接
  → 解析目标路径
  → Buffer.load(target)          ← 获取内容
  → ModeRegistry.findMode(path, content)  ← 自动选 Mode
  → 渲染
```

关键：**Mode 匹配同时看路径和内容，不只是扩展名。**

### findMode 实现

```typescript
findMode(path: string, content?: string | Blob | ArrayBuffer): Mode {
  // 1. 扩展名匹配
  for (const mode of this.modes) {
    if (mode.match(path) && (!content || mode.canHandle(content) !== 'none')) {
      return mode
    }
  }
  // 2. 内容类型匹配
  if (content) {
    for (const mode of this.modes) {
      if (mode.canHandle(content) === 'full') return mode
    }
  }
  // 3. fallback
  return rawMode
}
```

## Mode 切换

### 场景

| 场景 | 行为 |
|------|------|
| .md 文件想看原始文本 | 切换到 raw mode，不重新 fetch |
| .zip 文件想看 hex dump | 切换到 raw mode |
| 目录链接点击 | 切换到 directory mode |
| 用户手动 `M-x code-mode` | 切换到 code mode |

### 实现

```typescript
// App 层
switchMode(buffer: Buffer, modeName: string): void {
  const mode = this.modes.findModeByName(modeName)
  if (!mode) return

  // 检查兼容性
  const level = mode.canHandle(buffer.content)
  if (level === 'none') {
    // 提示用户：此 Mode 不支持当前内容
    return
  }

  buffer.mode = mode
  // 找到显示该 Buffer 的 Pane，重新渲染
  const pane = this.rootPane.findPaneByBuffer(buffer.path)
  if (pane) this.renderPane(pane, buffer.path)
}
```

## 迁移策略

### 阶段一：Buffer 添加内容层（不破坏现有）

1. Buffer 添加 `content` 字段，初始为 `null`
2. Mode.render 中仍然自己 fetch，但 fetch 后写入 `buffer.content`
3. 后续访问同一 Buffer 的其他 Mode 可以复用 `buffer.content`

### 阶段二：fetch 逻辑移到 Buffer 层

1. Buffer 添加 `load()` 方法
2. App.openFile 调用 `buffer.load()` 后再调 `mode.render()`
3. Mode.render 从 `ctx.buffer.content` 读数据，不再自己 fetch

### 阶段三：Mode 切换和 canHandle

1. Mode 接口添加 `canHandle`
2. App 添加 `switchMode`
3. 链接导航使用新的 findMode 逻辑

### 阶段四：Mode 分层复用

1. 抽取文本类/目录类/二进制类的基础 mixin
2. Mode 实现使用 mixin 减少重复代码

## 待讨论

- [ ] Buffer.content 的失效策略（文件被外部修改时如何刷新？）
- [ ] 大文件的分块加载（Buffer.load 是否需要支持流式？）
- [ ] 二进制类型的自动检测（magic bytes vs 扩展名）
- [ ] Mode 切换的 UI 入口（命令面板？工具栏下拉？快捷键？）
