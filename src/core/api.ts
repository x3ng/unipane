// API layer — fetch wrapper and file operations

import type { TreeItem, Config, FileStat, RootInfo } from './types'
import { encodePath } from './util'

const bust = (url: string): string =>
  url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now()

export async function fetchConfig(): Promise<Config> {
  const resp = await fetch(bust('/.unipane/config.json'))
  if (!resp.ok) throw new Error('Failed to load config.json')
  return resp.json()
}

export async function fetchTree(showHidden = false): Promise<TreeItem[]> {
  const url = '/api/tree' + (showHidden ? '?hidden=true' : '')
  const resp = await fetch(bust(url))
  if (!resp.ok) throw new Error('Failed to load file tree')
  return resp.json()
}

export async function fetchTextFile(path: string): Promise<string> {
  const resp = await fetch(bust(`/${encodePath(path)}`))
  if (!resp.ok) throw new Error(`Failed to load ${path}: ${resp.statusText}`)
  return resp.text()
}

export async function fetchStat(path: string): Promise<FileStat> {
  const resp = await fetch(bust('/api/stat?path=' + encodeURIComponent(path)))
  if (!resp.ok) throw new Error(`Failed to stat ${path}: ${resp.statusText}`)
  return resp.json()
}

export async function fetchRoot(): Promise<RootInfo> {
  const resp = await fetch(bust('/api/root'))
  if (!resp.ok) throw new Error(`Failed to fetch root: ${resp.statusText}`)
  return resp.json()
}

export async function setRoot(root: string): Promise<RootInfo> {
  const resp = await fetch('/api/root', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ root }),
  })
  if (!resp.ok) throw new Error(`Failed to set root: ${resp.status}`)
  return resp.json()
}

export async function saveFile(path: string, content: string): Promise<void> {
  const resp = await fetch('/api/file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content }),
  })
  if (!resp.ok) {
    throw new Error(`Failed to save: ${resp.status}`)
  }
}

export { bust }
