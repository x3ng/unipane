# 路线图

## 已完成

### 基础架构
- [x] TypeScript 模块化重构
- [x] Pane / Buffer / Mode 三层架构
- [x] Buffer 为中心的设计
- [x] esbuild 打包（IIFE 格式）
- [x] hash 路由（`#/file/<path>`）

### 核心功能
- [x] 文件浏览（目录树 + 内容显示）
- [x] Markdown 渲染（marked 库）
- [x] Markdown 编辑（textarea + 保存）
- [x] Checkbox 交互（直接点击切换）
- [x] 图片显示
- [x] HTML iframe 沙盒渲染
- [x] 纯文本显示（兜底 Mode）

### UI
- [x] Pane 分割（左右布局）
- [x] Pane resize（拖拽分割线）
- [x] 统一工具栏（Mode 按钮 + Buffer 列表 + 全局按钮）
- [x] 聚焦机制（点击 Pane 更新工具栏）
- [x] 明暗主题切换
- [x] CSS 主题切换（default / github / notion）
- [x] 中文文件名支持

### Mode 系统
- [x] Mode 接口（match、render、renderToolbar）
- [x] 目录 Mode（树形视图、展开折叠、隐藏文件切换）
- [x] Markdown Mode（渲染、编辑、工具栏按钮）
- [x] Buffer 列表 Mode

### 后端
- [x] serve.py 静态文件服务
- [x] 文件树 API（`/api/tree`）
- [x] 文件读写 API
- [x] `.unipane/config.json` 配置
- [x] Root 自动检测

## 近期计划

### Mode 扩展
- [ ] 代码高亮 Mode（基于 highlight.js 或 Prism）
- [ ] PDF 查看 Mode
- [ ] 音频/视频 Mode

### 布局增强
- [x] 垂直分割（上下布局）— 已实现
- [ ] 浮动面板
- [ ] 布局保存/恢复

### 交互增强
- [ ] 键盘快捷键
- [ ] 拖拽文件到 Pane
- [ ] 右键菜单

## 长期方向

### 插件系统
- [ ] 外部插件加载
- [ ] 插件 API 文档

### 多窗口
- [ ] 多 Frame 支持
- [ ] 窗口布局持久化

### 协作
- [ ] WebSocket 实时同步
- [ ] 多人编辑

### 性能
- [ ] 虚拟滚动（大目录）
- [ ] 懒加载（大文件）
- [ ] Service Worker 离线支持
