// Unipane — main entry point

import { App } from './core/app'
import { Router } from './core/router'
import { ThemeManager } from './core/theme'
import { createCommandPalette } from './modes/command-palette'

// Modes
import { markdownMode } from './modes/markdown'
import { imageMode } from './modes/image'
import { htmlMode } from './modes/html'
import { rawMode } from './modes/raw'
import { directoryMode } from './modes/directory'
import { bufferListMode } from './modes/buffer-list'

async function main() {
  const app = new App()

  // 注册 Mode
  app.modes.register(directoryMode)
  app.modes.register(imageMode)
  app.modes.register(htmlMode)
  app.modes.register(markdownMode)
  app.modes.register(bufferListMode)
  app.modes.register(rawMode)

  // 主题
  const theme = new ThemeManager()

  // 初始化 App
  try {
    await app.init()
  } catch (e: unknown) {
    const appEl = document.getElementById('app')
    if (appEl) {
      const msg = e instanceof Error ? e.message : String(e)
      appEl.textContent = `Error: ${msg}`
    }
    return
  }

  // 初始化主题
  theme.init(app.config || {})

  // 注册命令
  app.commands.registerBuiltin()

  // 命令面板
  const palette = createCommandPalette(app)

  // 监听命令面板事件
  app.events.on('command-palette', (options) => {
    palette.show(options)
  })

  // 统一工具栏
  setupToolbar(app)

  // 主题按钮
  const toggleTheme = document.getElementById('toggle-theme')
  if (toggleTheme) {
    toggleTheme.addEventListener('click', () => {
      theme.cycleTheme()
      toggleTheme.textContent = theme.getThemeIcon()
    })
    toggleTheme.textContent = theme.getThemeIcon()
  }

  const toggleCss = document.getElementById('toggle-css')
  if (toggleCss) {
    toggleCss.addEventListener('click', () => {
      theme.cycleCssTheme()
      toggleCss.textContent = theme.getCssThemeName()
      toggleCss.classList.toggle('active', theme.isCssThemeActive())
    })
    toggleCss.textContent = theme.getCssThemeName()
    toggleCss.classList.toggle('active', theme.isCssThemeActive())
  }

  // Router
  const router = new Router(app)
  router.init()

  // 内部链接处理
  const appEl = document.getElementById('app')
  if (appEl) {
    appEl.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).closest('a')
      if (!a) return
      const href = a.getAttribute('href')
      if (!href || !href.startsWith('#/')) return
      e.preventDefault()
      if (href.startsWith('#/dir/')) {
        // 目录链接：在当前 Pane 打开目录视图
        const path = decodeURIComponent(href.replace('#/dir/', '').replace(/\/$/, ''))
        const pane = app.focusedPane || app.mainPane
        if (pane) {
          app.renderPane(pane, path || '/', 'directory')
        }
      } else if (href.startsWith('#/file/')) {
        // 文件链接
        const path = decodeURIComponent(href.replace('#/file/', ''))
        app.openFile(path)
      }
    })
  }

  // 全局快捷键
  document.addEventListener('keydown', (e) => {
    // Ctrl+K — 命令面板
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault()
      palette.toggle()
    }
    // Ctrl+Shift+P — 文件搜索
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
      e.preventDefault()
      palette.show({ mode: 'file-search' })
    }
    // Ctrl+B — 切换侧边栏
    if (e.ctrlKey && e.key === 'b') {
      e.preventDefault()
      app.commands.get('toggle-sidebar')?.execute()
    }
    // Ctrl+W — 关闭当前 Buffer
    if (e.ctrlKey && e.key === 'w') {
      e.preventDefault()
      app.commands.get('close-buffer')?.execute()
    }
    // Escape — 关闭命令面板
    if (e.key === 'Escape') {
      palette.hide()
    }
  })
}

function setupToolbar(app: App) {
  const currentBuffer = document.getElementById('current-buffer')
  const bufferList = document.getElementById('buffer-list')
  const modeToolbar = document.getElementById('mode-toolbar')

  const update = () => {
    if (currentBuffer) {
      const buf = app.focusedPane?.buffer
      if (buf) {
        currentBuffer.textContent = `${buf.mode.name}:${buf.path}`
      } else {
        currentBuffer.textContent = ''
      }
    }

    // 如果没有聚焦的 Buffer，清空 mode toolbar
    if (modeToolbar && !app.focusedPane?.buffer) {
      modeToolbar.innerHTML = ''
    }

    if (bufferList) {
      bufferList.innerHTML = ''
      const buffers = Array.from(app.buffers.values())
      buffers.forEach(buf => {
        const tag = document.createElement('span')
        tag.className = 'buffer-tag' + (buf === app.focusedPane?.buffer ? ' active' : '')

        const name = document.createElement('span')
        name.className = 'buffer-tag-name'
        name.textContent = buf.path.split('/').pop() || buf.path
        name.title = buf.path
        name.onclick = () => {
          const pane = app.rootPane.findPaneByBuffer(buf.path)
          if (pane) {
            app.focusedPane = pane
            app.events.emit('focus-changed', pane)
            app.updateModeToolbar(buf)
          }
        }

        const close = document.createElement('span')
        close.className = 'buffer-tag-close'
        close.textContent = '×'
        close.title = '关闭'
        close.onclick = (e) => {
          e.stopPropagation()
          app.closeBuffer(buf.path)
        }

        tag.appendChild(name)
        tag.appendChild(close)
        bufferList.appendChild(tag)
      })
    }
  }

  app.events.on('buffer-changed', update)
  app.events.on('buffer-created', update)
  app.events.on('buffer-closed', update)
  app.events.on('focus-changed', update)
  update()
}

main()
