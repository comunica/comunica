import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type * as E from './expressions';

export interface IInternalEvaluator {
  internalEvaluation: (expr: E.Expression, mapping: RDF.Bindings) => Promise<E.Term>;

  context: IActionContext;
}

/**
 * An evaluator for RDF expressions.
 */
export interface IExpressionEvaluator extends IInternalEvaluator {
  /**
   * Evaluates the provided bindings in terms of the context the evaluator was created.
   * @param mapping the RDF bindings to evaluate against.
   */
  evaluate: (mapping: RDF.Bindings) => Promise<RDF.Term>;

  /**
   * Evaluates the provided bindings in terms of the context the evaluator was created,
   * returning the effective boolean value.
   * @param mapping the RDF bindings to evaluate against.
   */
  evaluateAsEBV: (mapping: RDF.Bindings) => Promise<boolean>;

  evaluateAsInternal: (mapping: RDF.Bindings) => Promise<E.Expression>;
}

export interface IEvalContext {
  args: E.Expression[];
  mapping: RDF.Bindings;
  exprEval: IInternalEvaluator;
}

export type FunctionApplication = (evalContext: IEvalContext) => Promise<E.TermExpression>;

