import {Bindings} from "@comunica/bus-query-operation";
import {ActorRdfJoin, IActionRdfJoin, IActorRdfJoinOutput} from "@comunica/bus-rdf-join";
import {IActorArgs} from "@comunica/core";
import {IMediatorTypeIterations} from "@comunica/mediatortype-iterations";
import {HashJoin} from "asyncjoin";

/**
 * A comunica Hash RDF Join Actor.
 */
export class ActorRdfJoinSymmetricHash extends ActorRdfJoin {

  constructor(args: IActorArgs<IActionRdfJoin, IMediatorTypeIterations, IActorRdfJoinOutput>) {
    super(args);
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

  public async run(action: IActionRdfJoin): Promise<IActorRdfJoinOutput> {
    const variables = ActorRdfJoin.overlappingVariables(action);
    const join = new HashJoin<Bindings, string, Bindings>(action.left, action.right,
      (entry) => ActorRdfJoinSymmetricHash.hash(entry, variables), ActorRdfJoin.join);
    const result: IActorRdfJoinOutput = { bindingsStream: join, variables: ActorRdfJoin.joinVariables(action) };

    if (ActorRdfJoin.iteratorsHaveMetadata(action, 'totalItems')) {
      result.metadata = { totalItems: this.getIterations(action) };
    }

    return result;
  }

  protected getIterations(action: IActionRdfJoin): number {
    return action.leftMetadata.totalItems + action.rightMetadata.totalItems;
  }

}
