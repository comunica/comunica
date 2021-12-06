import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import type { IActorTest } from '@comunica/core';
import type {
  IQueryableResult,
  IQueryableResultBindings,
  IQueryableResultQuads,
  IQueryableResultStream, IMetadata, IActionContext,
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

  public async testOperation(operation: Algebra.Slice, context: IActionContext | undefined): Promise<IActorTest> {
    return true;
  }

  public async runOperation(operation: Algebra.Slice, context: IActionContext | undefined):
  Promise<IQueryableResult> {
    // Resolve the input
    const output: IQueryableResult = await this.mediatorQueryOperation
      .mediate({ operation: operation.input, context });

    if (output.type === 'bindings') {
      const bindingsStream = this.sliceStream(output.bindingsStream, operation);
      return <IQueryableResultBindings> {
        type: 'bindings',
        bindingsStream,
        metadata: this.sliceMetadata(output, operation),
        variables: output.variables,
      };
    }

    if (output.type === 'quads') {
      const quadStream = this.sliceStream(output.quadStream, operation);
      return <IQueryableResultQuads> {
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
  private sliceMetadata(output: IQueryableResultStream, pattern: Algebra.Slice): () => Promise<IMetadata> {
    // eslint-disable-next-line unicorn/explicit-length-check
    const hasLength: boolean = Boolean(pattern.length) || pattern.length === 0;
    return () => (<() => Promise<IMetadata>>output.metadata)()
      .then(subMetadata => {
        let { cardinality } = subMetadata;
        if (Number.isFinite(cardinality)) {
          cardinality = Math.max(0, cardinality - pattern.start);
          if (hasLength) {
            cardinality = Math.min(cardinality, pattern.length!);
          }
        }
        return { ...subMetadata, cardinality };
      });
  }
}
