import { TermFunctionBase } from '@comunica/bus-function-factory';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import type {
  StringLiteral,

  NamedNode,
} from '@comunica/expression-evaluator';
import {
  declare,
  SparqlOperator,
  TermTransformer,
  TypeURL,
} from '@comunica/expression-evaluator';
import type { ComunicaDataFactory } from '@comunica/types';

/**
 * https://www.w3.org/TR/sparql11-query/#func-strdt
 */
export class TermFunctionStrDt extends TermFunctionBase {
  public constructor() {
    super({
      arity: 2,
      operator: SparqlOperator.STRDT,
      overloads: declare(SparqlOperator.STRDT).set(
        [ TypeURL.XSD_STRING, 'namedNode' ],
        exprEval => ([ str, iri ]: [StringLiteral, NamedNode]) => {
          const dataFactory: ComunicaDataFactory = exprEval.context.getSafe(KeysInitQuery.dataFactory);
          const lit = dataFactory.literal(str.typedValue, dataFactory.namedNode(iri.value));
          return new TermTransformer(exprEval.context.getSafe(KeysExpressionEvaluator.superTypeProvider))
            .transformLiteral(lit);
        },
      ).collect(),
    });
  }
}
