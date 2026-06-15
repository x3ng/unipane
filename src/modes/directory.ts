// Directory Mode — tree view with expand/collapse, hidden files toggle

import type { Mode } from '../core/mode-registry'
import type { ModeContext } from '../core/mode-registry'
import type { Buffer } from '../core/buffer'
import type { App } from '../core/app'
import type { TreeItem } from '../core/types'
import { fileIcon } from '../core/util'
import { fetchTree } from '../core/api'

export const directoryMode: Mode = {
  name: 'directory',

  match(path: string): boolean {
    return path.endsWith('/')
  },

  render(ctx: ModeContext) {
    const tree = ctx.app.tree
    if (!tree) {
      ctx.container.textContent = 'File tree not loaded'
      return
    }

    const dirPath = ctx.buffer.path.replace(/\/$/, '')
    const isRoot = !dirPath

    const list = document.createElement('div')
    list.className = 'dir-tree'

    const items = isRoot ? tree : findDir(tree, dirPath)?.children

    if (!items) {
      list.textContent = 'Directory not found: ' + dirPath
      ctx.container.appendChild(list)
      return
    }

    // 返回上级（非根目录）
    if (!isRoot) {
      const parentItem = document.createElement('div')
      parentItem.className = 'tree-item'
      parentItem.innerHTML = '<span class="tree-icon">📁</span> <span class="tree-name">..</span>'
      parentItem.onclick = () => {
        const parentPath = dirPath.split('/').slice(0, -1).join('/')
        const target = parentPath ? parentPath + '/' : '/'
        // 目录在侧边 Pane 导航
        ctx.app.openFile(target, ctx.pane)
      }
      list.appendChild(parentItem)
    }

    // 根目录快捷方式（非根目录时显示）
    if (!isRoot) {
      const rootItem = document.createElement('div')
      rootItem.className = 'tree-item'
      rootItem.innerHTML = '<span class="tree-icon">📁</span> <span class="tree-name">/</span>'
      rootItem.onclick = () => ctx.app.openFile('/', ctx.pane)
      list.appendChild(rootItem)
    }

    // 渲染目录树
    renderTree(list, items, ctx)
    ctx.container.appendChild(list)
  },

  renderToolbar(container: HTMLElement, buffer: Buffer, app: App) {
    const showHidden = buffer.state.showHidden ?? false

    const toggleHidden = document.createElement('button')
    toggleHidden.className = 'toolbar-btn' + (showHidden ? ' active' : '')
    toggleHidden.textContent = '.*'
    toggleHidden.title = showHidden ? '隐藏点文件' : '显示隐藏文件'
    toggleHidden.onclick = async () => {
      // 切换状态
      buffer.state.showHidden = !showHidden
      // 重新加载树
      app.tree = await fetchTree(buffer.state.showHidden)
      // 刷新当前 Buffer
      const pane = app.rootPane.findPaneByBuffer(buffer.path)
      if (pane) {
        app.renderPane(pane, buffer.path)
      }
      // 更新工具栏
      app.updateModeToolbar(buffer)
    }
    container.appendChild(toggleHidden)
  },
}

function renderTree(container: HTMLElement, items: TreeItem[], ctx: ModeContext) {
  items.forEach(item => {
    const row = document.createElement('div')
    row.className = 'tree-item'

    if (item.type === 'dir') {
      const toggle = document.createElement('span')
      toggle.className = 'tree-toggle'
      toggle.textContent = '▶'

      const icon = document.createElement('span')
      icon.className = 'tree-icon'
      icon.textContent = '📁'

      const name = document.createElement('span')
      name.className = 'tree-name'
      name.textContent = item.name

      row.appendChild(toggle)
      row.appendChild(icon)
      row.appendChild(name)

      const children = document.createElement('div')
      children.className = 'tree-children collapsed'

      row.onclick = (e) => {
        e.stopPropagation()
        const isExpanded = !children.classList.contains('collapsed')
        if (isExpanded) {
          children.classList.add('collapsed')
          toggle.textContent = '▶'
        } else {
          children.classList.remove('collapsed')
          toggle.textContent = '▼'
          if (children.children.length === 0 && item.children) {
            renderTree(children, item.children, ctx)
          }
        }
      }

      row.ondblclick = (e) => {
        e.stopPropagation()
        ctx.openFile(item.path + '/')
      }

      container.appendChild(row)
      container.appendChild(children)
    } else {
      const icon = document.createElement('span')
      icon.className = 'tree-icon'
      icon.textContent = fileIcon(item.name)

      const name = document.createElement('span')
      name.className = 'tree-name'
      name.textContent = item.name

      row.appendChild(icon)
      row.appendChild(name)
      // 文件在主 Pane 打开
      row.onclick = () => ctx.app.openFile(item.path, ctx.app.mainPane || undefined)
      container.appendChild(row)
    }
  })
}

function findDir(items: TreeItem[], path: string): TreeItem | null {
  for (const item of items) {
    if (item.path === path && item.type === 'dir') return item
    if (item.children) {
      const found = findDir(item.children, path)
      if (found) return found
    }
  }
  return null
}
