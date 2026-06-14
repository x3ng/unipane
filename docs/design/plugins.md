# Plugin（Mode）机制

当前实现的 Plugin 系统详细说明。

---

## Plugin 接口

```typescript
interface Plugin {
  match(filepath: string): boolean
  render(ctx: RenderContext): void
}
```

- `match` — 返回 true 表示此 Plugin 处理该文件。按注册顺序检查，第一个匹配的 Plugin 生效。
- `render` — 将文件内容渲染到 `ctx.container`。可以创建任意 DOM、绑定事件、调用 `ctx.saveFile` / `ctx.openFile` 等 API。

---

## 内建 Plugin

### markdown (`plugins/markdown.ts`)

**匹配规则：** `.md` 结尾

**外部依赖：** `marked`（CDN 加载，`index.html` 中引入），提供 `marked.parse()` 将 markdown 转为 HTML。

**渲染行为：**
1. 创建 `div.md-content`，用 `marked.parse()` 将 markdown 转为 HTML
2. 调用 `fixLinks` 将相对链接转为 hash 路由（`#/file/...`）
3. 调用 `setupCheckboxes` 让 checkbox 可直接点击切换
4. 在内容上方插入编辑按钮

**交互：**
- 点击相对链接 → `openFile` 打开新 Buffer（带面包屑历史）
- 点击 checkbox → 修改 markdown 源码并 POST 保存
- 点击编辑按钮 → 切换到 textarea 源码编辑器（保存/取消）

**fixLinks 逻辑：**
- 跳过 `#` 开头的锚点链接和 `http://` 等协议链接
- 解码 marked 自动编码的非 ASCII 字符（避免双重编码）
- 相对于当前文件目录解析路径
- 设置 href 为 `#/file/` + encodeURIComponent(绝对路径)

### directory (`plugins/directory.ts`)

**匹配规则：** 路径以 `/` 结尾

**渲染行为：**
- 从 `window.__unipane_tree` 中查找对应目录节点
- 渲染文件/目录列表（带图标）
- 顶部显示父目录链接（`..`）

**交互：**
- 点击文件 → `openFile` 打开
- 点击目录 → `openFile` 打开目录视图

**依赖：** Sidebar 将文件树存到 `window.__unipane_tree`，directory plugin 读取。

### image (`plugins/image.ts`)

**匹配规则：** `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`

**渲染行为：** 创建 `<img>` 元素，src 带 cache-busting 时间戳。

### html (`plugins/html.ts`)

**匹配规则：** `.html`, `.htm`

**渲染行为：** 创建 `<iframe>`，src 为文件路径。

### raw (`plugins/raw.ts`)

**匹配规则：** 兜底，匹配所有文件。

**渲染行为：** 创建 `<pre>` 元素，显示纯文本内容。

---

## RenderContext 详解

```typescript
interface RenderContext {
  container: HTMLElement
  filepath: string
  content: string | null
  root: string
  saveFile(path: string, content: string): Promise<void>
  openFile(path: string, history?: HistoryEntry[]): void
  showBreadcrumb(items: BreadcrumbItem[]): void
}
```

由 `main.ts` 的 `makeContext` 函数创建，绑定到当前 Pane 的状态。

- `container` — `#content` 元素，每次渲染前清空
- `filepath` — 当前 Pane 的 path
- `content` — fetch 到的文件内容（目录视图为 null）
- `root` — 数据根目录（用于构造绝对路径）
- `saveFile` — POST 到 `/api/file`
- `openFile` — 调用 `router.navigateTo('file', path, history)`
- `showBreadcrumb` — 当前未使用（面包屑由 `renderBreadcrumb` 统一处理）

---

## 如何添加新 Plugin

1. 在 `src/plugins/` 下创建新文件：

```typescript
// src/plugins/todo.ts
import { Plugin, RenderContext } from '../core/types'

export const todoPlugin: Plugin = {
  match(filepath: string): boolean {
    return filepath.endsWith('.todo')
  },
  render(ctx: RenderContext) {
    const div = document.createElement('div')
    // 渲染逻辑...
    ctx.container.appendChild(div)
  },
}
```

2. 在 `main.ts` 中注册（注意顺序，插在 rawPlugin 之前）：

```typescript
import { todoPlugin } from './plugins/todo'

const plugins: Plugin[] = [
  directoryPlugin,
  imagePlugin,
  htmlPlugin,
  markdownPlugin,
  todoPlugin,    // 新 Plugin
  rawPlugin,     // 兜底
]
```

3. 重新构建：`npm run build`
