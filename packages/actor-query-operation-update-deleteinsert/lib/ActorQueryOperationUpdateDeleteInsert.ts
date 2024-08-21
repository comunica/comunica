import { BindingsToQuadsIterator } from '@comunica/actor-query-operation-construct';
import { BindingsFactory } from '@comunica/bindings-factory';
import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import type { MediatorRdfUpdateQuads } from '@comunica/bus-rdf-update-quads';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import type { IQueryOperationResult, BindingsStream, IActionContext, ComunicaDataFactory } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator } from 'asynciterator';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Update DeleteInsert Query Operation Actor.
 */
export class ActorQueryOperationUpdateDeleteInsert extends ActorQueryOperationTypedMediated<Algebra.DeleteInsert> {
  public readonly mediatorUpdateQuads: MediatorRdfUpdateQuads;
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;

  protected blankNodeCounter = 0;

  public constructor(args: IActorQueryOperationUpdateDeleteInsertArgs) {
    super(args, 'deleteinsert');
  }

  public async testOperation(
    operation: Algebra.DeleteInsert,
    context: IActionContext,
  ): Promise<IActorTest> {
    ActorQueryOperation.throwOnReadOnly(context);
    return true;
  }

  public async runOperation(operation: Algebra.DeleteInsert, context: IActionContext):
  Promise<IQueryOperationResult> {
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const bindingsFactory = await BindingsFactory.create(this.mediatorMergeBindingsContext, context, dataFactory);
    // Evaluate the where clause
    const whereBindings: BindingsStream = operation.where ?
      ActorQueryOperation.getSafeBindings(await this.mediatorQueryOperation
        .mediate({ operation: operation.where, context })).bindingsStream :
      new ArrayIterator<RDF.Bindings>([ bindingsFactory.bindings() ], { autoStart: false });

    // Construct triples using the result based on the pattern.
    let quadStreamInsert: AsyncIterator<RDF.Quad> | undefined;
    let quadStreamDelete: AsyncIterator<RDF.Quad> | undefined;
    if (operation.insert) {
      // Localize blank nodes in pattern, to avoid clashes across different INSERT/DELETE calls
      quadStreamInsert = new BindingsToQuadsIterator(
        dataFactory,
        operation.insert.map(BindingsToQuadsIterator.localizeQuad.bind(null, dataFactory, this.blankNodeCounter)),
        whereBindings.clone(),
      );
      this.blankNodeCounter++;
    }
    if (operation.delete) {
      // Localize blank nodes in pattern, to avoid clashes across different INSERT/DELETE calls
      quadStreamDelete = new BindingsToQuadsIterator(
        dataFactory,
        operation.delete.map(BindingsToQuadsIterator.localizeQuad.bind(null, dataFactory, this.blankNodeCounter)),
        whereBindings.clone(),
      );
      this.blankNodeCounter++;
    }

    // Evaluate the required modifications
    const { execute } = await this.mediatorUpdateQuads.mediate({
      quadStreamInsert,
      quadStreamDelete,
      context,
    });

    return {
      type: 'void',
      execute,
    };
  }
}

export interface IActorQueryOperationUpdateDeleteInsertArgs extends IActorQueryOperationTypedMediatedArgs {
  /**
   * The RDF Update Quads mediator
   */
  mediatorUpdateQuads: MediatorRdfUpdateQuads;
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;

}
