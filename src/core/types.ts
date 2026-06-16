// Core types

export interface Config {
  title?: string
  root?: string
  defaultPage?: string
  theme?: string
  css?: string
}

export interface TreeItem {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: TreeItem[]
}

export interface FileStat {
  path: string
  exists: boolean
  type?: 'file' | 'dir'
  size?: number
  mtime?: number
  mtimeMs?: number
}

export interface RootInfo {
  root: string
  configPath: string
  hasConfig: boolean
}
