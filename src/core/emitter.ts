export type Handler<T> = (event: T) => void;

export class Emitter<T> {
  private handlers: Handler<T>[] = [];

  on(handler: Handler<T>): () => void {
    this.handlers.push(handler);
    return () => {
      const i = this.handlers.indexOf(handler);
      if (i >= 0) this.handlers.splice(i, 1);
    };
  }

  emit(event: T): void {
    for (let i = 0; i < this.handlers.length; i++) this.handlers[i](event);
  }
}
