import { TermFunctionBase } from '@comunica/bus-function-factory';
import {
  bool,
  declare,
  SparqlOperator,
} from '@comunica/utils-expression-evaluator';
import { DirLangStringLiteral } from '@comunica/utils-expression-evaluator/lib/expressions';

/**
 *
 */
export class TermFunctionHasLangdir extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.HAS_LANGDIR,
      overloads: declare(SparqlOperator.HAS_LANGDIR)
        .onTerm1(() => term => bool(term instanceof DirLangStringLiteral))
        .collect(),
    });
  }
}
