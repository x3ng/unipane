// Command Palette Mode — fuzzy search commands and files

import type { Mode } from '../core/mode-registry'
import type { ModeContext } from '../core/mode-registry'
import type { App } from '../core/app'
import type { Buffer } from '../core/buffer'
import type { Command } from '../core/commands'
import { fileIcon } from '../core/util'

export interface PaletteOptions {
  mode: 'command' | 'file-search' | 'buffer-list'
}

export function createCommandPalette(app: App): {
  show: (options?: PaletteOptions) => void
  hide: () => void
  toggle: (options?: PaletteOptions) => void
} {
  let overlay: HTMLElement | null = null

  function show(options: PaletteOptions = { mode: 'command' }) {
    if (overlay) hide()

    overlay = document.createElement('div')
    overlay.className = 'palette-overlay'
    overlay.onclick = (e) => {
      if (e.target === overlay) hide()
    }

    const box = document.createElement('div')
    box.className = 'palette-box'

    const input = document.createElement('input')
    input.className = 'palette-input'
    input.placeholder = options.mode === 'file-search' ? '搜索文件...' : '输入命令...'
    box.appendChild(input)

    const list = document.createElement('div')
    list.className = 'palette-list'
    box.appendChild(list)

    overlay.appendChild(box)
    document.body.appendChild(overlay)

    // 聚焦输入框
    requestAnimationFrame(() => input.focus())

    // 渲染列表
    let items: PaletteItem[] = []
    let selectedIndex = 0

    function renderList(filter: string = '') {
      items = getItems(options.mode, filter)
      selectedIndex = 0
      list.innerHTML = ''

      items.forEach((item, i) => {
        const el = document.createElement('div')
        el.className = 'palette-item' + (i === selectedIndex ? ' selected' : '') + (item.disabled ? ' disabled' : '')

        const name = document.createElement('span')
        name.className = 'palette-item-name'
        name.textContent = item.name

        const meta = document.createElement('span')
        meta.className = 'palette-item-meta'
        meta.textContent = item.meta || ''

        el.appendChild(name)
        el.appendChild(meta)

        el.onclick = () => {
          if (!item.disabled) {
            item.execute()
            hide()
          }
        }
        el.onmouseenter = () => {
          selectedIndex = i
          updateSelection()
        }

        list.appendChild(el)
      })
    }

    function updateSelection() {
      list.querySelectorAll('.palette-item').forEach((el, i) => {
        el.classList.toggle('selected', i === selectedIndex)
        el.classList.toggle('disabled', items[i]?.disabled)
      })
      // 滚动到选中项
      const selected = list.querySelector('.palette-item.selected')
      if (selected) selected.scrollIntoView({ block: 'nearest' })
    }

    input.oninput = () => renderList(input.value)
    input.onkeydown = (e) => {
      if (e.key === 'Escape') {
        hide()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1)
        updateSelection()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        selectedIndex = Math.max(selectedIndex - 1, 0)
        updateSelection()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (items[selectedIndex] && !items[selectedIndex].disabled) {
          items[selectedIndex].execute()
          hide()
        }
      }
    }

    renderList()
  }

  function hide() {
    if (overlay) {
      overlay.remove()
      overlay = null
    }
  }

  function toggle(options?: PaletteOptions) {
    if (overlay) hide()
    else show(options)
  }

  function getItems(mode: string, filter: string): PaletteItem[] {
    const lowerFilter = filter.toLowerCase()

    if (mode === 'file-search') {
      return getFileItems(lowerFilter)
    } else if (mode === 'buffer-list') {
      return getBufferItems(lowerFilter)
    } else {
      return getCommandItems(lowerFilter)
    }
  }

  function getCommandItems(filter: string): PaletteItem[] {
    const commands = app.commands.getAll()
    return commands
      .filter(cmd => cmd.name.toLowerCase().includes(filter) || cmd.id.includes(filter))
      .map(cmd => ({
        name: cmd.name,
        meta: cmd.category === 'mode' ? `[${cmd.mode}]` : cmd.shortcut || '',
        disabled: !cmd.isAvailable(),
        execute: () => cmd.execute(),
      }))
  }

  function getFileItems(filter: string): PaletteItem[] {
    const tree = app.tree
    if (!tree) return []

    const files: PaletteItem[] = []
    collectFiles(tree, files, filter, app)
    return files.slice(0, 50) // 限制数量
  }

  function getBufferItems(filter: string): PaletteItem[] {
    const buffers = Array.from(app.buffers.values())
    return buffers
      .filter(buf => buf.path.toLowerCase().includes(filter))
      .map(buf => ({
        name: buf.path.split('/').pop() || buf.path,
        meta: buf.path,
        disabled: false,
        execute: () => app.openFile(buf.path),
      }))
  }

  return { show, hide, toggle }
}

interface PaletteItem {
  name: string
  meta?: string
  disabled: boolean
  execute: () => void
}

function collectFiles(items: any[], result: PaletteItem[], filter: string, app?: App) {
  for (const item of items) {
    if (item.type === 'file') {
      if (!filter || item.name.toLowerCase().includes(filter) || item.path.toLowerCase().includes(filter)) {
        result.push({
          name: item.name,
          meta: item.path,
          disabled: false,
          execute: () => app?.openFile(item.path),
        })
      }
    }
    if (item.children) {
      collectFiles(item.children, result, filter, app)
    }
  }
}
