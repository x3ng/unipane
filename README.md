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

## 它做什么

- 自动扫描本地目录，展示文件树
- 渲染 markdown、HTML、图片等文件
- 通过 config.json 自定义首页和页面结构
- 支持标签页多开

## 项目结构

```
unipane/                      ← 本仓库（引擎）
├── README.md
├── docs/
│   ├── DESIGN.md             设计规格
│   └── NOTES.md              灵感和待定想法
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

- **title** — 浏览器标签标题
- **root** — 数据根目录，相对于 config.json
- **defaultPage** — 默认页面（文件路径或 pages 的 key）
- **sidebar.exclude** — 文件树排除的目录
- **pages** — 自定义页面（可选）

## 文档

- [设计文档](docs/DESIGN.md) — 架构、概念、接口
- [笔记](docs/NOTES.md) — 灵感和待定想法
