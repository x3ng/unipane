// API layer — fetch wrapper and file operations

import { TreeItem } from './types'

const bust = (url: string): string =>
  url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now()

export async function fetchConfig(): Promise<Record<string, unknown>> {
  const resp = await fetch(bust('./config.json'))
  if (!resp.ok) throw new Error('Failed to load config.json')
  return resp.json()
}

export async function fetchTree(showHidden = false): Promise<TreeItem[]> {
  const url = '/api/tree' + (showHidden ? '?hidden=true' : '')
  const resp = await fetch(bust(url))
  if (!resp.ok) throw new Error('Failed to load file tree')
  return resp.json()
}

export async function fetchFile(path: string): Promise<string> {
  const resp = await fetch(bust(path))
  if (!resp.ok) throw new Error(`Failed to load: ${resp.status}`)
  return resp.text()
}

export async function saveFile(path: string, content: string): Promise<void> {
  await fetch('/api/file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content }),
  })
}

export { bust }
