import { BindingsFactory } from '@comunica/bindings-factory';
import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperation, ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { MediatorRdfJoin } from '@comunica/bus-rdf-join';
import type { IActorTest } from '@comunica/core';
import { AsyncEvaluator, isExpressionError } from '@comunica/expression-evaluator';
import type { IQueryOperationResult, Bindings, IActionContext, IJoinEntry } from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica LeftJoin Query Operation Actor.
 */
export class ActorQueryOperationLeftJoin extends ActorQueryOperationTypedMediated<Algebra.LeftJoin> {
  public readonly mediatorJoin: MediatorRdfJoin;
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;

  public constructor(args: IActorQueryOperationLeftJoinArgs) {
    super(args, 'leftjoin');
  }

  public async testOperation(_operation: Algebra.LeftJoin, _context: IActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(operationOriginal: Algebra.LeftJoin, context: IActionContext):
  Promise<IQueryOperationResult> {
    // Delegate to join bus
    const entries: IJoinEntry[] = (await Promise.all(operationOriginal.input
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
    if (operationOriginal.expression) {
      const rightMetadata = await entries[1].output.metadata();
      const expressionVariables = rightMetadata.variables;

      const bindingsFactory = await BindingsFactory.create(this.mediatorMergeBindingsContext, context);
      const config = { ...ActorQueryOperation.getAsyncExpressionContext(
        context,
        this.mediatorQueryOperation,
        bindingsFactory,
      ) };
      const evaluator = new AsyncEvaluator(operationOriginal.expression, config);
      const bindingsStream = joined.bindingsStream
        .transform({
          autoStart: false,
          // eslint-disable-next-line ts/no-misused-promises
          transform: async(bindings: Bindings, done: () => void, push: (item: Bindings) => void) => {
            // If variables of the right-hand entry are missing, we skip expression evaluation
            if (!expressionVariables.every(variable => bindings.has(variable.value))) {
              push(bindings);
              return done();
            }

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
                this.logWarn(context, 'Error occurred while filtering.', () => ({ error, bindings }));
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
  mediatorJoin: MediatorRdfJoin;
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;
}
