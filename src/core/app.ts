// App — top-level orchestrator

import { Pane } from './pane'
import { Buffer } from './buffer'
import { ModeRegistry } from './mode-registry'
import { EventBus } from './events'
import { CommandRegistry } from './commands'
import { fetchTree, fetchConfig, saveFile } from './api'
import type { Config, TreeItem } from './types'
import type { ModeContext } from './mode-registry'

export class App {
  rootPane: Pane
  buffers: Map<string, Buffer> = new Map()
  modes: ModeRegistry
  events: EventBus
  commands: CommandRegistry
  config: Config | null = null
  tree: TreeItem[] | null = null
  root: string = ''
  focusedPane: Pane | null = null  // 当前聚焦的 Pane
  mainPane: Pane | null = null     // 主内容 Pane

  constructor() {
    this.rootPane = new Pane()
    this.rootPane.element.id = 'root-pane'
    this.modes = new ModeRegistry()
    this.events = new EventBus()
    this.commands = new CommandRegistry(this)
  }

  async init(): Promise<void> {
    this.config = await fetchConfig()
    this.root = this.config.root || ''
    this.tree = await fetchTree(false)

    // 默认布局：左侧目录 + 右侧内容
    const [sidePane, mainPane] = this.rootPane.split('horizontal', 0.2)
    this.mainPane = mainPane

    // 侧边栏：目录树
    this.renderPane(sidePane, '/', 'directory')

    // 主区域：默认页面
    const defaultPath = this.config.defaultPage || 'README.md'
    this.renderPane(mainPane, defaultPath)

    // 默认聚焦主 Pane
    this.focusedPane = mainPane
    // 更新工具栏
    if (mainPane.buffer) {
      this.updateModeToolbar(mainPane.buffer)
    }

    // 挂载到 DOM
    const container = document.getElementById('app')
    if (container) {
      container.innerHTML = ''
      container.appendChild(this.rootPane.element)
    }

    // 点击 Pane 时更新聚焦
    this.setupPaneFocus()
  }

  /** 设置 Pane 聚焦监听 */
  private setupPaneFocus(): void {
    const updateFocus = (pane: Pane) => {
      console.log('[app] updateFocus called, pane:', pane.id, 'buffer:', pane.buffer?.path)
      if (this.focusedPane !== pane) {
        this.focusedPane = pane
        this.events.emit('focus-changed', pane)
        if (pane.buffer) {
          this.updateModeToolbar(pane.buffer)
        }
      }
    }

    // 监听所有叶子 Pane 的点击
    const setupClick = (pane: Pane) => {
      if (pane.isLeaf) {
        pane.element.addEventListener('click', (e) => {
          console.log('[app] pane clicked:', pane.id, 'target:', (e.target as HTMLElement).className)
          updateFocus(pane)
        })
      } else if (pane.children) {
        setupClick(pane.children[0])
        setupClick(pane.children[1])
      }
    }
    setupClick(this.rootPane)
  }

  /** 打开文件到指定 Pane（默认聚焦的 Pane，回退到主 Pane） */
  openFile(path: string, targetPane?: Pane): void {
    const pane = targetPane || this.focusedPane || this.mainPane
    console.log('[app] openFile:', path, 'pane:', pane?.id, 'focusedPane:', this.focusedPane?.id, 'mainPane:', this.mainPane?.id)
    if (!pane) {
      console.warn('[app] openFile: no pane available')
      return
    }
    const buffer = this.getBuffer(path) || this.createBuffer(path)
    if (!buffer) {
      console.warn('[app] openFile: failed to create buffer for', path)
      return
    }
    this.renderPane(pane, path)
    this.focusedPane = pane
    this.events.emit('buffer-changed', buffer)
    this.updateModeToolbar(buffer)
  }

  /** 在指定 Pane 渲染文件 */
  renderPane(pane: Pane, path: string, modeName?: string): void {
    const buffer = this.getBuffer(path) || this.createBuffer(path, modeName)
    if (!buffer) return

    pane.showBuffer(buffer, (container) => {
      const ctx = this.makeModeContext(container, buffer, pane)
      buffer.mode.render(ctx)
    })

    // 更新聚焦
    this.focusedPane = pane
    this.events.emit('focus-changed', pane)
  }

  /** 更新 Mode 工具栏 */
  updateModeToolbar(buffer: Buffer): void {
    const modeToolbar = document.getElementById('mode-toolbar')
    if (!modeToolbar) {
      console.log('[app] updateModeToolbar: mode-toolbar element not found')
      return
    }
    console.log('[app] updateModeToolbar called for buffer:', buffer.path, 'mode:', buffer.mode.name)
    modeToolbar.innerHTML = ''

    // 通知 Mode 添加按钮
    if (buffer.mode.renderToolbar) {
      buffer.mode.renderToolbar(modeToolbar, buffer, this)
    } else {
      console.log('[app] mode has no renderToolbar')
    }
  }

  getBuffer(path: string): Buffer | undefined {
    return this.buffers.get(path)
  }

  createBuffer(path: string, modeName?: string): Buffer | null {
    const mode = modeName
      ? this.modes.findModeByName(modeName)
      : this.modes.findMode(path)
    if (!mode) return null

    const buffer = new Buffer(path, mode)
    this.buffers.set(path, buffer)
    this.events.emit('buffer-created', buffer)
    return buffer
  }

  closeBuffer(path: string): void {
    const buffer = this.buffers.get(path)
    if (!buffer) return

    // 找到显示该 Buffer 的 Pane
    for (const leaf of this.rootPane.getLeaves()) {
      if (leaf.buffer === buffer) {
        // 如果是侧边 Pane，隐藏整个 Pane
        if (leaf !== this.mainPane) {
          leaf.hide()
        }
        leaf.clearBuffer()
        break
      }
    }

    // 如果关闭的是聚焦的 Buffer，清除聚焦
    if (this.focusedPane?.buffer === buffer) {
      this.focusedPane = null
    }

    this.buffers.delete(path)
    this.events.emit('buffer-closed', buffer)

    // 如果主 Pane 为空，显示命令面板 fallback
    if (this.mainPane && !this.mainPane.buffer) {
      console.log('[app] mainPane is empty, showing welcome')
      this.showWelcome()
    }

    console.log('[app] after closeBuffer - focusedPane:', this.focusedPane?.id, 'buffers:', this.buffers.size)
  }

  /** 显示欢迎/命令面板 fallback */
  showWelcome(): void {
    if (!this.mainPane) return
    this.mainPane.element.innerHTML = ''
    this.mainPane.buffer = null

    const container = document.createElement('div')
    container.className = 'welcome-fallback'

    const title = document.createElement('h2')
    title.textContent = 'Unipane'

    const hint = document.createElement('p')
    hint.textContent = '按 Ctrl+K 打开命令面板，Ctrl+Shift+P 搜索文件'

    container.appendChild(title)
    container.appendChild(hint)
    this.mainPane.element.appendChild(container)
  }

  /** 保存 Buffer 内容并退出编辑模式 */
  async saveFileFromBuffer(buffer: Buffer, content: string): Promise<void> {
    await saveFile(buffer.path, content)
    buffer.state.rawContent = content
    buffer.state.isEditing = false
    const pane = this.rootPane.findPaneByBuffer(buffer.path)
    if (pane) this.renderPane(pane, buffer.path)
    this.updateModeToolbar(buffer)
  }

  makeModeContext(container: HTMLElement, buffer: Buffer, pane: Pane): ModeContext {
    return {
      buffer,
      pane,
      container,
      openFile: (path: string) => this.openFile(path, pane),
      saveFile: async (path: string, content: string) => {
        await saveFile(path, content)
      },
      app: this,
    }
  }
}
