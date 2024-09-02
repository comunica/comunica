import { BindingsFactory, bindingsToString } from '@comunica/bindings-factory';
import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import type { ExpressionError } from '@comunica/expression-evaluator';
import { AsyncEvaluator, isExpressionError } from '@comunica/expression-evaluator';
import type {
  Bindings,
  ComunicaDataFactory,
  IActionContext,
  IQueryOperationResult,
  IQueryOperationResultBindings,
} from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Extend Query Operation Actor.
 *
 * See https://www.w3.org/TR/sparql11-query/#sparqlAlgebra;
 */
export class ActorQueryOperationExtend extends ActorQueryOperationTypedMediated<Algebra.Extend> {
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;

  public constructor(args: IActorQueryOperationExtendArgs) {
    super(args, 'extend');
  }

  public async testOperation(operation: Algebra.Extend, context: IActionContext): Promise<TestResult<IActorTest>> {
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const bindingsFactory = await BindingsFactory.create(this.mediatorMergeBindingsContext, context, dataFactory);
    // Will throw error for unsupported opperations
    try {
      const _ = Boolean(new AsyncEvaluator(
        dataFactory,
        operation.expression,
        ActorQueryOperation.getAsyncExpressionContext(context, this.mediatorQueryOperation, bindingsFactory),
      ));
    } catch (error: unknown) {
      // TODO: return TestResult in ActorQueryOperation.getAsyncExpressionContext
      return failTest(() => (<Error> error).message);
    }
    return passTestVoid();
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

    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const bindingsFactory = await BindingsFactory.create(this.mediatorMergeBindingsContext, context, dataFactory);
    const config = { ...ActorQueryOperation.getAsyncExpressionContext(
      context,
      this.mediatorQueryOperation,
      bindingsFactory,
    ) };
    const evaluator = new AsyncEvaluator(dataFactory, expression, config);

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
          this.logWarn(context, `Expression error for extend operation (${(<ExpressionError> error).message})` +
            `with bindings '${bindingsToString(bindings)}'`);
        } else {
          bindingsStream.emit('error', error);
        }
      }
      next();
    };

    // eslint-disable-next-line ts/no-misused-promises
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

export interface IActorQueryOperationExtendArgs extends IActorQueryOperationTypedMediatedArgs {
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;
}
