/**
 * Collects the entries that are pushed in the same tick, and passes them to a handler in batches of a maximum size.
 */
export class TickBatcher<E> {
  private batch: E[] | undefined;

  public constructor(
    private readonly maxSize: number,
    private readonly handler: (batch: E[]) => void,
  ) {}

  public push(entry: E): void {
    if (!this.batch) {
      this.batch = [];
      setImmediate(() => this.flush());
    }
    this.batch.push(entry);
  }

  protected flush(): void {
    const batch = this.batch!;
    this.batch = undefined;
    for (let start = 0; start < batch.length; start += this.maxSize) {
      this.handler(batch.slice(start, start + this.maxSize));
    }
  }
}
