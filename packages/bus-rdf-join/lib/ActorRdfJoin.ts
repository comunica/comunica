import type { Bindings } from '@comunica/bus-query-operation';
import { getMetadata } from '@comunica/bus-query-operation';
import type { IActionRdfJoinSelectivity, IActorRdfJoinSelectivityOutput } from '@comunica/bus-rdf-join-selectivity';
import { KeysInitSparql } from '@comunica/context-entries';
import type { IAction, IActorArgs, IActorTest, Mediator } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type {
  IActorQueryOperationOutputBindings,
  IPhysicalQueryPlanLogger,
} from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { termToString } from 'rdf-string';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica actor for joining 2 binding streams.
 *
 * Actor types:
 * * Input:  IActionRdfJoin:                The streams that need to be joined.
 * * Test:   IMediatorTypeJoinCoefficients: Join coefficients.
 * * Output: IActorRdfJoinOutput:           The resulting joined stream.
 *
 * @see IActionRdfJoin
 * @see IActorQueryOperationOutput
 */
export abstract class ActorRdfJoin
  extends Actor<IActionRdfJoin, IMediatorTypeJoinCoefficients, IActorQueryOperationOutputBindings> {
  public static readonly METADATA_KEYS: (keyof IMetadataChecked)[] = [
    'cardinality',
  ];

  public readonly mediatorJoinSelectivity: Mediator<
  Actor<IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>,
  IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>;

  /**
   * If this actor will be logged in the debugger and physical query plan logger
   */
  public includeInLogs = true;
  public readonly logicalType: LogicalJoinType;
  public readonly physicalName: string;
  /**
   * Can be used by subclasses to indicate the max or min number of streams that can be joined.
   * 0 for infinity.
   * By default, this indicates the max number, but can be inverted by setting limitEntriesMin to true.
   */
  protected readonly limitEntries: number;
  /**
   * If true, the limitEntries field is a lower limit,
   * otherwise, it is an upper limit.
   */
  protected readonly limitEntriesMin: boolean;
  /**
   * If this actor can handle undefs in the bindings.
   */
  protected readonly canHandleUndefs: boolean;

  public constructor(args: IActorRdfJoinArgs, options: IActorRdfJoinInternalOptions) {
    super(args);
    this.logicalType = options.logicalType;
    this.physicalName = options.physicalName;
    this.limitEntries = options.limitEntries ?? Number.POSITIVE_INFINITY;
    this.limitEntriesMin = options.limitEntriesMin ?? false;
    this.canHandleUndefs = options.canHandleUndefs ?? false;
  }

  /**
   * Creates a hash of the given bindings by concatenating the results of the given variables.
   * This function will not sort the variables and expects them to be in the same order for every call.
   * @param {Bindings} bindings
   * @param {string[]} variables
   * @returns {string}
   */
  public static hash(bindings: Bindings, variables: string[]): string {
    return variables
      .filter(variable => bindings.has(variable))
      .map(variable => termToString(bindings.get(variable)))
      .join('');
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
    let valid = true;
    const joined = bindings
      .reduce((acc: Bindings, val: Bindings) => acc.mergeWith((left: RDF.Term, right: RDF.Term) => {
        if (!left.equals(right)) {
          valid = false;
        }
        return left;
      }, val));
    return valid ? joined : null;
  }

  /**
   * Checks if all metadata objects are present in the action, and if they have the specified key.
   * @param {Record<string, any>[]} metadatas The metadata entries.
   * @returns {boolean}
   */
  public static validateMetadata(metadatas: Record<string, any>[]): boolean {
    for (const metadata of metadatas) {
      if (!metadata) {
        return false;
      }
      for (const key of ActorRdfJoin.METADATA_KEYS) {
        if (!(key in metadata)) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Get the estimated number of items from the given metadata.
   * @param {Record<string, any>} metadata A metadata object.
   * @return {number} The estimated number of items, or `Infinity` if cardinality is falsy.
   */
  public static getCardinality(metadata: Record<string, any>): number {
    return metadata.cardinality || metadata.cardinality === 0 ? metadata.cardinality : Number.POSITIVE_INFINITY;
  }

  /**
   * Find the metadata index with the lowest cardinality.
   * @param {(Record<string, any> | undefined)[]} metadatas An array of optional metadata objects for the entries.
   * @param indexBlacklist An optional array of blacklisted indexes that will not be considered.
   * @return {number} The index of the entry with the lowest cardinality.
   */
  public static getLowestCardinalityIndex(metadatas: Record<string, any>[], indexBlacklist: number[] = []): number {
    let smallestId = -1;
    let smallestCount = Number.POSITIVE_INFINITY;
    for (const [ i, meta ] of metadatas.entries()) {
      if (!indexBlacklist.includes(i)) {
        const count: number = ActorRdfJoin.getCardinality(meta);
        if (count < smallestCount || smallestId === -1) {
          smallestCount = count;
          smallestId = i;
        }
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
   * Calculate the time to initiate a request for the given metadata entries.
   * @param metadatas An array of checked metadata.
   */
  public static getRequestInitialTimes(metadatas: IMetadataChecked[]): number[] {
    return metadatas.map(metadata => metadata.pageSize ? 0 : metadata.requestTime || 0);
  }

  /**
   * Calculate the time to receive a single item for the given metadata entries.
   * @param metadatas An array of checked metadata.
   */
  public static getRequestItemTimes(metadatas: IMetadataChecked[]): number[] {
    return metadatas
      .map(metadata => !metadata.pageSize ? 0 : metadata.cardinality / metadata.pageSize * (metadata.requestTime || 0));
  }

  /**
   * Default test function for join actors.
   * Checks whether all iterators have metadata.
   * If yes: call the abstract getIterations method, if not: return Infinity.
   * @param {IActionRdfJoin} action The input action containing the relevant iterators
   * @returns {Promise<IMediatorTypeJoinCoefficients>} The join coefficients.
   */
  public async test(action: IActionRdfJoin): Promise<IMediatorTypeJoinCoefficients> {
    // Validate logical join type
    if (action.type !== this.logicalType) {
      throw new Error(`${this.name} can only handle logical joins of type '${this.logicalType}', while '${action.type}' was given.`);
    }

    // Don't allow joining of one or zero streams
    if (action.entries.length <= 1) {
      throw new Error(`${this.name} requires at least two join entries.`);
    }

    // Check if this actor can handle the given number of streams
    if (this.limitEntriesMin ? action.entries.length < this.limitEntries : action.entries.length > this.limitEntries) {
      throw new Error(`${this.name} requires ${this.limitEntries
      } join entries at ${this.limitEntriesMin ? 'least' : 'most'
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

    const metadatas = await ActorRdfJoin.getMetadatas(action.entries);

    // Ensure that all metadata objects have all requires entries
    if (!ActorRdfJoin.validateMetadata(metadatas)) {
      return {
        iterations: Number.POSITIVE_INFINITY,
        persistedItems: Number.POSITIVE_INFINITY,
        blockingItems: Number.POSITIVE_INFINITY,
        requestTime: Number.POSITIVE_INFINITY,
      };
    }

    return await this.getJoinCoefficients(action, <IMetadataChecked[]> metadatas);
  }

  /**
   * Returns default input for 0 or 1 entries. Calls the getOutput function otherwise
   * @param {IActionRdfJoin} action
   * @returns {Promise<IActorQueryOperationOutput>}
   */
  public async run(action: IActionRdfJoin): Promise<IActorQueryOperationOutputBindings> {
    // Prepare logging to physical plan
    // This must be called before getOutput, because we need to override the plan node in the context
    let parentPhysicalQueryPlanNode;
    if (action.context && action.context.has(KeysInitSparql.physicalQueryPlanLogger)) {
      parentPhysicalQueryPlanNode = action.context.get(KeysInitSparql.physicalQueryPlanNode);
      action.context = action.context && action.context.set(KeysInitSparql.physicalQueryPlanNode, action);
    }

    const { result, physicalPlanMetadata } = await this.getOutput(action);
    const metadatas = await ActorRdfJoin.getMetadatas(action.entries);

    // Log to physical plan
    if (this.includeInLogs && action.context && action.context.has(KeysInitSparql.physicalQueryPlanLogger)) {
      const physicalQueryPlanLogger: IPhysicalQueryPlanLogger = action.context
        .get(KeysInitSparql.physicalQueryPlanLogger);
      physicalQueryPlanLogger.logOperation(
        `join-${this.logicalType}`,
        this.physicalName,
        action,
        parentPhysicalQueryPlanNode,
        this.name,
        {
          ...physicalPlanMetadata,
          cardinalities: metadatas.map(ActorRdfJoin.getCardinality),
          joinCoefficients: await this.getJoinCoefficients(action, <IMetadataChecked[]> metadatas),
        },
      );
    }

    // Lazily calculate upper cardinality limit
    // eslint-disable-next-line @typescript-eslint/no-this-alias,consistent-this
    const self = this;
    async function calculateCardinality(): Promise<number> {
      return metadatas
        .reduce((acc, metadata) => acc * ActorRdfJoin.getCardinality(metadata), 1) *
        (await self.mediatorJoinSelectivity.mediate({ entries: action.entries })).selectivity;
    }

    if (ActorRdfJoin.validateMetadata(metadatas)) {
      // Update the result promise to also add the estimated total items
      const unwrapped = result;
      if (unwrapped.metadata) {
        const oldMetadata = unwrapped.metadata;
        unwrapped.metadata = () => oldMetadata().then(async(metadata: any) => {
          // Don't overwrite metadata if it was generated by implementation
          if (!('cardinality' in metadata)) {
            metadata.cardinality = await calculateCardinality();
          }
          return metadata;
        });
      } else {
        unwrapped.metadata = () => calculateCardinality().then(cardinality => ({ cardinality }));
      }
      return unwrapped;
    }

    return result;
  }

  /**
   * Returns the resulting output for joining the given entries.
   * This is called after removing the trivial cases in run.
   * @param {IActionRdfJoin} action
   * @returns {Promise<IActorRdfJoinOutputInner>}
   */
  protected abstract getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner>;

  /**
   * Calculate the join coefficients.
   * @param {IActionRdfJoin} action Join action
   * @param metadatas Array of resolved metadata objects.
   * @returns {IMediatorTypeJoinCoefficients} The join coefficient estimates.
   */
  protected abstract getJoinCoefficients(
    action: IActionRdfJoin,
    metadatas: IMetadataChecked[],
  ): Promise<IMediatorTypeJoinCoefficients>;
}

export interface IActorRdfJoinArgs
  extends IActorArgs<IActionRdfJoin, IMediatorTypeJoinCoefficients, IActorQueryOperationOutputBindings> {
  mediatorJoinSelectivity: Mediator<
  Actor<IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>,
  IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>;
}

export interface IActorRdfJoinInternalOptions {
  /**
   * The logical join type this actor can handle.
   */
  logicalType: LogicalJoinType;
  /**
   * The physical name of join operation this actor implements.
   * This is used for debug and query plan logs.
   */
  physicalName: string;
  /**
   * Can be used by subclasses to indicate the max or min number of streams that can be joined.
   * 0 for infinity.
   * By default, this indicates the max number, but can be inverted by setting limitEntriesMin to true.
   */
  limitEntries?: number;
  /**
   * If true, the limitEntries field is a lower limit,
   * otherwise, it is an upper limit.
   * Defaults to false.
   */
  limitEntriesMin?: boolean;
  /**
   * If this actor can handle undefs in the bindings.
   * Defaults to false.
   */
  canHandleUndefs?: boolean;
}

/**
 * Represents a logical join type.
 */
export type LogicalJoinType = 'inner' | 'optional' | 'minus';

export interface IActionRdfJoin extends IAction {
  /**
   * The logical join type.
   */
  type: LogicalJoinType;
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

export interface IActorRdfJoinOutputInner {
  /**
   * The join result.
   */
  result: IActorQueryOperationOutputBindings;
  /**
   * Optional metadata that will be included as metadata within the physical query plan output.
   */
  physicalPlanMetadata?: any;
}

export interface IMetadataChecked {
  cardinality: number;
  pageSize?: number;
  requestTime?: number;
}
