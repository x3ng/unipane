// Image Mode — display images

import type { Mode } from '../core/mode-registry'
import type { ModeContext } from '../core/mode-registry'
import { encodePath } from '../core/util'

export const imageMode: Mode = {
  name: 'image',

  match(path: string): boolean {
    return /\.(png|jpe?g|gif|svg|webp|ico)$/i.test(path)
  },

  render(ctx: ModeContext) {
    const img = document.createElement('img')
    img.src = `/${encodePath(ctx.buffer.path)}`
    img.style.maxWidth = '100%'
    img.style.height = 'auto'
    img.alt = ctx.buffer.path
    ctx.container.appendChild(img)
  },
}
