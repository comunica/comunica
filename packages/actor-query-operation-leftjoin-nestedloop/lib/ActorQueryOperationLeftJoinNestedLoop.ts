import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperation, ActorQueryOperationTypedMediated, getMetadata,
} from '@comunica/bus-query-operation';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { ActionContext, IActorTest } from '@comunica/core';
import type { Bindings, IActorQueryOperationOutputBindings } from '@comunica/types';
import type { AsyncIterator } from 'asynciterator';
import type { Algebra } from 'sparqlalgebrajs';
import { AsyncEvaluator, isExpressionError } from 'sparqlee';

/**
 * A comunica LeftJoin NestedLoop Query Operation Actor.
 */
export class ActorQueryOperationLeftJoinNestedLoop extends ActorQueryOperationTypedMediated<Algebra.LeftJoin> {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'leftjoin');
  }

  public async testOperation(pattern: Algebra.LeftJoin, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.LeftJoin, context: ActionContext):
  Promise<IActorQueryOperationOutputBindings> {
    const leftRaw = await this.mediatorQueryOperation.mediate({ operation: pattern.left, context });
    const left = ActorQueryOperation.getSafeBindings(leftRaw);
    const rightRaw = await this.mediatorQueryOperation.mediate({ operation: pattern.right, context });
    const right = ActorQueryOperation.getSafeBindings(rightRaw);

    // TODO: refactor custom handling of pattern.expression. Should be pushed on the bus instead as a filter operation.
    const config = { ...ActorQueryOperation.getAsyncExpressionContext(context) };
    const evaluator = pattern.expression ?
      new AsyncEvaluator(pattern.expression, config) :
      null;

    const leftJoinInner = (outerItem: Bindings, innerStream: AsyncIterator<Bindings>):
    AsyncIterator<{ joinedBindings: Bindings; result: boolean }> => innerStream
      .transform<{ joinedBindings: Bindings; result: boolean }>({
      async transform(innerItem: Bindings, nextInner: any, push) {
        const joinedBindings = ActorRdfJoin.joinBindings(outerItem, innerItem);
        if (!joinedBindings) {
          nextInner();
          return;
        }
        if (!evaluator) {
          push({ joinedBindings, result: true });
          nextInner();
          return;
        }
        try {
          const result = await evaluator.evaluateAsEBV(joinedBindings);
          push({ joinedBindings, result });
        } catch (error: unknown) {
          // We ignore all Expression errors.
          // Other errors (likely programming mistakes) are still propagated.
          // Left Join is defined in terms of Filter (https://www.w3.org/TR/sparql11-query/#defn_algJoin),
          // and Filter requires this (https://www.w3.org/TR/sparql11-query/#expressions).
          if (!isExpressionError(<Error> error)) {
            bindingsStream.emit('error', error);
          }
        }
        nextInner();
      },
    });

    const leftJoinOuter = (leftItem: Bindings, nextLeft: any, push: (bindings: Bindings) => void): void => {
      const innerStream = right.bindingsStream.clone();
      const joinedStream = leftJoinInner(leftItem, innerStream);

      // TODO: This will not work for larger streams.
      // The full inner stream is kept in memory.
      joinedStream.on('end', () => nextLeft());
      joinedStream.on('data', async({ joinedBindings, result }) => {
        if (result) {
          push(joinedBindings);
        }
      });
    };

    const transform = leftJoinOuter;
    const bindingsStream = left.bindingsStream
      .transform<Bindings>({ optional: true, transform });

    const variables = ActorRdfJoin.joinVariablesStreams([ left, right ]);
    const metadata = (): Promise<Record<string, any>> => Promise.all([ left, right ].map(x => getMetadata(x)))
      .then(metadatas => metadatas.reduce((acc, val) => acc * val.totalItems, 1))
      .catch(() => Number.POSITIVE_INFINITY)
      .then(totalItems => ({ totalItems }));

    return { type: 'bindings', bindingsStream, metadata, variables, canContainUndefs: true };
  }
}
