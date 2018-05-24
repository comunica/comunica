import {
  ActorQueryOperation, ActorQueryOperationTypedMediated, Bindings,
  IActorQueryOperationOutputBindings, IActorQueryOperationTypedMediatedArgs,
} from "@comunica/bus-query-operation";
import { IActorTest } from "@comunica/core";
import { Algebra } from "sparqlalgebrajs";
import { AsyncEvaluator, ExpressionError } from "sparqlee";

/**
 * A comunica Filter Direct Query Operation Actor.
 */
export class ActorQueryOperationFilterDirect extends ActorQueryOperationTypedMediated<Algebra.Filter> {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'filter');
  }

  public async testOperation(pattern: Algebra.Filter, context?: { [id: string]: any }): Promise<IActorTest> {
    // will throw error for unsupported operators
    const _ = new AsyncEvaluator(pattern.expression);
    return true;
  }

  public async runOperation(pattern: Algebra.Filter, context?: { [id: string]: any })
    : Promise<IActorQueryOperationOutputBindings> {
    const output: IActorQueryOperationOutputBindings = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: pattern.input, context }));
    ActorQueryOperation.validateQueryOutput(output, 'bindings');

    const evaluator = new AsyncEvaluator(pattern.expression);
    const throwIfHardError = (err: any) => {
      if (!(err instanceof ExpressionError)) {
        bindingsStream.emit('error', err);
        throw err;
      }
    };

    const transform = (item: Bindings, next: any) => {
      evaluator.evaluateAsEBV(item)
        // Push the binding if it evaluates true, else don't
        .then((result) => { if (result) { bindingsStream._push(item); } })

        // Consider as false when expression errors
        .catch((err) => throwIfHardError(err))
        .then(next);
    };
    const bindingsStream = output.bindingsStream.transform<Bindings>({ transform });
    return { type: 'bindings', bindingsStream, metadata: output.metadata, variables: output.variables };
  }

}
