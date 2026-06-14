// Image plugin — display images

import { Plugin, RenderContext } from '../core/types'
import { bust } from '../core/api'

export const imagePlugin: Plugin = {
  match(filepath: string): boolean {
    return /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(filepath)
  },

  render(ctx: RenderContext) {
    const img = document.createElement('img')
    img.src = bust(ctx.root + '/' + ctx.filepath)
    img.style.maxWidth = '100%'
    ctx.container.appendChild(img)
  },
}
