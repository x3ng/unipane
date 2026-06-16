// Raw Mode — plain text fallback

import type { Mode } from '../core/mode-registry'
import type { ModeContext } from '../core/mode-registry'

export const rawMode: Mode = {
  name: 'raw',

  match(_path: string): boolean {
    return true  // fallback: matches everything
  },

  render(ctx: ModeContext) {
    ctx.buffer.loadText()
      .then(content => {
        if (ctx.pane.buffer !== ctx.buffer || ctx.pane.contentEl !== ctx.container) return
        const pre = document.createElement('pre')
        pre.textContent = content
        pre.style.whiteSpace = 'pre-wrap'
        pre.style.wordBreak = 'break-word'
        ctx.container.appendChild(pre)
      })
      .catch(err => {
        if (ctx.pane.buffer !== ctx.buffer || ctx.pane.contentEl !== ctx.container) return
        ctx.container.textContent = `加载失败: ${err.message}`
      })
  },
}
