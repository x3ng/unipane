# Unipane 设计文档

## 概述

Unipane 是一个本地内容浏览器，采用 Resource / Buffer / Viewer / Pane / Mode 架构。核心设计哲学参考 Emacs：框架管理内容资源、Buffer 生命周期和布局，内容渲染由 Mode 驱动。

## 核心概念

| 概念 | 定义 |
|------|------|
| **Resource** | 真实内容资源（通常是文件路径）的共享缓存，负责 load/error/version |
| **Pane** | 显示容器，可嵌套分割，每个叶子 Pane 显示一个 Viewer |
| **Buffer** | 内容语义实例（Resource + Mode + 状态），独立于显示 |
| **Viewer** | Buffer 的一次显示会话，承载滚动、选择、光标、局部 UI 状态 |
| **Mode** | 渲染处理器，接收 Buffer 渲染到 Pane |

## 文件结构

```
src/
├── main.ts                 — 入口
├── core/
│   ├── app.ts              — App 编排器
│   ├── pane.ts             — Pane 类（分割、resize、显示 Viewer）
│   ├── buffer.ts           — Buffer 类
│   ├── viewer.ts           — Viewer 显示会话
│   ├── resource.ts         — Resource / ResourceStore 共享内容层
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
    ├── welcome.ts          — Welcome 虚拟 Buffer
    └── buffer-list.ts      — Buffer 列表
```

## 设计文档

- [设计原则](design/principles.md) — 层级规则、操作边界、安全层原则
- [架构详解](design/architecture.md) — 模块职责、启动流程、技术选型
- [Buffer Viewer 模型](design/buffer-viewer.md) — Resource / Buffer / Viewer / Pane / Mode 设计哲学
- [Mode 系统](design/modes.md) — Mode 接口、内置 Mode、如何扩展
- [Content/Mode 分离](design/content-mode-separation.md) — Resource 持有内容、Buffer 绑定 Mode、Viewer 管显示状态
- [路线图](design/roadmap.md) — 已完成、近期计划、长期方向
