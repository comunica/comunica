import type { IAggregator, MediatorExpressionEvaluatorAggregate } from '@comunica/bus-expression-evaluator-aggregate';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import { BlankNodeBindingsScoped } from '@comunica/data-factory';
import type { IActionContext } from '@comunica/types';
import type { Algebra as Alg } from 'sparqlalgebrajs';
import { ExpressionEvaluator } from './ExpressionEvaluator';

/**
 * A counter that keeps track blank node generated through BNODE() SPARQL
 * expressions.
 *
 * @type {number}
 */
let bnodeCounter = 0;

export class ExpressionEvaluatorFactory {
  public readonly mediatorExpressionEvaluatorAggregate: MediatorExpressionEvaluatorAggregate;
  public readonly mediatorQueryOperation: MediatorQueryOperation;

  public constructor(args: IExpressionEvaluatorFactoryArgs) {
    this.mediatorExpressionEvaluatorAggregate = args.mediatorExpressionEvaluatorAggregate;
    this.mediatorQueryOperation = args.mediatorQueryOperation;
  }

  public createEvaluator(algExpr: Alg.Expression, context: IActionContext): ExpressionEvaluator {
    return new ExpressionEvaluator(algExpr, {
      now: context.get(KeysInitQuery.queryTimestamp),
      baseIRI: context.get(KeysInitQuery.baseIRI),
      actionContext: context,
      bnode: (input?: string) => Promise.resolve(new BlankNodeBindingsScoped(input || `BNODE_${bnodeCounter++}`)),
      exists: ActorQueryOperation.createExistenceResolver(context, this.mediatorQueryOperation),
    }, this);
  }

  public async createAggregator(algExpr: Alg.AggregateExpression, context: IActionContext): Promise<IAggregator> {
    return (await this.mediatorExpressionEvaluatorAggregate.mediate({
      expr: algExpr,
      factory: this,
      context,
    })).aggregator;
  }
}

interface IExpressionEvaluatorFactoryArgs {
  mediatorExpressionEvaluatorAggregate: MediatorExpressionEvaluatorAggregate;
  mediatorQueryOperation: MediatorQueryOperation;
}
