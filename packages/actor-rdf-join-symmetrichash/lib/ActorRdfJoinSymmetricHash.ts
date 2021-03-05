import {
  getMetadata,
} from '@comunica/bus-query-operation';
import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { IActorArgs } from '@comunica/core';
import type { IMediatorTypeIterations } from '@comunica/mediatortype-iterations';
import type { Bindings,
  IActorQueryOperationOutput,
  IActorQueryOperationOutputBindings } from '@comunica/types';
import { SymmetricHashJoin } from 'asyncjoin';

/**
 * A comunica Hash RDF Join Actor.
 */
export class ActorRdfJoinSymmetricHash extends ActorRdfJoin {
  public constructor(args: IActorArgs<IActionRdfJoin, IMediatorTypeIterations, IActorQueryOperationOutput>) {
    super(args, 2);
  }

  /**
   * Creates a hash of the given bindings by concatenating the results of the given variables.
   * This function will not sort the variables and expects them to be in the same order for every call.
   * @param {Bindings} bindings
   * @param {string[]} variables
   * @returns {string}
   */
  public static hash(bindings: Bindings, variables: string[]): string {
    return variables.filter(variable => bindings.has(variable)).map(variable => bindings.get(variable).value).join('');
  }

  public async getOutput(action: IActionRdfJoin): Promise<IActorQueryOperationOutputBindings> {
    const variables = ActorRdfJoin.overlappingVariables(action);
    const join = new SymmetricHashJoin<Bindings, string, Bindings>(
      action.entries[0].bindingsStream,
      action.entries[1].bindingsStream,
      entry => ActorRdfJoinSymmetricHash.hash(entry, variables),
      <any> ActorRdfJoin.join,
    );
    return {
      type: 'bindings',
      bindingsStream: join,
      variables: ActorRdfJoin.joinVariables(action),
      canContainUndefs: false,
    };
  }

  protected async getIterations(action: IActionRdfJoin): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    return (await getMetadata(action.entries[0])).totalItems + (await getMetadata(action.entries[1])).totalItems;
  }
}
