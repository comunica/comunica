import { BindingsToQuadsIterator } from '@comunica/actor-query-operation-construct';
import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import type { MediatorRdfUpdateQuads } from '@comunica/bus-rdf-update-quads';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import type { IQueryOperationResult, BindingsStream, IActionContext, ComunicaDataFactory } from '@comunica/types';
import { Algebra } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { getSafeBindings, testReadOnly } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator, TransformIterator } from 'asynciterator';

/**
 * A comunica Update DeleteInsert Query Operation Actor.
 */
export class ActorQueryOperationUpdateDeleteInsert extends ActorQueryOperationTypedMediated<Algebra.DeleteInsert> {
  public readonly mediatorUpdateQuads: MediatorRdfUpdateQuads;
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;

  protected blankNodeCounter = 0;

  public constructor(args: IActorQueryOperationUpdateDeleteInsertArgs) {
    super(args, Algebra.Types.DELETE_INSERT);
    this.mediatorUpdateQuads = args.mediatorUpdateQuads;
    this.mediatorMergeBindingsContext = args.mediatorMergeBindingsContext;
  }

  public async testOperation(
    operation: Algebra.DeleteInsert,
    context: IActionContext,
  ): Promise<TestResult<IActorTest>> {
    return testReadOnly(context);
  }

  /**
   * A stream of the given bindings that only produces them once all of them are known,
   * which is when the destination starts reading the quads to delete or insert.
   * The pattern of the WHERE clause must be evaluated before the destination is changed,
   * since both templates are instantiated from its solutions over the dataset before the operation,
   * as SPARQL 1.1 Update prescribes in sections 3.1.3 and 4.3.3.
   * Otherwise, a destination that is also a source could change what the pattern matches,
   * as an insertion that matches the pattern again, which may never end.
   * @param bindings The solutions of the WHERE clause.
   */
  public static evaluatedFirst(bindings: BindingsStream): BindingsStream {
    return new TransformIterator<RDF.Bindings>(
      async() => new ArrayIterator(await bindings.toArray(), { autoStart: false }),
      { autoStart: false },
    );
  }

  public async runOperation(operation: Algebra.DeleteInsert, context: IActionContext):
  Promise<IQueryOperationResult> {
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const bindingsFactory = await BindingsFactory.create(this.mediatorMergeBindingsContext, context, dataFactory);
    // Evaluate the where clause
    const whereBindings: BindingsStream = operation.where ?
      ActorQueryOperationUpdateDeleteInsert.evaluatedFirst(getSafeBindings(await this.mediatorQueryOperation
        .mediate({ operation: operation.where, context })).bindingsStream) :
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
