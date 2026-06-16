// Buffer List Mode — show all open buffers (like Emacs C-x C-b)

import type { Mode } from '../core/mode-registry'
import type { ModeContext } from '../core/mode-registry'
import { fileIcon } from '../core/util'
import { isUserVisibleBuffer } from '../core/buffer'

export const bufferListMode: Mode = {
  name: 'buffer-list',

  match(path: string): boolean {
    return path === '##buffers'
  },

  render(ctx: ModeContext) {
    const list = document.createElement('div')
    list.className = 'buffer-list'

    const title = document.createElement('h3')
    title.textContent = 'Open Buffers'
    list.appendChild(title)

    const buffers = Array.from(ctx.app.buffers.values()).filter(isUserVisibleBuffer)
    if (buffers.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'buffer-list-empty'
      empty.textContent = 'No open buffers'
      list.appendChild(empty)
    } else {
      buffers.forEach(buffer => {
        const item = document.createElement('div')
        item.className = 'buffer-list-item'

        const icon = document.createElement('span')
        icon.className = 'icon'
        icon.textContent = buffer.path.endsWith('/') ? '📁' : fileIcon(buffer.path)

        const name = document.createElement('span')
        name.className = 'buffer-list-name'
        name.textContent = buffer.path

        const mode = document.createElement('span')
        mode.className = 'buffer-list-mode'
        mode.textContent = `[${buffer.mode.name}]`

        item.appendChild(icon)
        item.appendChild(name)
        item.appendChild(mode)

        item.onclick = () => ctx.openFile(buffer.path)
        list.appendChild(item)
      })
    }

    ctx.container.appendChild(list)
  },
}
