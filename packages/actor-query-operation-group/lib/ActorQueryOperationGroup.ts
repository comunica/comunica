import * as stringify from "json-stable-stringify";

import { ArrayIterator } from 'asynciterator';
import { createHash, Hash } from "crypto";
import { Term } from 'rdf-js';
import { termToString } from 'rdf-string';
import { Algebra } from "sparqlalgebrajs";
import { AggregateEvaluator } from 'sparqlee';

import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
  Bindings,
  IActorQueryOperationOutputBindings,
  IActorQueryOperationTypedMediatedArgs,
} from "@comunica/bus-query-operation";
import { ActionContext, IActorTest } from "@comunica/core";

/**
 * A comunica Group Query Operation Actor.
 */
export class ActorQueryOperationGroup extends ActorQueryOperationTypedMediated<Algebra.Group> {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'group');
  }

  public async testOperation(pattern: Algebra.Group, context: ActionContext): Promise<IActorTest> {
    pattern.aggregates.forEach((aggregate) => {
      if (aggregate.distinct) {
        throw new Error("Group Operation doesn't support distinct just yet.");
      }
    });
    return true;
  }

  public async runOperation(pattern: Algebra.Group, context: ActionContext)
    : Promise<IActorQueryOperationOutputBindings> {
    // Get result stream for the input query
    const { input, aggregates } = pattern;
    const outputRaw = await this.mediatorQueryOperation.mediate({ operation: input, context });
    const output = ActorQueryOperation.getSafeBindings(outputRaw);
    ActorQueryOperation.validateQueryOutput(output, 'bindings');

    // The variables in scope are the variables on which we group, e.g. pattern.variables
    // for 'GROUP BY ?x, ?z', this is [?x, ?z], for 'GROUP by expr(?x) as ?e' this is [?e].
    // But also in scope are the variables defined by the aggregations, since GROUP has to handle this
    const variables = pattern.variables
      .map((variable) => termToString(variable))
      .concat(aggregates.map((agg) => termToString(agg.variable)));

    const patternVariables = new Set(pattern.variables.map((v) => termToString(v)));

    let groups: Map<BindingsHash, IGroup> = new Map();

    // Phase 1: Consume the stream, identify the groups and populate the aggregate bindings
    const phase1 = () => {
      output.bindingsStream.on('data', (bindings: Bindings) => {
        // Select the bindings on which we group
        const grouper = bindings.filter((term, variable) => patternVariables.has(variable)).toMap();
        const bindingsHash = hashBindings(grouper);

        // First member of groep -> create new group
        if (!groups.has(bindingsHash)) {
          // Initialize state for all aggregators for new group
          const aggregators = aggregates.reduce((result, aggregate) => {
            const key = termToString(aggregate.variable);
            result[key] = new AggregateEvaluator(aggregate, bindings);
            return result;
          }, {} as { [key: string]: AggregateEvaluator });

          const group: IGroup = { aggregators, bindings: grouper };
          groups = groups.set(bindingsHash, group);

        } else {
          // Group already exists
          // Update all the aggregators with the input binding
          const group = groups.get(bindingsHash);
          for (const key in group.aggregators) {
            group.aggregators[key].put(bindings);
          }
        }
      });
    };

    // Phase 2: Collect aggregator results
    // We can only return when the binding stream ends, when that happens
    // we return the groups identified (which are nothing more than Bindings)
    // and we merge that with the aggregate bindings for that group
    return new Promise((resolve, reject) => {
      output.bindingsStream.on('end', () => {
        try {
          // Collect groups
          // resolve();
          let rows: Bindings[] = Array.from(groups, ([groupHash, group]) => {
            const { bindings: groupBindings, aggregators } = group;

            // Collect aggregator bindings
            // If the aggregate errorred, the result will be undefined
            const aggBindings = Bindings(
              Object.keys(aggregators).reduce((result, variable) => {
                const value = aggregators[variable].result();
                // Filter undefined
                if (value) {
                  result[variable] = value;
                }
                return result;
              }, {} as { [key: string]: Term }),
            );

            // Merge grouping bindings and aggregator bindings
            return groupBindings.merge(aggBindings);
          });

          // Case: No Input
          // Some aggregators still define an output on the empty input
          // Result is a single Bindings
          if (rows.length === 0) {
            const single = aggregates.reduce((result, aggregate) => {
              const key = termToString(aggregate.variable);
              const value = AggregateEvaluator.emptyValue(aggregate);

              // Filter undefined
              if (value) {
                result[key] = AggregateEvaluator.emptyValue(aggregate);
              }
              return result;
            }, {} as { [key: string]: Term });
            rows = [Bindings(single)];
          }

          const bindingsStream = new ArrayIterator(rows);
          const metadata = output.metadata;
          resolve({ type: 'bindings', bindingsStream, metadata, variables });
        } catch (err) {
          reject(err);
        }
      });

      output.bindingsStream.on('error', (err) => {
        reject(err);
      });

      // Starting this phase will bind the data listeners, we need to do this
      // AFTER binding 'end' and 'error' listeners to avoid those events
      // having their listener not yet initialised.
      phase1();
    });
  }

}

function hashBindings(bindings: Bindings): string {
  const hash: Hash = createHash("sha1");
  hash.update(stringify(bindings));
  return hash.digest().toString();
}

interface IGroup {
  bindings: Bindings;
  aggregators: {
    [key: string]: AggregateEvaluator,
  };
}

type AggregateVariable = string;
type BindingsHash = string;
