import {Bindings} from "@comunica/bus-query-operation";
import {ActorRdfJoin, IActionRdfJoin, IActorRdfJoinOutput} from "@comunica/bus-rdf-join";
import {IActorArgs} from "@comunica/core";
import {IMediatorTypeIterations} from "@comunica/mediatortype-iterations";
import {NestedLoopJoin} from "asyncjoin";

/**
 * A comunica NestedLoop RDF Join Actor.
 */
export class ActorRdfJoinNestedLoop extends ActorRdfJoin {

  constructor(args: IActorArgs<IActionRdfJoin, IMediatorTypeIterations, IActorRdfJoinOutput>) {
    super(args);
  }

  public async run(action: IActionRdfJoin): Promise<IActorRdfJoinOutput> {
    const join = new NestedLoopJoin<Bindings, Bindings, Bindings>(action.left, action.right, ActorRdfJoin.join);
    const result: IActorRdfJoinOutput = { bindingsStream: join, variables: ActorRdfJoin.joinVariables(action) };

    if (ActorRdfJoin.iteratorsHaveMetadata(action, 'totalItems')) {
      result.metadata = { totalItems: this.getIterations(action) };
    }

    return result;
  }

  protected getIterations(action: IActionRdfJoin): number {
    return action.leftMetadata.totalItems * action.rightMetadata.totalItems;
  }

}
