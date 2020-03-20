import {
  ActorQueryOperationTypedMediated,
  IActorQueryOperationOutputBindings, IActorQueryOperationOutputQuads,
  IActorQueryOperationOutputStream,
  IActorQueryOperationTypedMediatedArgs
} from "@comunica/bus-query-operation";
import {ActionContext, IActorTest} from "@comunica/core";
import {AsyncIterator} from "asynciterator";
import {Algebra} from "sparqlalgebrajs";

/**
 * A comunica Slice Query Operation Actor.
 */
export class ActorQueryOperationSlice extends ActorQueryOperationTypedMediated<Algebra.Slice> {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'slice');
  }

  public async testOperation(pattern: Algebra.Slice, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.Slice, context: ActionContext)
  : Promise<IActorQueryOperationOutputStream> {
    // Resolve the input
    const output: IActorQueryOperationOutputStream = await this.mediatorQueryOperation.mediate({ operation: pattern.input, context });

    const metadata = this.sliceMetadata(output, pattern);

    if  (output.type === 'bindings') {
      const bindingsOutput = <IActorQueryOperationOutputBindings> output;
      const bindingsStream = this.sliceStream(bindingsOutput.bindingsStream, pattern);
      return <IActorQueryOperationOutputBindings> { type: 'bindings', bindingsStream, metadata, variables: bindingsOutput.variables };
    }

    if (output.type === 'quads') {
      const quadOutput = <IActorQueryOperationOutputQuads> output;
      const quadStream = this.sliceStream(quadOutput.quadStream, pattern);
      return <IActorQueryOperationOutputQuads> { type: 'quads', quadStream, metadata };
    }

    throw new Error(`Invalid query output type: Expected 'bindings' or 'quads' but got '${output.type}'`);
  }

  // Slice the stream based on the pattern values
  private sliceStream(stream: AsyncIterator<any>, pattern: Algebra.Slice): AsyncIterator<any> {
    const hasLength: boolean = !!pattern.length || pattern.length === 0;
    return stream.range(pattern.start,
      hasLength ? pattern.start + pattern.length - 1 : Infinity);
  }

  // If we find metadata, apply slicing on the total number of items
  private sliceMetadata(output: IActorQueryOperationOutputStream, pattern: Algebra.Slice): () => Promise<{[id: string]: any}> {
    const hasLength: boolean = !!pattern.length || pattern.length === 0;
    return !output.metadata ? null : () => output.metadata()
      .then((subMetadata) => {
        let totalItems: number = subMetadata.totalItems;
        if (isFinite(totalItems)) {
          totalItems = Math.max(0, totalItems - pattern.start);
          if (hasLength) {
            totalItems = Math.min(totalItems, pattern.length);
          }
        }
        return Object.assign({}, subMetadata, { totalItems });
      });
  }

}
