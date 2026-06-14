// Directory plugin — list directory contents

import { Plugin, RenderContext, TreeItem } from '../core/types'

export const directoryPlugin: Plugin = {
  match(filepath: string): boolean {
    return filepath.endsWith('/')
  },

  render(ctx: RenderContext) {
    // Find directory in tree (stored on window by sidebar)
    const tree = (window as any).__unipane_tree as TreeItem[] | undefined
    if (!tree) {
      ctx.container.textContent = 'File tree not loaded'
      return
    }

    const dirPath = ctx.filepath.replace(/\/$/, '')
    const dir = this.findDir(tree, dirPath)
    if (!dir) {
      ctx.container.textContent = 'Directory not found: ' + dirPath
      return
    }

    const list = document.createElement('div')
    list.className = 'dir-list'

    // Parent directory link
    if (dirPath && dirPath !== '.') {
      const parent = document.createElement('div')
      parent.className = 'tree-item'
      parent.innerHTML = '<span class="icon">📁</span> ..'
      parent.onclick = () => {
        const parentPath = dirPath.split('/').slice(0, -1).join('/')
        ctx.openFile(parentPath ? parentPath + '/' : '')
      }
      list.appendChild(parent)
    }

    // Directory contents
    dir.children?.forEach(item => {
      const el = document.createElement('div')
      el.className = 'tree-item' + (item.type === 'dir' ? ' dir' : '')
      const icon = item.type === 'dir' ? '📁' : this.fileIcon(item.name)
      el.innerHTML = `<span class="icon">${icon}</span> ${this.escapeHtml(item.name)}`
      el.onclick = () => ctx.openFile(item.path + (item.type === 'dir' ? '/' : ''))
      list.appendChild(el)
    })

    ctx.container.appendChild(list)
  },

  findDir(items: TreeItem[], path: string): TreeItem | null {
    for (const item of items) {
      if (item.path === path && item.type === 'dir') return item
      if (item.children) {
        const found = this.findDir(item.children, path)
        if (found) return found
      }
    }
    return null
  },

  fileIcon(name: string): string {
    if (name.endsWith('.md')) return '📝'
    if (name.endsWith('.html') || name.endsWith('.htm')) return '🌐'
    if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(name)) return '🖼'
    return '📄'
  },

  escapeHtml(str: string): string {
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
  },
}
