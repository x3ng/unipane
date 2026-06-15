// HTML Mode — render .html files in iframe

import type { Mode } from '../core/mode-registry'
import type { ModeContext } from '../core/mode-registry'

/** 编码路径，正确处理 #、?、& 等特殊字符 */
function encodePath(path: string): string {
  return path.split('/').map(segment => encodeURIComponent(segment)).join('/')
}

export const htmlMode: Mode = {
  name: 'html',

  match(path: string): boolean {
    return path.endsWith('.html') || path.endsWith('.htm')
  },

  render(ctx: ModeContext) {
    const iframe = document.createElement('iframe')
    iframe.sandbox = 'allow-same-origin allow-scripts'
    iframe.style.width = '100%'
    iframe.style.height = '100%'
    iframe.style.border = 'none'
    iframe.src = `/${encodePath(ctx.buffer.path)}`
    ctx.container.appendChild(iframe)
  },
}
