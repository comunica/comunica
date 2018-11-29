import * as RDF from 'rdf-js';
import { Algebra } from "sparqlalgebrajs";
import { AsyncEvaluator, ExpressionError } from "sparqlee";

import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
  Bindings,
  IActorQueryOperationOutputBindings,
  IActorQueryOperationTypedMediatedArgs,
} from "@comunica/bus-query-operation";
import { BindingsStream } from "@comunica/bus-query-operation";
import { ActionContext, IActorTest } from "@comunica/core";

/**
 * A comunica Filter Sparqlee Query Operation Actor.
 */
export class ActorQueryOperationFilterSparqlee extends ActorQueryOperationTypedMediated<Algebra.Filter> {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'filter');
  }

  public async testOperation(pattern: Algebra.Filter, context: ActionContext): Promise<IActorTest> {
    // Will throw error for unsupported operators
    // Coerce to boolean to check for falsy values
    return !!new AsyncEvaluator(pattern.expression);
  }

  public async runOperation(pattern: Algebra.Filter, context: ActionContext)
    : Promise<IActorQueryOperationOutputBindings> {

    const outputRaw = await this.mediatorQueryOperation.mediate({ operation: pattern.input, context });
    const output = ActorQueryOperation.getSafeBindings(outputRaw);
    ActorQueryOperation.validateQueryOutput(output, 'bindings');
    const { variables, metadata } = output;

    const hooks = {
      aggregate(expression: Algebra.AggregateExpression): Promise<RDF.Term> {
        return undefined;
      },
    };

    const evaluator = new AsyncEvaluator(pattern.expression, hooks);
    const transform = async (item: Bindings, next: any) => {
      try {
        const result = await evaluator.evaluateAsEBV(item);
        if (result === true) { bindingsStream._push(item); }
      } catch (err) {
        if (!this.isExpressionError(err)) {
          bindingsStream.emit('error', err);
        }
      }
      next();
    };

    const bindingsStream = output.bindingsStream.transform<Bindings>({ transform });
    return { type: 'bindings', bindingsStream, metadata, variables };
  }

  // TODO Duplication with e.g. Extend
  // Expression errors are errors intentionally thrown because of expression-data mismatches.
  // They are distinct from other errors in the sense that their behaviour is defined by
  // the SPARQL spec.
  // In this specific case, they should be ignored (while others obviously should not).
  // This function is separate so it can more easily be mocked in tests.
  public isExpressionError(error: Error): boolean {
    return error instanceof ExpressionError;
  }
}
