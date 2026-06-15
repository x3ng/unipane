# Unipane 设计文档

## 概述

Unipane 是一个本地内容浏览器，采用 Pane / Buffer / Mode 三层架构。核心设计哲学参考 Emacs：框架只管理布局和 Buffer 生命周期，所有内容渲染由 Mode 驱动。

## 核心概念

| 概念 | 定义 |
|------|------|
| **Pane** | 显示容器，可嵌套分割，每个叶子 Pane 显示一个 Buffer |
| **Buffer** | 内容实例（路径 + Mode + 状态），独立于显示 |
| **Mode** | 渲染处理器，接收 Buffer 渲染到 Pane |

## 文件结构

```
src/
├── main.ts                 — 入口
├── core/
│   ├── app.ts              — App 编排器
│   ├── pane.ts             — Pane 类（分割、resize、显示 Buffer）
│   ├── buffer.ts           — Buffer 类
│   ├── mode-registry.ts    — Mode 注册表
│   ├── router.ts           — URL hash → App.openFile()
│   ├── events.ts           — EventBus
│   ├── api.ts              — HTTP API 封装
│   ├── theme.ts            — 主题管理
│   ├── util.ts             — 共享工具函数
│   └── types.ts            — 类型定义
└── modes/
    ├── markdown.ts         — Markdown 渲染
    ├── image.ts            — 图片显示
    ├── directory.ts        — 目录列表
    ├── html.ts             — HTML iframe
    ├── raw.ts              — 纯文本
    └── buffer-list.ts      — Buffer 列表
```

## 设计文档

- [设计原则](design/principles.md) — 层级规则、操作边界、安全层原则
- [架构详解](design/architecture.md) — 模块职责、启动流程、技术选型
- [Buffer Viewer 模型](design/buffer-viewer.md) — Pane / Buffer / Mode 设计哲学
- [Mode 系统](design/modes.md) — Mode 接口、内置 Mode、如何扩展
- [Content/Mode 分离](design/content-mode-separation.md) — Buffer 持有内容、Mode 只管渲染（规划中）
- [路线图](design/roadmap.md) — 已完成、近期计划、长期方向
