// Core types and interfaces

/** Plugin interface — each file type implements this */
export interface Plugin {
  /** Return true if this plugin handles the given file path */
  match(filepath: string): boolean

  /** Render file content into the container */
  render(ctx: RenderContext): void
}

/** Context passed to plugin render methods */
export interface RenderContext {
  container: HTMLElement
  filepath: string
  content: string | null  // null for binary files (images)
  root: string

  // Core APIs
  saveFile(path: string, content: string): Promise<void>
  openFile(path: string, history?: HistoryEntry[]): void
  showBreadcrumb(items: BreadcrumbItem[]): void
}

/** Breadcrumb item */
export interface BreadcrumbItem {
  title: string
  path: string
}

/** History entry for navigation */
export interface HistoryEntry {
  path: string
  title: string
}

/** Tab/pane state */
export interface Pane {
  id: string
  type: 'file' | 'page'
  path?: string
  pageId?: string
  title: string
  history: HistoryEntry[]
}

/** Config structure */
export interface Config {
  title?: string
  root?: string
  defaultPage?: string
  theme?: string
  css?: string
  sidebar?: {
    mode?: 'auto' | 'manual'
    exclude?: string[]
  }
  pages?: Record<string, PageConfig>
}

export interface PageConfig {
  title?: string
  layout?: 'grid' | 'stack' | 'single'
  widgets?: WidgetConfig[]
}

export interface WidgetConfig {
  type: string
  source?: string
  [key: string]: unknown
}

/** File tree item from API */
export interface TreeItem {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: TreeItem[]
}
