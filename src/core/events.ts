// EventBus — simple pub/sub for component communication

type Callback = (...args: any[]) => void

export class EventBus {
  private listeners: Map<string, Set<Callback>> = new Map()

  on(event: string, callback: Callback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  off(event: string, callback: Callback): void {
    this.listeners.get(event)?.delete(callback)
  }

  emit(event: string, data?: any): void {
    this.listeners.get(event)?.forEach(cb => cb(data))
  }
}
