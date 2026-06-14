# 技术架构

## 目录结构

```
unipane/
├── src/                        TypeScript 源码
│   ├── main.ts                 入口：注册 Plugin、初始化模块、绑定事件
│   ├── core/                   核心模块
│   │   ├── types.ts            接口定义（Plugin, Pane, Config, TreeItem...）
│   │   ├── api.ts              Fetch 封装（config, tree, file, save）
│   │   ├── router.ts           Hash 路由 + Pane 管理
│   │   ├── sidebar.ts          文件树渲染、导航、resize
│   │   └── theme.ts            明暗模式 + CSS 主题切换
│   └── plugins/                Mode（渲染器）
│       ├── markdown.ts         Markdown 渲染、编辑、checkbox
│       ├── directory.ts        目录列表
│       ├── image.ts            图片显示
│       ├── html.ts             HTML iframe
│       └── raw.ts              纯文本兜底
├── main.js                     esbuild 编译输出（IIFE bundle）
├── index.html                  HTML shell
├── serve.py                    Python HTTP server + API
├── themes/                     CSS 主题
│   ├── default.css             基础主题（始终加载）
│   ├── github.css              GitHub 风格叠加
│   └── notion.css              Notion 风格叠加
├── docs/
│   ├── design/                 设计文档（详细）
│   ├── DESIGN.md               设计总览
│   └── NOTES.md                开发笔记
├── package.json                构建脚本 + 依赖
└── tsconfig.json               TypeScript 配置
```

---

## 模块职责

### `core/types.ts` — 接口定义

所有模块共享的类型。Plugin 接口、Pane 状态、Config 结构、TreeItem 等。

### `core/api.ts` — 数据访问

四个 fetch 函数，都带 cache-busting 时间戳：

- `fetchConfig()` → GET `./config.json`
- `fetchTree(showHidden)` → GET `/api/tree`
- `fetchFile(path)` → GET 文件路径
- `saveFile(path, content)` → POST `/api/file`

### `core/router.ts` — 路由 + Pane 管理

Router 类负责：

- Hash 路由解析：`#/`, `#/file/<path>`, `#/page/<pageId>`
- Pane 数组管理：创建、查找、激活、关闭
- 导航历史（pendingHistory）传递
- 两个回调：`onPaneChange`（重绘标签栏）、`onContentRender`（重绘内容区）

关键流程：
1. 用户点击 → `navigateTo(type, value, history?)`
2. 设置 `window.location.hash` → 触发 `hashchange`
3. `handleHashChange` → `openFile` / `openPage` / `openDefault`
4. `activatePane` → 回调渲染

### `core/sidebar.ts` — 侧边栏

- 渲染 config 定义的页面导航（sidebar-nav 区域）
- 获取并渲染文件树（递归 createTreeNode，单击展开/折叠，双击打开目录视图）
- 隐藏文件切换（.* 按钮，切换 showHidden 重新 fetch tree）
- 侧边栏宽度拖拽（`#sidebar-resize` 元素，宽度存 localStorage）
- 侧边栏隐藏/显示（`#toggle-sidebar` 按钮，位于 sidebar 外部以保证收起后仍可点击）

### `core/theme.ts` — 主题

- 始终加载 `themes/default.css`
- 叠加 CSS 主题（github/notion）
- 明暗模式切换（`data-theme` 属性 + CSS 变量）
- localStorage 持久化偏好

---

## Plugin 系统

Plugin 注册顺序决定优先级（first match wins）：

```typescript
const plugins: Plugin[] = [
  directoryPlugin,   // 路径以 / 结尾
  imagePlugin,       // 图片扩展名
  htmlPlugin,        // .html/.htm
  markdownPlugin,    // .md
  rawPlugin,         // 兜底
]
```

Plugin 通过 `match(filepath)` 声明自己处理哪些文件，通过 `render(ctx)` 渲染内容。

详见 [plugins.md](./plugins.md)。

---

## serve.py 职责

### 文件服务

- 用户数据文件：从 ROOT 目录提供
- 引擎文件（index.html, main.js, themes/）：从 ENGINE 目录（serve.py 所在目录）提供
- `/.unipane/config.json`：特殊路由，从 ROOT 提供（用户配置）

### API 端点

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/tree?hidden=true` | 返回目录结构 JSON |
| POST | `/api/file` | 创建/写入文件（JSON body: `{path, content}`） |
| DELETE | `/api/file?path=...` | 删除文件 |

### Root 检测

1. CLI 参数指定 → 使用参数
2. 无参数 → 检查当前目录 `.unipane/config.json` → 读取 `root` 字段
3. 无 config → 使用当前目录

### 安全边界

- 只操作 ROOT 目录内的文件
- 拒绝 ROOT 之外的路径请求
- `BrokenPipeError` 优雅处理

---

## 构建

使用 esbuild 将 TypeScript 模块打包为单个 IIFE bundle：

```bash
npm run build   # esbuild src/main.ts --bundle --outfile=main.js --format=iife
npm run watch   # 同上 + --watch 模式
```

输出 `main.js` 是浏览器直接加载的文件。无需运行时框架依赖。

---

## 启动流程

```
1. python3 serve.py [目录]          启动 HTTP server
2. serve.py 扫描 ROOT 生成文件树
3. 浏览器打开 /.unipane/index.html
4. index.html 加载 marked.js (CDN) + main.js
5. main.ts → fetchConfig()          加载配置
6. main.ts → 初始化 Router/Theme/Sidebar
7. sidebar.init() → fetchTree()     构建文件树
8. router.init() → handleHashChange 解析 URL hash
9. 渲染默认页面或指定文件
10. 用户交互 → 路由切换 → Plugin 渲染
```
