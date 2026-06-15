// Raw Mode — plain text fallback

import type { Mode } from '../core/mode-registry'
import type { ModeContext } from '../core/mode-registry'

/** 编码路径，正确处理 #、?、& 等特殊字符 */
function encodePath(path: string): string {
  return path.split('/').map(segment => encodeURIComponent(segment)).join('/')
}

export const rawMode: Mode = {
  name: 'raw',

  match(_path: string): boolean {
    return true  // fallback: matches everything
  },

  render(ctx: ModeContext) {
    const path = ctx.buffer.path
    fetch(`/${encodePath(path)}`)
      .then(r => r.ok ? r.text() : Promise.reject(new Error(r.statusText)))
      .then(content => {
        const pre = document.createElement('pre')
        pre.textContent = content
        pre.style.whiteSpace = 'pre-wrap'
        pre.style.wordBreak = 'break-word'
        ctx.container.appendChild(pre)
      })
      .catch(err => {
        ctx.container.textContent = `加载失败: ${err.message}`
      })
  },
}
