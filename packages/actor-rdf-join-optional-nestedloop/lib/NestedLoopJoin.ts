import type { MultiTransformOptions, AsyncIterator } from 'asynciterator';
import { MultiTransformIterator, SimpleTransformIterator, scheduleTask } from 'asynciterator';

// https://en.wikipedia.org/wiki/Nested_loop_join
export class NestedLoopJoin<L, R, T> extends MultiTransformIterator<L, T> {
  public constructor(
    left: AsyncIterator<L>,
    private readonly right: AsyncIterator<R>,
    private readonly funJoin: (left: L, right: R) => T | null,
    options?: MultiTransformOptions<L, T>,
  ) {
    super(left, options);

    this.right = right;
    // Function that joins 2 elements or returns null if join is not possible
    this.funJoin = funJoin;
    this.on('end', () => this.right.close());
  }

  protected override _end(): void {
    super._end(false);
    scheduleTask(() => this.right.destroy());
  }

  protected override _createTransformer(leftItem: L): AsyncIterator<T> {
    return new SimpleTransformIterator<R, T>(this.right.clone(), {
      transform: (rightItem, done, push) => {
        const result = this.funJoin(leftItem, rightItem);
        if (result !== null) {
          push(result);
        }
        done();
      },
    });
  }
}
