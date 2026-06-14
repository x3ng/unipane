# Roadmap

已完成和规划。与 design/ 下的实现文档不同，这里记录的是进展和想法。

---

## 已完成

### 核心功能

- [x] serve.py — HTTP server + /api/tree + 文件操作 API
- [x] index.html — HTML shell
- [x] main.js — config 加载、路由、文件树、标签页、渲染器
- [x] 链接拦截 — 内部链接用 hash 路由，外部链接新标签页打开
- [x] 缓存绕过 — fetch 带时间戳，Cache-Control 头
- [x] 引擎文件自动提供 — 不需要复制到用户数据目录

### 主题

- [x] 明暗主题 — 自动/亮/暗，跟随系统偏好
- [x] CSS 主题 — default/github/notion，完整页面样式覆盖

### 文件类型

- [x] markdown 渲染 — HTML + 编辑 + checkbox 直接点击
- [x] 目录视图 — 双击文件夹打开目录内容
- [x] 图片/HTML/纯文本 渲染

### 交互

- [x] 隐藏文件切换 — .* 按钮
- [x] 导航历史面包屑 — 每个标签页独立维护，返回后消失
- [x] 侧边栏调整 — 拖拽宽度、可隐藏

### 工程化

- [x] TypeScript 模块化 — main.js 拆分为 src/core/ + src/plugins/
- [x] esbuild 构建 — npm run build / watch
- [x] serve.py root 自动检测 — 无参数时读取 .unipane/config.json
- [x] BrokenPipeError 优雅处理

### Bug 修复

- [x] Sidebar 初始化崩溃 — 缺失 DOM 元素导致 null 引用
- [x] 中文文件名双重编码 — marked 自动编码 + fixLinks 重复编码

---

## 近期规划

### Status Bar（Mode Line）

底部状态栏，显示当前 Buffer 的信息：

```
[文件路径]              [Mode 名]  [文件信息]
```

内容由当前 Mode 提供，框架负责显示和布局。类似 Emacs 的 Mode Line。

### 侧边栏收起后的控制

侧边栏收起后，主题切换、隐藏文件等功能不可用。需要一个不依赖侧边栏的控制入口：
- 方案 A：Status Bar 集成控制按钮
- 方案 B：独立的控制面板（类似 Emacs which-key）
- 方案 C：快捷键系统

### Plugin 扩展机制

当前 Plugin 列表是硬编码的。规划支持从 `.unipane/plugins/` 加载外部 Mode：
- 用户放一个 JS 文件，导出 Plugin 接口
- 框架动态加载并注册
- 需要考虑安全边界（沙箱或信任模型）

---

## 远期方向

- 搜索 — fuse.js 或 WASM ripgrep 前端全文搜索
- 多面板布局 — 左右分屏、浮动窗口（Emacs Window 概念）
- 文件创建/删除 — 右键菜单或浮动按钮
- 图片上传 — 拖拽或粘贴
- 自定义首页 — defaultPage 指向 .html 文件
