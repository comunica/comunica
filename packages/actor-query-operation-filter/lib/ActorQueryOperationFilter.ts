import { BindingsFactory, bindingsToString } from '@comunica/bindings-factory';
import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import { MediatorProcessIterator } from '@comunica/bus-process-iterator';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import { ActionContext, type IActorTest } from '@comunica/core';
import { AsyncEvaluator, isExpressionError } from '@comunica/expression-evaluator';
import type { Bindings, IActionContext, IQueryOperationResult } from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Filter Sparqlee Query Operation Actor.
 */
export class ActorQueryOperationFilter extends ActorQueryOperationTypedMediated<Algebra.Filter> {
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;
  public readonly mediatorProcessIterator: MediatorProcessIterator;

  public constructor(args: IActorQueryOperationFilterSparqleeArgs) {
    super(args, 'filter');
  }

  public async testOperation(operation: Algebra.Filter, context: IActionContext): Promise<IActorTest> {
    // Will throw error for unsupported operators
    const bindingsFactory = await BindingsFactory.create(this.mediatorMergeBindingsContext, context);
    const config = { ...ActorQueryOperation.getAsyncExpressionContext(
      context,
      this.mediatorQueryOperation,
      bindingsFactory,
    ) };
    const _ = new AsyncEvaluator(operation.expression, config);
    return true;
  }

  public async runOperation(operation: Algebra.Filter, context: IActionContext):
  Promise<IQueryOperationResult> {
    const outputRaw = await this.mediatorQueryOperation.mediate({ operation: operation.input, context });
    const output = ActorQueryOperation.getSafeBindings(outputRaw);
    ActorQueryOperation.validateQueryOutput(output, 'bindings');

    const bindingsFactory = await BindingsFactory.create(this.mediatorMergeBindingsContext, context);
    const config = { ...ActorQueryOperation.getAsyncExpressionContext(
      context,
      this.mediatorQueryOperation,
      bindingsFactory,
    ) };
    const evaluator = new AsyncEvaluator(operation.expression, config);

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
    const _bindingsStream = output.bindingsStream.transform<Bindings>({ transform, autoStart: false });

    // Apply iterator processing actors on filtered stream
    const { stream } = await this.mediatorProcessIterator.mediate({
      type: "binding",
      streamSource: this.name,
      stream: _bindingsStream, 
      context: new ActionContext()
    });
    const bindingsStream = stream;

    
    return { type: 'bindings', bindingsStream, metadata: output.metadata };
  }
}

export interface IActorQueryOperationFilterSparqleeArgs extends IActorQueryOperationTypedMediatedArgs {
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;
  /**
   * A mediator for applying processing the filtered binding stream
   */
  mediatorProcessIterator: MediatorProcessIterator;
}
