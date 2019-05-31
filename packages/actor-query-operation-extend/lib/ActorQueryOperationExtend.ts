import { termToString } from 'rdf-string';
import { Algebra } from "sparqlalgebrajs";
import { AsyncEvaluator, isExpressionError } from "sparqlee";

import {
  ActorQueryOperation, ActorQueryOperationTypedMediated, Bindings,
  IActorQueryOperationOutputBindings,
  IActorQueryOperationTypedMediatedArgs,
} from "@comunica/bus-query-operation";
import { ActionContext, Actor, IActorTest } from "@comunica/core";

/**
 * A comunica Extend Query Operation Actor.
 *
 * See https://www.w3.org/TR/sparql11-query/#sparqlAlgebra;
 */
export class ActorQueryOperationExtend extends ActorQueryOperationTypedMediated<Algebra.Extend> {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'extend');
  }

  public async testOperation(pattern: Algebra.Extend, context: ActionContext): Promise<IActorTest> {
    // Will throw error for unsupported opperations
    const _ = !!new AsyncEvaluator(pattern.expression);
    return true;
  }

  public async runOperation(pattern: Algebra.Extend, context: ActionContext)
    : Promise<IActorQueryOperationOutputBindings> {

    const { expression, input, variable } = pattern;

    const output: IActorQueryOperationOutputBindings = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: input, context }));

    const extendKey = termToString(variable);
    const config = { ...ActorQueryOperation.getExpressionContext(context) };
    const evaluator = new AsyncEvaluator(expression, config);

    // Transform the stream by extending each Bindings with the expression result
    const transform = async (bindings: Bindings, next: any) => {
      try {
        const result = await evaluator.evaluate(bindings);
        // Extend operation is undefined when the key already exists
        // We just override it here.
        const extended = bindings.set(extendKey, result);
        bindingsStream._push(extended);
      } catch (err) {
        if (isExpressionError(err)) {
          // Errors silently don't actually extend according to the spec
          bindingsStream._push(bindings);
          // But let's warn anyway
          this.logWarn(context, `Expression error for extend operation with bindings '${JSON.stringify(bindings)}'`);
        } else {
          bindingsStream.emit('error', err);
        }
      }
      next();
    };

    const variables = output.variables.concat([extendKey]);
    const bindingsStream = output.bindingsStream.transform<Bindings>({ transform });
    const metadata = output.metadata;
    return { type: 'bindings', bindingsStream, metadata, variables };
  }
}
