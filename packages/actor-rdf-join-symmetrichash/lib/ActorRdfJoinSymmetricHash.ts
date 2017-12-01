import {Bindings, IActorQueryOperationOutput} from "@comunica/bus-query-operation";
import {ActorRdfJoin, IActionRdfJoin} from "@comunica/bus-rdf-join";
import {IActorArgs} from "@comunica/core";
import {IMediatorTypeIterations} from "@comunica/mediatortype-iterations";
import {SymmetricHashJoin} from "asyncjoin";

/**
 * A comunica Hash RDF Join Actor.
 */
export class ActorRdfJoinSymmetricHash extends ActorRdfJoin {

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

  public async getOutput(action: IActionRdfJoin): Promise<IActorQueryOperationOutput> {
    const variables = ActorRdfJoin.overlappingVariables(action);
    const join = new SymmetricHashJoin<Bindings, string, Bindings>(
      action.entries[0].bindingsStream, action.entries[1].bindingsStream,
      (entry) => ActorRdfJoinSymmetricHash.hash(entry, variables), ActorRdfJoin.join);
    const result: IActorQueryOperationOutput = { bindingsStream: join, variables: ActorRdfJoin.joinVariables(action) };

    if (ActorRdfJoin.iteratorsHaveMetadata(action, 'totalItems')) {
      result.metadata = { totalItems: action.entries[0].metadata.totalItems * action.entries[1].metadata.totalItems };
    }

    return result;
  }

  protected getIterations(action: IActionRdfJoin): number {
    return action.entries[0].metadata.totalItems + action.entries[1].metadata.totalItems;
  }

}
