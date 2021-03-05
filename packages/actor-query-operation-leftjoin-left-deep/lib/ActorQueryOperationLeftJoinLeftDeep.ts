import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated, getMetadata,
  materializeOperation,
} from '@comunica/bus-query-operation';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { ActionContext, IActorTest } from '@comunica/core';
import type { Bindings, BindingsStream, IActorQueryOperationOutputBindings } from '@comunica/types';
import { MultiTransformIterator, TransformIterator } from 'asynciterator';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';

/**
 * A comunica LeftJoin left-deep Query Operation Actor.
 */
export class ActorQueryOperationLeftJoinLeftDeep extends ActorQueryOperationTypedMediated<Algebra.LeftJoin> {
  private static readonly FACTORY = new Factory();

  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'leftjoin');
  }

  /**
   * Create a new bindings stream
   * that takes every binding of the base stream,
   * materializes the remaining patterns with it,
   * and emits all bindings from this new set of patterns.
   * @param {BindingsStream} leftStream The base stream.
   * @param {Algebra.Operation} rightOperation The operation to materialize with each binding of the base stream.
   * @param {Algebra.Operation => Promise<BindingsStream>} operationBinder A callback to retrieve the bindings stream
   *                                                                       of an operation.
   * @return {BindingsStream}
   */
  public static createLeftDeepStream(leftStream: BindingsStream, rightOperation: Algebra.Operation,
    operationBinder: (operation: Algebra.Operation) => Promise<BindingsStream>): BindingsStream {
    return new MultiTransformIterator(leftStream, {
      multiTransform(bindings: Bindings) {
        const bindingsMerger = (subBindings: Bindings): Bindings => subBindings.merge(bindings);
        return new TransformIterator(
          async() => (await operationBinder(materializeOperation(rightOperation, bindings)))
            .map(bindingsMerger), { maxBufferSize: 128 },
        );
      },
      optional: true,
    });
  }

  public async testOperation(pattern: Algebra.LeftJoin, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.LeftJoin, context: ActionContext):
  Promise<IActorQueryOperationOutputBindings> {
    // Initiate left and right operations
    // Only the left stream will be used.
    // The right stream is ignored and only its metadata and variables are used.
    const left = ActorQueryOperation.getSafeBindings(await this.mediatorQueryOperation
      .mediate({ operation: pattern.left, context }));
    const right = ActorQueryOperation.getSafeBindings(await this.mediatorQueryOperation
      .mediate({ operation: pattern.right, context }));

    // Close the right stream, since we don't need that one
    right.bindingsStream.close();

    // If an expression was defined, wrap the right operation in a filter expression.
    const rightOperation = pattern.expression ?
      ActorQueryOperationLeftJoinLeftDeep.FACTORY.createFilter(pattern.right, pattern.expression) :
      pattern.right;

    // Create a left-deep stream with left and right.
    const bindingsStream = ActorQueryOperationLeftJoinLeftDeep.createLeftDeepStream(
      left.bindingsStream,
      rightOperation,
      async(operation: Algebra.Operation) => ActorQueryOperation.getSafeBindings(
        await this.mediatorQueryOperation.mediate({ operation, context }),
      ).bindingsStream,
    );

    // Determine variables and metadata
    const variables = ActorRdfJoin.joinVariables({ entries: [ left, right ]});
    const metadata = (): Promise<Record<string, any>> => Promise.all([ left, right ].map(x => getMetadata(x)))
      .then(metadatas => metadatas.reduce((acc, val) => acc * val.totalItems, 1))
      .catch(() => Number.POSITIVE_INFINITY)
      .then(totalItems => ({ totalItems }));

    return { type: 'bindings', bindingsStream, metadata, variables, canContainUndefs: true };
  }
}
