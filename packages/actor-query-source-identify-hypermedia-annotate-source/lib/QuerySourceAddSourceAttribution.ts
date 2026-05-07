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

  /**
   * Creates a new source attribution wrapper.
   * @param innerSource The query source to wrap.
   */
  public constructor(innerSource: IQuerySource) {
    this.innerSource = innerSource;
  }

  /**
   * Delegates the filter factor calculation to the inner source.
   * @param context The action context.
   * @return The filter factor.
   */
  public getFilterFactor(context: IActionContext): Promise<number> {
    return this.innerSource.getFilterFactor(context);
  }

  /**
   * Delegates the selector shape retrieval to the inner source.
   * @param context The action context.
   * @return The fragment selector shape.
   */
  public async getSelectorShape(context: IActionContext): Promise<FragmentSelectorShape> {
    return this.innerSource.getSelectorShape(context);
  }

  /**
   * Queries bindings from the inner source and annotates each with source attribution.
   * @param operation The algebra operation to evaluate.
   * @param context The action context.
   * @param options Optional query bindings options.
   * @return A bindings stream with source attribution annotations.
   */
  public queryBindings(
    operation: Algebra.Operation,
    context: IActionContext,
    options: IQueryBindingsOptions | undefined,
  ): BindingsStream {
    return this.addSourceUrlToBindingContext(this.innerSource.queryBindings(operation, context, options));
  }

  /**
   * Annotates each binding in the stream with the source reference value.
   * @param iterator The bindings stream to annotate.
   * @return A new bindings stream with source context entries added.
   */
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

  /**
   * Delegates the boolean query to the inner source.
   * @param operation The ASK algebra operation.
   * @param context The action context.
   * @return The boolean query result.
   */
  public queryBoolean(operation: Algebra.Ask, context: IActionContext): Promise<boolean> {
    return this.innerSource.queryBoolean(operation, context);
  }

  /**
   * Delegates the quad query to the inner source.
   * @param operation The algebra operation.
   * @param context The action context.
   * @return An async iterator of quads.
   */
  public queryQuads(operation: Algebra.Operation, context: IActionContext): AsyncIterator<RDF.Quad> {
    return this.innerSource.queryQuads(operation, context);
  }

  /**
   * Delegates the void query to the inner source.
   * @param operation The algebra operation.
   * @param context The action context.
   */
  public queryVoid(operation: Algebra.Operation, context: IActionContext): Promise<void> {
    return this.innerSource.queryVoid(operation, context);
  }

  /**
   * Returns the inner source's reference value.
   */
  public get referenceValue(): QuerySourceReference {
    return this.innerSource.referenceValue;
  }

  /**
   * Returns the string representation of the inner source.
   * @return The string representation.
   */
  public toString(): string {
    return `${this.innerSource.toString()}`;
  }
}
