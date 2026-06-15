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
