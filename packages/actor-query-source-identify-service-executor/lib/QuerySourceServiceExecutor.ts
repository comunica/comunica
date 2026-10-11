import { KeysQueryOperation } from '@comunica/context-entries';
import type {
  BindingsStream,
  ComunicaDataFactory,
  FragmentSelectorShape,
  IActionContext,
  IQuerySource,
  IServiceExecutor,
  IServiceExecutorMetadata,
  MetadataBindings,
} from '@comunica/types';
import type { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
import { algebraUtils } from '@comunica/utils-algebra';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator, AsyncIterator, TransformIterator } from 'asynciterator';

/**
 * A query source that evaluates SERVICE clauses through a custom SERVICE executor.
 */
export class QuerySourceServiceExecutor implements IQuerySource {
  protected static readonly SELECTOR_SHAPE: FragmentSelectorShape = {
    type: 'operation',
    operation: { operationType: 'wildcard' },
  };

  public readonly referenceValue: string;
  private readonly serviceExecutor: IServiceExecutor;
  private readonly dataFactory: ComunicaDataFactory;
  private readonly algebraFactory: AlgebraFactory;

  public constructor(
    referenceValue: string,
    serviceExecutor: IServiceExecutor,
    dataFactory: ComunicaDataFactory,
    algebraFactory: AlgebraFactory,
  ) {
    this.referenceValue = referenceValue;
    this.serviceExecutor = serviceExecutor;
    this.dataFactory = dataFactory;
    this.algebraFactory = algebraFactory;
  }

  public async getSelectorShape(): Promise<FragmentSelectorShape> {
    return QuerySourceServiceExecutor.SELECTOR_SHAPE;
  }

  public async getFilterFactor(): Promise<number> {
    return 1;
  }

  public queryBindings(operation: Algebra.Operation, context: IActionContext): BindingsStream {
    const serviceOperation = this.algebraFactory.createService(
      operation,
      this.dataFactory.namedNode(this.referenceValue),
      Boolean(context.get(KeysQueryOperation.silent)),
    );
    const bindings = new TransformIterator<RDF.Bindings>(async() => {
      const solutions = await this.serviceExecutor
        .execute(serviceOperation, context.get(KeysQueryOperation.joinBindings), context);
      return solutions instanceof AsyncIterator ? solutions : new ArrayIterator([ ...solutions ], { autoStart: false });
    }, { autoStart: false });
    this.setMetadata(bindings, serviceOperation, context)
      .catch(error => bindings.destroy(error));
    return bindings;
  }

  public queryQuads(): never {
    throw new Error('Custom SERVICE executors can only produce bindings');
  }

  public async queryBoolean(): Promise<never> {
    throw new Error('Custom SERVICE executors can only produce bindings');
  }

  public async queryVoid(): Promise<never> {
    throw new Error('Custom SERVICE executors can only produce bindings');
  }

  public toString(): string {
    return `QuerySourceServiceExecutor(${this.referenceValue})`;
  }

  /**
   * Set the metadata of the given bindings stream, using the cardinality provided by the executor, if any.
   * @param bindings The bindings stream of the given SERVICE clause.
   * @param operation The SERVICE clause.
   * @param context The query context.
   */
  protected async setMetadata(
    bindings: BindingsStream,
    operation: Algebra.Service,
    context: IActionContext,
  ): Promise<void> {
    const provided: IServiceExecutorMetadata = await this.serviceExecutor.getMetadata?.(operation, context) ?? {};
    const metadata: MetadataBindings = {
      state: new MetadataValidationState(),
      cardinality: provided.cardinality ?? { type: 'estimate', value: Number.POSITIVE_INFINITY },
      variables: algebraUtils.inScopeVariables(operation.input).map(variable => ({ variable, canBeUndef: true })),
    };
    bindings.setProperty('metadata', metadata);
  }
}
