import {Bindings, IActorQueryOperationOutput} from "@comunica/bus-query-operation";
import {ActorRdfJoin, IActionRdfJoin} from "@comunica/bus-rdf-join";
import {IActorArgs} from "@comunica/core";
import {IMediatorTypeIterations} from "@comunica/mediatortype-iterations";
import {NestedLoopJoin} from "asyncjoin";

/**
 * A comunica NestedLoop RDF Join Actor.
 */
export class ActorRdfJoinNestedLoop extends ActorRdfJoin {

  constructor(args: IActorArgs<IActionRdfJoin, IMediatorTypeIterations, IActorQueryOperationOutput>) {
    super(args, 2);
  }

  protected async getOutput(action: IActionRdfJoin): Promise<IActorQueryOperationOutput> {
    const join = new NestedLoopJoin<Bindings, Bindings, Bindings>(
      action.entries[0].bindingsStream, action.entries[1].bindingsStream, ActorRdfJoin.join);
    const result: IActorQueryOperationOutput = { bindingsStream: join, variables: ActorRdfJoin.joinVariables(action) };

    if (ActorRdfJoin.iteratorsHaveMetadata(action, 'totalItems')) {
      result.metadata = { totalItems: this.getIterations(action) };
    }

    return result;
  }

  protected getIterations(action: IActionRdfJoin): number {
    return action.entries[0].metadata.totalItems * action.entries[1].metadata.totalItems;
  }

}
