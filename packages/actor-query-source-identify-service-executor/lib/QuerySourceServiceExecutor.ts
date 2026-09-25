import { KeysQueryOperation } from '@comunica/context-entries';
import type {
  BindingsStream,
  FragmentSelectorShape,
  IActionContext,
  IQuerySource,
  MetadataBindings,
  ServiceExecutor,
} from '@comunica/types';
import { Algebra, algebraUtils, isKnownOperation } from '@comunica/utils-algebra';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator, AsyncIterator, TransformIterator } from 'asynciterator';

/**
 * A query source that evaluates SERVICE clauses through a custom SERVICE executor.
 */
export class QuerySourceServiceExecutor implements IQuerySource {
  protected static readonly SELECTOR_SHAPE: FragmentSelectorShape = {
    type: 'operation',
    operation: { operationType: 'type', type: Algebra.Types.SERVICE },
    children: [
      { type: 'operation', operation: { operationType: 'wildcard' }},
    ],
  };

  public readonly referenceValue: string;
  private readonly serviceExecutor: ServiceExecutor;

  public constructor(referenceValue: string, serviceExecutor: ServiceExecutor) {
    this.referenceValue = referenceValue;
    this.serviceExecutor = serviceExecutor;
  }

  public async getSelectorShape(): Promise<FragmentSelectorShape> {
    return QuerySourceServiceExecutor.SELECTOR_SHAPE;
  }

  public async getFilterFactor(): Promise<number> {
    return 1;
  }

  public queryBindings(operation: Algebra.Operation, context: IActionContext): BindingsStream {
    if (!isKnownOperation(operation, Algebra.Types.SERVICE)) {
      throw new Error(`Custom SERVICE executors can only evaluate SERVICE clauses, but received a ${operation.type} operation`);
    }
    const bindings = new TransformIterator<RDF.Bindings>(async() => {
      const solutions = await this.serviceExecutor(operation, context.get(KeysQueryOperation.joinBindings), context);
      return solutions instanceof AsyncIterator ? solutions : new ArrayIterator([ ...solutions ], { autoStart: false });
    }, { autoStart: false });
    bindings.setProperty('metadata', QuerySourceServiceExecutor.getMetadata(operation));
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

  protected static getMetadata(operation: Algebra.Service): MetadataBindings {
    return {
      state: new MetadataValidationState(),
      cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
      variables: algebraUtils.inScopeVariables(operation.input).map(variable => ({ variable, canBeUndef: true })),
    };
  }
}
