import type { MediatorHashBindings } from '@comunica/bus-hash-bindings';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperation, ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { IActorTest } from '@comunica/core';
import type { IActionContext, IQueryOperationResult } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import type { Algebra } from 'sparqlalgebrajs';
import { AsyncEvaluator } from 'sparqlee';
import { GroupsState } from './GroupsState';

/**
 * A comunica Group Query Operation Actor.
 */
export class ActorQueryOperationGroup extends ActorQueryOperationTypedMediated<Algebra.Group> {
  public readonly mediatorHashBindings: MediatorHashBindings;

  public constructor(args: IActorQueryOperationGroupArgs) {
    super(args, 'group');
  }

  public async testOperation(operation: Algebra.Group, context: IActionContext): Promise<IActorTest> {
    for (const aggregate of operation.aggregates) {
      // Will throw for unsupported expressions
      const _ = new AsyncEvaluator(aggregate.expression, ActorQueryOperation.getAsyncExpressionContext(context));
    }
    return true;
  }

  public async runOperation(operation: Algebra.Group, context: IActionContext):
  Promise<IQueryOperationResult> {
    // Create a hash function
    const { hashFunction } = await this.mediatorHashBindings.mediate({ allowHashCollisions: true, context });

    // Get result stream for the input query
    const { input, aggregates } = operation;
    const outputRaw = await this.mediatorQueryOperation.mediate({ operation: input, context });
    const output = ActorQueryOperation.getSafeBindings(outputRaw);

    // The variables in scope are the variables on which we group, i.e. pattern.variables.
    // For 'GROUP BY ?x, ?z', this is [?x, ?z], for 'GROUP by expr(?x) as ?e' this is [?e].
    // But also in scope are the variables defined by the aggregations, since GROUP has to handle this.
    const variables = [
      ...operation.variables,
      ...aggregates.map(agg => agg.variable),
    ];

    const sparqleeConfig = ActorQueryOperation.getAsyncExpressionContext(context);

    // Return a new promise that completes when the stream has ended or when
    // an error occurs
    return new Promise((resolve, reject) => {
      const groups = new GroupsState(hashFunction, operation, sparqleeConfig);

      // Phase 2: Collect aggregator results
      // We can only return when the binding stream ends, when that happens
      // we return the identified groups. Which are nothing more than Bindings
      // of the grouping variables merged with the aggregate variables
      output.bindingsStream.on('end', async() => {
        try {
          const bindingsStream = new ArrayIterator(await groups.collectResults(), { autoStart: false });
          resolve({
            type: 'bindings',
            bindingsStream,
            metadata: async() => ({ ...await output.metadata(), variables }),
          });
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
        groups.consumeBindings(bindings).catch(reject);
      });
    });
  }
}

export interface IActorQueryOperationGroupArgs extends IActorQueryOperationTypedMediatedArgs {
  mediatorHashBindings: MediatorHashBindings;
}
