// Mode — renders a Buffer into a Pane
// ModeRegistry — manages registered Modes

import type { Buffer } from './buffer'
import type { Pane } from './pane'
import type { App } from './app'

export interface ModeContext {
  buffer: Buffer
  pane: Pane
  container: HTMLElement
  openFile(path: string): void
  saveFile(path: string, content: string): Promise<void>
  app: App
}

export interface Mode {
  name: string
  match(path: string): boolean
  render(ctx: ModeContext): void
  renderToolbar?(container: HTMLElement, buffer: Buffer, app: App): void
}

export class ModeRegistry {
  private modes: Mode[] = []

  register(mode: Mode): void {
    this.modes.push(mode)
  }

  findMode(path: string): Mode | null {
    for (const mode of this.modes) {
      if (mode.match(path)) return mode
    }
    return null
  }

  findModeByName(name: string): Mode | null {
    return this.modes.find(m => m.name === name) || null
  }
}
