import {
  ActorQueryOperation, ActorQueryOperationTypedMediated, Bindings,
  IActorQueryOperationOutputBindings, IActorQueryOperationTypedMediatedArgs,
} from "@comunica/bus-query-operation";
import { IActorTest } from "@comunica/core";
import { Algebra } from "sparqlalgebrajs";
import { AsyncEvaluator } from "sparqlee";

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

    const transform = (item: Bindings, next: any) => {
      evaluator.evaluateAsEBV(item)
        .then((result) => (result) ? bindingsStream._push(item) : undefined)
        .then(() => next())
        .catch((err) => bindingsStream.emit('error', err));
    };
    const bindingsStream = output.bindingsStream.transform<Bindings>({ transform });
    return { type: 'bindings', bindingsStream, metadata: output.metadata, variables: output.variables };
  }

}
