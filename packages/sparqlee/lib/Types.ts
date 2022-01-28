import type * as RDF from '@rdfjs/types';

export interface IExpressionEvaluator<ExpressionType, TermType> {
  evaluate: (expr: ExpressionType, mapping: RDF.Bindings) => TermType;
}

// Export type Hooks = {
//   existence?: ExistenceHook;
//   aggregate?: AggregateHook;
//   namedFunc?: NamedFuncHook;
// };

// // TODO: Document
// export type NamedFuncHook = (expression: Alg.NamedExpression) => Promise<RDF.Term>;
// export type AggregateHook = (expression: Alg.AggregateExpression) => Promise<RDF.Term>;
// export type ExistenceHook = (expression: Alg.ExistenceExpression, mapping: Bindings) => Promise<boolean>;
