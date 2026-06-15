# Mode 系统

## Mode 接口

```typescript
interface Mode {
  name: string
  match(path: string): boolean
  render(ctx: ModeContext): void
  renderToolbar?(container: HTMLElement, buffer: Buffer, app: App): void
}
```

## ModeContext

```typescript
interface ModeContext {
  buffer: Buffer          // 当前 Buffer
  pane: Pane              // 当前 Pane
  container: HTMLElement  // 渲染目标容器
  openFile(path: string): void
  saveFile(path: string, content: string): Promise<void>
  app: App
}
```

## 内置 Mode

### directory

匹配：路径以 `/` 结尾

功能：
- 树形目录视图，支持展开/折叠
- 懒加载子节点
- 隐藏文件切换（per-buffer 状态）
- `..` 返回上级，`/` 返回根目录
- 单击文件 → 在主 Pane 打开
- 单击目录 → 展开/折叠
- 双击目录 → 在当前 Pane 导航进入

工具栏按钮：
- `.*` 切换隐藏文件显示

### markdown

匹配：`.md` / `.markdown`

功能：
- 使用 `marked` 渲染 Markdown（DOMPurify 防 XSS）
- 自动修复相对链接：目录链接（`/` 结尾）→ `#/dir/...`，文件链接 → `#/file/...`
- Checkbox 交互（点击切换并保存，支持大写 X 和缩进）
- 编辑模式（textarea）

工具栏按钮：
- 预览模式：[编辑] — 切换到编辑模式
- 编辑模式：[保存] [取消] — 保存或取消编辑

### image

匹配：`.png` / `.jpg` / `.jpeg` / `.gif` / `.svg` / `.webp` / `.ico`

功能：显示 `<img>` 标签，自适应容器宽度

### html

匹配：`.html` / `.htm`

功能：iframe 沙盒渲染

### raw

匹配：所有文件（兜底）

功能：纯文本显示在 `<pre>` 标签中

### buffer-list

匹配：特殊路径 `##buffers`

功能：显示所有已打开的 Buffer 列表

## 注册顺序

```typescript
app.modes.register(directoryMode)   // 最先匹配目录
app.modes.register(imageMode)
app.modes.register(htmlMode)
app.modes.register(markdownMode)
app.modes.register(bufferListMode)
app.modes.register(rawMode)         // 兜底
```

## 添加自定义 Mode

```typescript
const csvMode: Mode = {
  name: 'csv',
  match: (path) => path.endsWith('.csv'),
  render: (ctx) => {
    // 渲染逻辑
  },
  renderToolbar: (container, buffer, app) => {
    // 工具栏按钮（可选）
  }
}

app.modes.register(csvMode)
```
