import { AsyncIterator } from 'asynciterator';

// https://en.wikipedia.org/wiki/Symmetric_Hash_Join
export class SymmetricHashJoin<S, H, T> extends AsyncIterator<T> {
    private usedLeft = false;
    private leftMap: Map<H, S[]> | null = new Map<H, S[]>();
    private rightMap: Map<H, S[]> | null = new Map<H, S[]>();
    private matchIdx = 0;
    private match: S | null = null;
    private matches: S[] | null = [];

    constructor (private left: AsyncIterator<S>, private right: AsyncIterator<S>, private funHash: (entry: S) => H, private funJoin: (left: S, right: S) => T)
    {
        super();

        this.on('end', () => this._cleanup() );

        if (this.left.readable || this.right.readable)
        {
            this.readable = true;
        }

        this.left.on('error', (error) => this.destroy(error));
        this.right.on('error', (error) => this.destroy(error));

        this.left.on('readable', () => this.readable = true);
        this.right.on('readable', () => this.readable = true);

        // this needs to be here since it's possible the left/right streams only get ended after there are no more results left
        this.left.on ('end', () => { if (!this.hasResults()) this._end(); });
        this.right.on('end', () => { if (!this.hasResults()) this._end(); });
    }

    hasResults()
    {
        // The "!!this.match" condition was added as a workaround to race
        // conditions and/or duplicate "end" events that may lead to premature
        // cleanups of the "this.matches" array.
        // See https://github.com/joachimvh/asyncjoin/issues/7
        return !this.left.ended  || !this.right.ended || (!!this.matches && this.matchIdx < this.matches.length);
    }

    _cleanup ()
    {
        // motivate garbage collector to remove these
        this.leftMap = null;
        this.rightMap = null;
        this.matches = null;
    }

    _end ()
    {
        super._end();
        this.left.destroy();
        this.right.destroy();
    }

    read ()
    {
        while(true){
            if (this.ended)
                return null;

            while (this.matchIdx < this.matches!.length)
            {
                let item = this.matches![this.matchIdx++];
                let result = this.usedLeft ? this.funJoin(this.match!, item) : this.funJoin(item, this.match!);
                if (result !== null)
                    return result;
            }

            if (!this.hasResults())
                this._end();

            let item: S | null = null;
            // try both streams if the first one has no value
            for (let i = 0; i < 2; ++i)
            {
                item = this.usedLeft ? this.right.read() : this.left.read();
                this.usedLeft = !this.usedLeft; // try other stream next time

                // found a result, no need to check the other stream this run
                if (item !== null)
                    break;
            }

            if (this.done || item === null)
            {
                this.readable = false;
                return null;
            }

            let hash = this.funHash(item);

            if (this.usedLeft && this.right.done) {
                this.leftMap = null;
            } else if (this.left.done) {
                this.rightMap = null;
            } else {
                let map = (this.usedLeft ? this.leftMap : this.rightMap)!;
                if (!map.has(hash))
                    map.set(hash, []);
                let arr = map.get(hash)!;
                arr.push(item);
            }

            this.match = item;
            this.matches = (this.usedLeft ? this.rightMap : this.leftMap)!.get(hash) || [];
            this.matchIdx = 0;
        }
    }
}
