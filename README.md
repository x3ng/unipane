# Unipane

JSON 配置驱动的纯前端本地内容浏览器。打开即用，数据和显示完全分离。

## 快速开始

```bash
# 1. 在你的数据目录下创建配置
mkdir -p .unipane
cat > .unipane/config.json << 'EOF'
{
  "title": "Notes",
  "root": "..",
  "defaultPage": "README.md"
}
EOF

# 2. 启动 serve
python3 /path/to/unipane/serve.py

# 3. 浏览器打开
http://localhost:8000/.unipane/index.html
```

## 功能

**浏览**
- 自动扫描本地目录，展示文件树
- 渲染 markdown、HTML、图片等文件
- 标签页多开
- 点击 markdown 内链接自动在标签页内打开

**编辑**
- markdown 文件：点"编辑"切换到源码模式，保存后自动刷新
- checkbox：查看模式下直接点击切换 `[ ]` ↔ `[x]`，自动保存

**外观**
- 明暗主题切换（自动/亮/暗），跟随系统偏好
- CSS 主题选择（default/github/notion），完整页面样式覆盖
- 主题偏好保存在 localStorage
- 侧边栏按钮：`.*` 隐藏文件、`Aa` CSS 主题、`◐` 明暗主题

**移动端**
- 局域网内手机可访问，自动响应式布局

## 项目结构

```
unipane/                      ← 本仓库（引擎）
├── README.md
├── docs/
│   ├── DESIGN.md             设计规格
│   └── NOTES.md              灵感和待定想法
├── themes/
│   ├── default.css           默认主题
│   ├── github.css            GitHub 风格
│   └── notion.css            Notion 风格
├── index.html                HTML shell
├── main.js                   前端逻辑
└── serve.py                  HTTP server + API

用户数据目录/                  ← 你的数据
├── .unipane/
│   └── config.json           配置文件（唯一需要创建的文件）
└── ...                       你的文件
```

引擎文件由 serve.py 自动提供，不需要复制到数据目录。

## 配置

`.unipane/config.json` 示例：

```json
{
  "title": "My Notes",
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
- **root** — 数据根目录，相对于 config.json
- **defaultPage** — 默认页面（文件路径或 pages 的 key）
- **theme** — 默认 CSS 主题（default/github/notion）
- **css** — 自定义 CSS 文件路径（相对于 root，始终加载）
- **sidebar.exclude** — 文件树排除的目录
- **pages** — 自定义页面（可选）

## 文档

- [设计文档](docs/DESIGN.md) — 架构、概念、接口
- [笔记](docs/NOTES.md) — 灵感和待定想法
