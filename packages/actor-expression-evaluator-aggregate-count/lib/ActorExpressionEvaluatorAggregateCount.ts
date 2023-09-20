import type {
  IActionExpressionEvaluatorAggregate,
  IActorExpressionEvaluatorAggregateArgs,
  IActorExpressionEvaluatorAggregateOutput,
} from '@comunica/bus-expression-evaluator-aggregate';
import { ActorExpressionEvaluatorAggregate } from '@comunica/bus-expression-evaluator-aggregate';
import type { IActorTest } from '@comunica/core';
import type { ExpressionEvaluator } from '@comunica/expression-evaluator';
import { AggregateEvaluator } from '@comunica/expression-evaluator';
import { integer } from '@comunica/expression-evaluator/lib/functions/Helpers';
import type * as RDF from '@rdfjs/types';
import { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Count Expression Evaluator Aggregate Actor.
 */
export class ActorExpressionEvaluatorAggregateCount extends ActorExpressionEvaluatorAggregate {
  public constructor(args: IActorExpressionEvaluatorAggregateArgs) {
    super(args);
  }

  public async test(action: IActionExpressionEvaluatorAggregate): Promise<IActorTest> {
    if (action.expr.aggregator !== 'count' ||
      action.expr.expression.expressionType === Algebra.expressionTypes.WILDCARD) {
      throw new Error('This actor only supports the \'count\' aggregator without wildcard.');
    }
    return {};
  }

  public async run(action: IActionExpressionEvaluatorAggregate): Promise<IActorExpressionEvaluatorAggregateOutput> {
    return {
      aggregator: new CountAggregator(action.factory.createEvaluator(action.expr, action.context)),
    };
  }
}

class CountAggregator extends AggregateEvaluator {
  private state: number | undefined = undefined;
  public constructor(evaluator: ExpressionEvaluator, throwError?: boolean) {
    super(evaluator, throwError);
  }

  public emptyValue(): RDF.Term {
    return integer(0).toRDF();
  }

  public putTerm(_: RDF.Term): void {
    if (this.state === undefined) {
      this.state = 0;
    }
    this.state++;
  }

  public termResult(): RDF.Term {
    if (this.state === undefined) {
      return this.emptyValue();
    }
    return integer(this.state).toRDF();
  }
}
