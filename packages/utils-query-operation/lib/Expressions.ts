import type * as RDF from '@rdfjs/types';
import { uniqTerms } from 'rdf-terms';
import { Algebra, Util } from 'sparqlalgebrajs';

/**
 * Get all variables inside the given expression.
 * @param expression An expression.
 * @return An array of variables, which can be empty.
 */
export function getExpressionVariables(expression: Algebra.Expression): RDF.Variable[] {
  switch (expression.expressionType) {
    case Algebra.expressionTypes.AGGREGATE:
    case Algebra.expressionTypes.WILDCARD:
      throw new Error(`Getting expression variables is not supported for ${expression.expressionType}`);
    case Algebra.expressionTypes.EXISTENCE:
      return Util.inScopeVariables(expression.input);
    case Algebra.expressionTypes.NAMED:
      return [];
    case Algebra.expressionTypes.OPERATOR:
      return uniqTerms(expression.args.flatMap(arg => getExpressionVariables(arg)));
    case Algebra.expressionTypes.TERM:
      if (expression.term.termType === 'Variable') {
        return [ expression.term ];
      }
      return [];
  }
}
