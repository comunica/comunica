import {
  Bindings,
  getMetadata,
  IActorQueryOperationOutput,
  IActorQueryOperationOutputBindings
} from "@comunica/bus-query-operation";
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

  protected async getOutput(action: IActionRdfJoin): Promise<IActorQueryOperationOutputBindings> {
    const join = new NestedLoopJoin<Bindings, Bindings, Bindings>(
      action.entries[0].bindingsStream, action.entries[1].bindingsStream, <any> ActorRdfJoin.join,
        { autoStart: false });
    return { type: 'bindings', bindingsStream: join, variables: ActorRdfJoin.joinVariables(action) };
  }

  protected async getIterations(action: IActionRdfJoin): Promise<number> {
    return (await getMetadata(action.entries[0])).totalItems * (await getMetadata(action.entries[1])).totalItems;
  }

}
