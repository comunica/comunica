import * as stringify from 'json-stable-stringify';

import { createHash, Hash } from 'crypto';
import { Term } from 'rdf-js';
import { termToString } from 'rdf-string';
import { Algebra } from 'sparqlalgebrajs';
import { AggregateEvaluator } from 'sparqlee';

import { Bindings } from '@comunica/bus-query-operation';

/**
 * A simple type alias for strings that should be hashes of Bindings
 */
export type BindingsHash = string;

/**
 * A state container for a single group
 *
 * @property {Bindings} bindings - The binding entries on which we group
 * @property aggregators - POJO with as keys the aggregate variables and as value an AggregateEvaluator
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

  constructor(private pattern: Algebra.Group) {
    this.groups = new Map();
    this.groupVariables = new Set(this.pattern.variables.map(termToString));
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
    const bindingsHash = this.hashBindings(grouper);

    // First member of group -> create new group
    if (!this.groups.has(bindingsHash)) {
      // Initialize state for all aggregators for new group
      const aggregators: { [key: string]: AggregateEvaluator } = {};
      for (const i in this.pattern.aggregates) {
        const aggregate = this.pattern.aggregates[i];
        const key = termToString(aggregate.variable);
        aggregators[key] = new AggregateEvaluator(aggregate, bindings);
      }

      const group: IGroup = { aggregators, bindings: grouper };
      this.groups.set(bindingsHash, group);

    } else {
      // Group already exists
      // Update all the aggregators with the input binding
      const group = this.groups.get(bindingsHash);
      for (const key in group.aggregators) {
        group.aggregators[key].put(bindings);
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
    const hash: Hash = createHash("sha1");
    hash.update(stringify(bindings));
    return hash.digest().toString();
  }
}
