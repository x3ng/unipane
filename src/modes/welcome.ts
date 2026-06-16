// Welcome Mode — virtual buffer shown when there is no active content

import type { Mode } from '../core/mode-registry'

export const welcomeMode: Mode = {
  name: 'welcome',

  match(path: string): boolean {
    return path === 'unipane://welcome'
  },

  render(ctx) {
    const container = document.createElement('div')
    container.className = 'welcome-fallback'

    const title = document.createElement('h2')
    title.textContent = 'Unipane'

    const hint = document.createElement('p')
    hint.textContent = '按 Ctrl+K 打开命令面板，Ctrl+Shift+P 搜索文件'

    container.appendChild(title)
    container.appendChild(hint)
    ctx.container.appendChild(container)
  },
}
