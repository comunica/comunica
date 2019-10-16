import {Bindings, IActorQueryOperationOutput,
  IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {Actor, IAction, IActorArgs} from "@comunica/core";
import {IMediatorTypeIterations} from "@comunica/mediatortype-iterations";
import {EmptyIterator} from "asynciterator";

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
   * Can be used by subclasses to indicate the max or min number of streams that can be joined.
   * 0 for infinity.
   * By default, this indicates the max number, but can be inverted by setting limitEntriesMin to true.
   */
  protected limitEntries: number;
  /**
   * If true, the limitEntries field is a lower limit,
   * otherwise, it is an upper limit.
   */
  protected limitEntriesMin: boolean;

  constructor(args: IActorArgs<IActionRdfJoin, IMediatorTypeIterations, IActorQueryOperationOutput>,
              limitEntries?: number, limitEntriesMin?: boolean) {
    super(args);
    this.limitEntries = limitEntries;
    this.limitEntriesMin = limitEntriesMin;
  }

  /**
   * Returns an array containing all the variable names that occur in all bindings streams.
   * @param {IActionRdfJoin} action
   * @returns {string[]}
   */
  public static overlappingVariables(action: IActionRdfJoin): string[] {
    return require('lodash.intersection').apply(this, action.entries.map((entry) => entry.variables));
  }

  /**
   * Returns the variables that will occur in the joined bindings.
   * @param {IActionRdfJoin} action
   * @returns {string[]}
   */
  public static joinVariables(action: IActionRdfJoin): string[] {
    return require('lodash.union').apply(this, action.entries.map((entry) => entry.variables));
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
    return Promise.all(action.entries.map(async (entry) => {
      const metadata = await entry.metadata();
      if (!metadata.hasOwnProperty(key)) {
        throw new Error();
      }
    })).then(() => true).catch(() => false);
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
    if (this.limitEntries && (this.limitEntriesMin
      ? action.entries.length < this.limitEntries : action.entries.length > this.limitEntries)) {
      throw new Error(this.name + ' requires ' + this.limitEntries
        + ' sources at ' + (this.limitEntriesMin ? 'least' : 'most')
        + '. The input contained ' + action.entries.length + '.');
    }
    for (const entry of action.entries) {
      if (entry.type !== 'bindings') {
        throw new Error('Invalid type of a join entry: Expected \'bindings\' but got \'' + entry.type + '\'');
      }
    }

    if (!(await ActorRdfJoin.iteratorsHaveMetadata(action, 'totalItems'))) {
      return { iterations: Infinity };
    }

    return { iterations: await this.getIterations(action) };
  }

  /**
   * Returns default input for 0 or 1 entries. Calls the getOutput function otherwise
   * @param {IActionRdfJoin} action
   * @returns {Promise<IActorQueryOperationOutput>}
   */
  public async run(action: IActionRdfJoin): Promise<IActorQueryOperationOutputBindings> {
    if (action.entries.length === 0) {
      return {
        bindingsStream: new EmptyIterator(),
        metadata: () => Promise.resolve({ totalItems: 0 }),
        type: 'bindings',
        variables: [],
      };
    }
    if (action.entries.length === 1) {
      return action.entries[0];
    }

    const result = this.getOutput(action);

    if (await ActorRdfJoin.iteratorsHaveMetadata(action, 'totalItems')) {
      const totalItems = () => Promise.all(action.entries
        .map((entry) => entry.metadata()))
        .then((metadatas) => metadatas.reduce((acc, val) => acc * val.totalItems, 1));

      // update the result promise to also add the estimated total items
      const unwrapped = await result;
      if (unwrapped.metadata) {
        const oldMetadata = unwrapped.metadata;
        unwrapped.metadata = () => oldMetadata().then(async (metadata) => {
          // don't overwrite metadata if it was generated by implementation
          if (!metadata.hasOwnProperty('totalItems')) {
            metadata.totalItems = await totalItems();
          }
          return metadata;
        });
      } else {
        unwrapped.metadata = () => totalItems().then((t) => ({ totalItems: t }));
      }
      return unwrapped;
    }

    return result;
  }

  /**
   * Returns the resulting output for joining the given entries.
   * This is called after removing the trivial cases in run.
   * @param {IActionRdfJoin} action
   * @returns {Promise<IActorQueryOperationOutput>}
   */
  protected abstract getOutput(action: IActionRdfJoin): Promise<IActorQueryOperationOutputBindings>;

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
  entries: IActorQueryOperationOutputBindings[];
}
