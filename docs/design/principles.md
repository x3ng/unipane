# 设计原则

## 层级规则

```
App → Pane → Buffer → Mode
```

每层职责明确，不越界：

| 层级 | 职责 | 操作 |
|------|------|------|
| **App** | 全局状态、生命周期 | createBuffer、closeBuffer |
| **Pane** | 布局、显示/隐藏 | show、hide、split |
| **Buffer** | 内容实例 | 绑定 Mode、持有状态 |
| **Mode** | 渲染内容 | render、renderToolbar |

## 操作边界

### Toggle vs Close

| 操作 | 行为 | 资源 |
|------|------|------|
| **Toggle** | 隐藏/显示 Pane | Buffer 保留在内存 |
| **Close** | 销毁 Buffer，隐藏 Pane | 释放内存 |

**示例：**
- `Ctrl+B` 切换侧边栏 — 隐藏/显示，Buffer 保留
- `×` 按钮关闭 Buffer — 销毁 Buffer，隐藏 Pane
- 再次 `Ctrl+B` — 如果 Pane 为空则创建新 Buffer

### 安全层原则

1. **能用低层 API 就不用高层 Hack**
   - 用 `pane.hide()` 而不是直接操作 `element.style.display`
   - 用 `app.closeBuffer()` 而不是手动清理 DOM

2. **修改行为前检查是否已有实现**
   - Pane 已有 `show()/hide()` → 用它
   - Mode 已有 `renderToolbar()` → 用它

3. **不破坏已有契约**
   - Buffer 的 `state` 是 per-buffer 的
   - Pane 的 `visible` 状态不影响 Buffer

## 快捷键规范

| 快捷键 | 功能 | 说明 |
|--------|------|------|
| `Ctrl+K` | 命令面板 | 不与浏览器冲突 |
| `Ctrl+Shift+P` | 文件搜索 | 快速打开文件 |
| `Ctrl+B` | 切换侧边栏 | 保留 Buffer |
| `Ctrl+W` | 关闭当前 Buffer | 销毁 Buffer |
| `Escape` | 关闭面板/对话框 | 统一退出 |

## 命令规范

### 全局命令
始终可用，不依赖特定 Buffer：
- 打开文件
- 切换侧边栏
- 切换主题

### Mode 命令
仅在对应 Mode 激活时可用：
- 编辑 Markdown（markdown Mode）
- 切换隐藏文件（directory Mode）

### 不可用命令
灰色显示，标注原因（属于哪个 Mode）
