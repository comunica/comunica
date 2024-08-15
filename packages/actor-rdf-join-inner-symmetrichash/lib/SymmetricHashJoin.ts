import { AsyncIterator } from 'asynciterator';

// https://en.wikipedia.org/wiki/Symmetric_Hash_Join
export class SymmetricHashJoin<S, H, T> extends AsyncIterator<T> {
  private usedLeft = false;
  private leftMap: Map<H, S[]> | null = new Map<H, S[]>();
  private rightMap: Map<H, S[]> | null = new Map<H, S[]>();
  private matchIdx = 0;
  private match: S | null = null;
  private matches: S[] | null = [];

  public constructor(
    private readonly left: AsyncIterator<S>,
    private readonly right: AsyncIterator<S>,
    private readonly funHash: (entry: S) => H,
    private readonly funJoin: (left: S, right: S) => T,
  ) {
    super();

    this.on('end', () => this._cleanup());
    this.readable ||= this.left.readable || this.right.readable;

    this.left.on('error', error => this.destroy(error));
    this.right.on('error', error => this.destroy(error));

    this.left.on('readable', () => this.readable = true);
    this.right.on('readable', () => this.readable = true);

    // This needs to be here since it's possible the left/right streams only get
    // ended after there are no more results left
    this.left.on ('end', () => {
      if (!this.hasResults()) {
        this._end();
      }
    });
    this.right.on('end', () => {
      if (!this.hasResults()) {
        this._end();
      }
    });
  }

  private hasResults(): boolean {
    // The "!!this.match" condition was added as a workaround to race
    // conditions and/or duplicate "end" events that may lead to premature
    // cleanups of the "this.matches" array.
    // See https://github.com/joachimvh/asyncjoin/issues/7
    return !this.left.ended || !this.right.ended || (Boolean(this.matches) && this.matchIdx < this.matches!.length);
  }

  private _cleanup(): void {
    // Motivate garbage collector to remove these
    this.leftMap = null;
    this.rightMap = null;
    this.matches = null;
  }

  protected override _end(): void {
    super._end();
    this.left.destroy();
    this.right.destroy();
  }

  public override read(): T | null {
    while (true) {
      if (this.ended) {
        return null;
      }

      while (this.matchIdx < this.matches!.length) {
        const item = this.matches![this.matchIdx++];
        const result = this.usedLeft ? this.funJoin(this.match!, item) : this.funJoin(item, this.match!);
        if (result !== null) {
          return result;
        }
      }

      if (!this.hasResults()) {
        this._end();
      }

      let item: S | null = null;
      // Try both streams if the first one has no value
      for (let i = 0; i < 2; ++i) {
        item = (this.usedLeft ? this.right : this.left).read();
        // Try other stream next time
        this.usedLeft = !this.usedLeft;

        // Found a result, no need to check the other stream this run
        if (item !== null) {
          break;
        }
      }

      if (this.done || item === null) {
        this.readable = false;
        return null;
      }

      const hash = this.funHash(item);

      if (this.usedLeft && this.right.done) {
        this.leftMap = null;
      } else if (this.left.done) {
        this.rightMap = null;
      } else {
        const map = (this.usedLeft ? this.leftMap : this.rightMap)!;
        if (!map.has(hash)) {
          map.set(hash, []);
        }
        const arr = map.get(hash)!;
        arr.push(item);
      }

      this.match = item;
      this.matches = (this.usedLeft ? this.rightMap : this.leftMap)!.get(hash) ?? [];
      this.matchIdx = 0;
    }
  }
}
