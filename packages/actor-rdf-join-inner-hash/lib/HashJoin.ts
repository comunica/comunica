import { AsyncIterator } from 'asynciterator';

// https://en.wikipedia.org/wiki/Hash_join
export class HashJoin<S, H, T> extends AsyncIterator<T> {
    private addedDataListener = false;
    private leftMap = new Map<H, S[]>();
    private matchIdx = 0;
    private match: S | null = null;
    private matches: S[];

    constructor (
        private left: AsyncIterator<S>,
        private right: AsyncIterator<S>, 
        private funHash: (entry: S) => H, 
        private funJoin: (left: S, right: S) => T
    ) {
        super();

        this.matches  = [];

        this.left.on('error', (error) => this.destroy(error));
        this.right.on('error', (error) => this.destroy(error));

        this.readable = false;

        const allowJoining = () => {
            this.readable = true;
            this.right.on('readable', () => this.readable = true);
            this.right.on('end', () => { if (!this.hasResults()) this._end(); });
        }

        this.left.on('end', allowJoining);

        this.on('newListener', (eventName) =>
        {
            if (eventName === 'data')
            {
                this._addDataListenerIfNeeded();
            }
        });
        if (this.left.readable)
            this._addDataListenerIfNeeded();
        this.left.on('readable', () => this._addDataListenerIfNeeded());
    }

    hasResults ()
    {
        return !this.right.ended || this.matchIdx < this.matches.length;
    }

    _end ()
    {
        super._end();
        this.left.destroy();
        this.right.destroy();
    }

    read ()
    {
        this._addDataListenerIfNeeded();

        while(true) {
            if (this.ended || !this.readable)
                return null;

            while (this.matchIdx < this.matches.length)
            {
                let item = this.matches[this.matchIdx++];
                let result = this.funJoin(item, this.match!);
                if (result !== null)
                    return result;
            }

            if (!this.hasResults())
                this._end();

            this.match = this.right.read();

            if (this.match === null)
            {
                this.readable = false;
                return null;
            }

            let hash = this.funHash(this.match);
            this.matches = this.leftMap.get(hash) || [];
            this.matchIdx = 0;
        }
    }

    _addDataListenerIfNeeded() {
        if (!this.addedDataListener)
        {
            this.addedDataListener = true;
            this._addDataListener();
        }
    }

    _addDataListener()
    {
        const addItem = (item: S) =>
        {
            let hash = this.funHash(item);
            if (!this.leftMap.has(hash))
                this.leftMap.set(hash, []);
            let arr = this.leftMap.get(hash);
            arr!.push(item);
        }
        
        this.left.on('data', addItem);
    }
}
