import { KeysInitQuery } from '@comunica/context-entries';
import type {
  BindingsStream,
  ComunicaDataFactory,
  FragmentSelectorShape,
  IActionContext,
  IQueryBindingsOptions,
  IQuerySource,
  QuerySourceReference,
} from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator } from 'asynciterator';
import { deskolemizeOperation, skolemizeBindingsStream, skolemizeQuadStream } from './utils';

/**
 * A IQuerySource wrapper that skolemizes outgoing quads and bindings.
 */
export class QuerySourceSkolemized implements IQuerySource {
  /**
   * The query source to wrap over.
   */
  public readonly innerSource: IQuerySource;
  /**
   * ID of the inner source, see KeysQuerySourceIdentify.sourceIds.
   */
  public readonly sourceId: string;

  /**
   * @param innerSource The query source to wrap.
   * @param sourceId The unique identifier for this source.
   */
  public constructor(innerSource: IQuerySource, sourceId: string) {
    this.innerSource = innerSource;
    this.sourceId = sourceId;
  }

  /**
   * Returns the selector shape of the inner source.
   * @param context The action context.
   * @return The fragment selector shape.
   */
  public async getSelectorShape(context: IActionContext): Promise<FragmentSelectorShape> {
    return this.innerSource.getSelectorShape(context);
  }

  /**
   * Returns the filter factor of the inner source.
   * @param context The action context.
   * @return The filter factor.
   */
  public async getFilterFactor(context: IActionContext): Promise<number> {
    return await this.innerSource.getFilterFactor(context);
  }

  /**
   * Queries bindings from the inner source after deskolemizing the operation, and skolemizes the results.
   * @param operation The algebra operation to query.
   * @param context The action context.
   * @param options Optional query bindings options.
   * @return A skolemized bindings stream, or an empty stream if deskolemization fails.
   */
  public queryBindings(
    operation: Algebra.Operation,
    context: IActionContext,
    options: IQueryBindingsOptions | undefined,
  ): BindingsStream {
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const operationMapped = deskolemizeOperation(dataFactory, operation, this.sourceId);
    if (!operationMapped) {
      const it: BindingsStream = new ArrayIterator<RDF.Bindings>([], { autoStart: false });
      it.setProperty('metadata', {
        state: new MetadataValidationState(),
        cardinality: { type: 'exact', value: 0 },
        variables: [],
      });
      return it;
    }
    return skolemizeBindingsStream(
      dataFactory,
      this.innerSource.queryBindings(operationMapped, context, options),
      this.sourceId,
    );
  }

  /**
   * Delegates a boolean query to the inner source.
   * @param operation The ASK algebra operation.
   * @param context The action context.
   * @return The boolean result.
   */
  public queryBoolean(operation: Algebra.Ask, context: IActionContext): Promise<boolean> {
    return this.innerSource.queryBoolean(operation, context);
  }

  /**
   * Queries quads from the inner source after deskolemizing the operation, and skolemizes the results.
   * @param operation The algebra operation to query.
   * @param context The action context.
   * @return A skolemized quad stream, or an empty stream if deskolemization fails.
   */
  public queryQuads(operation: Algebra.Operation, context: IActionContext): AsyncIterator<RDF.Quad> {
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const operationMapped = deskolemizeOperation(dataFactory, operation, this.sourceId);
    if (!operationMapped) {
      const it: AsyncIterator<RDF.Quad> = new ArrayIterator<RDF.Quad>([], { autoStart: false });
      it.setProperty('metadata', {
        state: new MetadataValidationState(),
        cardinality: { type: 'exact', value: 0 },
      });
      return it;
    }
    return skolemizeQuadStream(dataFactory, this.innerSource.queryQuads(operationMapped, context), this.sourceId);
  }

  /**
   * Delegates a void query to the inner source.
   * @param operation The algebra operation.
   * @param context The action context.
   */
  public queryVoid(operation: Algebra.Operation, context: IActionContext): Promise<void> {
    return this.innerSource.queryVoid(operation, context);
  }

  /**
   * Returns the reference value of the inner source.
   */
  public get referenceValue(): QuerySourceReference {
    return this.innerSource.referenceValue;
  }

  /**
   * Returns a string representation including the inner source and skolem ID.
   * @return The string representation.
   */
  public toString(): string {
    return `${this.innerSource.toString()}(SkolemID:${this.sourceId})`;
  }
}
