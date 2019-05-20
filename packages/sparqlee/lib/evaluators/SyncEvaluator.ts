import * as RDF from 'rdf-js';
import { Algebra as Alg } from 'sparqlalgebrajs';

import * as E from '../expressions/Expressions';

import { transformAlgebra } from '../Transformation';
import { Bindings, ExpressionEvaluator } from '../Types';

import { SyncRecursiveEvaluator } from './RecursiveExpressionEvaluator';

type Expression = E.Expression;
type Term = E.TermExpression;

export interface SyncEvaluatorConfig {
  now?: Date;
  baseIRI?: string;

  exists?: (expression: Alg.ExistenceExpression, mapping: Bindings) => boolean;
  aggregate?: (expression: Alg.AggregateExpression) => RDF.Term;
  bnode?: (input?: string) => RDF.BlankNode;
}

export type SyncEvaluatorContext = SyncEvaluatorConfig & {
  now: Date;
};

export class SyncEvaluator {
  private expr: Expression;
  private evaluator: ExpressionEvaluator<Expression, Term>;

  constructor(public algExpr: Alg.Expression, public config: SyncEvaluatorConfig = {}) {
    this.expr = transformAlgebra(algExpr);

    const context: SyncEvaluatorContext = {
      now: config.now || new Date(Date.now()),
      baseIRI: config.baseIRI || undefined,
      exists: config.exists,
      aggregate: config.aggregate,
    };

    this.evaluator = new SyncRecursiveEvaluator(context);
  }

  evaluate(mapping: Bindings): RDF.Term {
    const result = this.evaluator.evaluate(this.expr, mapping);
    return log(result).toRDF();
  }

  evaluateAsEBV(mapping: Bindings): boolean {
    const result = this.evaluator.evaluate(this.expr, mapping);
    return log(result).coerceEBV();
  }

  evaluateAsInternal(mapping: Bindings): Term {
    const result = this.evaluator.evaluate(this.expr, mapping);
    return log(result);
  }
}

function log<T>(val: T): T {
  // console.log(val);
  return val;
}
