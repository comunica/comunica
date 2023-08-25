import type * as RDF from '@rdfjs/types';

export interface IExpressionEvaluator<ExpressionType, TermType> {
  evaluate: (expr: ExpressionType, mapping: RDF.Bindings) => TermType;
}
