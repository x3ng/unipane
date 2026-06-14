// Raw plugin — plain text fallback

import { Plugin, RenderContext } from '../core/types'

export const rawPlugin: Plugin = {
  match(_filepath: string): boolean {
    return true  // Fallback — matches everything
  },

  render(ctx: RenderContext) {
    const pre = document.createElement('pre')
    pre.textContent = ctx.content || ''
    ctx.container.appendChild(pre)
  },
}
