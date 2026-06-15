// Markdown Mode — render .md files with marked, support editing

import type { Mode } from '../core/mode-registry'
import type { ModeContext } from '../core/mode-registry'
import type { Buffer } from '../core/buffer'
import type { App } from '../core/app'

declare const marked: { parse(src: string): string }

export const markdownMode: Mode = {
  name: 'markdown',

  match(path: string): boolean {
    return path.endsWith('.md') || path.endsWith('.markdown')
  },

  render(ctx: ModeContext) {
    const path = ctx.buffer.path
    fetch(`/${encodeURI(path)}`)
      .then(r => r.ok ? r.text() : Promise.reject(new Error(r.statusText)))
      .then(content => {
        ctx.buffer.state.rawContent = content
        renderMarkdownView(ctx, content)
      })
      .catch(err => {
        ctx.container.textContent = `加载失败: ${err.message}`
      })
  },

  renderToolbar(container: HTMLElement, buffer: Buffer, app: App) {
    const editBtn = document.createElement('button')
    editBtn.className = 'toolbar-btn'
    editBtn.textContent = '编辑'
    editBtn.title = '编辑 Markdown'
    editBtn.onclick = () => {
      const pane = app.rootPane.findPaneByBuffer(buffer.path)
      if (pane && buffer.state.rawContent) {
        pane.showBuffer(buffer, (container) => {
          const ctx = app.makeModeContext(container, buffer, pane)
          showEditor(buffer.state.rawContent, buffer.path, ctx)
        })
      }
    }
    container.appendChild(editBtn)
  },
}

function renderMarkdownView(ctx: ModeContext, content: string) {
  const div = document.createElement('div')
  div.className = 'markdown-body'
  div.innerHTML = marked.parse(content)
  fixLinks(div, ctx.buffer.path)
  setupCheckboxes(div, ctx.buffer.path, ctx)
  ctx.container.appendChild(div)
}

function fixLinks(div: HTMLElement, filepath: string) {
  const dir = filepath.includes('/') ? filepath.substring(0, filepath.lastIndexOf('/')) : ''
  div.querySelectorAll('a[href]').forEach(a => {
    const rawHref = a.getAttribute('href')
    if (!rawHref || rawHref.startsWith('#') || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(rawHref)) return
    const href = decodeURIComponent(rawHref)
    let absPath = href
    if (dir && !href.startsWith('/')) absPath = dir + '/' + href
    const parts = absPath.split('/').filter(Boolean)
    const resolved: string[] = []
    for (const p of parts) {
      if (p === '.') continue
      if (p === '..') { if (resolved.length > 0) resolved.pop(); continue }
      resolved.push(p)
    }
    a.setAttribute('href', '#/file/' + encodeURIComponent(resolved.join('/')))
  })
}

function setupCheckboxes(div: HTMLElement, path: string, ctx: ModeContext) {
  div.querySelectorAll('input[type="checkbox"]').forEach((cb, i) => {
    const input = cb as HTMLInputElement
    input.dataset.index = String(i)
    input.addEventListener('change', () => {
      fetch(`/${encodeURI(path)}`)
        .then(r => r.text())
        .then(content => {
          let idx = 0
          const updated = content.replace(/- \[[ x]\]/g, match => {
            if (idx === i) { idx++; return input.checked ? '- [x]' : '- [ ]' }
            idx++
            return match
          })
          ctx.saveFile(path, updated)
        })
    })
  })
}

function showEditor(content: string, path: string, ctx: ModeContext) {
  const textarea = document.createElement('textarea')
  textarea.className = 'md-editor'
  textarea.value = content

  const btns = document.createElement('div')
  btns.className = 'md-editor-btns'

  const saveBtn = document.createElement('button')
  saveBtn.textContent = '保存'
  saveBtn.onclick = async () => {
    await ctx.saveFile(path, textarea.value)
    ctx.buffer.state.rawContent = textarea.value
    const pane = ctx.app.rootPane.findPaneByBuffer(path)
    if (pane) ctx.app.renderPane(pane, path)
  }

  const cancelBtn = document.createElement('button')
  cancelBtn.textContent = '取消'
  cancelBtn.onclick = () => {
    const pane = ctx.app.rootPane.findPaneByBuffer(path)
    if (pane) ctx.app.renderPane(pane, path)
  }

  btns.appendChild(saveBtn)
  btns.appendChild(cancelBtn)
  ctx.container.innerHTML = ''
  ctx.container.appendChild(btns)
  ctx.container.appendChild(textarea)
}
