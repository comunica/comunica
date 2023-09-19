import type {
  IActionExpressionEvaluatorAggregate,
  IActorExpressionEvaluatorAggregateArgs,
  IActorExpressionEvaluatorAggregateOutput,
} from '@comunica/bus-expression-evaluator-aggregate';
import { ActorExpressionEvaluatorAggregate } from '@comunica/bus-expression-evaluator-aggregate';
import type { IActorTest } from '@comunica/core';
import type { ExpressionEvaluator } from '@comunica/expression-evaluator';
import { AggregateEvaluator } from '@comunica/expression-evaluator';
import * as E from '@comunica/expression-evaluator/lib/expressions';
import { regularFunctions } from '@comunica/expression-evaluator/lib/functions';
import { integer } from '@comunica/expression-evaluator/lib/functions/Helpers';
import * as C from '@comunica/expression-evaluator/lib/util/Consts';
import type * as RDF from '@rdfjs/types';

/**
 * A comunica Average Expression Evaluator Aggregate Actor.
 */
export class ActorExpressionEvaluatorAggregateAverage extends ActorExpressionEvaluatorAggregate {
  public constructor(args: IActorExpressionEvaluatorAggregateArgs) {
    super(args);
  }

  public async test(action: IActionExpressionEvaluatorAggregate): Promise<IActorTest> {
    return action.expr.aggregator === 'avg';
  }

  public async run(action: IActionExpressionEvaluatorAggregate): Promise<IActorExpressionEvaluatorAggregateOutput> {
    return {
      aggregator: new AverageAggregator(action.factory.createEvaluator(action.expr, { actionContext: action.context })),
    };
  }
}

interface IAverageState {
  sum: E.NumericLiteral;
  count: number;
}

class AverageAggregator extends AggregateEvaluator {
  // This will eventually be a mediator call.
  private readonly summer = regularFunctions[C.RegularOperator.ADDITION];
  private readonly divider = regularFunctions[C.RegularOperator.DIVISION];
  private state: IAverageState | undefined = undefined;

  public constructor(evaluator: ExpressionEvaluator, throwError?: boolean) {
    super(evaluator, throwError);
  }

  public emptyValue(): RDF.Term {
    return integer(0).toRDF();
  }

  public putTerm(term: RDF.Term): void {
    if (this.state === undefined) {
      const sum = this.termToNumericOrError(term);
      this.state = { sum, count: 1 };
    } else {
      const internalTerm = this.termToNumericOrError(term);
      this.state.sum = <E.NumericLiteral> this.summer.apply([ this.state.sum, internalTerm ], this.evaluator.context);
      this.state.count++;
    }
  }

  public termResult(): RDF.Term {
    if (this.state === undefined) {
      return this.emptyValue();
    }
    const count = new E.IntegerLiteral(this.state.count);
    const result = this.divider.apply([ this.state.sum, count ], this.evaluator.context);
    return result.toRDF();
  }
}
