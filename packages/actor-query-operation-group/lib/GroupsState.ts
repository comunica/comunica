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
  private readonly groupVariables: Set<string>;
  private readonly distinctHashes: null | Map<BindingsHash, Set<BindingsHash>>;
  private readonly waitList: Promise<void>[];

  public constructor(private readonly pattern: Algebra.Group, private readonly sparqleeConfig: AsyncEvaluatorConfig) {
    this.groups = new Map();
    this.groupVariables = new Set(this.pattern.variables.map(x => termToString(x)));
    this.distinctHashes = pattern.aggregates.some(({ distinct }) => distinct) ?
      new Map() :
      null;
    this.waitList = [];
  }

  /**
   * - Consumes a stream binding
   * - Find the corresponding group and create one if need be
   * - Feeds the binding to the group's aggregators
   *
   * @param {Bindings} bindings - The Bindings to consume
   */
  public consumeBindings(bindings: Bindings): Promise<void> {
    const res: Promise<void> = (async() => {
      // Select the bindings on which we group
      const grouper = bindings
        .filter((_, variable: string) => this.groupVariables.has(variable))
        .toMap();
      const groupHash = this.hashBindings(grouper);
      // First member of group -> create new group
      let group: IGroup | undefined = this.groups.get(groupHash);
      if (!group) {
        // Initialize state for all aggregators for new group
        const aggregators: Record<string, AsyncAggregateEvaluator> = {};
        const terms: (Term|undefined)[] = await Promise.all(this.pattern.aggregates.map(async aggregate => {
          const key = termToString(aggregate.variable);
          aggregators[key] = new AsyncAggregateEvaluator(aggregate, this.sparqleeConfig);
          const term = await aggregators[key].evaluate(bindings);
          if (!term) {
            return term;
          }
          aggregators[key].putTerm(term);
          return term;
        }));

        // Check group again, the group might already been initialized
        group = this.groups.get(groupHash);
        if (group) {
          return await this.consumeBindingsInGroup(group, groupHash, bindings, terms);
        }

        group = { aggregators, bindings: grouper };
        this.groups.set(groupHash, group);

        if (this.distinctHashes) {
          const bindingsHash = this.hashBindings(bindings);
          this.distinctHashes.set(groupHash, new Set([ bindingsHash ]));
        }
      } else {
        // Group already exists
        await this.consumeBindingsInGroup(group, groupHash, bindings);
      }
    })();
    this.waitList.push(res);
    return res;
  }

  private async consumeBindingsInGroup(group: IGroup, groupHash: string, bindings: Bindings,
    terms?: (Term|undefined)[]): Promise<void> {
    // Update all the aggregators with the input binding
    await Promise.all(this.pattern.aggregates.map(async(aggregate, index) => {
      // If distinct, check first whether we have inserted these values already
      if (aggregate.distinct) {
        const hash = this.hashBindings(bindings);
        if (this.distinctHashes!.get(groupHash)!.has(hash)) {
          return;
        }
        this.distinctHashes!.get(groupHash)!.add(hash);
      }

      const variable = termToString(aggregate.variable);
      let term;
      if (terms && index < terms.length) {
        term = terms[index];
      } else {
        term = await group.aggregators[variable].evaluate(bindings);
      }
      if (term) {
        group.aggregators[variable].putTerm(term);
      }
    }));
  }

  /**
   * Collect the result of the current state. This returns a Bindings per group,
   * and a (possibly empty) Bindings in case the no Bindings have been consumed yet.
   */
  public async collectResults(): Promise<Bindings[]> {
    await Promise.all(this.waitList);
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

    return rows;
  }

  /**
   * @param {Bindings} bindings - Bindings to hash
   */
  private hashBindings(bindings: Bindings): BindingsHash {
    return AbstractFilterHash.hash(bindings);
  }
}
