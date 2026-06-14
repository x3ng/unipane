// Theme — light/dark mode and CSS theme switching

import { Config } from './types'
import { bust } from './api'

const THEMES = ['default', 'github', 'notion']

export class ThemeManager {
  private currentCss: string
  private themeLink: HTMLLinkElement | null = null
  private baseLink: HTMLLinkElement | null = null

  constructor() {
    this.currentCss = localStorage.getItem('unipane-css') || 'default'
  }

  init(config: Config) {
    // Load default.css as base
    this.baseLink = document.createElement('link')
    this.baseLink.rel = 'stylesheet'
    this.baseLink.href = bust('/.unipane/themes/default.css')
    document.head.appendChild(this.baseLink)

    // Apply saved or config theme
    const saved = localStorage.getItem('unipane-css')
    this.currentCss = saved || config.theme || 'default'
    this.applyCssTheme(this.currentCss)

    // Restore light/dark preference
    const savedTheme = localStorage.getItem('unipane-theme')
    if (savedTheme) document.documentElement.dataset.theme = savedTheme

    // Load custom CSS
    if (config.css) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = bust(config.css)
      document.head.appendChild(link)
    }
  }

  cycleTheme() {
    const cur = document.documentElement.dataset.theme
    const next = cur === 'light' ? 'dark' : cur === 'dark' ? '' : 'light'
    if (next) {
      document.documentElement.dataset.theme = next
      localStorage.setItem('unipane-theme', next)
    } else {
      delete document.documentElement.dataset.theme
      localStorage.removeItem('unipane-theme')
    }
  }

  getThemeIcon(): string {
    const t = document.documentElement.dataset.theme
    return t === 'light' ? '☀' : t === 'dark' ? '☾' : '◐'
  }

  cycleCssTheme() {
    const idx = THEMES.indexOf(this.currentCss)
    this.currentCss = THEMES[(idx + 1) % THEMES.length]
    localStorage.setItem('unipane-css', this.currentCss)
    this.applyCssTheme(this.currentCss)
  }

  getCssThemeName(): string {
    return this.currentCss === 'default' ? 'Aa' : this.currentCss
  }

  isCssThemeActive(): boolean {
    return this.currentCss !== 'default'
  }

  private applyCssTheme(name: string) {
    if (this.themeLink) this.themeLink.remove()
    if (name && name !== 'default') {
      this.themeLink = document.createElement('link')
      this.themeLink.rel = 'stylesheet'
      this.themeLink.href = bust('/.unipane/themes/' + name + '.css')
      document.head.appendChild(this.themeLink)
    }
  }
}
