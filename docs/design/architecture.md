# 架构设计

## 核心概念

**Buffer 为中心，Resource 共享内容**：所有内容语义都是 Buffer，Pane 只是布局容器；同一路径的多个 Buffer 可以共享一个 Resource 内容实例。

| 概念 | 定义 |
|------|------|
| **Resource** | 真实内容资源（path + content + loading/error/version），由 ResourceStore 共享 |
| **Pane** | 显示容器，可嵌套分割，每个叶子 Pane 显示一个 Buffer |
| **Buffer** | 内容语义实例（Resource + Mode + 状态），独立于显示 |
| **Viewer** | Buffer 在某个 Pane 中的显示会话，保存 scroll/selection/cursor 等局部状态（规划中） |
| **Mode** | 渲染处理器，接收 Buffer 渲染到 Pane |

## 模块职责

### Core（框架层）

| 模块 | 文件 | 职责 |
|------|------|------|
| **App** | `app.ts` | 顶层编排器。持有 Pane、Buffer、ModeRegistry、EventBus。管理 Buffer 生命周期，跟踪聚焦 Pane |
| **Pane** | `pane.ts` | 显示容器。递归结构：叶子节点显示 Buffer，分支节点分割为子 Pane。支持水平/垂直分割、拖拽 resize |
| **Buffer** | `buffer.ts` | 内容语义实例。持有路径、绑定的 Mode、运行时状态，并引用共享 Resource |
| **Resource** | `resource.ts` | 共享内容层。按 path 缓存真实内容、加载状态、错误和 version；多个 Buffer 可共享 |
| **ModeRegistry** | `mode-registry.ts` | Mode 注册表。按顺序匹配文件路径，返回对应 Mode |
| **Router** | `router.ts` | URL hash 路由。解析 `#/file/<path>` → openFile，`#/dir/<path>` → directory mode |
| **EventBus** | `events.ts` | 简单 pub/sub。支持事件：buffer-changed、buffer-created、buffer-closed、focus-changed |
| **ThemeManager** | `theme.ts` | 明暗主题 + CSS 主题切换 |
| **API** | `api.ts` | HTTP 封装：fetchConfig、fetchTree、saveFile |

### Modes（渲染层）

| Mode | 文件 | 匹配规则 | 功能 |
|------|------|----------|------|
| **directory** | `directory.ts` | 路径以 `/` 结尾 | 树形目录视图，展开/折叠，隐藏文件切换 |
| **markdown** | `markdown.ts` | `.md` / `.markdown` | Markdown 渲染，编辑模式，checkbox 交互 |
| **image** | `image.ts` | `.png` / `.jpg` / `.jpeg` / `.gif` / `.svg` / `.webp` / `.ico` | 图片显示 |
| **html** | `html.ts` | `.html` / `.htm` | iframe 沙盒渲染 |
| **raw** | `raw.ts` | 兜底 | 纯文本显示 |
| **buffer-list** | `buffer-list.ts` | `##buffers` | Buffer 列表视图 |

## 工具栏设计

统一工具栏，左边 Mode 按钮，右边全局按钮：

```
[Mode 按钮] [mode:path] ←→ [Buffer 列表 ×] [Aa] [◐]
```

- **Mode 按钮**：由 `mode.renderToolbar()` 渲染，绑定到当前聚焦的 Buffer
  - directory: `.*` 隐藏文件切换
  - markdown: 编辑按钮
- **Buffer 列表**：显示所有打开的 Buffer，可点击切换，可关闭
- **全局按钮**：主题切换、明暗切换

## 聚焦机制

- `app.focusedPane` 跟踪当前聚焦的 Pane
- 点击 Pane 时更新聚焦
- 工具栏显示聚焦 Pane 的 Buffer 的 Mode 按钮
- 目录 Mode 中：
  - 点击文件 → 在主 Pane 打开
  - 点击目录 → 在当前 Pane 导航

## 启动流程

```
main.ts
  → new App()
  → register modes (directory, image, html, markdown, buffer-list, raw)
  → new ThemeManager()
  → app.init()
      → fetchConfig() → load .unipane/config.json
      → fetchTree()   → load file tree from server
      → rootPane.split('horizontal', 0.2) → [sidePane, mainPane]
      → renderPane(sidePane, '/', 'directory')
      → renderPane(mainPane, defaultPage)
      → focusedPane = mainPane
      → updateModeToolbar(mainPane.buffer)
      → mount rootPane to #app
  → setupToolbar(app) → 绑定 Buffer 列表更新
  → theme.init(config)
  → bind theme buttons
  → new Router(app).init()
```

## 数据流

```
用户点击文件 → openFile(path, pane)
  → ResourceStore.get(path)
  → Buffer 已存在？切换 : 创建新 Buffer(Resource + Mode)
  → pane.showBuffer(buffer)
  → Mode.render(ctx)
  → 渲染到 pane.contentEl
  → emit('buffer-changed')
  → updateModeToolbar(buffer)
```

## Pane 布局

```
RootPane (horizontal)
├── SidePane (20%) → directory Buffer（树形视图）
└── MainPane (80%) → 文件内容 Buffer
```

## Content/Mode 分离

当前已引入 Resource / ResourceStore 作为共享内容层，Markdown 和 Raw Mode 已开始通过 Buffer 加载文本内容。后续继续推进到：所有 Mode 不直接 fetch、Viewer 承载显示状态、同一路径可创建不同 Mode 的多个 Buffer 并共享 Resource。

详见 [content-mode-separation.md](content-mode-separation.md)。

## 技术选型

| 技术 | 用途 | 原因 |
|------|------|------|
| TypeScript | 核心语言 | 类型安全，模块化 |
| esbuild | 打包 | 极速，零配置 |
| IIFE 格式 | 输出 | 浏览器直接加载，无需模块系统 |
| marked (CDN) | Markdown | 轻量，浏览器端渲染 |
| Python | HTTP 服务器 | serve.py 提供 API 和静态文件 |
