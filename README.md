# Unipane

JSON 配置驱动的纯前端本地内容浏览器。采用 Pane / Buffer / Mode 三层架构，参考 Emacs 设计哲学。

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
http://localhost:8000/.unipane/index.html
```

## 架构

**Buffer 为中心**：所有内容都是 Buffer，Pane 只是布局容器。

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
│       └── buffer-list.ts      Buffer 列表
├── main.js                     构建产物
├── index.html                  HTML shell
├── serve.py                    HTTP server + API
├── themes/                     CSS 主题
└── docs/                       设计文档
```

## 开发

```bash
# 监听模式
npm run watch

# 一次性构建
npm run build
```

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

`.unipane/config.json`：

```json
{
  "title": "My Notes",
  "root": "..",
  "defaultPage": "README.md",
  "theme": "github",
  "css": "my-style.css"
}
```

## 文档

- [设计文档](docs/DESIGN.md) — 总览
- [设计原则](docs/design/principles.md) — 层级规则、操作边界
- [架构详解](docs/design/architecture.md) — 模块职责、启动流程
- [Buffer Viewer 模型](docs/design/buffer-viewer.md) — Pane / Buffer / Mode 设计哲学
- [Mode 系统](docs/design/modes.md) — Mode 接口、内置 Mode、如何扩展
- [Content/Mode 分离](docs/design/content-mode-separation.md) — 下一步架构规划
- [路线图](docs/design/roadmap.md) — 已完成、计划
