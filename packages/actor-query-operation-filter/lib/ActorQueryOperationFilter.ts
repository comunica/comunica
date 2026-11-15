import type { MediatorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import { KeysQueryOperation } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { Bindings, BindingsStream, IActionContext, IJoinFilter, IQueryOperationResult } from '@comunica/types';
import { Algebra, isKnownSubType } from '@comunica/utils-algebra';
import { bindingsToString } from '@comunica/utils-bindings-factory';
import { isExpressionError } from '@comunica/utils-expression-evaluator';
import { getExpressionVariables, getSafeBindings, validateQueryOutput } from '@comunica/utils-query-operation';

/**
 * A comunica Filter Sparqlee Query Operation Actor.
 */
export class ActorQueryOperationFilter extends ActorQueryOperationTypedMediated<Algebra.Filter> {
  private readonly mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;

  public constructor(args: IActorQueryOperationFilterSparqleeArgs) {
    super(args, Algebra.Types.FILTER);
    this.mediatorExpressionEvaluatorFactory = args.mediatorExpressionEvaluatorFactory;
  }

  public async testOperation(): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async runOperation(operation: Algebra.Filter, context: IActionContext):
  Promise<IQueryOperationResult> {
    // Joins may already apply the parts of the filter that they can evaluate synchronously
    let inputContext = context;
    if (operation.input.type === Algebra.Types.JOIN) {
      const filters = await this.getJoinFilters(operation, context);
      if (filters.length > 0) {
        inputContext = context
          .set(KeysQueryOperation.joinFilters, [ ...context.get(KeysQueryOperation.joinFilters) ?? [], ...filters ]);
      }
    }

    const outputRaw = await this.mediatorQueryOperation.mediate({ operation: operation.input, context: inputContext });
    const output = getSafeBindings(outputRaw);
    validateQueryOutput(output, 'bindings');

    const evaluator = await this.mediatorExpressionEvaluatorFactory
      .mediate({ algExpr: operation.expression, context });

    const handleError = (error: unknown, item: Bindings, stream: BindingsStream): void => {
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
        stream.emit('error', error);
      }
    };

    // Expressions of which all functions are synchronous are evaluated without promises per bindings
    const { evaluateAsEBVSynchronously } = evaluator;
    if (evaluateAsEBVSynchronously) {
      const bindingsStream: BindingsStream = output.bindingsStream.filter((item) => {
        try {
          return evaluateAsEBVSynchronously(item);
        } catch (error: unknown) {
          handleError(error, item, bindingsStream);
          return false;
        }
      });
      return { type: 'bindings', bindingsStream, metadata: output.metadata };
    }

    const transform = async(item: Bindings, next: any, push: (bindings: Bindings) => void): Promise<void> => {
      try {
        const result = await evaluator.evaluateAsEBV(item);
        if (result) {
          push(item);
        }
      } catch (error: unknown) {
        handleError(error, item, bindingsStream);
      }
      next();
    };

    // eslint-disable-next-line ts/no-misused-promises
    const bindingsStream = output.bindingsStream.transform<Bindings>({ transform, autoStart: false });
    return { type: 'bindings', bindingsStream, metadata: output.metadata };
  }

  /**
   * Determine the filters that the join of the given filter operation may already apply,
   * one for each conjunct of its expression that can be evaluated synchronously.
   * A binding is only rejected early if a conjunct is false for it, as the whole expression is then false as well.
   * @param operation A filter over a join.
   * @param context The action context.
   */
  public async getJoinFilters(operation: Algebra.Filter, context: IActionContext): Promise<IJoinFilter[]> {
    const conjuncts: Algebra.Expression[] = [];
    const split = (expression: Algebra.Expression): void => {
      if (isKnownSubType(expression, Algebra.ExpressionTypes.OPERATOR) && expression.operator === '&&') {
        for (const arg of expression.args) {
          split(arg);
        }
      } else {
        conjuncts.push(expression);
      }
    };
    split(operation.expression);

    const filters: IJoinFilter[] = [];
    for (const conjunct of conjuncts) {
      const evaluator = await this.mediatorExpressionEvaluatorFactory.mediate({ algExpr: conjunct, context });
      const { evaluateAsEBVSynchronously } = evaluator;
      if (evaluateAsEBVSynchronously) {
        filters.push({
          join: operation.input,
          variables: getExpressionVariables(conjunct),
          test(bindings) {
            // Errors are left to the filter afterwards
            try {
              return evaluateAsEBVSynchronously(bindings);
            } catch {
              return true;
            }
          },
        });
      }
    }
    return filters;
  }
}

export interface IActorQueryOperationFilterSparqleeArgs extends IActorQueryOperationTypedMediatedArgs {
  mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;
}
