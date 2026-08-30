import { TermFunctionBase } from '@comunica/bus-function-factory';
import { bool, declare, DirLangStringLiteral, SparqlOperator } from '@comunica/utils-expression-evaluator';

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
