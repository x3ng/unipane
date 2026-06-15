// Markdown Mode — render .md files with marked, support editing

import type { Mode } from '../core/mode-registry'
import type { ModeContext } from '../core/mode-registry'
import type { Buffer } from '../core/buffer'
import type { App } from '../core/app'

declare const marked: { parse(src: string): string }
declare const DOMPurify: { sanitize(html: string): string }

/** 编码路径，正确处理 #、?、& 等特殊字符 */
function encodePath(path: string): string {
  return path.split('/').map(segment => encodeURIComponent(segment)).join('/')
}

export const markdownMode: Mode = {
  name: 'markdown',

  match(path: string): boolean {
    return path.endsWith('.md') || path.endsWith('.markdown')
  },

  render(ctx: ModeContext) {
    const path = ctx.buffer.path
    const isEditing = ctx.buffer.state.isEditing ?? false

    if (isEditing && ctx.buffer.state.rawContent) {
      // 编辑模式
      showEditor(ctx.buffer.state.rawContent, path, ctx)
    } else {
      // 预览模式
      fetch(`/${encodePath(path)}`)
        .then(r => r.ok ? r.text() : Promise.reject(new Error(r.statusText)))
        .then(content => {
          ctx.buffer.state.rawContent = content
          renderMarkdownView(ctx, content)
        })
        .catch(err => {
          ctx.container.textContent = `加载失败: ${err.message}`
        })
    }
  },

  renderToolbar(container: HTMLElement, buffer: Buffer, app: App) {
    const isEditing = buffer.state.isEditing ?? false

    if (isEditing) {
      // 编辑模式：显示保存和取消
      const saveBtn = document.createElement('button')
      saveBtn.className = 'toolbar-btn'
      saveBtn.textContent = '保存'
      saveBtn.title = '保存更改'
      saveBtn.onclick = async () => {
        const textarea = document.querySelector('.md-editor') as HTMLTextAreaElement
        if (textarea) {
          await app.saveFileFromBuffer(buffer, textarea.value)
        }
      }
      container.appendChild(saveBtn)

      const cancelBtn = document.createElement('button')
      cancelBtn.className = 'toolbar-btn'
      cancelBtn.textContent = '取消'
      cancelBtn.title = '取消编辑'
      cancelBtn.onclick = () => {
        buffer.state.isEditing = false
        const pane = app.rootPane.findPaneByBuffer(buffer.path)
        if (pane) app.renderPane(pane, buffer.path)
        app.updateModeToolbar(buffer)
      }
      container.appendChild(cancelBtn)
    } else {
      // 预览模式：显示编辑按钮
      const editBtn = document.createElement('button')
      editBtn.className = 'toolbar-btn'
      editBtn.textContent = '编辑'
      editBtn.title = '编辑 Markdown'
      editBtn.onclick = () => {
        buffer.state.isEditing = true
        const pane = app.rootPane.findPaneByBuffer(buffer.path)
        if (pane) app.renderPane(pane, buffer.path)
        app.updateModeToolbar(buffer)
      }
      container.appendChild(editBtn)
    }
  },
}

function renderMarkdownView(ctx: ModeContext, content: string) {
  const div = document.createElement('div')
  div.className = 'markdown-body'
  div.innerHTML = DOMPurify.sanitize(marked.parse(content))
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
    // 区分目录链接（以 / 结尾）和文件链接
    const isDirectory = href.endsWith('/') || href === ''
    const prefix = isDirectory ? '#/dir/' : '#/file/'
    const suffix = isDirectory ? '/' : ''
    const encoded = resolved.map(s => encodeURIComponent(s)).join('/')
    a.setAttribute('href', prefix + encoded + suffix)
  })
}

function setupCheckboxes(div: HTMLElement, path: string, ctx: ModeContext) {
  div.querySelectorAll('input[type="checkbox"]').forEach((cb, i) => {
    const input = cb as HTMLInputElement
    input.dataset.index = String(i)
    input.addEventListener('change', () => {
      fetch(`/${encodePath(path)}`)
        .then(r => r.text())
        .then(content => {
          let idx = 0
          const updated = content.replace(/^(\s*)- \[[ xX]\]/gm, (match, indent) => {
            if (idx === i) { idx++; return `${indent}- ${input.checked ? '[x]' : '[ ]'}` }
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
  ctx.container.appendChild(textarea)
}
