import { KeysHttp, KeysInitQuery } from '@comunica/context-entries';
import type {
  Bindings,
  BindingsStream,
  ComunicaDataFactory,
  FragmentSelectorShape,
  IActionContext,
  IQueryBindingsOptions,
  IQuerySource,
  QuerySourceReference,
} from '@comunica/types';
import { Algebra, isKnownOperation } from '@comunica/utils-algebra';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator } from 'asynciterator';
import {
  deskolemizeOperation,
  deskolemizePattern,
  hasSkolemizedTerms,
  skolemizeBindings,
  skolemizeBindingsStream,
  skolemizeQuadStream,
} from './utils';

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

  public constructor(innerSource: IQuerySource, sourceId: string) {
    this.innerSource = innerSource;
    this.sourceId = sourceId;
  }

  public async getSelectorShape(context: IActionContext): Promise<FragmentSelectorShape> {
    return this.innerSource.getSelectorShape(context);
  }

  public async getFilterFactor(context: IActionContext): Promise<number> {
    return await this.innerSource.getFilterFactor(context);
  }

  /**
   * Check if skolemization would not change the given operation and its results.
   * @param operation An operation.
   */
  protected canPassThrough(operation: Algebra.Operation): boolean {
    return isKnownOperation(operation, Algebra.Types.PATTERN) && this.innerSource.canContainBlankNodes?.() === false &&
      !hasSkolemizedTerms(operation);
  }

  public canContainBlankNodes(): boolean {
    return this.innerSource.canContainBlankNodes?.() !== false;
  }

  public queryBindings(
    operation: Algebra.Operation,
    context: IActionContext,
    options: IQueryBindingsOptions | undefined,
  ): BindingsStream {
    if (this.canPassThrough(operation)) {
      return QuerySourceSkolemized.destroyOnAbort(this.innerSource.queryBindings(operation, context, options), context);
    }
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const operationMapped = isKnownOperation(operation, Algebra.Types.PATTERN) ?
      deskolemizePattern(dataFactory, operation, this.sourceId) :
      deskolemizeOperation(dataFactory, operation, this.sourceId);
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
      QuerySourceSkolemized.destroyOnAbort(this.innerSource.queryBindings(operationMapped, context, options), context),
      this.sourceId,
    );
  }

  public queryBindingsSynchronous(operation: Algebra.Operation, context: IActionContext): Bindings[] | undefined {
    if (!this.innerSource.queryBindingsSynchronous) {
      return undefined;
    }
    if (this.canPassThrough(operation)) {
      return this.innerSource.queryBindingsSynchronous(operation, context);
    }
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const operationMapped = isKnownOperation(operation, Algebra.Types.PATTERN) ?
      deskolemizePattern(dataFactory, operation, this.sourceId) :
      deskolemizeOperation(dataFactory, operation, this.sourceId);
    if (!operationMapped) {
      return [];
    }
    return this.innerSource.queryBindingsSynchronous(operationMapped, context)
      ?.map(bindings => skolemizeBindings(dataFactory, bindings, this.sourceId));
  }

  public queryBoolean(operation: Algebra.Ask, context: IActionContext): Promise<boolean> {
    return this.innerSource.queryBoolean(operation, context);
  }

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
    return skolemizeQuadStream(
      dataFactory,
      QuerySourceSkolemized.destroyOnAbort(this.innerSource.queryQuads(operationMapped, context), context),
      this.sourceId,
    );
  }

  /**
   * Destroy a stream of the source once the abort signal of the context aborts,
   * so that a query that is aborted stops reading from its sources,
   * which also stops the operations that read their input in full.
   * @param stream A stream of the source.
   * @param context The action context.
   */
  public static destroyOnAbort<T>(stream: AsyncIterator<T>, context: IActionContext): AsyncIterator<T> {
    const signal = context.get(KeysHttp.httpAbortSignal);
    if (signal) {
      if (signal.aborted) {
        stream.destroy();
      } else {
        const onAbort = (): void => stream.destroy();
        signal.addEventListener('abort', onAbort, { once: true });
        stream.on('end', () => signal.removeEventListener('abort', onAbort));
      }
    }
    return stream;
  }

  public queryVoid(operation: Algebra.Operation, context: IActionContext): Promise<void> {
    return this.innerSource.queryVoid(operation, context);
  }

  public get referenceValue(): QuerySourceReference {
    return this.innerSource.referenceValue;
  }

  public toString(): string {
    return `${this.innerSource.toString()}(SkolemID:${this.sourceId})`;
  }
}
