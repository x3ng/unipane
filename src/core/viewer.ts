// Viewer — one display session for a Buffer inside a Pane

import type { Buffer } from './buffer'
import type { Pane } from './pane'
import type { App } from './app'
import type { ModeContext } from './mode-registry'

let viewerId = 0

export interface ViewerState {
  scrollTop?: number
  scrollLeft?: number
  cursor?: unknown
  selection?: unknown
  viewport?: unknown
  [key: string]: unknown
}

export class Viewer {
  id: string
  buffer: Buffer
  pane: Pane | null = null
  state: ViewerState = {}

  constructor(buffer: Buffer) {
    this.id = `viewer-${++viewerId}`
    this.buffer = buffer
  }

  render(app: App, container: HTMLElement, pane: Pane): void {
    this.pane = pane
    const ctx: ModeContext = {
      buffer: this.buffer,
      viewer: this,
      pane,
      container,
      openFile: (path: string) => app.openFile(path, pane),
      saveFile: async (path: string, content: string) => {
        await app.saveFileContent(path, content)
      },
      app,
    }
    this.buffer.mode.render(ctx)
  }
}
