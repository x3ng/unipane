// Router — hash-based routing and tab management

import { Pane, HistoryEntry, Config } from './types'
import { bust } from './api'

export class Router {
  private panes: Pane[] = []
  private activeId: string | null = null
  private pendingHistory: HistoryEntry[] | null = null
  private config: Config = {}
  private root = ''

  // Callbacks
  private onPaneChange: () => void = () => {}
  private onContentRender: (pane: Pane) => void = () => {}

  setConfig(config: Config, root: string) {
    this.config = config
    this.root = root
  }

  setCallbacks(onPaneChange: () => void, onContentRender: (pane: Pane) => void) {
    this.onPaneChange = onPaneChange
    this.onContentRender = onContentRender
  }

  init() {
    window.addEventListener('hashchange', () => this.handleHashChange())
    this.handleHashChange()
  }

  navigateTo(type: 'file' | 'page', value: string, history?: HistoryEntry[]) {
    this.pendingHistory = history || null
    const newHash = type === 'file'
      ? '#/file/' + encodeURIComponent(value)
      : '#/page/' + value
    if (window.location.hash === newHash) {
      this.handleHashChange()
    } else {
      window.location.hash = newHash
    }
  }

  private async handleHashChange() {
    const route = this.parseHash()
    if (route.type === 'file') {
      const history = this.pendingHistory
      this.pendingHistory = null
      await this.openFile(route.path!, history)
    } else if (route.type === 'page') {
      this.openPage(route.pageId!)
    } else {
      await this.openDefault()
    }
  }

  private parseHash(): { type: string; path?: string; pageId?: string } {
    const hash = window.location.hash || '#/'
    if (hash.startsWith('#/file/')) {
      return { type: 'file', path: decodeURIComponent(hash.slice(7)) }
    }
    if (hash.startsWith('#/page/')) {
      return { type: 'page', pageId: hash.slice(7) }
    }
    return { type: 'default' }
  }

  async openFile(path: string, history?: HistoryEntry[]) {
    const id = 'file:' + path
    let pane = this.findPane(id)
    if (!pane) {
      pane = { id, type: 'file', path, title: this.basename(path), history: history || [] }
      this.panes.push(pane)
    }
    await this.activatePane(id)
  }

  private openPage(pageId: string) {
    const id = 'page:' + pageId
    let pane = this.findPane(id)
    if (!pane) {
      const page = this.config.pages?.[pageId]
      pane = { id, type: 'page', pageId, title: page?.title || pageId, history: [] }
      this.panes.push(pane)
    }
    this.activatePane(id)
  }

  private async openDefault() {
    const dp = this.config.defaultPage || 'home'
    if (dp.includes('.')) {
      await this.openFile(dp)
    } else if (this.config.pages?.[dp]) {
      this.openPage(dp)
    }
  }

  closePane(id: string) {
    const idx = this.panes.findIndex(p => p.id === id)
    if (idx < 0) return
    this.panes.splice(idx, 1)
    if (this.activeId === id) {
      if (this.panes.length > 0) {
        const newIdx = Math.min(idx, this.panes.length - 1)
        this.activatePane(this.panes[newIdx].id)
      } else {
        this.activeId = null
        this.onPaneChange()
      }
    } else {
      this.onPaneChange()
    }
  }

  private activatePane(id: string) {
    this.activeId = id
    const pane = this.findPane(id)
    if (pane) this.onContentRender(pane)
    this.onPaneChange()
  }

  getActivePane(): Pane | null {
    return this.activeId ? this.findPane(this.activeId) : null
  }

  getPanes(): Pane[] {
    return this.panes
  }

  getActiveId(): string | null {
    return this.activeId
  }

  findPane(id: string): Pane | undefined {
    return this.panes.find(p => p.id === id)
  }

  private basename(path: string): string {
    return path.split('/').pop() || path
  }
}
