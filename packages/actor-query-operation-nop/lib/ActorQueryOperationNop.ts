import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { ComunicaDataFactory, IActionContext, IQueryOperationResult } from '@comunica/types';
import { Algebra } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import { SingletonIterator } from 'asynciterator';

/**
 * A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation)
 * actor that handles SPARQL nop operations.
 */
export class ActorQueryOperationNop extends ActorQueryOperationTypedMediated<Algebra.Nop> {
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;

  public constructor(args: IActorQueryOperationNopArgs) {
    super(args, Algebra.Types.NOP);
    this.mediatorMergeBindingsContext = args.mediatorMergeBindingsContext;
  }

  public async testOperation(_operation: Algebra.Nop, _context: IActionContext): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async runOperation(operation: Algebra.Nop, context: IActionContext): Promise<IQueryOperationResult> {
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const bindingsFactory = await BindingsFactory.create(
      this.mediatorMergeBindingsContext,
      context,
      dataFactory,
    );

    return {
      bindingsStream: new SingletonIterator<RDF.Bindings>(bindingsFactory.bindings()),
      metadata: () => Promise.resolve({
        state: new MetadataValidationState(),
        cardinality: { type: 'exact', value: 1 },
        variables: [],
      }),
      type: 'bindings',
    };
  }
}

export interface IActorQueryOperationNopArgs extends IActorQueryOperationTypedMediatedArgs {
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;
}
