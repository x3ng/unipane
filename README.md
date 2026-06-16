# Unipane

JSON 配置驱动的本地内容浏览器。前端运行在浏览器中，配套 `serve.py` 提供本机静态文件服务和文件 API。架构参考 Emacs 设计哲学，核心抽象为 Resource / Buffer / Viewer / Pane / Mode。

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 构建
npm run build

# 3. 在你的数据目录下创建配置
mkdir -p .unipane
cat > .unipane/config.json << 'EOF'
{
  "title": "Notes",
  "root": "..",
  "defaultPage": "README.md"
}
EOF

# 4. 启动 serve
python3 /path/to/unipane/serve.py

# 5. 浏览器打开
http://127.0.0.1:8000/index.html
```

## 架构

**Buffer 为中心，Resource 共享内容**：Resource 持有真实文件内容缓存；Buffer 绑定 Mode 并引用 Resource；Viewer 是 Buffer 的显示会话；Pane 是 Viewer 的布局容器。

```
[Mode 按钮] [mode:path] ←→ [Buffer 列表 ×] [Aa] [◐]
┌─────────────────────────────────────────────────────┐
│ SidePane (20%)  │ MainPane (80%)                    │
│ 目录树          │ 文件内容                          │
│                 │                                   │
└─────────────────────────────────────────────────────┘
```

## 项目结构

```
unipane/
├── src/                        TypeScript 源码
│   ├── main.ts                 入口
│   ├── core/                   框架层
│   │   ├── app.ts              App 编排器
│   │   ├── pane.ts             Pane 分割和 resize
│   │   ├── buffer.ts           Buffer 类
│   │   ├── viewer.ts           Viewer 显示会话
│   │   ├── resource.ts         Resource / ResourceStore 共享内容层
│   │   ├── mode-registry.ts    Mode 注册表
│   │   ├── router.ts           URL hash 路由
│   │   ├── events.ts           EventBus
│   │   ├── api.ts              HTTP API 封装
│   │   ├── theme.ts            主题管理
│   │   ├── util.ts             工具函数
│   │   └── types.ts            类型定义
│   └── modes/                  渲染 Mode
│       ├── markdown.ts         Markdown 渲染和编辑
│       ├── directory.ts        树形目录视图
│       ├── image.ts            图片显示
│       ├── html.ts             HTML iframe
│       ├── raw.ts              纯文本兜底
│       ├── welcome.ts          Welcome 虚拟 Buffer
│       └── buffer-list.ts      Buffer 列表
├── main.js                     构建产物
├── index.html                  HTML shell
├── serve.py                    HTTP server + API
├── themes/                     CSS 主题
└── docs/                       设计文档
```

## 开发

```bash
# 类型检查
npm run typecheck

# 监听模式
npm run watch

# 类型检查 + 一次性构建
npm run build
```

## 安全边界

`serve.py` 默认只监听 `127.0.0.1`，并限制浏览器跨源 API 访问到本机来源。它仍然拥有对配置根目录内文件的读写能力，只应在可信本机环境中运行。

## 功能

**浏览**
- 树形目录视图（展开/折叠）
- 隐藏文件切换（.* 按钮）
- Markdown、HTML、图片渲染
- Markdown 内链接导航（文件和目录）

**编辑**
- Markdown 编辑模式
- Checkbox 直接点击切换

**布局**
- 左右分栏（侧边栏 + 主区域）
- 拖拽调整分割比例
- 聚焦切换（点击 Pane 更新工具栏）

**交互**
- 命令面板（Ctrl+K）
- 文件搜索（Ctrl+Shift+P）

**外观**
- 明暗主题切换
- CSS 主题（default/github/notion）

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+K` | 命令面板 |
| `Ctrl+Shift+P` | 文件搜索 |
| `Ctrl+B` | 切换侧边栏 |
| `Ctrl+W` | 关闭当前 Buffer |
| `Escape` | 关闭面板/对话框 |

## 配置

项目目录的 `.unipane/config.json`：

```json
{
  "title": "My Notes",
  "root": "..",
  "defaultPage": "README.md",
  "theme": "github",
  "css": "my-style.css"
}
```

`.unipane/` 是用户项目控制目录，可放配置、自定义 CSS、主页和 assets。Unipane 内置运行资源由 server 暴露在 `/__unipane__/`，不会占用用户项目的 `.unipane/`。

## 文档

- [设计文档](docs/DESIGN.md) — 总览
- [设计原则](docs/design/principles.md) — 层级规则、操作边界
- [架构详解](docs/design/architecture.md) — 模块职责、启动流程
- [Buffer Viewer 模型](docs/design/buffer-viewer.md) — Resource / Buffer / Viewer / Pane / Mode 设计哲学
- [Mode 系统](docs/design/modes.md) — Mode 接口、内置 Mode、如何扩展
- [Content/Mode 分离](docs/design/content-mode-separation.md) — Resource 共享内容与 Mode 渲染边界
- [路线图](docs/design/roadmap.md) — 已完成、计划
