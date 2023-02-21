import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperation, ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { MediatorRdfJoin } from '@comunica/bus-rdf-join';
import type { IActorTest } from '@comunica/core';
import type { IQueryOperationResult, Bindings, IActionContext, IJoinEntry, BindingsStream } from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';
import { AsyncEvaluator, isExpressionError } from 'sparqlee';
import { ClosableTransformIterator } from '@comunica/bus-query-operation';

/**
 * A comunica LeftJoin Query Operation Actor.
 */
export class ActorQueryOperationLeftJoin extends ActorQueryOperationTypedMediated<Algebra.LeftJoin> {
  public readonly mediatorJoin: MediatorRdfJoin;

  public constructor(args: IActorQueryOperationLeftJoinArgs) {
    super(args, 'leftjoin');
  }

  public async testOperation(operation: Algebra.LeftJoin, context: IActionContext): Promise<IActorTest> {
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

    if (typeof operationOriginal.expression !== undefined) {
      const { variables: variables0 } = await entries[0].output.metadata();
      const { variables: variables1 } = await entries[1].output.metadata();
      const variables = [...variables0, ...variables1];
      const config = { ...ActorQueryOperation.getAsyncExpressionContext(context) };
      const evaluator = new AsyncEvaluator(operationOriginal.expression!, config);

      const validateExpressions = async(bindings: Bindings, done: () => void, push: (item: Bindings) => void, bindingsStream: BindingsStream) => {
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
      }

      const filteredBindingsStreamLeft: BindingsStream = new ClosableTransformIterator(entries[0].output.bindingsStream.transform({
        autoStart: false,
        transform: async(bindings: Bindings, done: () => void, push: (item: Bindings) => void) => validateExpressions(bindings, done, push, filteredBindingsStreamLeft)
      }), {
        autoStart: false,
        onClose: () => entries[0].output.bindingsStream.close()
      })

      const filteredBindingsStreamRight: BindingsStream = new ClosableTransformIterator(entries[1].output.bindingsStream.transform({
        autoStart: false,
        transform: async(bindings: Bindings, done: () => void, push: (item: Bindings) => void) => {
          const keysArefulfilled = variables.length > 0 ?
            variables.every(variable => bindings.has(variable.value)) :
            true;

          if (!keysArefulfilled) {
            push(bindings);
            return done();
          }

          return validateExpressions(bindings, done, push, filteredBindingsStreamRight);
        }
      }), {
        autoStart: false,
        onClose: () => entries[1].output.bindingsStream.close()
      })

      entries[0].output.bindingsStream = filteredBindingsStreamLeft
      entries[1].output.bindingsStream = filteredBindingsStreamRight
    }

    return this.mediatorJoin.mediate({ type: 'optional', entries, context });
  }
}

export interface IActorQueryOperationLeftJoinArgs extends IActorQueryOperationTypedMediatedArgs {
  /**
   * A mediator for joining Bindings streams
   */
  mediatorJoin: MediatorRdfJoin;
}
