import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { ActionContext, failTest, passTestVoid } from '@comunica/core';
import type { IActionContext, SourceType } from '@comunica/types';
import { Algebra, isKnownOperation } from '@comunica/utils-algebra';

/**
 * A comunica Set Sources From Dataset Optimize Query Operation Actor.
 *
 * It appends the IRIs of the query's FROM and FROM NAMED clauses as sources to the context,
 * and removes the dataset clauses from the query afterwards.
 * FROM NAMED sources are tagged so that their data is exposed under the named graph of their IRI.
 */
export class ActorOptimizeQueryOperationSetSourcesFromDataset extends ActorOptimizeQueryOperation {
  public async test(action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    if (!action.context.get(KeysInitQuery.dereferenceFromNamed)) {
      return failTest('This actor can only be used when dereferenceFromNamed is enabled.');
    }
    if (!isKnownOperation(action.operation, Algebra.Types.FROM)) {
      return failTest('This actor can only be used on queries with a FROM or FROM NAMED clause.');
    }
    return passTestVoid();
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    // The operation type has been asserted in test()
    const operation = <Algebra.From> action.operation;
    return {
      operation: operation.input,
      context: ActorOptimizeQueryOperationSetSourcesFromDataset.appendSources(action.context, operation),
    };
  }

  /**
   * Append the dataset clauses of the given operation as sources to the given context.
   * @param context The context to append the sources to.
   * @param operation The FROM operation to read the dataset clauses from.
   */
  public static appendSources(context: IActionContext, operation: Algebra.From): IActionContext {
    const existingSources: SourceType[] = context.get(KeysInitQuery.querySourcesUnidentified) ?? [];

    // FROM NAMED sources are tagged, so that they expose their data under the named graph of their IRI
    const namedSources: SourceType[] = operation.named.map(graph => ({
      value: graph.value,
      context: new ActionContext({ [KeysQueryOperation.sourceAsNamedGraph.name]: graph }),
    }));

    return context.set(KeysInitQuery.querySourcesUnidentified, [
      ...new Set([ ...existingSources, ...operation.default.map(graph => graph.value) ]),
      ...namedSources,
    ]);
  }
}
