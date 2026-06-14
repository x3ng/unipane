# Unipane

## 定位

JSON 配置驱动的纯前端本地内容浏览器。打开即用，数据和显示完全分离。

- **Universal** — 不只 markdown，任何文件类型都可以有对应的渲染器
- **Pane** — 面板/窗格，专注展示本地文件内容

## 核心原则

- **数据与显示完全分离** — unipane 不嵌入、不 build、不预处理用户数据，只在浏览器端通过 fetch 实时读取和渲染文件
- **配置驱动** — `.unipane/config.json` 是唯一的人机界面
- **可插拔渲染器** — 每种文件后缀对应一个渲染器（Mode），加新类型只加一个文件
- **本地优先** — 不依赖远程服务，唯一需要的是本地 HTTP server

## 架构概览

```
unipane/
├── src/                   TypeScript 源码
│   ├── core/              核心模块（types, api, router, sidebar, theme）
│   └── plugins/           Mode（markdown, directory, image, html, raw）
├── main.js                esbuild 编译输出
├── index.html             HTML shell
├── serve.py               HTTP server + API
└── themes/                CSS 主题
```

**Buffer Viewer 模型：** 框架管理 Buffer（Pane）的生命周期和布局，Mode（Plugin）自包含渲染和交互逻辑。详见 [design/buffer-viewer.md](./design/buffer-viewer.md)。

**Plugin 系统：** 每个 Plugin 实现 match(filepath) + render(ctx)，通过 RenderContext 调用框架 API。详见 [design/plugins.md](./design/plugins.md)。

**技术架构：** 模块职责、serve.py 规则、构建流程、启动顺序。详见 [design/architecture.md](./design/architecture.md)。

## 核心概念

### Root（数据根目录）

确定优先级：
1. CLI 参数：`python3 serve.py /path/to/notes`
2. config 字段：`"root": "/path/to/notes"`
3. 自动检测：当前目录 `.unipane/config.json` 中的 root 字段
4. 默认值：`.`（当前目录）

### 配置文件

`.unipane/config.json` 结构：

```json
{
  "title": "Notes",
  "root": "..",
  "defaultPage": "README.md",
  "theme": "github",
  "css": "my-style.css",
  "sidebar": {
    "mode": "auto",
    "exclude": [".unipane", ".git"]
  }
}
```

- **title** — 浏览器标签标题
- **root** — 数据根目录，相对于 config.json 所在目录
- **defaultPage** — 默认显示的文件路径或 pages 的 key
- **theme** — 默认 CSS 主题（default/github/notion）
- **css** — 自定义 CSS 文件路径（相对于 root）
- **sidebar.exclude** — auto 模式下排除的目录名

### 路由

Hash 路由，不需要 serve 端配合：
- `#/` — 显示 defaultPage
- `#/file/<path>` — 显示文件
- `#/page/<pageId>` — 显示配置页面

### 导航历史面包屑

每个标签页独立维护。从文件 A 点击链接到文件 B 时，B 的标签页显示面包屑 `A > B`。点击面包屑条目可返回。

### 主题系统

两层：
1. 明暗模式 — 自动/亮/暗，CSS 变量 + `prefers-color-scheme` + `data-theme`
2. CSS 主题 — default/github/notion，叠加覆盖

偏好保存在 localStorage。

### 编辑功能

- markdown 查看模式点"编辑"→ textarea 源码编辑器 → 保存/取消
- checkbox（`- [ ]` / `- [x]`）可直接点击切换，自动保存

## 已完成和规划

详见 [design/roadmap.md](./design/roadmap.md)。

