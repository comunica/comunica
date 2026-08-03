import { Algebra, algebraUtils, isKnownSubType } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';
import { uniqTerms } from 'rdf-terms';

/**
 * Get all variables inside the given expression.
 * @param expression An expression.
 * @return An array of variables, which can be empty.
 */
export function getExpressionVariables(expression: Algebra.Expression): RDF.Variable[] {
  if (isKnownSubType(expression, Algebra.ExpressionTypes.EXISTENCE)) {
    return algebraUtils.inScopeVariables(expression.input);
  }
  if (isKnownSubType(expression, Algebra.ExpressionTypes.NAMED)) {
    return [];
  }
  if (isKnownSubType(expression, Algebra.ExpressionTypes.OPERATOR)) {
    return uniqTerms(expression.args.flatMap(arg => getExpressionVariables(arg)));
  }
  if (isKnownSubType(expression, Algebra.ExpressionTypes.TERM)) {
    if (expression.term.termType === 'Variable') {
      return [ expression.term ];
    }
    return [];
  }
  throw new Error(`Getting expression variables is not supported for ${expression.subType}`);
}
