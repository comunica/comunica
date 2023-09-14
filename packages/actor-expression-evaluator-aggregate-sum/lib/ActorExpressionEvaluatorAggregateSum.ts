import type {
  IActionExpressionEvaluatorAggregate,
  IActorExpressionEvaluatorAggregateOutput,
  IActorExpressionEvaluatorAggregateArgs,
} from '@comunica/bus-expression-evaluator-aggregate';
import { ActorExpressionEvaluatorAggregate } from '@comunica/bus-expression-evaluator-aggregate';
import type { IActorTest } from '@comunica/core';
import type { AsyncEvaluator } from '@comunica/expression-evaluator';
import { AggregateEvaluator } from '@comunica/expression-evaluator';
import type * as E from '@comunica/expression-evaluator/lib/expressions';
import { regularFunctions } from '@comunica/expression-evaluator/lib/functions';
import { integer } from '@comunica/expression-evaluator/lib/functions/Helpers';
import * as C from '@comunica/expression-evaluator/lib/util/Consts';
import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Sum Expression Evaluator Aggregate Actor.
 */
export class ActorExpressionEvaluatorAggregateSum extends ActorExpressionEvaluatorAggregate {
  public constructor(args: IActorExpressionEvaluatorAggregateArgs) {
    super(args);
  }

  public async test(action: IActionExpressionEvaluatorAggregate): Promise<IActorTest> {
    return action.expr.aggregator === 'sum';
  }

  public async run(action: IActionExpressionEvaluatorAggregate): Promise<IActorExpressionEvaluatorAggregateOutput> {
    return {
      aggregator: new SumAggregator(action.expr, action.evaluator),
    };
  }
}

type SumState = E.NumericLiteral;

class SumAggregator extends AggregateEvaluator {
  private state: SumState | undefined = undefined;
  private readonly summer = regularFunctions[C.RegularOperator.ADDITION];

  public constructor(expr: Algebra.AggregateExpression,
    evaluator: AsyncEvaluator, throwError?: boolean) {
    super(expr, evaluator, throwError);
  }

  public emptyValue(): RDF.Term {
    return integer(0).toRDF();
  }

  public putTerm(term: RDF.Term): void {
    if (this.state === undefined) {
      this.state = this.termToNumericOrError(term);
    } else {
      const internalTerm = this.termToNumericOrError(term);
      this.state = <E.NumericLiteral> this.summer.apply([ this.state, internalTerm ], this.evaluator.context);
    }
  }

  public termResult(): RDF.Term {
    if (this.state === undefined) {
      return this.emptyValue();
    }
    return this.state.toRDF();
  }
}
