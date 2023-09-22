import type * as RDF from '@rdfjs/types';
import type { Algebra as Alg } from 'sparqlalgebrajs';
import type { IActionContext } from './IActionContext';

export interface IBindingAggregator {
  putBindings: (bindings: RDF.Bindings) => Promise<void>;
  result: () => Promise<RDF.Term | undefined>;
}

export interface IExpressionEvaluatorFactory {
  createEvaluator: (algExpr: Alg.Expression, context: IActionContext) => IExpressionEvaluator;
  createAggregator: (algExpr: Alg.AggregateExpression, context: IActionContext) => Promise<IBindingAggregator>;
}

export interface IExpressionEvaluator {
  evaluate: (mapping: RDF.Bindings) => Promise<RDF.Term>;
  evaluateAsEBV: (mapping: RDF.Bindings) => Promise<boolean>;
  orderTypes: (termA: RDF.Term | undefined, termB: RDF.Term | undefined, strict: boolean | undefined) => -1 | 0 | 1;
  factory: IExpressionEvaluatorFactory;
}
