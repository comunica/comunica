import { Term } from 'rdf-js';
import { termToString } from 'rdf-string';
import { Algebra } from 'sparqlalgebrajs';
import { AggregateEvaluator, SyncEvaluatorConfig } from 'sparqlee';

import { AbstractFilterHash } from '@comunica/actor-abstract-bindings-hash';
import { Bindings } from '@comunica/bus-query-operation';

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
  aggregators: {
    [key: string]: AggregateEvaluator,
  };
}

/**
 * A state manager for the groups constructed by consuming the bindings-stream.
 */
export class GroupsState {
  private groups: Map<BindingsHash, IGroup>;
  private groupVariables: Set<string>;
  private distinctHashes: null | Map<BindingsHash, Set<BindingsHash>>;

  constructor(private pattern: Algebra.Group, private sparqleeConfig: SyncEvaluatorConfig) {
    this.groups = new Map();
    this.groupVariables = new Set(this.pattern.variables.map(termToString));
    this.distinctHashes = pattern.aggregates.some(({ distinct }) => distinct)
      ? new Map()
      : null;
  }

  /**
   * - Consumes a stream binding
   * - Find the corresponding group and create one if need be
   * - Feeds the binding to the group's aggregators
   *
   * @param {Bindings} bindings - The Bindings to consume
   */
  public consumeBindings(bindings: Bindings) {
    // Select the bindings on which we group
    const grouper = bindings
      .filter((_, variable) => this.groupVariables.has(variable))
      .toMap();
    const groupHash = this.hashBindings(grouper);

    // First member of group -> create new group
    if (!this.groups.has(groupHash)) {
      // Initialize state for all aggregators for new group
      const aggregators: { [key: string]: AggregateEvaluator } = {};
      for (const i in this.pattern.aggregates) {
        const aggregate = this.pattern.aggregates[i];
        const key = termToString(aggregate.variable);
        aggregators[key] = new AggregateEvaluator(aggregate, this.sparqleeConfig);
        aggregators[key].put(bindings);
      }

      const group: IGroup = { aggregators, bindings: grouper };
      this.groups.set(groupHash, group);

      if (this.distinctHashes) {
        const bindingsHash = this.hashBindings(bindings);
        this.distinctHashes.set(groupHash, new Set([bindingsHash]));
      }

    } else {
      // Group already exists
      // Update all the aggregators with the input binding
      const group = this.groups.get(groupHash);
      for (const i in this.pattern.aggregates) {
        const aggregate = this.pattern.aggregates[i];

        // If distinct, check first wether we have inserted these values already
        if (aggregate.distinct) {
          const hash = this.hashBindings(bindings);
          if (this.distinctHashes!.get(groupHash).has(hash)) {
            continue;
          } else {
            this.distinctHashes!.get(groupHash).add(hash);
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
    let rows: Bindings[] = Array.from(this.groups, ([_, group]) => {
      const { bindings: groupBindings, aggregators } = group;

      // Collect aggregator bindings
      // If the aggregate errorred, the result will be undefined
      const aggBindings: { [key: string]: Term } = {};
      for (const variable in aggregators) {
        const value = aggregators[variable].result();
        if (value !== undefined) { // Filter undefined
          aggBindings[variable] = value;
        }
      }

      // Merge grouping bindings and aggregator bindings
      return groupBindings.merge(aggBindings);
    });

    // Case: No Input
    // Some aggregators still define an output on the empty input
    // Result is a single Bindings
    if (rows.length === 0) {
      const single: { [key: string]: Term } = {};
      for (const i in this.pattern.aggregates) {
        const aggregate = this.pattern.aggregates[i];
        const key = termToString(aggregate.variable);
        const value = AggregateEvaluator.emptyValue(aggregate);
        if (value !== undefined) {
          single[key] = value;
        }
      }
      rows = [Bindings(single)];
    }

    return rows;
  }

  /**
   * @param {Bindings} bindings - Bindings to hash
   */
  private hashBindings(bindings: Bindings): BindingsHash {
    return AbstractFilterHash.hash('sha1', 'hex', bindings);
  }
}
