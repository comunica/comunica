import {ActorQueryOperation, ActorQueryOperationTypedMediated, Bindings,
  IActorQueryOperationOutputBindings, IActorQueryOperationTypedMediatedArgs} from "@comunica/bus-query-operation";
import {ActionContext, IActorTest} from "@comunica/core";
import {Algebra} from "sparqlalgebrajs";
import {SparqlExpressionEvaluator} from "./SparqlExpressionEvaluator";

/**
 * A comunica Filter Direct Query Operation Actor.
 */
export class ActorQueryOperationFilterDirect extends ActorQueryOperationTypedMediated<Algebra.Filter> {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'filter');
  }

  public async testOperation(pattern: Algebra.Filter, context: ActionContext): Promise<IActorTest> {
    // will throw error for unsupported operators
    SparqlExpressionEvaluator.createEvaluator(pattern.expression);
    return true;
  }

  public async runOperation(pattern: Algebra.Filter, context: ActionContext)
    : Promise<IActorQueryOperationOutputBindings> {
    const output: IActorQueryOperationOutputBindings = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: pattern.input, context }));
    ActorQueryOperation.validateQueryOutput(output, 'bindings');

    const exprFunc = SparqlExpressionEvaluator.createEvaluator(pattern.expression);
    const filter = (bindings: Bindings) => {
      try {
        const term = exprFunc(bindings);
        return term && term.value !== 'false' && term.value !== '0';
      } catch (e) {
        bindingsStream.emit('error', e);
        return false;
      }
    };
    const bindingsStream = output.bindingsStream.filter(filter);

    return { type: 'bindings', bindingsStream, metadata: output.metadata, variables: output.variables };
  }

}
