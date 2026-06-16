# Buffer Viewer 模型

## 设计哲学

Unipane 采用类似 Emacs 的 Buffer Viewer 架构：

- **Buffer 是第一抽象** — 所有内容都是 Buffer
- **Resource 是共享内容** — 同一路径的真实内容只加载/缓存一份
- **Viewer 是显示会话** — 同一 Buffer 可以在不同位置显示不同滚动/选择状态
- **Pane 是布局容器** — 管理屏幕空间的分割和组合
- **Mode 是渲染引擎** — 决定 Buffer 如何呈现

核心思想：**Resource 管内容，Buffer 管语义，Viewer 管显示状态，Pane 管布局。**

## 概念映射

| Emacs | Unipane | 说明 |
|-------|---------|------|
| File contents | Resource | 真实内容缓存 |
| Frame | 页面 | 整个应用窗口 |
| Window | Pane | 屏幕上的显示区域 |
| Buffer | Buffer | 内容实例 |
| Window state | Viewer | 一次显示会话的局部状态 |
| Major Mode | Mode | 渲染和交互模式 |

## Buffer 为中心

一切都是 Buffer：
- 文件内容 = Buffer（markdown、image、html）
- 目录树 = Buffer（directory Mode）
- Buffer 列表 = Buffer（buffer-list Mode）

Buffer 的生命周期由 App 管理：
- 打开文件 → 创建或切换 Buffer
- 关闭 Buffer → 从所有 Pane 中移除
- 同一路径的内容由 ResourceStore 共享
- 同一文件可以创建多个不同 Mode 的 Buffer（规划中），例如 markdown / raw / outline

## Pane 布局

Pane 是递归的布局结构：

```
RootPane (horizontal)
├── SidePane (leaf) → directory Buffer
└── MainPane (leaf) → markdown Buffer
```

分割操作：
```typescript
const [left, right] = pane.split('horizontal', 0.3)
```

## 聚焦机制

- 每个 Pane 可以被聚焦
- 工具栏显示聚焦 Pane 的 Buffer 的 Mode 按钮
- 目录 Mode 中，文件在主 Pane 打开，目录在当前 Pane 导航

## 与传统 Tab 的区别

传统浏览器 Tab：
- 每个 Tab 是独立的内容实例
- 关闭 Tab 销毁内容
- 同一文件可以开多个 Tab

Unipane Buffer：
- Resource 独立于 Buffer，Buffer 独立于显示
- 关闭 Pane 不销毁 Buffer 或 Resource
- 同一文件可通过多个 Buffer/Mode 查看，但共享同一个 Resource 内容实例

## Viewer

Pane 不直接渲染 Buffer，而是显示 Viewer。Viewer 必须绑定 Buffer，不允许出现脱离 Buffer 的特殊显示路径：

```typescript
interface Viewer {
  id: string
  buffer: Buffer
  pane: Pane
  state: {
    scrollTop?: number
    selection?: unknown
    cursor?: unknown
  }
}
```

Viewer 只保存一次显示会话的局部状态，不拥有内容，也不覆盖 Buffer 的 Mode。

## Virtual Buffer

所有可显示内容都必须是 Buffer。文件内容使用 Resource Buffer；系统、临时、派生内容使用 Virtual Buffer。

示例：

| 内容 | Buffer | Mode |
|------|--------|------|
| 欢迎页 | `unipane://welcome` | `welcome` |
| Loading | `unipane://loading` | `loading`（规划中） |
| Error | `unipane://error/<id>` | `error`（规划中） |
| 搜索结果 | `unipane://search?q=...` | `search-results`（规划中） |
| 命令面板 | `unipane://commands` | `command-palette`（规划中） |

约束：

- Viewer 必须绑定 Buffer
- Buffer 必须由 Mode 渲染
- 特殊界面不绕过 Buffer/Mode 直接操作 Pane DOM
- Virtual Buffer 不绑定 Resource，内容来自 Buffer.state 或 Mode 逻辑

## 扩展点

### 新增 Mode

```typescript
const myMode: Mode = {
  name: 'my-mode',
  match: (path) => path.endsWith('.xyz'),
  render: (ctx) => {
    ctx.container.textContent = 'Hello!'
  },
  renderToolbar: (container, buffer, app) => {
    // 工具栏按钮
  }
}
app.modes.register(myMode)
```

### Pane 分割

```typescript
const [left, right] = pane.split('horizontal', 0.5)
const [top, bottom] = pane.split('vertical', 0.7)
```

### 事件监听

```typescript
app.events.on('buffer-changed', (buffer) => {
  console.log('Switched to:', buffer.path)
})

app.events.on('focus-changed', (pane) => {
  console.log('Focused pane:', pane.id)
})
```
