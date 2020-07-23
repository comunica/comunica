import { ActorQueryOperation, ActorQueryOperationTypedMediated, Bindings,
  IActorQueryOperationOutputBindings, IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActionContext, IActorTest } from '@comunica/core';
import { Algebra } from 'sparqlalgebrajs';
import * as SparqlExpressionEvaluator from './SparqlExpressionEvaluator';

/**
 * A comunica Filter Direct Query Operation Actor.
 */
export class ActorQueryOperationFilterDirect extends ActorQueryOperationTypedMediated<Algebra.Filter> {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'filter');
  }

  public async testOperation(pattern: Algebra.Filter): Promise<IActorTest> {
    // Will throw error for unsupported operators
    SparqlExpressionEvaluator.createEvaluator(pattern.expression);
    return true;
  }

  public async runOperation(pattern: Algebra.Filter, context: ActionContext):
  Promise<IActorQueryOperationOutputBindings> {
    const output: IActorQueryOperationOutputBindings = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: pattern.input, context }),
    );
    ActorQueryOperation.validateQueryOutput(output, 'bindings');

    const exprFunc = SparqlExpressionEvaluator.createEvaluator(pattern.expression);
    function filter(bindings: Bindings): boolean {
      try {
        const term = exprFunc(bindings);
        // eslint-disable-next-line no-implicit-coercion
        return !!term && term.value !== 'false' && term.value !== '0';
      } catch (error) {
        bindingsStream.emit('error', error);
        return false;
      }
    }
    const bindingsStream = output.bindingsStream.transform<Bindings>({ filter, autoStart: false });

    return { type: 'bindings', bindingsStream, metadata: output.metadata, variables: output.variables };
  }
}
