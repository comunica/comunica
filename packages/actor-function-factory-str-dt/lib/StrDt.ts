import { RegularFunction } from '@comunica/bus-function-factory';
import { KeysExpressionEvaluator } from '@comunica/context-entries';
import type {
  StringLiteral,

  NamedNode,
} from '@comunica/expression-evaluator';
import {
  RegularOperator,
  TypeURL,
  declare,
  TermTransformer,
} from '@comunica/expression-evaluator';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';

const DF = new DataFactory<RDF.BaseQuad>();

/**
 * https://www.w3.org/TR/sparql11-query/#func-strdt
 */
export class StrDt extends RegularFunction {
  protected arity = 2;
  public operator = RegularOperator.STRDT;

  protected overloads = declare(RegularOperator.STRDT).set(
    [ TypeURL.XSD_STRING, 'namedNode' ],
    exprEval => ([ str, iri ]: [StringLiteral, NamedNode]) => {
      const lit = DF.literal(str.typedValue, DF.namedNode(iri.value));
      return new TermTransformer(exprEval.context.getSafe(KeysExpressionEvaluator.superTypeProvider))
        .transformLiteral(lit);
    },
  ).collect();
}
