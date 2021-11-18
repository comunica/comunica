import type { IActorQueryOperationTypedMediatedArgs,
  IActorQueryOperationOutputBindings } from '@comunica/bus-query-operation';
import {
  ActorQueryOperation, ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import type { ActorRdfJoin, IActionRdfJoin, IJoinEntry } from '@comunica/bus-rdf-join';
import type { ActionContext, IActorTest, Mediator } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { IActorQueryOperationOutput, Bindings } from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';
import { AsyncEvaluator, isExpressionError } from 'sparqlee';

/**
 * A comunica LeftJoin Query Operation Actor.
 */
export class ActorQueryOperationLeftJoin extends ActorQueryOperationTypedMediated<Algebra.LeftJoin> {
  public readonly mediatorJoin: Mediator<ActorRdfJoin,
  IActionRdfJoin, IMediatorTypeJoinCoefficients, IActorQueryOperationOutputBindings>;

  public constructor(args: IActorQueryOperationLeftJoinArgs) {
    super(args, 'leftjoin');
  }

  public async testOperation(pattern: Algebra.LeftJoin, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.LeftJoin, context: ActionContext):
  Promise<IActorQueryOperationOutput> {
    // Delegate to join bus
    const entries: IJoinEntry[] = (await Promise.all(pattern.input
      .map(async subOperation => ({
        output: await this.mediatorQueryOperation.mediate({ operation: subOperation, context }),
        operation: subOperation,
      }))))
      .map(({ output, operation }) => ({
        output: ActorQueryOperation.getSafeBindings(output),
        operation,
      }));
    const joined = await this.mediatorJoin.mediate({ type: 'optional', entries, context });

    // If the pattern contains an expression, filter the resulting stream
    if (pattern.expression) {
      const config = { ...ActorQueryOperation.getAsyncExpressionContext(context) };
      const evaluator = new AsyncEvaluator(pattern.expression, config);
      const bindingsStream = joined.bindingsStream
        .transform({
          autoStart: false,
          transform: async(bindings: Bindings, done: () => void, push: (item: Bindings) => void) => {
            try {
              const result = await evaluator.evaluateAsEBV(bindings);
              if (result) {
                push(bindings);
              }
            } catch (error: unknown) {
              // We ignore all Expression errors.
              // Other errors (likely programming mistakes) are still propagated.
              // Left Join is defined in terms of Filter (https://www.w3.org/TR/sparql11-query/#defn_algJoin),
              // and Filter requires this (https://www.w3.org/TR/sparql11-query/#expressions).
              if (isExpressionError(<Error>error)) {
                // In many cases, this is a user error, where the user should manually cast the variable to a string.
                // In order to help users debug this, we should report these errors via the logger as warnings.
                this.logWarn(context, 'Error occurred while filtering.', () => ({ error, bindings: bindings.toJS() }));
              } else {
                bindingsStream.emit('error', error);
              }
            }
            done();
          },
        });
      joined.bindingsStream = bindingsStream;
    }

    return joined;
  }
}

export interface IActorQueryOperationLeftJoinArgs extends IActorQueryOperationTypedMediatedArgs {
  /**
   * A mediator for joining Bindings streams
   */
  mediatorJoin: Mediator<ActorRdfJoin,
  IActionRdfJoin, IMediatorTypeJoinCoefficients, IActorQueryOperationOutputBindings>;
}
