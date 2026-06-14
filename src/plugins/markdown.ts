// Markdown plugin — render, edit, checkbox, breadcrumb

import { Plugin, RenderContext, BreadcrumbItem } from '../core/types'

declare const marked: { parse: (md: string) => string }

export const markdownPlugin: Plugin = {
  match(filepath: string): boolean {
    return filepath.endsWith('.md')
  },

  render(ctx: RenderContext) {
    const div = document.createElement('div')
    div.className = 'md-content'
    div.innerHTML = marked.parse(ctx.content || '')
    ctx.container.appendChild(div)

    // Fix relative links to absolute hash paths
    this.fixLinks(div, ctx.filepath)

    // Checkbox interaction
    this.setupCheckboxes(div, ctx)

    // Edit button
    const toolbar = document.createElement('div')
    toolbar.style.cssText = 'margin-bottom:12px;display:flex;gap:8px;'
    const editBtn = document.createElement('button')
    editBtn.className = 'sidebar-btn'
    editBtn.textContent = '编辑'
    toolbar.appendChild(editBtn)
    ctx.container.insertBefore(toolbar, div)

    editBtn.addEventListener('click', () => {
      ctx.container.innerHTML = ''
      this.renderEditor(ctx)
    })
  },

  fixLinks(div: HTMLElement, filepath: string) {
    const dir = filepath.includes('/') ? filepath.substring(0, filepath.lastIndexOf('/')) : ''
    div.querySelectorAll('a[href]').forEach(a => {
      const rawHref = a.getAttribute('href')
      if (!rawHref || rawHref.startsWith('#') || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(rawHref)) return
      // marked auto-encodes non-ASCII chars; decode first to avoid double-encoding
      const href = decodeURIComponent(rawHref)
      let absPath = href
      if (dir) absPath = dir + '/' + href
      const parts = absPath.split('/').filter(Boolean)
      const resolved: string[] = []
      for (const p of parts) {
        if (p === '.') continue
        if (p === '..') { if (resolved.length > 0) resolved.pop(); continue; }
        resolved.push(p)
      }
      a.setAttribute('href', '#/file/' + encodeURIComponent(resolved.join('/')))
    })
  },

  setupCheckboxes(div: HTMLElement, ctx: RenderContext) {
    div.querySelectorAll('input[type="checkbox"]').forEach((cb, i) => {
      const input = cb as HTMLInputElement
      input.disabled = false
      input.style.cursor = 'pointer'
      input.addEventListener('change', async () => {
        const lines = (ctx.content || '').split('\n')
        let count = 0
        for (let j = 0; j < lines.length; j++) {
          if (/^\s*-\s*\[[ x]\]/.test(lines[j])) {
            if (count === i) {
              lines[j] = input.checked
                ? lines[j].replace('[ ]', '[x]')
                : lines[j].replace('[x]', '[ ]')
              break
            }
            count++
          }
        }
        const newContent = lines.join('\n')
        ctx.content = newContent
        await ctx.saveFile(ctx.filepath, newContent)
      })
    })
  },

  renderEditor(ctx: RenderContext) {
    const toolbar = document.createElement('div')
    toolbar.style.cssText = 'margin-bottom:12px;display:flex;gap:8px;'

    const saveBtn = document.createElement('button')
    saveBtn.className = 'sidebar-btn active'
    saveBtn.textContent = '保存'

    const cancelBtn = document.createElement('button')
    cancelBtn.className = 'sidebar-btn'
    cancelBtn.textContent = '取消'

    toolbar.appendChild(saveBtn)
    toolbar.appendChild(cancelBtn)
    ctx.container.appendChild(toolbar)

    const textarea = document.createElement('textarea')
    textarea.value = ctx.content || ''
    textarea.style.cssText = 'width:100%;height:calc(100vh - 160px);padding:12px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:14px;line-height:1.6;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);resize:vertical;'
    ctx.container.appendChild(textarea)
    textarea.focus()

    saveBtn.addEventListener('click', async () => {
      const newContent = textarea.value
      await ctx.saveFile(ctx.filepath, newContent)
      ctx.container.innerHTML = ''
      ctx.content = newContent
      this.render(ctx)
    })

    cancelBtn.addEventListener('click', () => {
      ctx.container.innerHTML = ''
      this.render(ctx)
    })
  },
}
