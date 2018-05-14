import {
  ActorQueryOperation, ActorQueryOperationTypedMediated, Bindings,
  IActorQueryOperationOutputBindings,
  IActorQueryOperationTypedMediatedArgs,
} from "@comunica/bus-query-operation";
import { BindingsStream } from "@comunica/bus-query-operation";
import { IActorTest } from "@comunica/core";
import { Algebra } from "sparqlalgebrajs";

/**
 * A comunica Extend Query Operation Actor.
 */
export class ActorQueryOperationExtend extends ActorQueryOperationTypedMediated<Algebra.Extend> {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'extend');
  }

  public async testOperation(pattern: Algebra.Extend, context?: { [id: string]: any }): Promise<IActorTest> {
    // will throw error for unsupported operators
    const _ = new AsyncEvaluator(pattern.expression);
    return true;
  }

  public async runOperation(pattern: Algebra.Extend, context?: { [id: string]: any })
    : Promise<IActorQueryOperationOutputBindings> {

    // const { } = pattern;
    // Resolve the input
    const output: IActorQueryOperationOutputBindings = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: pattern.input, context }));

    const variables = output.variables;
    const bindingsStream = output.bindingsStream;

    // TODO check if metadata can be kept
    return { type: 'bindings', bindingsStream, metadata: output.metadata, variables };
  }

}
