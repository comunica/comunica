import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type { IActionQueryOperation } from '@comunica/bus-query-operation';
import { ActorQueryOperationTyped } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorArgs, IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type {
  IQueryOperationResult,
  BindingsStream,
  Bindings,
  IActionContext,
  MetadataBindings,
  ComunicaDataFactory,
} from '@comunica/types';
import { Algebra } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { ArrayIterator } from 'asynciterator';

/**
 * A comunica Values Query Operation Actor.
 */
export class ActorQueryOperationValues extends ActorQueryOperationTyped<Algebra.Values> {
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;

  public constructor(args: IActorQueryOperationUpdateDeleteInsertArgs) {
    super(args, Algebra.Types.VALUES);
    this.mediatorMergeBindingsContext = args.mediatorMergeBindingsContext;
  }

  public async testOperation(_operation: Algebra.Values, _context: IActionContext): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async runOperation(operation: Algebra.Values, context: IActionContext):
  Promise<IQueryOperationResult> {
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const bindingsFactory = await BindingsFactory.create(this.mediatorMergeBindingsContext, context, dataFactory);

    const bindingsStream: BindingsStream = new ArrayIterator<Bindings>(operation.bindings
      .map(x => bindingsFactory.bindings(Object.entries(x)
        .map(([ key, value ]) => [ dataFactory.variable(key), value ]))));
    const metadata = (): Promise<MetadataBindings> => Promise.resolve({
      state: new MetadataValidationState(),
      cardinality: { type: 'exact', value: operation.bindings.length },
      variables: operation.variables.map(variable => ({
        variable,
        canBeUndef: operation.bindings.some(bindings => !(variable.value in bindings)),
      })),
    });
    return { type: 'bindings', bindingsStream, metadata };
  }
}

export interface IActorQueryOperationUpdateDeleteInsertArgs extends
  IActorArgs<IActionQueryOperation, IActorTest, IQueryOperationResult> {
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;
}
