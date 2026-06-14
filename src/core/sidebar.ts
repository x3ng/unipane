// Sidebar — file tree, navigation, resize

import { TreeItem, Config } from './types'
import { fetchTree } from './api'
import { Router } from './router'
import { ThemeManager } from './theme'

export class Sidebar {
  private tree: TreeItem[] = []
  private showHidden = false
  private router: Router
  private theme: ThemeManager

  constructor(router: Router, theme: ThemeManager) {
    this.router = router
    this.theme = theme
  }

  async init(config: Config) {
    this.renderNav(config)
    await this.loadTree()
    this.setupResize()
    this.setupToggle()
  }

  private renderNav(config: Config) {
    const nav = document.getElementById('sidebar-nav')!
    nav.innerHTML = ''
    if (!config.pages) return

    Object.keys(config.pages).forEach(id => {
      const page = config.pages![id]
      const el = document.createElement('div')
      el.className = 'nav-item'
      el.textContent = page.title || id
      el.onclick = () => this.router.navigateTo('page', id)
      nav.appendChild(el)
    })
  }

  async loadTree() {
    try {
      this.tree = await fetchTree(this.showHidden)
      this.renderTree()
    } catch (e) {
      console.error('Failed to load tree:', e)
    }
  }

  private renderTree() {
    const container = document.getElementById('file-tree')!
    container.innerHTML = ''
    this.tree.forEach(item => container.appendChild(this.createTreeNode(item)))
  }

  private createTreeNode(item: TreeItem): HTMLElement {
    const el = document.createElement('div')

    if (item.type === 'dir') {
      const header = document.createElement('div')
      header.className = 'tree-item dir'
      header.innerHTML = `<span class="icon">▶</span> ${this.escapeHtml(item.name)}`

      const children = document.createElement('div')
      children.className = 'tree-children collapsed'

      if (item.children) {
        item.children.forEach(child => children.appendChild(this.createTreeNode(child)))
      }

      header.onclick = () => {
        const collapsed = children.classList.toggle('collapsed')
        header.querySelector('.icon')!.textContent = collapsed ? '▶' : '▼'
      }

      header.ondblclick = (e) => {
        e.stopPropagation()
        this.router.navigateTo('file', item.path + '/')
      }

      el.appendChild(header)
      el.appendChild(children)
    } else {
      const file = document.createElement('div')
      file.className = 'tree-item'
      file.innerHTML = `<span class="icon">${this.fileIcon(item.name)}</span> ${this.escapeHtml(item.name)}`
      file.onclick = () => this.router.navigateTo('file', item.path)
      el.appendChild(file)
    }

    return el
  }

  private setupResize() {
    const sidebar = document.getElementById('sidebar')
    const handle = document.getElementById('sidebar-resize')
    if (!sidebar || !handle) return
    let resizing = false

    const savedWidth = localStorage.getItem('unipane-sidebar-width')
    if (savedWidth) sidebar.style.width = savedWidth

    handle.addEventListener('mousedown', (e) => {
      resizing = true
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      e.preventDefault()
    })

    document.addEventListener('mousemove', (e) => {
      if (!resizing) return
      const w = Math.max(150, Math.min(window.innerWidth * 0.5, e.clientX))
      sidebar.style.width = w + 'px'
    })

    document.addEventListener('mouseup', () => {
      if (!resizing) return
      resizing = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      localStorage.setItem('unipane-sidebar-width', sidebar.style.width)
    })
  }

  private setupToggle() {
    const sidebar = document.getElementById('sidebar')
    const btn = document.getElementById('toggle-sidebar')
    if (!sidebar || !btn) return

    btn.addEventListener('click', () => {
      sidebar.classList.toggle('hidden')
      btn.textContent = sidebar.classList.contains('hidden') ? '▶' : '◀'
    })
  }

  setupHiddenToggle() {
    const btn = document.getElementById('toggle-hidden')!
    btn.addEventListener('click', async () => {
      this.showHidden = !this.showHidden
      btn.classList.toggle('active', this.showHidden)
      await this.loadTree()
    })
  }

  private fileIcon(name: string): string {
    if (name.endsWith('.md')) return '📝'
    if (name.endsWith('.html') || name.endsWith('.htm')) return '🌐'
    if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(name)) return '🖼'
    return '📄'
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
  }
}
