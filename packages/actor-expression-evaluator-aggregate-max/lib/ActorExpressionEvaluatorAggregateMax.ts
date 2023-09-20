import type {
  IActionExpressionEvaluatorAggregate,
  IActorExpressionEvaluatorAggregateOutput,
  IActorExpressionEvaluatorAggregateArgs,
} from '@comunica/bus-expression-evaluator-aggregate';
import { ActorExpressionEvaluatorAggregate } from '@comunica/bus-expression-evaluator-aggregate';
import type { IActorTest } from '@comunica/core';
import type { ExpressionEvaluator } from '@comunica/expression-evaluator';
import { AggregateEvaluator } from '@comunica/expression-evaluator';
import type * as RDF from '@rdfjs/types';

/**
 * A comunica Max Expression Evaluator Aggregate Actor.
 */
export class ActorExpressionEvaluatorAggregateMax extends ActorExpressionEvaluatorAggregate {
  public constructor(args: IActorExpressionEvaluatorAggregateArgs) {
    super(args);
  }

  public async test(action: IActionExpressionEvaluatorAggregate): Promise<IActorTest> {
    if (action.expr.aggregator !== 'max') {
      throw new Error('This actor only supports the \'max\' aggregator.');
    }
    return {};
  }

  public async run(action: IActionExpressionEvaluatorAggregate): Promise<IActorExpressionEvaluatorAggregateOutput> {
    return {
      aggregator: new MaxAggregator(action.factory.createEvaluator(action.expr, action.context)),
    };
  }
}

class MaxAggregator extends AggregateEvaluator {
  private state: RDF.Term | undefined = undefined;
  public constructor(evaluator: ExpressionEvaluator, throwError?: boolean) {
    super(evaluator, throwError);
  }

  public putTerm(term: RDF.Term): void {
    if (term.termType !== 'Literal') {
      throw new Error(`Term with value ${term.value} has type ${term.termType} and is not a literal`);
    }
    if (this.state === undefined) {
      this.state = term;
    } else if (this.evaluator.orderTypes(this.state, term) === -1) {
      this.state = term;
    }
  }

  public termResult(): RDF.Term | undefined {
    if (this.state === undefined) {
      return this.emptyValue();
    }
    return this.state;
  }
}
