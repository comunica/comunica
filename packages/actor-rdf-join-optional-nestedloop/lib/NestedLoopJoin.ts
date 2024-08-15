import { MultiTransformIterator, MultiTransformOptions, SimpleTransformIterator, scheduleTask, AsyncIterator } from 'asynciterator';

// https://en.wikipedia.org/wiki/Nested_loop_join
export class NestedLoopJoin<L, R, T> extends MultiTransformIterator<L, T>
{
    constructor (left: AsyncIterator<L>, private right: AsyncIterator<R>, private funJoin: (left: L, right: R) => T | null, options?: MultiTransformOptions<L, T>) {
        super(left, options);

        this.right = right;
        this.funJoin = funJoin; // function that joins 2 elements or returns null if join is not possible
        this.on('end', () => this.right.close());
    }

    override _end ()
    {
        super._end(false);
        scheduleTask(() => this.right.destroy());
    }

    override _createTransformer (leftItem: L)
    {
        return new SimpleTransformIterator<R, T>(this.right.clone(), { transform: (rightItem, done, push) =>
        {
            let result = this.funJoin(leftItem, rightItem);
            if (result !== null)
                push(result);
            done();
        }});
    }
}
