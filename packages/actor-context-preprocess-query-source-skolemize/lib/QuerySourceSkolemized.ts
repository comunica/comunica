import { KeysInitQuery } from '@comunica/context-entries';
import { MetadataValidationState } from '@comunica/metadata';
import type {
  BindingsStream,
  ComunicaDataFactory,
  FragmentSelectorShape,
  IActionContext,
  IQueryBindingsOptions,
  IQuerySource,
} from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator } from 'asynciterator';
import type { Algebra } from 'sparqlalgebrajs';
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
   * ID of the inner source, see KeysRdfResolveQuadPattern.sourceIds.
   */
  public readonly sourceId: string;

  public constructor(innerSource: IQuerySource, sourceId: string) {
    this.innerSource = innerSource;
    this.sourceId = sourceId;
  }

  public async getSelectorShape(context: IActionContext): Promise<FragmentSelectorShape> {
    return this.innerSource.getSelectorShape(context);
  }

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
        canContainUndefs: false,
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
    return skolemizeQuadStream(dataFactory, this.innerSource.queryQuads(operationMapped, context), this.sourceId);
  }

  public queryVoid(operation: Algebra.Update, context: IActionContext): Promise<void> {
    return this.innerSource.queryVoid(operation, context);
  }

  public get referenceValue(): string | RDF.Source {
    return this.innerSource.referenceValue;
  }

  public toString(): string {
    return `${this.innerSource.toString()}(SkolemID:${this.sourceId})`;
  }
}
