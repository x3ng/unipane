# Buffer Viewer 模型

Unipane 的核心抽象参考 Emacs 的 Buffer/Mode/Window 体系。以下是当前实际实现的描述。

---

## 概念对照

| 概念 | Unipane 实现 | 对应代码 |
|------|-------------|---------|
| **Buffer** | Pane | `core/types.ts` → `Pane` 接口 |
| **Mode** | Plugin | `core/types.ts` → `Plugin` 接口 |
| **Window** | Tab Layout | `core/router.ts` → Pane 数组 + activeId |
| **Frame** | 浏览器窗口 | — |

---

## Buffer（Pane）

一个 Buffer 是一个文件或页面的视图状态。纯粹的状态容器，不知道自己怎么被渲染。

```typescript
// core/types.ts
interface Pane {
  id: string                    // 'file:path' 或 'page:pageId'
  type: 'file' | 'page'
  path?: string                 // 文件路径（相对于 root）
  pageId?: string               // 配置页面 ID
  title: string                 // 标签栏显示标题
  history: HistoryEntry[]       // 导航历史（面包屑用）
}
```

Buffer 由 Router 管理。Router 维护一个 Pane 数组和一个 activeId，负责：
- 创建 Buffer（`openFile` / `openPage`）
- 切换 Buffer（`activatePane`）
- 关闭 Buffer（`closePane`）
- 路由解析（hash → Buffer 类型和路径）

---

## Mode（Plugin）

Mode 是文件类型的处理单元。框架通过 Plugin 接口与 Mode 交互：

```typescript
// core/types.ts
interface Plugin {
  match(filepath: string): boolean
  render(ctx: RenderContext): void
}
```

`match` 声明处理哪些文件，`render` 负责将内容渲染到 DOM 容器。

### RenderContext — 框架给 Mode 的 API

```typescript
interface RenderContext {
  container: HTMLElement             // DOM 容器，Mode 往这里写
  filepath: string                   // 当前文件路径
  content: string | null             // 文件内容（二进制为 null）
  root: string                       // 数据根目录
  saveFile(path, content): Promise   // 写文件
  openFile(path, history?): void     // 打开新 Buffer
  showBreadcrumb(items): void        // 显示面包屑
}
```

Mode 通过 RenderContext 调用框架能力，但框架不干预 Mode 内部实现。

### Mode 的自包含性

每个 Mode 自己决定所有渲染和交互逻辑：

- **markdown** — HTML 渲染、编辑模式（textarea）、checkbox 点击切换、相对链接转换
- **directory** — 文件列表渲染、点击打开文件/目录
- **image** — img 元素、cache-busting
- **html** — iframe 嵌入
- **raw** — pre 纯文本

Mode 可以在 render 中创建任意 DOM 结构、绑定事件、调用 RenderContext API。框架只提供容器和 API，不干涉内容。

### Plugin 注册

Plugin 列表在 `main.ts` 中硬编码，顺序决定优先级（first match wins）：

```typescript
// main.ts
const plugins: Plugin[] = [
  directoryPlugin,   // 路径以 / 结尾
  imagePlugin,       // 图片扩展名
  htmlPlugin,        // .html/.htm
  markdownPlugin,    // .md
  rawPlugin,         // 兜底
]
```

---

## 布局（Window）

当前实现：标签页模式。多个 Buffer 以 Tab 形式切换，同一时间只显示一个 active Buffer。

```
┌─────────────────────────────────────┐
│ Sidebar │ Tab Bar: [A] [B] [C]      │
│         │ ┌───────────────────────┐ │
│  File   │ │                       │ │
│  Tree   │ │   Content Area        │ │
│         │ │   (Active Buffer)     │ │
│         │ │                       │ │
│         │ └───────────────────────┘ │
└─────────────────────────────────────┘
```

标签栏由 `renderTabs` 函数根据 Router 的 Pane 数组动态生成。点击标签 → `router.navigateTo` → hash 变化 → `activatePane` → 渲染对应 Buffer 的内容。

---

## 数据流

```
用户点击（侧边栏/标签/链接）
  ↓
router.navigateTo(type, value, history?)
  ↓
window.location.hash = '#/file/' + encodedPath
  ↓
hashchange 事件 → handleHashChange()
  ↓
openFile(path, history) → 创建或复用 Pane
  ↓
activatePane(id) → onContentRender(pane)
  ↓
renderContent(pane) → findPlugin(path) → plugin.render(ctx)
  ↓
Mode 在 container 中渲染内容，绑定交互
```
