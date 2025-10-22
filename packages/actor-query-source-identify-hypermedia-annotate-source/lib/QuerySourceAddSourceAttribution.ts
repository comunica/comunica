import { KeysMergeBindingsContext } from '@comunica/context-entries';
import type {
  BindingsStream,
  FragmentSelectorShape,
  IActionContext,
  IQueryBindingsOptions,
  IQuerySource,
  MetadataBindings,
  QuerySourceReference,
} from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { Bindings } from '@comunica/utils-bindings-factory';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';

/**
 * A IQuerySource wrapper that skolemizes outgoing quads and bindings.
 */
export class QuerySourceAddSourceAttribution implements IQuerySource {
  /**
   * The query source to wrap over.
   */
  public readonly innerSource: IQuerySource;

  public constructor(innerSource: IQuerySource) {
    this.innerSource = innerSource;
  }

  public getFilterFactor(context: IActionContext): Promise<number> {
    return this.innerSource.getFilterFactor(context);
  }

  public async getSelectorShape(context: IActionContext): Promise<FragmentSelectorShape> {
    return this.innerSource.getSelectorShape(context);
  }

  public queryBindings(
    operation: Algebra.Operation,
    context: IActionContext,
    options: IQueryBindingsOptions | undefined,
  ): BindingsStream {
    return this.addSourceUrlToBindingContext(this.innerSource.queryBindings(operation, context, options));
  }

  public addSourceUrlToBindingContext(iterator: BindingsStream): BindingsStream {
    const ret = iterator.map((bindings) => {
      if (bindings instanceof Bindings) {
        bindings = bindings.setContextEntry(
          KeysMergeBindingsContext.sourcesBinding,
          [ this.innerSource.referenceValue ],
        );
      }
      return bindings;
    });

    function inheritMetadata(): void {
      iterator.getProperty('metadata', (metadata: MetadataBindings) => {
        ret.setProperty('metadata', metadata);
        metadata.state.addInvalidateListener(inheritMetadata);
      });
    }
    inheritMetadata();

    return ret;
  }

  public queryBoolean(operation: Algebra.Ask, context: IActionContext): Promise<boolean> {
    return this.innerSource.queryBoolean(operation, context);
  }

  public queryQuads(operation: Algebra.Operation, context: IActionContext): AsyncIterator<RDF.Quad> {
    return this.innerSource.queryQuads(operation, context);
  }

  public queryVoid(operation: Algebra.Operation, context: IActionContext): Promise<void> {
    return this.innerSource.queryVoid(operation, context);
  }

  public get referenceValue(): QuerySourceReference {
    return this.innerSource.referenceValue;
  }

  public toString(): string {
    return `${this.innerSource.toString()}`;
  }
}
