# Unipane 笔记

灵感、想法、待定事项。

---

## 已完成

- [x] serve.py — HTTP server + /api/tree + 文件操作 API
- [x] index.html — HTML shell + CSS 布局
- [x] main.js — config 加载、路由、文件树、标签页、渲染器、widget
- [x] 链接拦截 — 本地文件用 hash 路由，外部链接新标签页打开
- [x] 缓存绕过 — fetch 带时间戳，Cache-Control 头
- [x] 引擎文件自动提供 — 不需要复制到用户数据目录

## 后续想法

- [ ] TypeScript 化：main.js 拆分为 TS 模块
- [ ] 更多 widget：tasks、kv、table
- [ ] 搜索功能：fuse.js 或 WASM ripgrep
- [ ] 编辑功能：textarea + POST 保存
- [ ] 多面板布局：左右分屏、浮动窗口
- [ ] 插件机制：外部 renderer/widget 动态加载
- [ ] 自定义首页：defaultPage 指向 .html 文件
