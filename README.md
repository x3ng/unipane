# Unipane

JSON 配置驱动的纯前端本地内容浏览器。打开即用，数据和显示完全分离。

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

## 项目结构

```
unipane/
├── src/                        TypeScript 源码
│   ├── main.ts                 入口
│   ├── core/                   核心模块
│   │   ├── types.ts            接口定义
│   │   ├── api.ts              fetch 封装
│   │   ├── router.ts           路由 + 标签页
│   │   ├── sidebar.ts          文件树 + 导航
│   │   └── theme.ts            主题切换
│   └── plugins/                文件类型插件
│       ├── markdown.ts         markdown 渲染、编辑、checkbox
│       ├── directory.ts        目录视图
│       ├── image.ts            图片渲染
│       ├── html.ts             iframe 渲染
│       └── raw.ts              纯文本兜底
├── main.js                     构建产物（浏览器加载）
├── index.html                  HTML shell
├── serve.py                    HTTP server + API
├── themes/                     CSS 主题
│   ├── default.css
│   ├── github.css
│   └── notion.css
├── package.json
├── tsconfig.json
└── docs/
    ├── DESIGN.md               设计规格
    └── NOTES.md                笔记
```

## 开发

```bash
# 监听模式，自动编译
npm run watch

# 一次性构建
npm run build
```

## 功能

**浏览**
- 自动扫描本地目录，展示文件树
- 渲染 markdown、HTML、图片等文件
- 标签页多开
- 目录视图（双击文件夹打开）
- 隐藏文件切换（.* 按钮）

**导航**
- markdown 内链接自动在标签页内打开
- 导航历史面包屑
- 侧边栏拖拽调整宽度、可隐藏

**编辑**
- markdown 编辑模式 + checkbox 直接点击

**外观**
- 明暗主题切换（自动/亮/暗）
- CSS 主题（default/github/notion）

## 配置

`.unipane/config.json`：

```json
{
  "title": "My Notes",
  "root": "..",
  "defaultPage": "README.md",
  "theme": "github",
  "css": "my-style.css",
  "sidebar": {
    "exclude": [".unipane", ".git"]
  }
}
```

## 插件系统

每种文件类型由独立插件处理。插件接口：

```typescript
interface Plugin {
  match(filepath: string): boolean
  render(ctx: RenderContext): void
}
```

添加新文件类型：在 `src/plugins/` 创建文件，实现接口，注册到 `src/main.ts`。

## 文档

- [设计文档](docs/DESIGN.md)
- [笔记](docs/NOTES.md)
