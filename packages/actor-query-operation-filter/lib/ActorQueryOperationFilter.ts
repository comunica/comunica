import type { MediatorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import { isExpressionError } from '@comunica/expression-evaluator';
import type { Bindings, IActionContext, IQueryOperationResult } from '@comunica/types';
import { bindingsToString } from '@comunica/utils-bindings-factory';
import { getSafeBindings, validateQueryOutput } from '@comunica/utils-query-operation';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Filter Sparqlee Query Operation Actor.
 */
export class ActorQueryOperationFilter extends ActorQueryOperationTypedMediated<Algebra.Filter> {
  private readonly mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;

  public constructor(args: IActorQueryOperationFilterSparqleeArgs) {
    super(args, 'filter');
    this.mediatorExpressionEvaluatorFactory = args.mediatorExpressionEvaluatorFactory;
  }

  public async testOperation(operation: Algebra.Filter, context: IActionContext): Promise<TestResult<IActorTest>> {
    // Will throw error for unsupported operators
    try {
      const _ = await this.mediatorExpressionEvaluatorFactory.mediate({ algExpr: operation.expression, context });
    } catch (error: unknown) {
      // TODO: return TestResult in ActorQueryOperation.getAsyncExpressionContext
      return failTest((<Error> error).message);
    }
    return passTestVoid();
  }

  public async runOperation(operation: Algebra.Filter, context: IActionContext):
  Promise<IQueryOperationResult> {
    const outputRaw = await this.mediatorQueryOperation.mediate({ operation: operation.input, context });
    const output = getSafeBindings(outputRaw);
    validateQueryOutput(output, 'bindings');

    const evaluator = await this.mediatorExpressionEvaluatorFactory
      .mediate({ algExpr: operation.expression, context });

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
          this.logWarn(context, 'Error occurred while filtering.', () => ({ error, bindings: bindingsToString(item) }));
        } else {
          bindingsStream.emit('error', error);
        }
      }
      next();
    };

    // eslint-disable-next-line ts/no-misused-promises
    const bindingsStream = output.bindingsStream.transform<Bindings>({ transform, autoStart: false });
    return { type: 'bindings', bindingsStream, metadata: output.metadata };
  }
}

export interface IActorQueryOperationFilterSparqleeArgs extends IActorQueryOperationTypedMediatedArgs {
  mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;
}
