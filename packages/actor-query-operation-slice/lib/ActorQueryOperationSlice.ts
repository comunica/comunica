import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import { KeysQueryOperation } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import type {
  IQueryOperationResult,
  IQueryOperationResultBindings,
  IQueryOperationResultQuads,
  IQueryOperationResultStream, IMetadata, IActionContext,
} from '@comunica/types';
import type { AsyncIterator } from 'asynciterator';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Slice Query Operation Actor.
 */
export class ActorQueryOperationSlice extends ActorQueryOperationTypedMediated<Algebra.Slice> {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'slice');
  }

  public async testOperation(operation: Algebra.Slice, context: IActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(operation: Algebra.Slice, context: IActionContext):
  Promise<IQueryOperationResult> {
    // Add limit indicator to the context, which can be used for query planning
    // eslint-disable-next-line unicorn/explicit-length-check
    if (operation.length) {
      context = context.set(KeysQueryOperation.limitIndicator, operation.length);
    }

    // Resolve the input
    const output: IQueryOperationResult = await this.mediatorQueryOperation
      .mediate({ operation: operation.input, context });

    if (output.type === 'bindings') {
      const bindingsStream = this.sliceStream(output.bindingsStream, operation);
      return <IQueryOperationResultBindings> {
        type: 'bindings',
        bindingsStream,
        metadata: this.sliceMetadata(output, operation),
      };
    }

    if (output.type === 'quads') {
      const quadStream = this.sliceStream(output.quadStream, operation);
      return <IQueryOperationResultQuads> {
        type: 'quads',
        quadStream,
        metadata: this.sliceMetadata(output, operation),
      };
    }

    throw new Error(`Invalid query output type: Expected 'bindings' or 'quads' but got '${output.type}'`);
  }

  // Slice the stream based on the pattern values
  private sliceStream(stream: AsyncIterator<any>, pattern: Algebra.Slice): AsyncIterator<any> {
    // eslint-disable-next-line unicorn/explicit-length-check
    const hasLength: boolean = Boolean(pattern.length) || pattern.length === 0;
    const { start } = pattern;
    const end = hasLength ? pattern.start + pattern.length! - 1 : Number.POSITIVE_INFINITY;
    return stream.transform({ offset: start, limit: Math.max(end - start + 1, 0), autoStart: false });
  }

  // If we find metadata, apply slicing on the total number of items
  private sliceMetadata(
    output: IQueryOperationResultStream<any, any>,
    pattern: Algebra.Slice,
  ): () => Promise<IMetadata<any>> {
    // eslint-disable-next-line unicorn/explicit-length-check
    const hasLength: boolean = Boolean(pattern.length) || pattern.length === 0;
    return () => (<() => Promise<IMetadata<any>>>output.metadata)()
      .then(subMetadata => {
        const cardinality = { ...subMetadata.cardinality };
        if (Number.isFinite(cardinality.value)) {
          cardinality.value = Math.max(0, cardinality.value - pattern.start);
          if (hasLength) {
            cardinality.value = Math.min(cardinality.value, pattern.length!);
          }
        }
        return { ...subMetadata, cardinality };
      });
  }
}
