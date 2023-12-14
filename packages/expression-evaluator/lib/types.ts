import type { IInternalEvaluator } from '@comunica/bus-expression-evaluator-factory';
import type * as RDF from '@rdfjs/types';
import type * as E from './expressions';

export interface IEvalContext {
  args: E.Expression[];
  mapping: RDF.Bindings;
  exprEval: IInternalEvaluator;
}

export type FunctionApplication = (evalContext: IEvalContext) => Promise<E.TermExpression>;

