import { TermFunctionBase } from '@comunica/bus-function-factory';
import type {
  BooleanLiteral,
} from '@comunica/expression-evaluator';
import {
  bool,
  declare,
  SparqlOperator,
} from '@comunica/expression-evaluator';

export class TermFunctionInequality extends TermFunctionBase {
  public constructor(private readonly equalityFunction: TermFunctionBase) {
    super({
      arity: 2,
      operator: SparqlOperator.NOT_EQUAL,
      overloads: declare(SparqlOperator.NOT_EQUAL)
        .set([ 'term', 'term' ], expressionEvaluator =>
          ([ first, second ]) =>
            bool(!(<BooleanLiteral> this.equalityFunction
              .applyOnTerms([ first, second ], expressionEvaluator)).typedValue))
        .collect(),
    });
  }
}
