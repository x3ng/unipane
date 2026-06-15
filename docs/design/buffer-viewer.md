# Buffer Viewer 模型

## 设计哲学

Unipane 采用类似 Emacs 的 Buffer Viewer 架构：

- **Buffer 是第一抽象** — 所有内容都是 Buffer
- **Pane 是布局容器** — 管理屏幕空间的分割和组合
- **Mode 是渲染引擎** — 决定 Buffer 如何呈现

核心思想：**框架不管内容，只管布局和生命周期。**

## 概念映射

| Emacs | Unipane | 说明 |
|-------|---------|------|
| Frame | 页面 | 整个应用窗口 |
| Window | Pane | 屏幕上的显示区域 |
| Buffer | Buffer | 内容实例 |
| Major Mode | Mode | 渲染和交互模式 |

## Buffer 为中心

一切都是 Buffer：
- 文件内容 = Buffer（markdown、image、html）
- 目录树 = Buffer（directory Mode）
- Buffer 列表 = Buffer（buffer-list Mode）

Buffer 的生命周期由 App 管理：
- 打开文件 → 创建或切换 Buffer
- 关闭 Buffer → 从所有 Pane 中移除
- 同一文件只创建一个 Buffer

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
- Buffer 独立于显示
- 关闭 Pane 不销毁 Buffer
- 同一文件只有一个 Buffer

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
