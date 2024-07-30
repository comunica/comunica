import { RegularFunction } from '@comunica/bus-function-factory';
import type {
  BooleanLiteral,
} from '@comunica/expression-evaluator';
import {
  RegularOperator,
  bool,
  declare,
} from '@comunica/expression-evaluator';

export class Inequality extends RegularFunction {
  public constructor(private readonly equalityFunction: RegularFunction) {
    super();
  }

  protected arity = 2;

  public operator = RegularOperator.NOT_EQUAL;

  protected overloads = declare(RegularOperator.NOT_EQUAL)
    .set([ 'term', 'term' ], expressionEvaluator =>
      ([ first, second ]) =>
        bool(!(<BooleanLiteral> this.equalityFunction
          .applyOnTerms([ first, second ], expressionEvaluator)).typedValue))
    .collect();
}
