import { bindingsToString } from '@comunica/bindings-factory';
import type { MediatorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperation, ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { IActorTest } from '@comunica/core';
import { isExpressionError } from '@comunica/expression-evaluator';
import type { Bindings, IActionContext, IQueryOperationResult, IQueryOperationResultBindings } from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Extend Query Operation Actor.
 *
 * See https://www.w3.org/TR/sparql11-query/#sparqlAlgebra;
 */
export class ActorQueryOperationExtend extends ActorQueryOperationTypedMediated<Algebra.Extend> {
  private readonly mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;

  public constructor(args: IActorQueryOperationExtendArgs) {
    super(args, 'extend');
    this.mediatorExpressionEvaluatorFactory = args.mediatorExpressionEvaluatorFactory;
  }

  public async testOperation(operation: Algebra.Extend, context: IActionContext): Promise<IActorTest> {
    // Will throw error for unsupported operations
    const _ = Boolean(
      await this.mediatorExpressionEvaluatorFactory.mediate({ algExpr: operation.expression, context }),
    );
    return true;
  }

  public async runOperation(operation: Algebra.Extend, context: IActionContext):
  Promise<IQueryOperationResult> {
    const { expression, input, variable } = operation;

    const output: IQueryOperationResultBindings = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: input, context }),
    );

    // Throw if the variable has already been bound
    if ((await output.metadata()).variables.some(innerVariable => innerVariable.equals(variable))) {
      throw new Error(`Illegal binding to variable '${variable.value}' that has already been bound`);
    }

    const evaluator = await this.mediatorExpressionEvaluatorFactory
      .mediate({ algExpr: operation.expression, context });

    // Transform the stream by extending each Bindings with the expression result
    const transform = async(bindings: Bindings, next: any, push: (pusbBindings: Bindings) => void): Promise<void> => {
      try {
        const result = await evaluator.evaluate(bindings);
        // Extend operation is undefined when the key already exists
        // We just override it here.
        const extended = bindings.set(variable, result);
        push(extended);
      } catch (error: unknown) {
        if (isExpressionError(<Error> error)) {
          // Errors silently don't actually extend according to the spec
          push(bindings);
          // But let's warn anyway
          this.logWarn(context, `Expression error for extend operation with bindings '${bindingsToString(bindings)}'`);
        } else {
          bindingsStream.emit('error', error);
        }
      }
      next();
    };

    const bindingsStream = output.bindingsStream.transform<Bindings>({ autoStart: false, transform });
    return {
      type: 'bindings',
      bindingsStream,
      async metadata() {
        const outputMetadata = await output.metadata();
        return { ...outputMetadata, variables: [ ...outputMetadata.variables, variable ]};
      },
    };
  }
}

interface IActorQueryOperationExtendArgs extends IActorQueryOperationTypedMediatedArgs {
  mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;
}
