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
  private readonly groupsInitializer: Map<BindingsHash, Promise<IGroup>>;
  private readonly groupVariables: Set<string>;
  private readonly distinctHashes: null | Map<BindingsHash, Set<BindingsHash>>;
  private waitCounter: number;
  private waitResolver: ((bindings: Bindings[]) => void);

  public constructor(private readonly pattern: Algebra.Group, private readonly sparqleeConfig: AsyncEvaluatorConfig) {
    this.groups = new Map();
    this.groupsInitializer = new Map();
    this.groupVariables = new Set(this.pattern.variables.map(x => termToString(x)));
    this.distinctHashes = pattern.aggregates.some(({ distinct }) => distinct) ?
      new Map() :
      null;
    this.waitCounter = 1;
  }

  /**
   * - Consumes a stream binding
   * - Find the corresponding group and create one if need be
   * - Feeds the binding to the group's aggregators
   *
   * @param {Bindings} bindings - The Bindings to consume
   */
  public consumeBindings(bindings: Bindings): Promise<void> {
    this.waitCounter++;

    // Select the bindings on which we group
    const grouper = bindings
      .filter((_, variable: string) => this.groupVariables.has(variable))
      .toMap();
    const groupHash = this.hashBindings(grouper);
    // First member of group -> create new group
    const groupTest: Promise<IGroup> | undefined = this.groupsInitializer.get(groupHash);

    let res: Promise<any>;
    if (!groupTest) {
      // Initialize state for all aggregators for new group
      const groupPromise = (async() => {
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
        return { aggregators, bindings: grouper };
      })();
      this.groupsInitializer.set(groupHash, groupPromise);
      res = groupPromise.then(group => {
        this.groups.set(groupHash, group);
      });
    } else {
      const defGroupPromise = groupTest;
      res = (async() => {
        const group = await defGroupPromise;
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
      })();
    }
    return res.then(() => {
      this.subtractCounter();
    });
  }

  private subtractCounter(): void {
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
   * Collect the result of the current state. This returns a Bindings per group,
   * and a (possibly empty) Bindings in case the no Bindings have been consumed yet.
   */
  public collectResults(): Promise<Bindings[]> {
    const res: Promise<Bindings[]> = new Promise(resolve => {
      this.waitResolver = resolve;
    });
    this.subtractCounter();
    return res;
  }

  /**
   * @param {Bindings} bindings - Bindings to hash
   */
  private hashBindings(bindings: Bindings): BindingsHash {
    return AbstractFilterHash.hash(bindings);
  }
}
