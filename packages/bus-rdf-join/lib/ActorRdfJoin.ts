
import {Bindings, IActorQueryOperationOutput} from "@comunica/bus-query-operation";
import {Actor, IAction, IActorArgs} from "@comunica/core";
import {IMediatorTypeIterations} from "@comunica/mediatortype-iterations";
import {EmptyIterator} from "asynciterator";
import * as _ from "lodash";

/**
 * A comunica actor for joining 2 binding streams.
 *
 * Actor types:
 * * Input:  IActionRdfJoin:      The streams that need to be joined.
 * * Test:   <none>
 * * Output: IActorRdfJoinOutput: The resulting joined stream.
 *
 * @see IActionRdfJoin
 * @see IActorQueryOperationOutput
 */
export abstract class ActorRdfJoin extends Actor<IActionRdfJoin, IMediatorTypeIterations, IActorQueryOperationOutput> {

  /**
   * Can be used by subclasses to indicate the max number of streams that can be joined.
   * 0 for infinity.
   */
  protected maxEntries: number;

  constructor(args: IActorArgs<IActionRdfJoin, IMediatorTypeIterations, IActorQueryOperationOutput>,
              maxEntries?: number) {
    super(args);
    this.maxEntries = maxEntries;
  }

  /**
   * Returns an array containing all the variable names that occur in all bindings streams.
   * @param {IActionRdfJoin} action
   * @returns {string[]}
   */
  public static overlappingVariables(action: IActionRdfJoin): string[] {
    return _.intersection.apply(_, action.entries.map((entry) => entry.variables));
  }

  /**
   * Returns the variables that will occur in the joined bindings.
   * @param {IActionRdfJoin} action
   * @returns {string[]}
   */
  public static joinVariables(action: IActionRdfJoin): string[] {
    return _.union.apply(_, action.entries.map((entry) => entry.variables));
  }

  /**
   * Returns the result of joining bindings, or `null` if no join is possible.
   * @param {Bindings[]} bindings
   * @returns {Bindings}
   */
  public static join(...bindings: Bindings[]): Bindings {
    try {
      return bindings.reduce((acc, val) => acc.mergeWith((l, r) => {
        if (!l.equals(r)) {
          throw new Error();
        }
        return l;
      }, val));
    } catch (e) {
      return null;
    }
  }

  /**
   * Checks if all metadata objects are present in the action, and if they have the specified key.
   * @param {IActionRdfJoin} action
   * @param {string} key
   * @returns {boolean}
   */
  public static async iteratorsHaveMetadata(action: IActionRdfJoin, key: string): Promise<boolean> {
    for (const entry of action.entries) {
      if (!entry.metadata || !(await entry.metadata).hasOwnProperty(key)) {
        return Promise.resolve(false);
      }
    }
    return Promise.resolve(true);
  }

  /**
   * Default test function for join actors.
   * Checks whether all iterators have metadata.
   * If yes: call the abstract getIterations method, if not: return Infinity.
   * @param {IActionRdfJoin} action The input action containing the relevant iterators
   * @returns {Promise<IMediatorTypeIterations>} The calculated estime.
   */
  public async test(action: IActionRdfJoin): Promise<IMediatorTypeIterations> {
    if (action.entries.length <= 1) {
      return { iterations: 0 };
    }
    if (this.maxEntries && action.entries.length > this.maxEntries) {
      return null;
    }
    const self = this;
    // not explicitly calculating with await since it might not be required by the mediator
    return ActorRdfJoin.iteratorsHaveMetadata(action, 'totalItems').
      then((haveMetadata) => {
        if (haveMetadata) {
          return self.getIterations(action).then((iterations) => ({ iterations }));
        } else {
          return { iterations: Infinity };
        }
      });
  }

  /**
   * Returns default input for 0 or 1 entries. Calls the getOutput function otherwise
   * @param {IActionRdfJoin} action
   * @returns {Promise<IActorQueryOperationOutput>}
   */
  public async run(action: IActionRdfJoin): Promise<IActorQueryOperationOutput> {
    if (action.entries.length === 0) {
      return { bindingsStream: new EmptyIterator(), metadata: Promise.resolve({ totalItems: 0 }), variables: [] };
    }
    if (action.entries.length === 1) {
      return action.entries[0];
    }

    let result = this.getOutput(action);

    if (await ActorRdfJoin.iteratorsHaveMetadata(action, 'totalItems')) {
      const totalItems = await Promise.all(action.entries
        .map((entry) => entry.metadata))
        .then((metadatas) => metadatas.reduce((acc, val) => acc * val.totalItems, 1));

      // update the result promise to also add the estimated total items
      // not using await since the actual results aren't required at this point
      result = result.then((previous) => {
        // make sure we don't remove any metadata added by the actual join implementation
        if (previous.hasOwnProperty('metadata')) {
          previous.metadata = previous.metadata.then((metadata) => {
            if (!metadata.hasOwnProperty('totalItems')) {
              metadata.totalItems = totalItems;
            }
            return metadata;
          });
        } else {
          previous.metadata = Promise.resolve({ totalItems });
        }
        return previous;
      });
    }

    return result;
  }

  /**
   * Returns the resulting output for joining the given entries.
   * This is called after removing the trivial cases in run.
   * @param {IActionRdfJoin} action
   * @returns {Promise<IActorQueryOperationOutput>}
   */
  protected abstract getOutput(action: IActionRdfJoin): Promise<IActorQueryOperationOutput>;

  /**
   * Used when calculating the number of iterations in the test function.
   * All metadata objects are guaranteed to have a value for the `totalItems` key.
   * @param {IActionRdfJoin} action
   * @returns {number} The estimated number of iterations when joining the given iterators.
   */
  protected abstract getIterations(action: IActionRdfJoin): Promise<number>;

}

export interface IActionRdfJoin extends IAction {

  /**
   * The list of streams and their corresponding metadata that need to be joined.
   */
  entries: IActorQueryOperationOutput[];
}
