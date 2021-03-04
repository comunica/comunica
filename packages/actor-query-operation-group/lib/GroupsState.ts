import { AbstractFilterHash } from '@comunica/actor-abstract-bindings-hash';
import { Bindings } from '@comunica/bus-query-operation';
import type { Term } from 'rdf-js';
import { termToString } from 'rdf-string';
import type { Algebra } from 'sparqlalgebrajs';
import type { SyncEvaluatorConfig } from 'sparqlee';
import { AggregateEvaluator } from 'sparqlee';

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
  aggregators: Record<string, AggregateEvaluator>;
}

/**
 * A state manager for the groups constructed by consuming the bindings-stream.
 */
export class GroupsState {
  private readonly groups: Map<BindingsHash, IGroup>;
  private readonly groupVariables: Set<string>;
  private readonly distinctHashes: null | Map<BindingsHash, Set<BindingsHash>>;

  public constructor(private readonly pattern: Algebra.Group, private readonly sparqleeConfig: SyncEvaluatorConfig) {
    this.groups = new Map();
    this.groupVariables = new Set(this.pattern.variables.map(x => termToString(x)));
    this.distinctHashes = pattern.aggregates.some(({ distinct }) => distinct) ?
      new Map() :
      null;
  }

  /**
   * - Consumes a stream binding
   * - Find the corresponding group and create one if need be
   * - Feeds the binding to the group's aggregators
   *
   * @param {Bindings} bindings - The Bindings to consume
   */
  public consumeBindings(bindings: Bindings): void {
    // Select the bindings on which we group
    const grouper = bindings
      .filter((_, variable: string) => this.groupVariables.has(variable))
      .toMap();
    const groupHash = this.hashBindings(grouper);

    // First member of group -> create new group
    let group: IGroup | undefined = this.groups.get(groupHash);
    if (!group) {
      // Initialize state for all aggregators for new group
      const aggregators: Record<string, AggregateEvaluator> = {};
      for (const aggregate of this.pattern.aggregates) {
        const key = termToString(aggregate.variable);
        aggregators[key] = new AggregateEvaluator(aggregate, this.sparqleeConfig);
        aggregators[key].put(bindings);
      }

      group = { aggregators, bindings: grouper };
      this.groups.set(groupHash, group);

      if (this.distinctHashes) {
        const bindingsHash = this.hashBindings(bindings);
        this.distinctHashes.set(groupHash, new Set([ bindingsHash ]));
      }
    } else {
      // Group already exists
      // Update all the aggregators with the input binding
      for (const aggregate of this.pattern.aggregates) {
        // If distinct, check first wether we have inserted these values already
        if (aggregate.distinct) {
          const hash = this.hashBindings(bindings);
          if (this.distinctHashes!.get(groupHash)!.has(hash)) {
            continue;
          } else {
            this.distinctHashes!.get(groupHash)!.add(hash);
          }
        }

        const variable = termToString(aggregate.variable);
        group.aggregators[variable].put(bindings);
      }
    }
  }

  /**
   * Collect the result of the current state. This returns a Bindings per group,
   * and a (possibly empty) Bindings in case the no Bindings have been consumed yet.
   */
  public collectResults(): Bindings[] {
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
        const value = AggregateEvaluator.emptyValue(aggregate);
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
