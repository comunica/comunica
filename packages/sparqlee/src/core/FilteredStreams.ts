import { BindingsStream, Bindings } from './Bindings';
import { AsyncIterator } from 'asynciterator';

// TODO: Make following instances
// - SyncFilter
// - AsyncFilter
// - NonLazySync/AsyncFilter (evaluation will only happen on read() call)
//      This would need to buffer input bindings and it's result
export interface FilteredStream extends BindingsStream {

}

export abstract class AbstractFilteredStream
    extends AsyncIterator<Bindings>
    implements FilteredStream
{
    inputs: BindingsStream;

    constructor(mappings: BindingsStream) {
        super();
        this.inputs = mappings;
        this.inputs.on('end', () => this.onInputEnd());
        this.inputs.on('data', (mapping: Bindings) => this.onInputData(mapping));
    }

    abstract onInputData(mapping: Bindings): void;
    abstract onInputEnd(): void;
}
