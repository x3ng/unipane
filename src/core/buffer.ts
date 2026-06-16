// Buffer — content semantics, independent of display

import type { Mode } from './mode-registry'
import type { Resource } from './resource'

export type BufferKind = 'resource' | 'virtual'

export class Buffer {
  id: string
  kind: BufferKind
  path: string
  mode: Mode
  resource: Resource | null
  state: Record<string, any> = {}

  constructor(path: string, mode: Mode, resource: Resource | null) {
    this.id = path
    this.kind = resource ? 'resource' : 'virtual'
    this.path = path
    this.mode = mode
    this.resource = resource
  }

  get content(): Resource['content'] {
    return this.resource?.content ?? null
  }

  get version(): number {
    return this.resource?.version ?? 0
  }

  loadText(force = false): Promise<string> {
    if (!this.resource) {
      return Promise.reject(new Error(`Buffer ${this.id} has no resource content`))
    }
    return this.resource.loadText(force)
  }

  setText(content: string): void {
    if (!this.resource) return
    this.resource.setText(content)
  }
}

export function isUserVisibleBuffer(buffer: Buffer): boolean {
  return buffer.kind !== 'virtual'
}
