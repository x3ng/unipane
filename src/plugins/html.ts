// HTML plugin — display in iframe

import { Plugin, RenderContext } from '../core/types'
import { bust } from '../core/api'

export const htmlPlugin: Plugin = {
  match(filepath: string): boolean {
    return filepath.endsWith('.html') || filepath.endsWith('.htm')
  },

  render(ctx: RenderContext) {
    const iframe = document.createElement('iframe')
    iframe.src = bust(ctx.root + '/' + ctx.filepath)
    iframe.style.width = '100%'
    iframe.style.height = '100%'
    iframe.style.border = 'none'
    ctx.container.appendChild(iframe)
  },
}
