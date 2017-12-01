
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
  public static iteratorsHaveMetadata(action: IActionRdfJoin, key: string): boolean {
    return action.entries.every((entry) => entry.metadata && entry.metadata.hasOwnProperty(key));
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
    if (!ActorRdfJoin.iteratorsHaveMetadata(action, 'totalItems')) {
      return { iterations: Infinity };
    }
    return { iterations: this.getIterations(action) };
  }

  /**
   * Returns default input for 0 or 1 entries. Calls the getOutput function otherwise
   * @param {IActionRdfJoin} action
   * @returns {Promise<IActorQueryOperationOutput>}
   */
  public async run(action: IActionRdfJoin): Promise<IActorQueryOperationOutput> {
    if (action.entries.length === 0) {
      return { bindingsStream: new EmptyIterator(), metadata: { totalItems: 0}, variables: [] };
    }
    if (action.entries.length === 1) {
      return action.entries[0];
    }
    return this.getOutput(action);
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
  protected abstract getIterations(action: IActionRdfJoin): number;

}

export interface IActionRdfJoin extends IAction {

  /**
   * The list of streams and their corresponding metadata that need to be joined.
   */
  entries: IActorQueryOperationOutput[];
}
