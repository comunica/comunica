import type { BindOrder } from '@comunica/actor-rdf-join-multi-bind';
import { ActorRdfJoinMultiBind } from '@comunica/actor-rdf-join-multi-bind';
import type { IActorQueryOperationOutputBindings } from '@comunica/bus-query-operation';
import { ActorQueryOperation, getMetadata } from '@comunica/bus-query-operation';
import type {
  IActionRdfJoin,
  IActorRdfJoinOutputInner,
  IMetadataChecked,
} from '@comunica/bus-rdf-join';
import {
  ActorRdfJoin,
} from '@comunica/bus-rdf-join';
import { KeysQueryOperation } from '@comunica/context-entries';
import type { Actor, IActorArgs, IActorTest, Mediator } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { Bindings, BindingsStream, IActionQueryOperation } from '@comunica/types';
import { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Optional Bind RDF Join Actor.
 */
export class ActorRdfJoinOptionalBind extends ActorRdfJoin {
  public readonly bindOrder: BindOrder;
  public readonly mediatorQueryOperation: Mediator<
  Actor<IActionQueryOperation, IActorTest, IActorQueryOperationOutputBindings>,
  IActionQueryOperation, IActorTest, IActorQueryOperationOutputBindings>;

  public constructor(args: IActorRdfJoinOptionalBindArgs) {
    super(args, 'optional', 'bind', 2, undefined, true);
  }

  protected async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    // Close the right stream, since we don't need that one
    action.entries[1].output.bindingsStream.close();

    // Bind the right pattern for each binding in the stream
    const subContext = action.context && action.context
      .set(KeysQueryOperation.joinLeftMetadata, await getMetadata(action.entries[0].output))
      .set(KeysQueryOperation.joinRightMetadatas, [ await getMetadata(action.entries[1].output) ]);
    const bindingsStream: BindingsStream = ActorRdfJoinMultiBind.createBindStream(
      this.bindOrder,
      action.entries[0].output.bindingsStream,
      [ action.entries[1].operation ],
      async(operations: Algebra.Operation[], operationBindings: Bindings) => {
        // Send the materialized patterns to the mediator for recursive join evaluation.
        // Length of operations will always be 1
        const operation = operations[0];
        const output = ActorQueryOperation.getSafeBindings(await this.mediatorQueryOperation.mediate(
          { operation, context: subContext?.set(KeysQueryOperation.joinBindings, operationBindings) },
        ));
        return output.bindingsStream;
      },
      true,
    );

    return {
      result: {
        type: 'bindings',
        bindingsStream,
        variables: ActorRdfJoin.joinVariables(action),
        canContainUndefs: true,
      },
    };
  }

  public async getJoinCoefficients(
    action: IActionRdfJoin,
    metadatas: IMetadataChecked[],
  ): Promise<IMediatorTypeJoinCoefficients> {
    const requestInitialTimes = ActorRdfJoin.getRequestInitialTimes(metadatas);
    const requestItemTimes = ActorRdfJoin.getRequestItemTimes(metadatas);

    // Reject binding on some operation types
    if (action.entries[1].operation.type === Algebra.types.EXTEND ||
      action.entries[1].operation.type === Algebra.types.GROUP) {
      throw new Error(`Actor ${this.name} can not bind on Extend and Group operations`);
    }

    // Calculate overlap factor of variables of the smallest entry with the other entries
    // This is a heuristic for determining the join cardinality
    const variablesBoundRemaining = this.getBoundVariablesAfterBinding(
      action.entries[0].output.variables,
      action.entries[1].output.variables,
    ) * 10;

    return {
      iterations: metadatas[0].cardinality * metadatas[1].cardinality / variablesBoundRemaining,
      persistedItems: 0,
      blockingItems: 0,
      requestTime: requestInitialTimes[0] +
        metadatas[0].cardinality / variablesBoundRemaining * (
          requestItemTimes[0] +
          requestInitialTimes[1] +
          metadatas[1].cardinality * requestItemTimes[1]
        ),
    };
  }

  public getBoundVariablesAfterBinding(variablesPrimary: string[], variablesSecondary: string[]): number {
    let boundVariables = 0;
    for (const variable of variablesSecondary) {
      if (variablesPrimary.includes(variable)) {
        boundVariables++;
      }
    }
    return boundVariables;
  }
}

export interface IActorRdfJoinOptionalBindArgs
  extends IActorArgs<IActionRdfJoin, IMediatorTypeJoinCoefficients, IActorQueryOperationOutputBindings> {
  bindOrder: BindOrder;
  mediatorQueryOperation: Mediator<Actor<IActionQueryOperation, IActorTest, IActorQueryOperationOutputBindings>,
  IActionQueryOperation, IActorTest, IActorQueryOperationOutputBindings>;
}
