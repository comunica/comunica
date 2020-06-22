import {Algebra} from "sparqlalgebrajs";
import {AsyncEvaluator, isExpressionError} from "sparqlee";
import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
  Bindings,
  IActorQueryOperationOutputBindings,
  IActorQueryOperationTypedMediatedArgs,
  materializeOperation,
} from "@comunica/bus-query-operation";
import {ActionContext, IActorTest} from "@comunica/core";

/**
 * A comunica Filter Sparqlee Query Operation Actor.
 */
export class ActorQueryOperationFilterSparqlee extends ActorQueryOperationTypedMediated<Algebra.Filter> {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'filter');
  }

  public async testOperation(pattern: Algebra.Filter, context: ActionContext): Promise<IActorTest> {
    // Will throw error for unsupported operators
    const _ = new AsyncEvaluator(pattern.expression,
      ActorQueryOperation.getExpressionContext(context, this.mediatorQueryOperation));
    return true;
  }

  public async runOperation(pattern: Algebra.Filter, context: ActionContext)
    : Promise<IActorQueryOperationOutputBindings> {

    const outputRaw = await this.mediatorQueryOperation.mediate({ operation: pattern.input, context });
    const output = ActorQueryOperation.getSafeBindings(outputRaw);
    ActorQueryOperation.validateQueryOutput(output, 'bindings');
    const { variables, metadata } = output;

    const config = ActorQueryOperation.getExpressionContext(context, this.mediatorQueryOperation);
    const evaluator = new AsyncEvaluator(pattern.expression, config);

    const transform = async (item: Bindings, next: any, push: (bindings: Bindings) => void) => {
      try {
        const result = await evaluator.evaluateAsEBV(item);
        if (result) {
          push(item);
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
