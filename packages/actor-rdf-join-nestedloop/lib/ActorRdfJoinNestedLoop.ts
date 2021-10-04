import {
  getMetadata,
} from '@comunica/bus-query-operation';
import type { IActionRdfJoin, IActorRdfJoinOutputInner } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { IActorArgs } from '@comunica/core';
import type { IMediatorTypeIterations } from '@comunica/mediatortype-iterations';
import type { Bindings,
  IActorQueryOperationOutput } from '@comunica/types';
import { NestedLoopJoin } from 'asyncjoin';

/**
 * A comunica NestedLoop RDF Join Actor.
 */
export class ActorRdfJoinNestedLoop extends ActorRdfJoin {
  public constructor(args: IActorArgs<IActionRdfJoin, IMediatorTypeIterations, IActorQueryOperationOutput>) {
    super(args, 'nested-loop', 2, undefined, true);
  }

  protected async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    const join = new NestedLoopJoin<Bindings, Bindings, Bindings>(
      action.entries[0].output.bindingsStream,
      action.entries[1].output.bindingsStream,
      <any> ActorRdfJoin.joinBindings,
      { autoStart: false },
    );
    return {
      result: {
        type: 'bindings',
        bindingsStream: join,
        variables: ActorRdfJoin.joinVariables(action),
        canContainUndefs: action.entries.reduce((acc, val) => acc || val.output.canContainUndefs, false),
      },
    };
  }

  protected async getIterations(action: IActionRdfJoin): Promise<number> {
    return (await getMetadata(action.entries[0].output)).cardinality *
      (await getMetadata(action.entries[1].output)).cardinality;
  }
}
