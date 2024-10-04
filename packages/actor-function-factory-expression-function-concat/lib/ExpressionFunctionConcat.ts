import { ExpressionFunctionBase } from '@comunica/bus-function-factory';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import type {
  IEvalContext,
  Literal,
  OverloadTree,
  TermExpression,
} from '@comunica/expression-evaluator';
import {
  declare,
  InvalidArgumentTypes,
  langString,
  SparqlOperator,
  string,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-concat
 */
export class ExpressionFunctionConcat extends ExpressionFunctionBase {
  public constructor() {
    super({
      arity: Number.POSITIVE_INFINITY,
      operator: SparqlOperator.CONCAT,
      apply: async(context: IEvalContext): Promise<TermExpression> => {
        const { args, mapping, exprEval } = context;
        const pLits: Promise<Literal<string>>[] = args
          .map(async expr => exprEval.evaluatorExpressionEvaluation(expr, mapping))
          .map(async(pTerm) => {
            const operation = ExpressionFunctionConcat.concatTree.search(
              [ await pTerm ],
              exprEval.context.getSafe(KeysExpressionEvaluator.superTypeProvider),
              exprEval.context.getSafe(KeysInitQuery.functionArgumentsCache),
            );
            if (!operation) {
              throw new InvalidArgumentTypes(args, SparqlOperator.CONCAT);
            }
            return <Literal<string>> operation(exprEval)([ await pTerm ]);
          });
        const lits = await Promise.all(pLits);
        const strings = lits.map(lit => lit.typedValue);
        const joined = strings.join('');
        const lang = ExpressionFunctionConcat.langAllEqual(lits) ? lits[0].language : undefined;
        return lang ? langString(joined, lang) : string(joined);
      },
    });
  }

  /**
   * This OverloadTree with the constant function will handle both type promotion and subtype-substitution
   */
  private static readonly concatTree: OverloadTree = declare(SparqlOperator.CONCAT).onStringly1(() => expr => expr)
    .collect();

  private static langAllEqual(lits: Literal<string>[]): boolean {
    return lits.length > 0 && lits.every(lit => lit.language === lits[0].language);
  }
}
