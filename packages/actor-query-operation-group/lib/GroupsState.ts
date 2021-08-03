import { AbstractFilterHash } from '@comunica/actor-abstract-bindings-hash';
import { Bindings } from '@comunica/bus-query-operation';
import type { Term } from 'rdf-js';
import { termToString } from 'rdf-string';
import type { Algebra } from 'sparqlalgebrajs';
import { AsyncAggregateEvaluator } from 'sparqlee';
import type { AsyncEvaluatorConfig } from 'sparqlee';

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

  public constructor(private readonly pattern: Algebra.Group, private readonly sparqleeConfig: AsyncEvaluatorConfig) {
    this.groups = new Map();
    this.groupsInitializer = new Map();
    this.groupVariables = new Set(this.pattern.variables.map(x => termToString(x)));
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
    // We increment the counter and decrement him when put action is performed.
    this.waitCounter++;

    // Select the bindings on which we group
    const grouper = bindings
      .filter((_, variable: string) => this.groupVariables.has(variable))
      .toMap();
    const groupHash = this.hashBindings(grouper);
    // First member of group -> create new group
    let groupInitializer: Promise<IGroup> | undefined = this.groupsInitializer.get(groupHash);

    let res: Promise<any>;
    if (!groupInitializer) {
      // Initialize state for all aggregators for new group
      groupInitializer = (async() => {
        const aggregators: Record<string, AsyncAggregateEvaluator> = {};
        await Promise.all(this.pattern.aggregates.map(async aggregate => {
          const key = termToString(aggregate.variable);
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

          const variable = termToString(aggregate.variable);
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
      const aggBindings: Record<string, Term> = {};
      for (const variable in aggregators) {
        const value = aggregators[variable].result();
        if (value !== undefined) {
          // Filter undefined
          aggBindings[variable] = value;
        }
      }

      // Merge grouping bindings and aggregator bindings
      return groupBindings.merge(aggBindings);
    });

    // Case: No Input
    // Some aggregators still define an output on the empty input
    // Result is a single Bindings
    if (rows.length === 0 && this.groupVariables.size === 0) {
      const single: Record<string, Term> = {};
      for (const aggregate of this.pattern.aggregates) {
        const key = termToString(aggregate.variable);
        const value = AsyncAggregateEvaluator.emptyValue(aggregate);
        if (value !== undefined) {
          single[key] = value;
        }
      }
      rows = [ Bindings(single) ];
    }
    this.waitResolver(rows);
  }

  /**
   * Collect the result of the final state. This returns a Bindings per group,
   * and a (possibly empty) Bindings in case no Bindings have been consumed yet.
   * you can only call this method once. Once the promise resolves calling @{consumeBindings} will not alter this value.
   */
  public collectResults(): Promise<Bindings[]> {
    if (this.resultHasBeenCalled) {
      return new Promise((resolve, reject) => reject(new Error('collectResult should only be called once.')));
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
    return AbstractFilterHash.hash(bindings);
  }
}
