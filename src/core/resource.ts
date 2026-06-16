// Resource — shared file content backing one or more Buffers

import { fetchTextFile } from './api'

export type ResourceContent = string | Blob | ArrayBuffer | null
export type ResourceKind = 'unknown' | 'text' | 'binary' | 'directory'

export class Resource {
  readonly path: string
  kind: ResourceKind = 'unknown'
  content: ResourceContent = null
  loading = false
  loaded = false
  error: Error | null = null
  version = 0
  private loadPromise: Promise<string> | null = null

  constructor(path: string) {
    this.path = path
    if (path.endsWith('/')) {
      this.kind = 'directory'
      this.loaded = true
    }
  }

  async loadText(force = false): Promise<string> {
    if (!force && this.loaded && typeof this.content === 'string') {
      return this.content
    }
    if (!force && this.loadPromise) return this.loadPromise

    this.loading = true
    this.error = null
    this.loadPromise = fetchTextFile(this.path)
      .then(content => {
        this.kind = 'text'
        this.content = content
        this.loaded = true
        this.version++
        return content
      })
      .catch(err => {
        this.error = err instanceof Error ? err : new Error(String(err))
        throw this.error
      })
      .finally(() => {
        this.loading = false
        this.loadPromise = null
      })

    return this.loadPromise
  }

  setText(content: string): void {
    this.kind = 'text'
    this.content = content
    this.loaded = true
    this.error = null
    this.version++
  }
}

export class ResourceStore {
  private resources: Map<string, Resource> = new Map()

  get(path: string): Resource {
    let resource = this.resources.get(path)
    if (!resource) {
      resource = new Resource(path)
      this.resources.set(path, resource)
    }
    return resource
  }
}
