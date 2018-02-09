import {ActorQueryOperation, ActorQueryOperationTypedMediated, Bindings,
  IActorQueryOperationOutput, IActorQueryOperationTypedMediatedArgs} from "@comunica/bus-query-operation";
import {IActorTest} from "@comunica/core";
import {Algebra} from "sparqlalgebrajs";
import {SparqlExpressionEvaluator} from "./SparqlExpressionEvaluator";

/**
 * A comunica Filter Direct Query Operation Actor.
 */
export class ActorQueryOperationFilterDirect extends ActorQueryOperationTypedMediated<Algebra.Filter> {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'filter');
  }

  public async testOperation(pattern: Algebra.Filter, context?: {[id: string]: any}): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.Filter, context?: {[id: string]: any})
    : Promise<IActorQueryOperationOutput> {
    const output: IActorQueryOperationOutput =
      await this.mediatorQueryOperation.mediate({ operation: pattern.input, context });
    ActorQueryOperation.validateQueryOutput(output, 'bindings');

    const exprFunc = SparqlExpressionEvaluator.createEvaluator(pattern.expression);
    const filter = (bindings: Bindings) => {
      const term = exprFunc(bindings);
      return term && term.value !== 'false' && term.value !== '0';
    };
    const bindingsStream = output.bindingsStream.filter(filter);

    return { type: 'bindings', bindingsStream, metadata: output.metadata, variables: output.variables };
  }

}
