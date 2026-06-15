// Buffer — content instance, independent of display

import type { Mode } from './mode-registry'

export class Buffer {
  id: string            // 文件路径作为唯一 ID
  path: string
  mode: Mode
  state: Record<string, any> = {}

  constructor(path: string, mode: Mode) {
    this.id = path
    this.path = path
    this.mode = mode
  }
}
