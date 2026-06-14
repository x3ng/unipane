# Unipane

## 定位

JSON 配置驱动的纯前端本地内容浏览器。打开即用，数据和显示完全分离。

- **Universal** — 不只 markdown，任何文件类型都可以有对应的渲染器
- **Pane** — 面板/窗格，专注展示本地文件内容，不是仪表盘也不是编辑器

## 核心原则

### 数据与显示完全分离

用户数据目录（root）和 unipane 引擎是独立的。unipane 不嵌入、不 build、不预处理用户数据，只在浏览器端通过 fetch 实时读取和渲染文件。

用户数据的组织方式完全由用户决定，unipane 不对目录结构做任何假设。

### 配置驱动

`.unipane/config.json` 是唯一的人机界面。改它就改整个页面：默认首页、侧边栏结构、每个视图挂什么 widget。

### 可插拔渲染器

每种文件后缀对应一个渲染器。加新类型只加一个文件，注册到渲染器列表即可。

### 可插拔 Widget

Widget 是比渲染器更高层的组装单元——它可以从多个文件里提取数据，拼成有结构的视图。加新 widget 同样只加一个文件，注册即可。

### 本地优先

不依赖任何远程服务。唯一需要的是一个本地 HTTP server，仅用于绕过浏览器 file:// 协议的 CORS 限制。不改本地文件就不会触发任何请求。

---

## 核心概念

### Root（数据根目录）

unipane 看到的最顶层目录。所有文件路径都相对于 root 解析。

确定优先级：
1. CLI 参数：`unipane serve /path/to/notes`
2. config 字段：`"root": "/path/to/notes"`
3. 默认值：`.`（当前目录）

### Renderer（渲染器）

知道如何显示一种文件类型的组件。

```typescript
interface Renderer {
  match(filepath: string): boolean       // 是否能处理这种文件
  render(content: string | Blob): HTMLElement  // 把内容变成 DOM
}
```

内建渲染器：
- **markdown** — .md → HTML
- **html** — .html → iframe/srcdoc（浏览器原生）
- **image** — .png/.jpg/.gif → img（浏览器原生）
- **raw** — 未知类型 → 纯文本 pre（兜底）

### Widget（页面组件）

页面里的一个展示区块。从配置中读取 source 路径，fetch 文件内容，用渲染器（或自定义逻辑）渲染成 DOM。

```typescript
interface WidgetConfig {
  type: string                    // widget 类型名
  source?: string                 // 数据文件路径（相对于 root）
  [key: string]: any              // 各 widget 自定义配置
}

interface Context {
  fetch(path: string): Promise<string>  // 读文件内容
  root: string                          // 数据根目录
}

interface Widget {
  render(config: WidgetConfig, ctx: Context): HTMLElement
}
```

Widget 和 Renderer 的关系：Widget 是更高层的抽象，内部可以调用 Renderer。`md` widget 的实现就是 fetch 文件 → 调用 markdown renderer → 渲染到 DOM。但 Widget 也可以不依赖 Renderer，自己解析文件内容（如 tasks widget 解析待办列表）。

内建 Widget：
- **md** — 渲染整个 .md 文件

### View（视图）

面板里显示的内容。有三种类型：

```typescript
type View =
  | { type: 'file', path: string }       // 显示文件（用对应 renderer）
  | { type: 'page', pageId: string }     // 显示配置页面（渲染 widgets）
  | { type: 'html', path: string }       // 显示用户自定义 HTML
```

### Pane（面板）

一个矩形区域，包含一个 View 和一个标题（用于标签页显示）。

```typescript
interface Pane {
  view: View
  title: string
}
```

### Layout（布局）

管理多个 Pane 的排列方式。

```typescript
interface Layout {
  panes: Pane[]
  activeIndex: number    // 当前激活的标签页索引
}
```

MVP 只做标签页模式：多个 Pane 以标签页形式切换，同一时间只显示一个。

以后扩展为多面板时，Layout 变成树结构（左右/上下分割），每个叶节点是一个 Pane。Pane 和 View 的接口不变，只改 Layout 层。

---

## 路由

使用 hash 路由，不需要 serve 端配合。

URL 格式：
- `#/` — 显示 defaultPage
- `#/file/<path>` — 显示文件
- `#/page/<pageId>` — 显示配置页面

路由和标签页的关系：路由决定"当前标签页显示什么"。点击侧边栏时，要么激活已有标签页（如果已经打开了同一个文件/页面），要么创建新标签页。

```typescript
window.addEventListener('hashchange', () => {
  const hash = window.location.hash
  // 解析 hash，查找或创建对应标签页，更新 Layout
})
```

---

## 配置文件

### config.json 结构

```json
{
  "title": "Notes",
  "root": "..",
  "defaultPage": "home",
  "sidebar": {
    "mode": "auto",
    "exclude": [".unipane", ".git"]
  },
  "pages": {
    "home": {
      "title": "首页",
      "layout": "grid",
      "widgets": [
        {"type": "md", "source": "README.md"}
      ]
    }
  }
}
```

### 字段说明

- **title** — 页面标题，显示在浏览器标签和侧边栏顶部
- **root** — 数据根目录，相对于 config.json 所在目录。可选，默认 `..`
- **defaultPage** — 默认显示的页面 ID。可以是 pages 里的 key，也可以是 `.html` 文件路径（用户自定义首页）
- **sidebar.mode** — `auto`（serve 端自动扫描文件树）| `manual`（手动定义）
- **sidebar.exclude** — auto 模式下排除的目录名
- **pages** — 页面定义。每个 page 有 title、layout、widgets

### 自定义首页

如果 defaultPage 指向一个 `.html` 文件，前端直接 fetch 该文件并渲染到主区域，不走 pages/widget 逻辑。用户可以在 root 目录下写任意 HTML 作为首页。

---

## 操作维度

### 读操作（内建，无需额外能力）

- 渲染任何支持的文件类型
- 文件树扫描（serve 端自动完成）
- 标签页多开

### 便捷操作（需 serve 端配合）

serve 端暴露轻量 API：

- 新建/删除/重命名文件或目录
- 写入内容（编辑保存）

安全边界：只操作 root 目定的目录。

### 暂不支持

- 批量导入
- 文件同步
- 版本管理（交给 git）

### 设计影响

Widget 和 Renderer 接口保持纯读。写操作通过独立的 ops 模块暴露给 UI 层（编辑按钮、右键菜单），不与渲染逻辑耦合。

---

## 架构分层

```
src/
├── core/
│   ├── router.ts         路由 + 标签页管理
│   ├── filetree.ts       fetch /api/tree → 文件树数据
│   ├── parser.ts         markdown → HTML 解析器
│   └── engine.ts         读 config.json → 调度 widget/renderer
├── renderers/
│   ├── base.ts           Renderer 接口定义
│   ├── markdown.ts
│   ├── html.ts
│   ├── image.ts
│   └── raw.ts
├── widgets/
│   ├── base.ts           Widget 接口定义
│   └── md.ts
└── index.ts              入口：注册 renderer/widget，启动路由
```

注册机制：

```typescript
// index.ts
registerRenderer(new MarkdownRenderer())
registerRenderer(new HtmlRenderer())
registerRenderer(new ImageRenderer())
registerRenderer(new RawRenderer())

registerWidget('md', new MdWidget())
```

现在是静态注册（写死在代码里）。以后加插件机制，只需加一个加载器从外部 JS 文件读取注册调用，接口不变。

---

## serve 工具

Python 脚本，职责：

- 静态文件服务（基于 http.server）
- `GET /api/tree` — 返回目录结构 JSON
- `POST /api/file` — 创建/写入文件
- `DELETE /api/file` — 删除文件

安全边界：只操作 root 目录内的文件。拒绝 root 之外的路径请求。

用户使用方式：`unipane serve [目录]`，浏览器打开 `http://localhost:8000/.unipane/index.html`。

---

## 启动流程

1. 用户执行 `unipane serve [目录]`
2. serve 端启动 HTTP server，扫描目录生成文件树
3. 浏览器打开 index.html
4. 前端 fetch config.json，构建侧边栏
5. 前端 fetch /api/tree，填充文件树
6. 前端解析 URL hash，渲染对应 View
7. 用户点击侧边栏 → 切换/创建标签页 → fetch 文件 → 渲染

---

## 技术选型

- TypeScript（开发时），编译为单文件 JS（运行时）
- 无需框架，纯 DOM 操作
- 无需 Python 或其他外部依赖（运行时）
- src/ 目录存 TS 源码，main.js 是编译产物，提交到仓库方便直接使用

---

## 未来方向

- 搜索（前端全文搜索）
- 更多 widget（统计图、进度条）
- 多面板布局（左右分屏、浮动窗口）
- 插件机制（外部 renderer/widget 动态加载）
- 编译为单文件离线包（所有数据内嵌到一个 HTML）
