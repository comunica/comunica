import { BindingsFactory } from '@comunica/bindings-factory';
import type { HashFunction } from '@comunica/bus-hash-bindings';
import type { Bindings } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';
import { AsyncAggregateEvaluator } from 'sparqlee';
import type { AsyncEvaluatorConfig } from 'sparqlee';

const DF = new DataFactory();
const BF = new BindingsFactory();

/**
 * A simple type alias for strings that should be hashes of Bindings
 */
export type BindingsHash = string;

/**
 * A state container for a single group
 *
 * @property {Bindings} bindings - The binding entries on which we group
 */
export interface IGroup {
  bindings: Bindings;
  aggregators: Record<string, AsyncAggregateEvaluator>;
}

/**
 * A state manager for the groups constructed by consuming the bindings-stream.
 */
export class GroupsState {
  private readonly groups: Map<BindingsHash, IGroup>;
  // We need to the promises of a group so we can await the initialisation/ creation of them.
  //  Without this we could have duplicate work/ override precious work.
  private readonly groupsInitializer: Map<BindingsHash, Promise<IGroup>>;
  private readonly groupVariables: Set<string>;
  private readonly distinctHashes: null | Map<BindingsHash, Set<BindingsHash>>;
  private waitCounter: number;
  // Function that resolves the promise given by collectResults
  private waitResolver: (bindings: Bindings[]) => void;
  private resultHasBeenCalled: boolean;

  public constructor(
    private readonly hashFunction: HashFunction,
    private readonly pattern: Algebra.Group,
    private readonly sparqleeConfig: AsyncEvaluatorConfig,
  ) {
    this.groups = new Map();
    this.groupsInitializer = new Map();
    this.groupVariables = new Set(this.pattern.variables.map(x => x.value));
    this.distinctHashes = pattern.aggregates.some(({ distinct }) => distinct) ?
      new Map() :
      null;
    this.waitCounter = 1;
    this.resultHasBeenCalled = false;
  }

  /**
   * - Consumes a stream binding
   * - Find the corresponding group and create one if need be
   * - Feeds the binding to the group's aggregators
   *
   * @param {Bindings} bindings - The Bindings to consume
   */
  public consumeBindings(bindings: Bindings): Promise<void> {
    const check = this.resultCheck<void>();
    if (check) {
      return check;
    }
    // We increment the counter and decrement him when put action is performed.
    this.waitCounter++;

    // Select the bindings on which we group
    const grouper = bindings
      .filter((_, variable) => this.groupVariables.has(variable.value));
    const groupHash = this.hashBindings(grouper);

    // First member of group -> create new group
    let groupInitializer: Promise<IGroup> | undefined = this.groupsInitializer.get(groupHash);

    let res: Promise<any>;
    if (!groupInitializer) {
      // Initialize state for all aggregators for new group
      groupInitializer = (async() => {
        const aggregators: Record<string, AsyncAggregateEvaluator> = {};
        await Promise.all(this.pattern.aggregates.map(async aggregate => {
          const key = aggregate.variable.value;
          aggregators[key] = new AsyncAggregateEvaluator(aggregate, this.sparqleeConfig);
          await aggregators[key].put(bindings);
        }));

        if (this.distinctHashes) {
          const bindingsHash = this.hashBindings(bindings);
          this.distinctHashes.set(groupHash, new Set([ bindingsHash ]));
        }
        const group = { aggregators, bindings: grouper };
        this.groups.set(groupHash, group);
        this.subtractWaitCounterAndCollect();
        return group;
      })();
      this.groupsInitializer.set(groupHash, groupInitializer);
      res = groupInitializer;
    } else {
      const groupInitializerDefined = groupInitializer;
      res = (async() => {
        const group = await groupInitializerDefined;
        await Promise.all(this.pattern.aggregates.map(async aggregate => {
          // If distinct, check first whether we have inserted these values already
          if (aggregate.distinct) {
            const hash = this.hashBindings(bindings);
            if (this.distinctHashes!.get(groupHash)!.has(hash)) {
              return;
            }
            this.distinctHashes!.get(groupHash)!.add(hash);
          }

          const variable = aggregate.variable.value;
          await group.aggregators[variable].put(bindings);
        }));
      })().then(() => {
        this.subtractWaitCounterAndCollect();
      });
    }
    return res;
  }

  private subtractWaitCounterAndCollect(): void {
    if (--this.waitCounter === 0) {
      this.handleResultCollection();
    }
  }

  private handleResultCollection(): void {
    // Collect groups
    let rows: Bindings[] = [ ...this.groups ].map(([ _, group ]) => {
      const { bindings: groupBindings, aggregators } = group;

      // Collect aggregator bindings
      // If the aggregate errorred, the result will be undefined
      let returnBindings = groupBindings;
      for (const variable in aggregators) {
        const value = aggregators[variable].result();
        if (value) {
          // Filter undefined
          returnBindings = returnBindings.set(DF.variable(variable), value);
        }
      }

      // Merge grouping bindings and aggregator bindings
      return returnBindings;
    });

    // Case: No Input
    // Some aggregators still define an output on the empty input
    // Result is a single Bindings
    if (rows.length === 0 && this.groupVariables.size === 0) {
      const single: [RDF.Variable, RDF.Term][] = [];
      for (const aggregate of this.pattern.aggregates) {
        const key = aggregate.variable;
        const value = AsyncAggregateEvaluator.emptyValue(aggregate);
        if (value !== undefined) {
          single.push([ key, value ]);
        }
      }
      rows = [ BF.bindings(single) ];
    }
    this.waitResolver(rows);
  }

  private resultCheck<T>(): Promise<T> | undefined {
    if (this.resultHasBeenCalled) {
      return Promise.reject(new Error('Calling any function after calling collectResult is invalid.'));
    }
  }

  /**
   * Collect the result of the final state. This returns a Bindings per group,
   * and a (possibly empty) Bindings in case no Bindings have been consumed yet.
   * You can only call this method once, after calling this method,
   * calling any function on this will result in an error being thrown.
   */
  public collectResults(): Promise<Bindings[]> {
    const check = this.resultCheck<Bindings[]>();
    if (check) {
      return check;
    }
    this.resultHasBeenCalled = true;
    const res = new Promise<Bindings[]>(resolve => {
      this.waitResolver = resolve;
    });
    this.subtractWaitCounterAndCollect();
    return res;
  }

  /**
   * @param {Bindings} bindings - Bindings to hash
   */
  private hashBindings(bindings: Bindings): BindingsHash {
    return this.hashFunction(bindings);
  }
}
