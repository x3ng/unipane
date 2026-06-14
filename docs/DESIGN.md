# Unipane

## 定位

JSON 配置驱动的纯前端本地内容浏览器。打开即用，数据和显示完全分离。

- **Universal** — 不只 markdown，任何文件类型都可以有对应的渲染器
- **Pane** — 面板/窗格，专注展示本地文件内容

## 核心原则

### 数据与显示完全分离

用户数据目录（root）和 unipane 引擎是独立的。unipane 不嵌入、不 build、不预处理用户数据，只在浏览器端通过 fetch 实时读取和渲染文件。

### 配置驱动

`.unipane/config.json` 是唯一的人机界面。改它就改整个页面：默认首页、侧边栏结构、主题、样式。

### 可插拔渲染器

每种文件后缀对应一个渲染器。加新类型只加一个文件，注册到渲染器列表即可。

### 本地优先

不依赖任何远程服务。唯一需要的是一个本地 HTTP server，仅用于绕过浏览器 file:// 协议的 CORS 限制。

---

## 核心概念

### Root（数据根目录）

unipane 看到的最顶层目录。所有文件路径都相对于 root 解析。

确定优先级：
1. CLI 参数：`python3 serve.py /path/to/notes`
2. config 字段：`"root": "/path/to/notes"`
3. 默认值：`.`（当前目录）

### Renderer（渲染器）

知道如何显示一种文件类型的组件。

内建渲染器：
- **markdown** — .md → HTML（支持编辑、checkbox 交互、导航历史面包屑）
- **directory** — 目录 → 文件列表（双击文件夹打开）
- **html** — .html → iframe（浏览器原生）
- **image** — .png/.jpg/.gif → img（浏览器原生）
- **raw** — 未知类型 → 纯文本 pre（兜底）

### View（视图）

标签页里显示的内容：

```typescript
type View =
  | { type: 'file', path: string }       // 显示文件
  | { type: 'page', pageId: string }     // 显示配置页面
  | { type: 'html', path: string }       // 显示用户自定义 HTML
```

### Pane（面板）

一个标签页，包含一个 View、一个标题和导航历史。

### Layout（布局）

管理多个 Pane 的排列方式。MVP 只做标签页模式：多个 Pane 以标签页形式切换，同一时间只显示一个。

---

## 路由

使用 hash 路由，不需要 serve 端配合。

URL 格式：
- `#/` — 显示 defaultPage
- `#/file/<path>` — 显示文件
- `#/page/<pageId>` — 显示配置页面

路由和标签页的关系：路由决定"当前标签页显示什么"。点击侧边栏时，要么激活已有标签页，要么创建新标签页。

---

## 导航历史面包屑

每个标签页独立维护导航历史。当从文件 A 点击链接跳转到文件 B 时：
- 文件 B 的标签页显示面包屑：A > B
- 文件 A 的标签页保持原样

点击面包屑中的条目可返回对应位置，返回后该条目之后的历史被清除。

从侧边栏直接打开文件时，历史为空（新起点）。

---

## 主题系统

### 明暗模式

三种模式：自动（跟随系统）、亮色、暗色。

实现方式：
- CSS 变量定义颜色（`--bg`, `--text`, `--border` 等）
- `@media (prefers-color-scheme: dark)` 处理自动模式
- `html[data-theme="light/dark"]` 处理手动切换
- 偏好保存在 localStorage

### CSS 主题

每个主题是一个完整的 CSS 文件，覆盖整个页面样式（侧边栏、标签页、内容区）。

内建主题：
- **default** — 默认主题
- **github** — GitHub 风格
- **notion** — Notion 风格

主题加载顺序：
1. 始终加载 `themes/default.css` 作为基础
2. 用户选择的主题 CSS 叠加覆盖
3. config.css（用户自定义）始终加载

主题切换通过侧边栏 `Aa` 按钮，偏好保存在 localStorage。

### 设计约束

每个主题必须同时定义亮色和暗色配色（通过 CSS 变量）。如果只定义一套配色，切换模式时会出现颜色不匹配。

---

## 编辑功能

### markdown 编辑

查看模式下点"编辑"按钮，切换到 textarea 源码编辑器。编辑完点"保存"，POST 到 serve 端，自动切回查看模式。

### checkbox 交互

查看模式下，checkbox（`- [ ]` / `- [x]`）可直接点击切换。点击后：
1. 找到对应的 markdown 源码行
2. 切换 `[ ]` ↔ `[x]`
3. POST 保存整个文件

---

## 侧边栏

### 文件树

serve 端扫描 root 目录，返回文件树 JSON。前端渲染为可折叠的树形结构。

功能：
- 单击文件夹：展开/折叠
- 双击文件夹：打开目录视图
- 单击文件：在标签页中打开
- `.*` 按钮：切换显示隐藏文件

### 侧边栏调整

- 右边缘拖拽调整宽度
- `◀` 按钮隐藏侧边栏
- 宽度保存在 localStorage

---

## 配置文件

### config.json 结构

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

### 字段说明

- **title** — 浏览器标签标题
- **root** — 数据根目录，相对于 config.json 所在目录。可选，默认 `..`
- **defaultPage** — 默认显示的页面（文件路径或 pages 的 key）
- **theme** — 默认 CSS 主题（default/github/notion）
- **css** — 自定义 CSS 文件路径（相对于 root，始终加载）
- **sidebar.mode** — `auto`（serve 端自动扫描文件树）| `manual`（手动定义）
- **sidebar.exclude** — auto 模式下排除的目录名

---

## 操作维度

### 读操作（内建）

- 渲染任何支持的文件类型
- 文件树扫描（serve 端自动完成）
- 标签页多开
- 隐藏文件切换
- 目录视图

### 写操作（需 serve 端配合）

- markdown 编辑（编辑模式 + 保存）
- checkbox 切换（查看模式直接点击）

安全边界：只操作 root 目录内的文件。

### 暂不支持

- 批量导入
- 文件同步
- 版本管理（交给 git）

---

## 架构

```
unipane/
├── index.html              HTML shell（最小 reset）
├── main.js                 前端逻辑（单文件，后续拆 TS）
├── serve.py                HTTP server + API
└── themes/
    ├── default.css         默认主题
    ├── github.css          GitHub 风格
    └── notion.css          Notion 风格
```

### serve.py 职责

- 静态文件服务（用户数据从 ROOT，引擎文件从 ENGINE）
- `GET /api/tree?hidden=true` — 返回目录结构 JSON
- `POST /api/file` — 创建/写入文件
- `DELETE /api/file` — 删除文件
- `GET /.unipane/*` — 引擎文件（index.html, main.js, themes/）
- `GET /.unipane/config.json` — 配置文件（从用户数据目录）

安全边界：只操作 root 目录内的文件。拒绝 root 之外的路径请求。

### main.js 职责

- Config 加载
- Hash 路由 + 标签页管理
- 文件树获取和渲染
- Renderer 分发（markdown/directory/html/image/raw）
- markdown 编辑和 checkbox 交互
- 导航历史面包屑
- 主题切换（明暗 + CSS 主题）
- 侧边栏调整（拖拽、隐藏）

---

## 启动流程

1. 用户执行 `python3 serve.py [目录]`
2. serve 端启动 HTTP server，扫描目录生成文件树
3. 浏览器打开 `http://localhost:8000/.unipane/index.html`
4. 前端 fetch config.json
5. 前端加载默认 CSS 主题
6. 前端 fetch /api/tree，构建侧边栏文件树
7. 前端解析 URL hash，渲染对应 View
8. 用户点击侧边栏 → 切换/创建标签页 → fetch 文件 → 渲染

---

## 技术选型

- JavaScript（单文件，后续拆 TypeScript）
- 无需框架，纯 DOM 操作
- CSS 变量实现主题切换
- marked.js（CDN）渲染 markdown
- Python（serve 工具）

---

## 未来方向

- TypeScript 化：main.js 拆分为模块
- 搜索（前端全文搜索）
- 多面板布局（左右分屏、浮动窗口）
- 插件机制（外部 renderer/widget 动态加载）
- 文件创建/删除（右键菜单）
- 图片上传（拖拽或粘贴）
