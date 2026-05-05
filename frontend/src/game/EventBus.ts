type EventHandler<T = unknown> = (data: T) => void;

/**
 * Lightweight, typed EventBus for decoupled game-loop ↔ UI communication.
 * Follows the standard EventEmitter API (on / off / emit / clear).
 */
export class EventBus {
  private listeners = new Map<string, Set<EventHandler>>();

  /** Subscribe to an event. Returns an unsubscribe function. */
  on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as EventHandler);
    return () => this.off(event, handler);
  }

  /** Unsubscribe a specific handler from an event. */
  off<T = unknown>(event: string, handler: EventHandler<T>): void {
    this.listeners.get(event)?.delete(handler as EventHandler);
  }

  /** Emit an event, calling all registered handlers with the provided data. */
  emit<T = unknown>(event: string, data?: T): void {
    this.listeners.get(event)?.forEach((handler) => handler(data));
  }

  /** Remove all handlers for a specific event, or all events if none given. */
  clear(event?: string): void {
    if (event !== undefined) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

/** Singleton instance shared across the application. */
export const eventBus = new EventBus();
