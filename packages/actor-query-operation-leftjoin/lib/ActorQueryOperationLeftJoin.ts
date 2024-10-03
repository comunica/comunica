import type { MediatorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { MediatorRdfJoin } from '@comunica/bus-rdf-join';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import { isExpressionError } from '@comunica/expression-evaluator';
import type { Bindings, IActionContext, IJoinEntry, IQueryOperationResult } from '@comunica/types';
import { getSafeBindings } from '@comunica/utils-query-operation';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica LeftJoin Query Operation Actor.
 */
export class ActorQueryOperationLeftJoin extends ActorQueryOperationTypedMediated<Algebra.LeftJoin> {
  public readonly mediatorJoin: MediatorRdfJoin;
  private readonly mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;

  public constructor(args: IActorQueryOperationLeftJoinArgs) {
    super(args, 'leftjoin');
    this.mediatorExpressionEvaluatorFactory = args.mediatorExpressionEvaluatorFactory;
  }

  public async testOperation(_operation: Algebra.LeftJoin, _context: IActionContext): Promise<TestResult<IActorTest>> {
    return passTestVoid();
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
        output: getSafeBindings(output),
        operation,
      }));
    const joined = await this.mediatorJoin.mediate({ type: 'optional', entries, context });

    // If the pattern contains an expression, filter the resulting stream
    if (operationOriginal.expression) {
      const rightMetadata = await entries[1].output.metadata();
      const expressionVariables = rightMetadata.variables;
      const evaluator = await this.mediatorExpressionEvaluatorFactory
        .mediate({ algExpr: operationOriginal.expression, context });
      const bindingsStream = joined.bindingsStream
        .transform({
          autoStart: false,
          // eslint-disable-next-line ts/no-misused-promises
          transform: async(bindings: Bindings, done: () => void, push: (item: Bindings) => void) => {
            // If variables of the right-hand entry are missing, we skip expression evaluation
            if (!expressionVariables.every(variable => bindings.has(variable.variable.value))) {
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
  mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;
}
