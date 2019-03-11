import {
  ActorQueryOperation, ActorQueryOperationTypedMediated, Bindings,
  IActorQueryOperationOutputBindings,
  IActorQueryOperationTypedMediatedArgs,
} from "@comunica/bus-query-operation";
import { ActionContext, IActorTest } from "@comunica/core";
import { Algebra } from "sparqlalgebrajs";
import { AsyncEvaluator, isExpressionError } from "sparqlee";

/**
 * A comunica Filter Sparqlee Query Operation Actor.
 */
export class ActorQueryOperationFilterSparqlee extends ActorQueryOperationTypedMediated<Algebra.Filter> {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'filter');
  }

  public async testOperation(pattern: Algebra.Filter, context: ActionContext): Promise<IActorTest> {
    // Will throw error for unsupported operators
    const _ = new AsyncEvaluator(pattern.expression);
    return true;
  }

  public async runOperation(pattern: Algebra.Filter, context: ActionContext)
    : Promise<IActorQueryOperationOutputBindings> {

    const outputRaw = await this.mediatorQueryOperation.mediate({ operation: pattern.input, context });
    const output = ActorQueryOperation.getSafeBindings(outputRaw);
    ActorQueryOperation.validateQueryOutput(output, 'bindings');
    const { variables, metadata } = output;

    const evaluator = new AsyncEvaluator(pattern.expression);
    const transform = async (item: Bindings, next: any) => {
      try {
        const result = await evaluator.evaluateAsEBV(item);
        if (result) {
          bindingsStream._push(item);
        }
      } catch (err) {
        if (!isExpressionError(err)) {
          bindingsStream.emit('error', err);
        }
      }
      next();
    };

    const bindingsStream = output.bindingsStream.transform<Bindings>({ transform });
    return { type: 'bindings', bindingsStream, metadata, variables };
  }
}
