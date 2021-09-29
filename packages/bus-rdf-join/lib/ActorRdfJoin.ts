import { getMetadata } from '@comunica/bus-query-operation';
import type { IAction, IActorArgs } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { IMediatorTypeIterations } from '@comunica/mediatortype-iterations';
import type { Bindings, IActorQueryOperationOutput,
  IActorQueryOperationOutputBindings } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import type { Algebra } from 'sparqlalgebrajs';

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
  /**
   * If this actor can handle undefs in the bindings.
   */
  protected canHandleUndefs: boolean;

  public constructor(
    args: IActorArgs<IActionRdfJoin, IMediatorTypeIterations, IActorQueryOperationOutput>,
    limitEntries?: number,
    limitEntriesMin?: boolean,
    canHandleUndefs?: boolean,
  ) {
    super(args);
    this.limitEntries = limitEntries ?? Number.POSITIVE_INFINITY;
    this.limitEntriesMin = limitEntriesMin ?? false;
    this.canHandleUndefs = canHandleUndefs ?? false;
  }

  /**
   * Returns an array containing all the variable names that occur in all bindings streams.
   * @param {IActionRdfJoin} action
   * @returns {string[]}
   */
  public static overlappingVariables(action: IActionRdfJoin): string[] {
    const variables = action.entries.map(entry => entry.output.variables);
    let baseArray = variables[0];
    for (const array of variables.slice(1)) {
      baseArray = baseArray.filter(el => array.includes(el));
    }
    return baseArray;
  }

  /**
   * Returns the variables that will occur in the joined bindings.
   * @param {IActionRdfJoin} action The join action.
   * @returns {string[]}
   */
  public static joinVariables(action: IActionRdfJoin): string[] {
    return ActorRdfJoin.joinVariablesStreams(action.entries.map(entry => entry.output));
  }

  /**
   * Returns the variables that will occur in the joined bindings.
   * @param {IActorQueryOperationOutputBindings[]} streams The streams to consider
   * @returns {string[]}
   */
  public static joinVariablesStreams(streams: IActorQueryOperationOutputBindings[]): string[] {
    const variables = streams.map(entry => entry.variables);
    const withDuplicates = variables.reduce((acc, it) => [ ...acc, ...it ], []);
    return [ ...new Set(withDuplicates) ];
  }

  /**
   * Returns the result of joining bindings, or `null` if no join is possible.
   * @param {Bindings[]} bindings
   * @returns {Bindings}
   */
  public static joinBindings(...bindings: Bindings[]): Bindings | null {
    try {
      return bindings.reduce((acc: Bindings, val: Bindings) => acc.mergeWith((left: RDF.Term, right: RDF.Term) => {
        if (!left.equals(right)) {
          throw new Error('Join failure');
        }
        return left;
      }, val));
    } catch {
      return null;
    }
  }

  /**
   * Checks if all metadata objects are present in the action, and if they have the specified key.
   * @param {IActionRdfJoin} action
   * @param {string} key
   * @returns {boolean}
   */
  public static async allEntriesHaveMetadata(action: IActionRdfJoin, key: string): Promise<boolean> {
    return Promise.all(action.entries.map(async entry => {
      if (!entry.output.metadata) {
        throw new Error('Missing metadata');
      }
      const metadata = await entry.output.metadata();
      if (!(key in metadata)) {
        throw new Error('Missing metadata value');
      }
    })).then(() => true).catch(() => false);
  }

  /**
   * Get the estimated number of items from the given metadata.
   * @param {Record<string, any>} metadata A metadata object.
   * @return {number} The estimated number of items, or `Infinity` if totalItems is falsy.
   */
  public static getCardinality(metadata: Record<string, any>): number {
    return metadata.totalItems || metadata.totalItems === 0 ? metadata.totalItems : Number.POSITIVE_INFINITY;
  }

  /**
   * Find the metadata index with the lowest cardinality.
   * @param {(Record<string, any> | undefined)[]} metadatas An array of optional metadata objects for the entries.
   * @return {number} The index of the entry with the lowest cardinality.
   */
  public static getLowestCardinalityIndex(metadatas: Record<string, any>[]): number {
    let smallestId = -1;
    let smallestCount = Number.POSITIVE_INFINITY;
    for (const [ i, meta ] of metadatas.entries()) {
      const count: number = ActorRdfJoin.getCardinality(meta);
      if (count < smallestCount || smallestId === -1) {
        smallestCount = count;
        smallestId = i;
      }
    }
    return smallestId;
  }

  /**
   * Obtain the metadata from all given join entries.
   * @param entries Join entries.
   */
  public static async getMetadatas(entries: IJoinEntry[]): Promise<Record<string, any>[]> {
    return await Promise.all(entries.map(entry => getMetadata(entry.output)));
  }

  /**
   * Default test function for join actors.
   * Checks whether all iterators have metadata.
   * If yes: call the abstract getIterations method, if not: return Infinity.
   * @param {IActionRdfJoin} action The input action containing the relevant iterators
   * @returns {Promise<IMediatorTypeIterations>} The calculated estime.
   */
  public async test(action: IActionRdfJoin): Promise<IMediatorTypeIterations> {
    // Allow joining of one or zero streams
    if (action.entries.length <= 1) {
      return { iterations: 0 };
    }

    // Check if this actor can handle the given number of streams
    if (this.limitEntriesMin ? action.entries.length < this.limitEntries : action.entries.length > this.limitEntries) {
      throw new Error(`${this.name} requires ${this.limitEntries
      } sources at ${this.limitEntriesMin ? 'least' : 'most'
      }. The input contained ${action.entries.length}.`);
    }

    // Check if all streams are bindings streams
    for (const entry of action.entries) {
      if (entry.output.type !== 'bindings') {
        throw new Error(`Invalid type of a join entry: Expected 'bindings' but got '${entry.output.type}'`);
      }
    }

    // Check if this actor can handle undefs
    if (!this.canHandleUndefs) {
      for (const entry of action.entries) {
        if (entry.output.canContainUndefs) {
          throw new Error(`Actor ${this.name} can not join streams containing undefs`);
        }
      }
    }

    // If at least one entry has no metadata, return infinity
    if (!await ActorRdfJoin.allEntriesHaveMetadata(action, 'totalItems')) {
      return { iterations: Number.POSITIVE_INFINITY };
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
        bindingsStream: new ArrayIterator([], { autoStart: false }),
        metadata: () => Promise.resolve({ totalItems: 0 }),
        type: 'bindings',
        variables: [],
        canContainUndefs: false,
      };
    }
    if (action.entries.length === 1) {
      return action.entries[0].output;
    }

    const result = this.getOutput(action);

    // Lazily calculate upper cardinality limit
    function calculateCardinality(): Promise<number> {
      return Promise.all(action.entries
        .map(entry => (<() => Promise<Record<string, any>>> entry.output.metadata)()))
        .then(metadatas => metadatas.reduce((acc, val) => acc * val.totalItems, 1));
    }

    if (await ActorRdfJoin.allEntriesHaveMetadata(action, 'totalItems')) {
      // Update the result promise to also add the estimated total items
      const unwrapped = await result;
      if (unwrapped.metadata) {
        const oldMetadata = unwrapped.metadata;
        unwrapped.metadata = () => oldMetadata().then(async(metadata: any) => {
          // Don't overwrite metadata if it was generated by implementation
          if (!('totalItems' in metadata)) {
            metadata.totalItems = await calculateCardinality();
          }
          return metadata;
        });
      } else {
        unwrapped.metadata = () => calculateCardinality().then(totalItemsValue => ({ totalItems: totalItemsValue }));
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
   * The array of streams to join.
   */
  entries: IJoinEntry[];
}

/**
 * A joinable entry.
 */
export interface IJoinEntry {
  /**
   * A (lazy) resolved bindings stream, from which metadata may be obtained.
   */
  output: IActorQueryOperationOutputBindings;
  /**
   * The original query operation from which the bindings stream was produced.
   */
  operation: Algebra.Operation;
}
