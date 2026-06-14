// Unipane — main entry point

import { Plugin, RenderContext, Pane, HistoryEntry } from './core/types'
import { fetchConfig, fetchFile, saveFile } from './core/api'
import { Router } from './core/router'
import { ThemeManager } from './core/theme'
import { Sidebar } from './core/sidebar'
import { markdownPlugin } from './plugins/markdown'
import { directoryPlugin } from './plugins/directory'
import { imagePlugin } from './plugins/image'
import { htmlPlugin } from './plugins/html'
import { rawPlugin } from './plugins/raw'

// Plugin registry — order matters: first match wins
const plugins: Plugin[] = [
  directoryPlugin,
  imagePlugin,
  htmlPlugin,
  markdownPlugin,
  rawPlugin,  // fallback
]

function findPlugin(filepath: string): Plugin {
  return plugins.find(p => p.match(filepath)) || rawPlugin
}

async function main() {
  // Load config
  let config: Record<string, unknown>
  try {
    config = await fetchConfig()
  } catch (e) {
    document.getElementById('content')!.innerHTML =
      '<div class="welcome"><h2>Error</h2><p>Failed to load config</p></div>'
    return
  }

  const root = (config.root as string) || '..'
  document.title = (config.title as string) || 'Unipane'

  // Initialize core modules
  const router = new Router()
  const theme = new ThemeManager()
  const sidebar = new Sidebar(router, theme)

  router.setConfig(config as any, root)

  // Tab bar rendering
  function renderTabs() {
    const bar = document.getElementById('tab-bar')!
    bar.innerHTML = ''
    router.getPanes().forEach(pane => {
      const tab = document.createElement('div')
      tab.className = 'tab' + (pane.id === router.getActiveId() ? ' active' : '')

      const label = document.createElement('span')
      label.textContent = pane.title
      label.onclick = () => router.navigateTo(
        pane.type as 'file' | 'page',
        pane.path || pane.pageId || '',
      )

      const close = document.createElement('span')
      close.className = 'close'
      close.textContent = '×'
      close.onclick = (e) => {
        e.stopPropagation()
        router.closePane(pane.id)
      }

      tab.appendChild(label)
      tab.appendChild(close)
      bar.appendChild(tab)
    })
  }

  // Content rendering
  async function renderContent(pane: Pane) {
    const container = document.getElementById('content')!
    container.innerHTML = ''

    if (pane.type === 'file' && pane.path) {
      // Directory
      if (pane.path.endsWith('/')) {
        // Store tree on window for directory plugin
        ;(window as any).__unipane_tree = (sidebar as any).tree
        renderBreadcrumb(container, pane)
        const ctx = makeContext(container, pane)
        directoryPlugin.render(ctx)
        return
      }

      try {
        const content = await fetchFile(root + '/' + pane.path)
        renderBreadcrumb(container, pane)
        const plugin = findPlugin(pane.path)
        const ctx = makeContext(container, pane, content)
        plugin.render(ctx)
      } catch (e: any) {
        container.textContent = 'Error: ' + e.message
      }
    } else if (pane.type === 'page') {
      container.textContent = 'Page view not yet implemented'
    }
  }

  function makeContext(container: HTMLElement, pane: Pane, content?: string): RenderContext {
    return {
      container,
      filepath: pane.path || '',
      content: content || null,
      root,
      saveFile: async (path: string, content: string) => {
        await saveFile(path, content)
      },
      openFile: (path: string, history?: HistoryEntry[]) => {
        router.navigateTo('file', path, history)
      },
      showBreadcrumb: (items: any[]) => {
        // Handled by renderBreadcrumb
      },
    }
  }

  function renderBreadcrumb(container: HTMLElement, pane: Pane) {
    if (!pane.history || pane.history.length === 0) return

    const breadcrumb = document.createElement('div')
    breadcrumb.className = 'breadcrumb'

    pane.history.forEach((h, i) => {
      if (i > 0) {
        const sep = document.createElement('span')
        sep.className = 'sep'
        sep.textContent = '>'
        breadcrumb.appendChild(sep)
      }
      const link = document.createElement('a')
      link.textContent = h.title
      link.href = '#'
      link.onclick = (e) => {
        e.preventDefault()
        // Trim history and navigate
        pane.history = pane.history.slice(0, i)
        router.navigateTo('file', h.path)
      }
      breadcrumb.appendChild(link)
    })

    container.appendChild(breadcrumb)
  }

  // Wire up router callbacks
  router.setCallbacks(renderTabs, renderContent)

  // Initialize
  theme.init(config as any)
  await sidebar.init(config as any)
  sidebar.setupHiddenToggle()

  // Theme buttons
  document.getElementById('toggle-theme')!.addEventListener('click', () => {
    theme.cycleTheme()
    document.getElementById('toggle-theme')!.textContent = theme.getThemeIcon()
  })
  document.getElementById('toggle-theme')!.textContent = theme.getThemeIcon()

  document.getElementById('toggle-css')!.addEventListener('click', () => {
    theme.cycleCssTheme()
    const btn = document.getElementById('toggle-css')!
    btn.textContent = theme.getCssThemeName()
    btn.classList.toggle('active', theme.isCssThemeActive())
  })
  const cssBtn = document.getElementById('toggle-css')!
  cssBtn.textContent = theme.getCssThemeName()
  cssBtn.classList.toggle('active', theme.isCssThemeActive())

  // Internal link handler (for hash links and breadcrumb history)
  document.getElementById('content')!.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest('a')
    if (!a) return
    const href = a.getAttribute('href')
    if (!href) return

    // Internal hash link (#/file/... or #/page/...)
    if (href.startsWith('#/')) {
      e.preventDefault()
      const pane = router.getActivePane()
      const newHistory: HistoryEntry[] = pane ? [...pane.history] : []
      if (pane?.path) {
        newHistory.push({ path: pane.path, title: pane.title })
      }
      router.navigateTo('file', decodeURIComponent(href.replace('#/file/', '')), newHistory)
      return
    }
  })

  // Start router
  router.init()
}

main()
