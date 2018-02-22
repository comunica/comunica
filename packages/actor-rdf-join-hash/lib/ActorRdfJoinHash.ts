import {Bindings, IActorQueryOperationOutput, IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {ActorRdfJoin, IActionRdfJoin} from "@comunica/bus-rdf-join";
import {IActorArgs} from "@comunica/core";
import {IMediatorTypeIterations} from "@comunica/mediatortype-iterations";
import {HashJoin} from "asyncjoin";

/**
 * A comunica Hash RDF Join Actor.
 */
export class ActorRdfJoinHash extends ActorRdfJoin {

  constructor(args: IActorArgs<IActionRdfJoin, IMediatorTypeIterations, IActorQueryOperationOutput>) {
    super(args, 2);
  }

  /**
   * Creates a hash of the given bindings by concatenating the results of the given variables.
   * This function will not sort the variables and expects them to be in the same order for every call.
   * @param {Bindings} bindings
   * @param {string[]} variables
   * @returns {string}
   */
  protected static hash(bindings: Bindings, variables: string[]): string {
    return variables.map((v) => bindings.get(v)).join('');
  }

  public async getOutput(action: IActionRdfJoin): Promise<IActorQueryOperationOutputBindings> {
    const variables = ActorRdfJoin.overlappingVariables(action);
    const join = new HashJoin<Bindings, string, Bindings>(
      action.entries[0].bindingsStream, action.entries[1].bindingsStream,
      (entry) => ActorRdfJoinHash.hash(entry, variables), ActorRdfJoin.join);
    return { type: 'bindings', bindingsStream: join, variables: ActorRdfJoin.joinVariables(action) };
  }

  protected async getIterations(action: IActionRdfJoin): Promise<number> {
    return (await action.entries[0].metadata()).totalItems + (await action.entries[1].metadata()).totalItems;
  }

}
