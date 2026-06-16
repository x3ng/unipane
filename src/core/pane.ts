// Pane — display container, recursive split, shows one Viewer at a time

import type { Viewer } from './viewer'
import type { Buffer } from './buffer'

let paneId = 0

export class Pane {
  id: string
  parent: Pane | null
  children: [Pane, Pane] | null = null
  direction: 'horizontal' | 'vertical' | null = null
  ratio: number = 1
  viewer: Viewer | null = null
  element: HTMLElement
  contentEl: HTMLElement | null = null  // viewer 渲染容器
  private _visible: boolean = true
  private _resizeHandle: HTMLElement | null = null  // 相邻的 resize handle

  constructor(parent: Pane | null = null) {
    this.id = `pane-${++paneId}`
    this.parent = parent
    this.element = document.createElement('div')
    this.element.className = 'pane'
    this.element.dataset.paneId = this.id
  }

  get isLeaf(): boolean {
    return this.children === null
  }

  get buffer(): Buffer | null {
    return this.viewer?.buffer ?? null
  }

  get visible(): boolean {
    return this._visible
  }

  /** 隐藏 Pane */
  hide(): void {
    this._visible = false
    this.element.style.display = 'none'
    // 隐藏相邻的 resize handle
    if (this._resizeHandle) {
      this._resizeHandle.style.display = 'none'
    }
    // 让兄弟 Pane 铺满空间
    this.updateSiblingFlex()
  }

  /** 显示 Pane */
  show(): void {
    this._visible = true
    this.element.style.display = ''
    // 显示相邻的 resize handle
    if (this._resizeHandle) {
      this._resizeHandle.style.display = ''
    }
    // 恢复兄弟 Pane 的 flex
    this.updateSiblingFlex()
  }

  /** 设置相邻的 resize handle */
  setResizeHandle(handle: HTMLElement): void {
    this._resizeHandle = handle
  }

  /** 更新兄弟 Pane 的 flex 比例 */
  private updateSiblingFlex(): void {
    if (!this.parent || !this.parent.children) return
    const [left, right] = this.parent.children
    const sibling = left === this ? right : left
    if (this._visible) {
      // 恢复原始比例
      sibling.element.style.flex = `${sibling.ratio}`
    } else {
      // 兄弟铺满
      sibling.element.style.flex = '1'
    }
  }

  /** 分割当前 Pane，返回两个子 Pane */
  split(dir: 'horizontal' | 'vertical', ratio: number = 0.5): [Pane, Pane] {
    if (!this.isLeaf) throw new Error('Cannot split a non-leaf pane')

    const savedViewer = this.viewer
    this.viewer = null
    this.contentEl = null

    const left = new Pane(this)
    const right = new Pane(this)
    left.ratio = ratio
    right.ratio = 1 - ratio

    this.children = [left, right]
    this.direction = dir

    this.element.innerHTML = ''
    this.element.classList.add('pane-split')
    this.element.style.display = 'flex'
    this.element.style.flexDirection = dir === 'horizontal' ? 'row' : 'column'

    left.element.style.flex = `${ratio}`
    right.element.style.flex = `${1 - ratio}`

    this.element.appendChild(left.element)

    const handle = document.createElement('div')
    handle.className = 'pane-resize-handle'
    handle.style.flexShrink = '0'
    this.setupResizeHandle(handle, left, right)
    this.element.appendChild(handle)

    // 设置 resize handle 引用
    left.setResizeHandle(handle)
    right.setResizeHandle(handle)

    this.element.appendChild(right.element)

    if (savedViewer) {
      left.showViewer(savedViewer, () => {})  // 需要 App 重新渲染
    }

    return [left, right]
  }

  /** 显示 Viewer，render 回调负责实际渲染 */
  showViewer(viewer: Viewer, render: (container: HTMLElement) => void): void {
    this.viewer = viewer
    viewer.pane = this
    this.element.innerHTML = ''
    this.element.className = 'pane'

    const container = document.createElement('div')
    container.className = 'buffer-content'
    this.contentEl = container
    this.element.appendChild(container)

    render(container)
  }

  /** 清除 Viewer，显示空白 */
  clearViewer(): void {
    if (this.viewer?.pane === this) this.viewer.pane = null
    this.viewer = null
    this.element.innerHTML = ''
    this.element.className = 'pane'
    this.contentEl = null
  }

  /** 关闭当前 Pane */
  close(): void {
    if (!this.parent || !this.parent.children) return

    const sibling = this.parent.children[0] === this
      ? this.parent.children[1]
      : this.parent.children[0]

    const grandparent = this.parent.parent
    if (grandparent && grandparent.children) {
      const idx = grandparent.children[0] === this.parent ? 0 : 1
      grandparent.children[idx] = sibling
      sibling.parent = grandparent
      this.parent.element.replaceWith(sibling.element)
    } else {
      sibling.parent = null
      this.parent.element.replaceWith(sibling.element)
    }
  }

  /** 调整分割比例 */
  resize(ratio: number): void {
    if (!this.parent || !this.parent.children) return

    const [left, right] = this.parent.children
    const isLeft = left === this

    left.ratio = isLeft ? ratio : 1 - ratio
    right.ratio = isLeft ? 1 - ratio : ratio

    left.element.style.flex = `${left.ratio}`
    right.element.style.flex = `${right.ratio}`
  }

  private setupResizeHandle(handle: HTMLElement, left: Pane, right: Pane): void {
    let startPos = 0
    let startRatio = 0
    const isHorizontal = this.direction === 'horizontal'

    const onMove = (e: MouseEvent) => {
      const delta = isHorizontal ? e.clientX - startPos : e.clientY - startPos
      const containerSize = isHorizontal
        ? this.element.clientWidth
        : this.element.clientHeight
      if (containerSize === 0) return

      const newRatio = Math.max(0.1, Math.min(0.9, startRatio + delta / containerSize))
      left.ratio = newRatio
      right.ratio = 1 - newRatio
      left.element.style.flex = `${newRatio}`
      right.element.style.flex = `${1 - newRatio}`

      localStorage.setItem(`unipane-pane-${this.id}`, String(newRatio))
    }

    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault()
      startPos = isHorizontal ? e.clientX : e.clientY
      startRatio = left.ratio
      document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    })

    const saved = localStorage.getItem(`unipane-pane-${this.id}`)
    if (saved) {
      const ratio = parseFloat(saved)
      if (!isNaN(ratio) && ratio > 0.1 && ratio < 0.9) {
        left.ratio = ratio
        right.ratio = 1 - ratio
        left.element.style.flex = `${ratio}`
        right.element.style.flex = `${1 - ratio}`
      }
    }
  }

  findPaneByBuffer(bufferId: string): Pane | null {
    if (this.isLeaf && this.buffer?.id === bufferId) return this
    if (this.children) {
      return this.children[0].findPaneByBuffer(bufferId)
        || this.children[1].findPaneByBuffer(bufferId)
    }
    return null
  }

  getLeaves(): Pane[] {
    if (this.isLeaf) return [this]
    if (!this.children) return []
    return [...this.children[0].getLeaves(), ...this.children[1].getLeaves()]
  }
}
