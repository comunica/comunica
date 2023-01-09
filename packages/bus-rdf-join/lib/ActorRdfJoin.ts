import { ActorQueryOperation } from '@comunica/bus-query-operation';
import type {
  MediatorRdfJoinSelectivity,
} from '@comunica/bus-rdf-join-selectivity';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IAction, IActorArgs, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type {
  IQueryOperationResultBindings, MetadataBindings,
  IPhysicalQueryPlanLogger, Bindings, IActionContext, IJoinEntry, IJoinEntryWithMetadata,
} from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { termToString } from 'rdf-string';

const DF = new DataFactory();

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
  extends Actor<IActionRdfJoin, IMediatorTypeJoinCoefficients, IQueryOperationResultBindings> {
  public readonly mediatorJoinSelectivity: MediatorRdfJoinSelectivity;

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

  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   * @param options - Actor-specific join options.
   */
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
  public static hash(bindings: Bindings, variables: RDF.Variable[]): string {
    return variables
      .filter(variable => bindings.has(variable))
      .map(variable => termToString(bindings.get(variable)))
      .join('');
  }

  /**
   * Returns an array containing all the variable names that occur in all bindings streams.
   * @param {MetadataBindings[]} metadatas An array of optional metadata objects for the entries.
   * @returns {string[]}
   */
  public static overlappingVariables(metadatas: MetadataBindings[]): RDF.Variable[] {
    const variables = metadatas.map(metadata => metadata.variables);
    let baseArray = variables[0];
    for (const array of variables.slice(1)) {
      baseArray = baseArray.filter(el => array.some(value => value.value === el.value));
    }
    return baseArray;
  }

  /**
   * Returns the variables that will occur in the joined bindings.
   * @param {MetadataBindings[]} metadatas An array of metadata objects for the entries.
   * @returns {string[]}
   */
  public static joinVariables(metadatas: MetadataBindings[]): RDF.Variable[] {
    return [ ...new Set(metadatas.flatMap(metadata => metadata.variables.map(variable => variable.value))) ]
      .map(variable => DF.variable(variable));
  }

  /**
   * Returns the result of joining bindings, or `null` if no join is possible.
   * @param {Bindings[]} bindings
   * @returns {Bindings}
   */
  public static joinBindings(...bindings: Bindings[]): Bindings | null {
    if (bindings.length === 0) {
      return null;
    }
    if (bindings.length === 1) {
      return bindings[0];
    }

    let acc: Bindings = bindings[0];
    for (const binding of bindings.slice(1)) {
      const merged = acc.merge(binding);
      if (!merged) {
        return null;
      }
      acc = merged;
    }
    return acc;
  }

  /**
   * Get the estimated number of items from the given metadata.
   * @param {Record<string, any>} metadata A metadata object.
   * @return {number} The estimated number of items, or `Infinity` if cardinality is falsy.
   */
  public static getCardinality(metadata: MetadataBindings): RDF.QueryResultCardinality {
    return metadata.cardinality;
  }

  /**
   * Obtain the metadata from all given join entries.
   * @param entries Join entries.
   */
  public static async getMetadatas(entries: IJoinEntry[]): Promise<MetadataBindings[]> {
    return await Promise.all(entries.map(entry => entry.output.metadata()));
  }

  /**
   * Obtain the join entries witt metadata from all given join entries.
   * @param entries Join entries.
   */
  public static async getEntriesWithMetadatas(entries: IJoinEntry[]): Promise<IJoinEntryWithMetadata[]> {
    const metadatas = await ActorRdfJoin.getMetadatas(entries);
    return entries.map((entry, i) => ({ ...entry, metadata: metadatas[i] }));
  }

  /**
   * Calculate the time to initiate a request for the given metadata entries.
   * @param metadatas An array of checked metadata.
   */
  public static getRequestInitialTimes(metadatas: MetadataBindings[]): number[] {
    return metadatas.map(metadata => metadata.pageSize ? 0 : metadata.requestTime || 0);
  }

  /**
   * Calculate the time to receive a single item for the given metadata entries.
   * @param metadatas An array of checked metadata.
   */
  public static getRequestItemTimes(metadatas: MetadataBindings[]): number[] {
    return metadatas
      .map(metadata => !metadata.pageSize ? 0 : (metadata.requestTime || 0) / metadata.pageSize);
  }

  /**
   * Helper function to create a new metadata object for the join result.
   * For required metadata entries that are not provided, sane defaults are calculated.
   * @param entries Join entries.
   * @param metadatas Metadata of the join entries.
   * @param context The action context.
   * @param partialMetadata Partial metadata entries.
   */
  public async constructResultMetadata(
    entries: IJoinEntry[],
    metadatas: MetadataBindings[],
    context: IActionContext,
    partialMetadata: Partial<MetadataBindings> = {},
  ): Promise<MetadataBindings> {
    let cardinalityJoined: RDF.QueryResultCardinality;
    if (partialMetadata.cardinality) {
      cardinalityJoined = partialMetadata.cardinality;
    } else {
      cardinalityJoined = metadatas
        .reduce((acc: RDF.QueryResultCardinality, metadata) => {
          const cardinalityThis = ActorRdfJoin.getCardinality(metadata);
          return {
            type: cardinalityThis.type === 'estimate' ? 'estimate' : acc.type,
            value: acc.value * cardinalityThis.value,
          };
        }, { type: 'exact', value: 1 });
      cardinalityJoined.value *= (await this.mediatorJoinSelectivity.mediate({ entries, context })).selectivity;
    }

    return {
      ...partialMetadata,
      cardinality: {
        type: cardinalityJoined.type,
        value: cardinalityJoined.value,
      },
      canContainUndefs: partialMetadata.canContainUndefs ?? metadatas.some(metadata => metadata.canContainUndefs),
      variables: ActorRdfJoin.joinVariables(metadatas),
    };
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

    const metadatas = await ActorRdfJoin.getMetadatas(action.entries);

    // Check if this actor can handle undefs
    if (!this.canHandleUndefs) {
      for (const metadata of metadatas) {
        if (metadata.canContainUndefs) {
          throw new Error(`Actor ${this.name} can not join streams containing undefs`);
        }
      }
    }

    return await this.getJoinCoefficients(action, metadatas);
  }

  /**
   * Returns default input for 0 or 1 entries. Calls the getOutput function otherwise
   * @param {IActionRdfJoin} action
   * @returns {Promise<IActorQueryOperationOutput>}
   */
  public async run(action: IActionRdfJoin): Promise<IQueryOperationResultBindings> {
    // Prepare logging to physical plan
    // This must be called before getOutput, because we need to override the plan node in the context
    let parentPhysicalQueryPlanNode;
    if (action.context.has(KeysInitQuery.physicalQueryPlanLogger)) {
      parentPhysicalQueryPlanNode = action.context.get(KeysInitQuery.physicalQueryPlanNode);
      action.context = action.context.set(KeysInitQuery.physicalQueryPlanNode, action);
    }

    // Log to physical plan
    const physicalQueryPlanLogger: IPhysicalQueryPlanLogger | undefined = action.context.get(KeysInitQuery
      .physicalQueryPlanLogger);
    let planMetadata: any;
    if (this.includeInLogs && physicalQueryPlanLogger) {
      planMetadata = {};
      physicalQueryPlanLogger.logOperation(
        `join-${this.logicalType}`,
        this.physicalName,
        action,
        parentPhysicalQueryPlanNode,
        this.name,
        planMetadata,
      );
    }

    // Get action output
    const { result, physicalPlanMetadata } = await this.getOutput(action);
    const metadatas = await ActorRdfJoin.getMetadatas(action.entries);

    // Fill in the physical plan metadata after determining action output
    if (planMetadata) {
      Object.assign(planMetadata, physicalPlanMetadata);
      planMetadata.cardinalities = metadatas.map(ActorRdfJoin.getCardinality);
      planMetadata.joinCoefficients = await this.getJoinCoefficients(action, metadatas);
    }

    // Cache metadata
    result.metadata = ActorQueryOperation.cachifyMetadata(result.metadata);

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
    metadatas: MetadataBindings[],
  ): Promise<IMediatorTypeJoinCoefficients>;
}

export interface IActorRdfJoinArgs
  extends IActorArgs<IActionRdfJoin, IMediatorTypeJoinCoefficients, IQueryOperationResultBindings> {
  mediatorJoinSelectivity: MediatorRdfJoinSelectivity;
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

export interface IActorRdfJoinOutputInner {
  /**
   * The join result.
   */
  result: IQueryOperationResultBindings;
  /**
   * Optional metadata that will be included as metadata within the physical query plan output.
   */
  physicalPlanMetadata?: any;
}

export type MediatorRdfJoin = Mediate<IActionRdfJoin, IQueryOperationResultBindings, IMediatorTypeJoinCoefficients>;
