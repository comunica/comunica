import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperation, ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import type { ActionContext, IActorTest } from '@comunica/core';
import type { Bindings, IActorQueryOperationOutputBindings } from '@comunica/types';
import { termToString } from 'rdf-string';
import type { Algebra } from 'sparqlalgebrajs';
import { AsyncEvaluator, isExpressionError } from 'sparqlee';

/**
 * A comunica Extend Query Operation Actor.
 *
 * See https://www.w3.org/TR/sparql11-query/#sparqlAlgebra;
 */
export class ActorQueryOperationExtend extends ActorQueryOperationTypedMediated<Algebra.Extend> {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'extend');
  }

  public async testOperation(pattern: Algebra.Extend, context: ActionContext): Promise<IActorTest> {
    // Will throw error for unsupported opperations
    const _ = Boolean(new AsyncEvaluator(pattern.expression));
    return true;
  }

  public async runOperation(pattern: Algebra.Extend, context: ActionContext):
  Promise<IActorQueryOperationOutputBindings> {
    const { expression, input, variable } = pattern;

    const output: IActorQueryOperationOutputBindings = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: input, context }),
    );

    const extendKey = termToString(variable);
    const config = { ...ActorQueryOperation.getExpressionContext(context, this.mediatorQueryOperation) };
    const evaluator = new AsyncEvaluator(expression, config);

    // Transform the stream by extending each Bindings with the expression result
    const transform = async(bindings: Bindings, next: any, push: (pusbBindings: Bindings) => void): Promise<void> => {
      try {
        const result = await evaluator.evaluate(bindings);
        // Extend operation is undefined when the key already exists
        // We just override it here.
        const extended = bindings.set(extendKey, result);
        push(extended);
      } catch (error: unknown) {
        if (isExpressionError(<Error> error)) {
          // Errors silently don't actually extend according to the spec
          push(bindings);
          // But let's warn anyway
          this.logWarn(context, `Expression error for extend operation with bindings '${JSON.stringify(bindings)}'`);
        } else {
          bindingsStream.emit('error', error);
        }
      }
      next();
    };

    const variables = [ ...output.variables, extendKey ];
    const bindingsStream = output.bindingsStream.transform<Bindings>({ transform });
    const { metadata } = output;
    return { type: 'bindings', bindingsStream, metadata, variables, canContainUndefs: output.canContainUndefs };
  }
}
