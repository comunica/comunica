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
    const config = { exists: this.createExistenceResolver(context) };
    const _ = new AsyncEvaluator(pattern.expression, config);
    return true;
  }

  public async runOperation(pattern: Algebra.Filter, context: ActionContext)
    : Promise<IActorQueryOperationOutputBindings> {

    const outputRaw = await this.mediatorQueryOperation.mediate({ operation: pattern.input, context });
    const output = ActorQueryOperation.getSafeBindings(outputRaw);
    ActorQueryOperation.validateQueryOutput(output, 'bindings');
    const { variables, metadata } = output;

    const expressionContext = ActorQueryOperation.getExpressionContext(context);
    const config = {
      ...expressionContext,
      exists: this.createExistenceResolver(context),
    };
    const evaluator = new AsyncEvaluator(pattern.expression, config);

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

  private createExistenceResolver(context: ActionContext):
    (expr: Algebra.ExistenceExpression, bindings: Bindings) => Promise<boolean> {
    return async (expr, bindings) => {
      const operation = materializeOperation(expr.input, bindings);

      const outputRaw = await this.mediatorQueryOperation.mediate({ operation, context });
      const output = ActorQueryOperation.getSafeBindings(outputRaw);

      return new Promise(
        (resolve, reject) => {
          output.bindingsStream.on('end', () => {
            resolve(false);
          });

          output.bindingsStream.on('error', reject);

          output.bindingsStream.on('data', () => {
            output.bindingsStream.close();
            resolve(true);
          });
        })
        .then((exists: boolean) => expr.not ? !exists : exists);
    };
  }

}
