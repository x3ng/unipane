// Router — URL hash → App.openFile()

import type { App } from './app'

export class Router {
  private app: App

  constructor(app: App) {
    this.app = app
  }

  init(): void {
    window.addEventListener('hashchange', () => this.handleHash())
    if (window.location.hash) {
      this.handleHash()
    }
  }

  private handleHash(): void {
    const hash = window.location.hash

    const fileMatch = hash.match(/^#\/file\/(.+)$/)
    if (fileMatch) {
      const path = decodeURIComponent(fileMatch[1])
      this.app.openFile(path)
      return
    }

    const dirMatch = hash.match(/^#\/dir\/(.*)$/)
    if (dirMatch) {
      const path = decodeURIComponent(dirMatch[1]).replace(/\/$/, '')
      const pane = this.app.focusedPane || this.app.mainPane
      if (pane) {
        this.app.renderPane(pane, path || '/', 'directory')
      }
      return
    }

    const pageMatch = hash.match(/^#\/page\/(.+)$/)
    if (pageMatch) {
      console.warn('Page view not yet implemented:', pageMatch[1])
    }
  }
}
