import * as RDF from 'rdf-js';
import { termToString } from 'rdf-string';
import { Algebra, Factory, Util } from "sparqlalgebrajs";
import { AsyncEvaluator, isExpressionError } from "sparqlee";

import {
  ActorQueryOperation, ActorQueryOperationTypedMediated, Bindings,
  IActorQueryOperationOutputBindings,
  IActorQueryOperationTypedMediatedArgs,
} from "@comunica/bus-query-operation";
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

    const config = { exists: this.createExistenceResolver(context) };
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
      const operation = this.substitute(expr.input, bindings);

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

  private substitute(operation: Algebra.Operation, bindings: Bindings): Algebra.Operation {
    return Util.mapOperation(operation, {
      path: (op: Algebra.Path, factory: Factory) => {
        return {
          recurse: false,
          result: factory.createPath(
            this.substituteSingle(op.subject, bindings),
            op.predicate,
            this.substituteSingle(op.object, bindings),
            this.substituteSingle(op.graph, bindings),
          ),
        };
      },
      pattern: (op: Algebra.Pattern, factory: Factory) => {
        return {
          recurse: false,
          result: factory.createPattern(
            this.substituteSingle(op.subject, bindings),
            this.substituteSingle(op.predicate, bindings),
            this.substituteSingle(op.object, bindings),
            this.substituteSingle(op.graph, bindings),
          ),
        };
      },
    });
  }

  private substituteSingle(term: RDF.Term, bindings: Bindings): RDF.Term {
    if (term.termType === 'Variable') {
      return bindings.get(termToString(term), term);
    }
    return term;
  }
}
