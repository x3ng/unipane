// Unipane — main entry point

import { App } from './core/app'
import { Router } from './core/router'
import { ThemeManager } from './core/theme'

// Modes
import { markdownMode } from './modes/markdown'
import { imageMode } from './modes/image'
import { htmlMode } from './modes/html'
import { rawMode } from './modes/raw'
import { directoryMode } from './modes/directory'
import { bufferListMode } from './modes/buffer-list'

async function main() {
  const app = new App()

  // 注册 Mode（顺序重要：先匹配的优先）
  app.modes.register(directoryMode)
  app.modes.register(imageMode)
  app.modes.register(htmlMode)
  app.modes.register(markdownMode)
  app.modes.register(bufferListMode)
  app.modes.register(rawMode)  // fallback

  // 主题
  const theme = new ThemeManager()

  // 初始化 App
  try {
    await app.init()
  } catch (e: any) {
    document.getElementById('app')!.innerHTML =
      `<div class="welcome"><h2>Error</h2><p>${e.message}</p></div>`
    return
  }

  // 初始化主题
  theme.init(app.config || {})

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
  document.getElementById('app')!.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest('a')
    if (!a) return
    const href = a.getAttribute('href')
    if (href && href.startsWith('#/')) {
      e.preventDefault()
      const path = decodeURIComponent(href.replace('#/file/', ''))
      app.openFile(path)
    }
  })
}

function setupToolbar(app: App) {
  const currentBuffer = document.getElementById('current-buffer')
  const bufferList = document.getElementById('buffer-list')

  const update = () => {
    // 当前聚焦的 Buffer 名称
    if (currentBuffer) {
      currentBuffer.textContent = app.focusedPane?.buffer?.path || ''
    }

    // Buffer 列表（显示所有 Buffer）
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
          // 找到显示该 Buffer 的 Pane 并聚焦
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
