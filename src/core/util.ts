// Shared utilities

export function fileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (['md', 'txt', 'log'].includes(ext)) return '📝'
  if (['html', 'htm'].includes(ext)) return '🌐'
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext)) return '🖼️'
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'go', 'rs', 'c', 'cpp', 'h'].includes(ext)) return '📄'
  if (['json', 'yaml', 'yml', 'toml', 'xml'].includes(ext)) return '📋'
  if (['css', 'scss', 'less'].includes(ext)) return '🎨'
  if (['sh', 'bash', 'zsh'].includes(ext)) return '⚙️'
  return '📄'
}

/** Encode a slash-delimited file path for browser fetch URLs. */
export function encodePath(path: string): string {
  return path.split('/').map(segment => encodeURIComponent(segment)).join('/')
}

export function escapeHtml(str: string): string {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}
