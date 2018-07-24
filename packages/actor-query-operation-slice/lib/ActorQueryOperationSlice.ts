import {ActorQueryOperation, ActorQueryOperationTypedMediated, IActorQueryOperationOutputBindings,
  IActorQueryOperationTypedMediatedArgs} from "@comunica/bus-query-operation";
import {BindingsStream} from "@comunica/bus-query-operation";
import {ActionContext, IActorTest} from "@comunica/core";
import {Algebra} from "sparqlalgebrajs";

/**
 * A comunica Slice Query Operation Actor.
 */
export class ActorQueryOperationSlice extends ActorQueryOperationTypedMediated<Algebra.Slice> {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'slice');
  }

  public async testOperation(pattern: Algebra.Slice, context?: ActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.Slice, context?: ActionContext)
  : Promise<IActorQueryOperationOutputBindings> {
    // Resolve the input
    const output: IActorQueryOperationOutputBindings = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: pattern.input, context }));

    // Slice the bindings stream
    const hasLength: boolean = !!pattern.length || pattern.length === 0;
    const bindingsStream: BindingsStream = output.bindingsStream.range(pattern.start,
      hasLength ? pattern.start + pattern.length - 1 : Infinity);

    // If we find metadata, apply slicing on the total number of items
    const metadata: () => Promise<{[id: string]: any}> = !output.metadata ? null : () => output.metadata()
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

    return { type: 'bindings', bindingsStream, metadata, variables: output.variables };
  }

}
