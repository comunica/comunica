import { TermFunctionBase } from '@comunica/bus-function-factory';
import {
  declare,
  DirLangStringLiteral,
  ExpressionError,
  SparqlOperator,
  TypeURL,
} from '@comunica/utils-expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-strlang
 */
export class TermFunctionStrLangdir extends TermFunctionBase {
  public constructor() {
    super({
      arity: 3,
      operator: SparqlOperator.STRLANGDIR,
      overloads: declare(SparqlOperator.STRLANGDIR)
        .onTernaryTyped(
          [ TypeURL.XSD_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
          () => (val: string, language: string, direction: string) => {
            if (!language) {
              throw new ExpressionError(`Unable to create directional language string for empty languages`);
            }
            if (direction !== 'ltr' && direction !== 'rtl') {
              throw new ExpressionError(`Unable to create directional language string for direction "${direction}"`);
            }
            return new DirLangStringLiteral(val, language.toLowerCase(), direction);
          },
        )
        .collect(),
    });
  }
}
