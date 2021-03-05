import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import type { ActionContext, IActorTest } from '@comunica/core';
import type { IActorQueryOperationOutputBindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { termToString } from 'rdf-string';
import type { Algebra } from 'sparqlalgebrajs';
import { SyncEvaluator } from 'sparqlee';

import { GroupsState } from './GroupsState';

/**
 * A comunica Group Query Operation Actor.
 */
export class ActorQueryOperationGroup extends ActorQueryOperationTypedMediated<Algebra.Group> {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'group');
  }

  public async testOperation(pattern: Algebra.Group, context: ActionContext): Promise<IActorTest> {
    for (const aggregate of pattern.aggregates) {
      // Will throw for unsupported expressions
      const _ = new SyncEvaluator(aggregate.expression);
    }
    return true;
  }

  public async runOperation(pattern: Algebra.Group, context: ActionContext):
  Promise<IActorQueryOperationOutputBindings> {
    // Get result stream for the input query
    const { input, aggregates } = pattern;
    const outputRaw = await this.mediatorQueryOperation.mediate({ operation: input, context });
    const output = ActorQueryOperation.getSafeBindings(outputRaw);

    // The variables in scope are the variables on which we group, i.e. pattern.variables.
    // For 'GROUP BY ?x, ?z', this is [?x, ?z], for 'GROUP by expr(?x) as ?e' this is [?e].
    // But also in scope are the variables defined by the aggregations, since GROUP has to handle this.
    const variables = [
      ...pattern.variables.map(x => termToString(x)),
      ...aggregates.map(agg => termToString(agg.variable)),
    ];

    const sparqleeConfig = { ...ActorQueryOperation.getExpressionContext(context) };

    // Return a new promise that completes when the stream has ended or when
    // an error occurs
    return new Promise((resolve, reject) => {
      const groups = new GroupsState(pattern, sparqleeConfig);

      // Phase 2: Collect aggregator results
      // We can only return when the binding stream ends, when that happens
      // we return the identified groups. Which are nothing more than Bindings
      // of the grouping variables merged with the aggregate variables
      output.bindingsStream.on('end', () => {
        try {
          const bindingsStream = new ArrayIterator(groups.collectResults(), { autoStart: false });
          const { metadata } = output;
          resolve({ type: 'bindings', bindingsStream, metadata, variables, canContainUndefs: output.canContainUndefs });
        } catch (error: unknown) {
          reject(error);
        }
      });

      // Make sure to propagate any errors in the binding stream
      output.bindingsStream.on('error', reject);

      // Phase 1: Consume the stream, identify the groups and populate the aggregators.
      // We need to bind this after the 'error' and 'end' listeners to avoid the
      // stream having ended before those listeners are bound.
      output.bindingsStream.on('data', bindings => {
        try {
          groups.consumeBindings(bindings);
        } catch (error: unknown) {
          reject(error);
        }
      });
    });
  }
}
