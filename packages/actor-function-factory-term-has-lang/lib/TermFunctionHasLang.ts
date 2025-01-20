import { TermFunctionBase } from '@comunica/bus-function-factory';
import {
  bool,
  declare,
  LangStringLiteral,
  SparqlOperator,
} from '@comunica/utils-expression-evaluator';
import { DirLangStringLiteral } from '@comunica/utils-expression-evaluator/lib/expressions';

/**
 *
 */
export class TermFunctionHasLang extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.HAS_LANG,
      overloads: declare(SparqlOperator.HAS_LANG)
        .onTerm1(() => term => bool(term instanceof LangStringLiteral || term instanceof DirLangStringLiteral))
        .collect(),
    });
  }
}
