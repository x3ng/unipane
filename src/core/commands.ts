// Command registry — manages global and mode-specific commands

import type { App } from './app'

export interface Command {
  id: string
  name: string
  category: 'global' | 'mode'
  mode?: string           // 所属 Mode（category=mode 时）
  shortcut?: string       // 快捷键显示文本
  isAvailable: () => boolean
  execute: () => void
}

export class CommandRegistry {
  private commands: Map<string, Command> = new Map()
  private app: App

  constructor(app: App) {
    this.app = app
  }

  /** 注册命令 */
  register(command: Command): void {
    this.commands.set(command.id, command)
  }

  /** 获取所有命令（按分类排序） */
  getAll(): Command[] {
    const cmds = Array.from(this.commands.values())
    return cmds.sort((a, b) => {
      // 全局命令在前
      if (a.category !== b.category) return a.category === 'global' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }

  /** 获取可用命令 */
  getAvailable(): Command[] {
    return this.getAll().filter(cmd => cmd.isAvailable())
  }

  /** 按 ID 获取命令 */
  get(id: string): Command | undefined {
    return this.commands.get(id)
  }

  /** 注册内置全局命令 */
  registerBuiltin(): void {
    const app = this.app

    // 打开文件
    this.register({
      id: 'open-file',
      name: '打开文件',
      category: 'global',
      shortcut: 'Ctrl+Shift+P',
      isAvailable: () => true,
      execute: () => {
        app.events.emit('command-palette', { mode: 'file-search' })
      },
    })

    // 切换侧边栏
    this.register({
      id: 'toggle-sidebar',
      name: '切换侧边栏',
      category: 'global',
      shortcut: 'Ctrl+B',
      isAvailable: () => true,
      execute: () => {
        const sidePane = app.rootPane.children?.[0]
        if (!sidePane) return

        if (sidePane.visible) {
          sidePane.hide()
        } else {
          if (!sidePane.buffer) {
            app.renderPane(sidePane, '/', 'directory')
          }
          sidePane.show()
        }
      },
    })

    // 切换明暗主题
    this.register({
      id: 'toggle-theme',
      name: '切换明暗主题',
      category: 'global',
      isAvailable: () => true,
      execute: () => {
        const btn = document.getElementById('toggle-theme')
        if (btn) btn.click()
      },
    })

    // 切换 CSS 主题
    this.register({
      id: 'toggle-css',
      name: '切换 CSS 主题',
      category: 'global',
      isAvailable: () => true,
      execute: () => {
        const btn = document.getElementById('toggle-css')
        if (btn) btn.click()
      },
    })

    // 关闭当前 Buffer
    this.register({
      id: 'close-buffer',
      name: '关闭当前 Buffer',
      category: 'global',
      shortcut: 'Ctrl+W',
      isAvailable: () => !!app.focusedPane?.buffer,
      execute: () => {
        const buffer = app.focusedPane?.buffer
        if (buffer) app.closeBuffer(buffer.path)
      },
    })
  }
}
