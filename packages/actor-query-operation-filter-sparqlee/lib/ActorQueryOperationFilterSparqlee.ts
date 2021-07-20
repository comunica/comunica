import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import type { ActionContext, IActorTest } from '@comunica/core';
import type { Bindings, IActorQueryOperationOutputBindings } from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';
import { AsyncEvaluator, isExpressionError } from 'sparqlee';

/**
 * A comunica Filter Sparqlee Query Operation Actor.
 */
export class ActorQueryOperationFilterSparqlee extends ActorQueryOperationTypedMediated<Algebra.Filter> {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'filter');
  }

  public async testOperation(pattern: Algebra.Filter, context: ActionContext): Promise<IActorTest> {
    // Will throw error for unsupported operators
    const config = { ...ActorQueryOperation.getAsyncExpressionContext(context, this.mediatorQueryOperation) };
    const _ = new AsyncEvaluator(pattern.expression, config);
    return true;
  }

  public async runOperation(pattern: Algebra.Filter, context: ActionContext):
  Promise<IActorQueryOperationOutputBindings> {
    const outputRaw = await this.mediatorQueryOperation.mediate({ operation: pattern.input, context });
    const output = ActorQueryOperation.getSafeBindings(outputRaw);
    ActorQueryOperation.validateQueryOutput(output, 'bindings');
    const { variables, metadata } = output;

    const config = { ...ActorQueryOperation.getAsyncExpressionContext(context, this.mediatorQueryOperation) };
    const evaluator = new AsyncEvaluator(pattern.expression, config);

    const transform = async(item: Bindings, next: any, push: (bindings: Bindings) => void): Promise<void> => {
      try {
        const result = await evaluator.evaluateAsEBV(item);
        if (result) {
          push(item);
        }
      } catch (error: unknown) {
        // We ignore all Expression errors.
        // Other errors (likely programming mistakes) are still propagated.
        //
        // > Specifically, FILTERs eliminate any solutions that,
        // > when substituted into the expression, either result in
        // > an effective boolean value of false or produce an error.
        // > ...
        // > These errors have no effect outside of FILTER evaluation.
        // https://www.w3.org/TR/sparql11-query/#expressions
        if (isExpressionError(<Error> error)) {
          // In many cases, this is a user error, where the user should manually cast the variable to a string.
          // In order to help users debug this, we should report these errors via the logger as warnings.
          this.logWarn(context, 'Error occurred while filtering.', () => ({ error, bindings: item }));
        } else {
          bindingsStream.emit('error', error);
        }
      }
      next();
    };

    const bindingsStream = output.bindingsStream.transform<Bindings>({ transform });
    return { type: 'bindings', bindingsStream, metadata, variables, canContainUndefs: output.canContainUndefs };
  }
}
