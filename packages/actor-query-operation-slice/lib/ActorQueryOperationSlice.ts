import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import { KeysQueryOperation } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type {
  IQueryOperationResult,
  IQueryOperationResultBindings,
  IQueryOperationResultQuads,
  IQueryOperationResultStream,
  IMetadata,
  IActionContext,
} from '@comunica/types';
import { Algebra, isKnownOperation } from '@comunica/utils-algebra';
import { assignOperationSortLimit } from '@comunica/utils-query-operation';
import type { AsyncIterator } from 'asynciterator';

/**
 * A comunica Slice Query Operation Actor.
 */
export class ActorQueryOperationSlice extends ActorQueryOperationTypedMediated<Algebra.Slice> {
  /**
   * Operations that map every input result to exactly one output result in the same order, so that
   * a bound on their output is also a bound on their input.
   * Notably, DISTINCT and REDUCED are not among those.
   */
  private static readonly ORDER_PRESERVING_TYPES = new Set<string>([
    Algebra.Types.PROJECT,
    Algebra.Types.EXTEND,
  ]);

  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, Algebra.Types.SLICE);
  }

  public async testOperation(_operation: Algebra.Slice, _context: IActionContext): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async runOperation(operation: Algebra.Slice, context: IActionContext):
  Promise<IQueryOperationResult> {
    // Add limit indicator to the context, which can be used for query planning
    // eslint-disable-next-line unicorn/explicit-length-check
    if (operation.length) {
      context = context.set(KeysQueryOperation.limitIndicator, operation.length);
    }

    // Resolve the input, telling the ORDER BY below us (if any) how many results will be read
    const input = ActorQueryOperationSlice.pushSortLimit(operation) ?? operation.input;
    const output: IQueryOperationResult = await this.mediatorQueryOperation
      .mediate({ operation: input, context });

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

    // In all other cases, return the result as-is.
    return output;
  }

  /**
   * Annotate the ORDER BY that produces the results of the given slice with the number of results
   * that will actually be read, so that it can sort within a bounded buffer instead of
   * materializing all of its input.
   * @param operation A slice operation.
   * @return The rewritten input of the slice, or undefined if there is no ORDER BY to annotate.
   */
  private static pushSortLimit(operation: Algebra.Slice): Algebra.Operation | undefined {
    // Without a LIMIT, the number of results that will be read is unbounded
    if (operation.length === undefined) {
      return;
    }
    return ActorQueryOperationSlice.annotateSortLimit(operation.input, operation.start + operation.length);
  }

  /**
   * Annotate the ORDER BY that determines the first `sortLimit` results of the given operation.
   * @param operation The input of a slice, or of an operation that was traversed from one.
   * @param sortLimit The number of results that will be read from that operation.
   * @return The annotated operation, or undefined if there is no ORDER BY to annotate.
   */
  private static annotateSortLimit(operation: Algebra.Operation, sortLimit: number): Algebra.Operation | undefined {
    if (isKnownOperation(operation, Algebra.Types.ORDER_BY)) {
      return assignOperationSortLimit(operation, sortLimit);
    }
    if (ActorQueryOperationSlice.ORDER_PRESERVING_TYPES.has(operation.type)) {
      const parent = <Algebra.Project | Algebra.Extend> operation;
      const input = ActorQueryOperationSlice.annotateSortLimit(parent.input, sortLimit);
      if (input) {
        const copy: Algebra.Project | Algebra.Extend = { ...parent, input };
        return copy;
      }
    }
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
      .then((subMetadata) => {
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
