// Buffer — content instance, independent of display

import type { Mode } from './mode-registry'
import type { Resource } from './resource'

export class Buffer {
  id: string            // 文件路径作为唯一 ID
  path: string
  mode: Mode
  resource: Resource
  state: Record<string, any> = {}

  constructor(path: string, mode: Mode, resource: Resource) {
    this.id = path
    this.path = path
    this.mode = mode
    this.resource = resource
  }

  get content(): Resource['content'] {
    return this.resource.content
  }

  get version(): number {
    return this.resource.version
  }

  loadText(force = false): Promise<string> {
    return this.resource.loadText(force)
  }

  setText(content: string): void {
    this.resource.setText(content)
  }
}
