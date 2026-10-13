import type { BindingsStream, MetadataBindings } from '@comunica/types';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import { BufferedIterator } from 'asynciterator';

/**
 * Wraps a bindings stream so that its errors are swallowed.
 * If the wrapped stream errors before emitting anything,
 * a single empty solution is emitted instead, as mandated by SPARQL 1.1 Federated Query for `SERVICE SILENT`.
 * If it errors after emitting results, those results are kept and the stream simply ends,
 * since the empty solution can no longer be substituted for them.
 */
export class SilencedBindingsIterator extends BufferedIterator<RDF.Bindings> {
  private readonly innerSource: BindingsStream;
  private readonly emptyBindings: RDF.Bindings;
  private readonly onError: (error: Error) => void;
  private innerError: Error | undefined;
  private emittedAny = false;

  public constructor(source: BindingsStream, emptyBindings: RDF.Bindings, onError: (error: Error) => void) {
    super({ autoStart: false });
    this.innerSource = source;
    this.emptyBindings = emptyBindings;
    this.onError = onError;
    // Metadata is exposed as an iterator property, so it must be forwarded explicitly.
    source.getProperty('metadata', (metadata: MetadataBindings) => this.setProperty('metadata', metadata));
    source.on('error', (error: Error) => {
      this.innerError = error;
      if (!this.getProperty('metadata')) {
        this.setProperty('metadata', {
          state: new MetadataValidationState(),
          cardinality: { type: 'exact', value: 1 },
          variables: [],
        });
      }
      this.readable = true;
    });
    source.on('readable', () => {
      this.readable = true;
    });
    source.on('end', () => {
      this.readable = true;
    });
  }

  protected override _read(count: number, done: () => void): void {
    if (this.innerError) {
      this.onError(this.innerError);
      if (!this.emittedAny) {
        this._push(this.emptyBindings);
      }
      this.close();
      return done();
    }
    while (count-- > 0) {
      const item = this.innerSource.read();
      if (item === null) {
        break;
      }
      this.emittedAny = true;
      this._push(item);
    }
    if (this.innerSource.done) {
      this.close();
    }
    done();
  }
}
