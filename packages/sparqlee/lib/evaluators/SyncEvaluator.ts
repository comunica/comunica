import type * as RDF from '@rdfjs/types';
import type { Algebra as Alg } from 'sparqlalgebrajs';

import type * as E from '../expressions/Expressions';

import { transformAlgebra } from '../Transformation';
import type { Bindings, IExpressionEvaluator } from '../Types';

import { SyncRecursiveEvaluator } from './RecursiveExpressionEvaluator';

type Expression = E.Expression;
type Term = E.TermExpression;

export interface ISyncEvaluatorConfig {
  now?: Date;
  baseIRI?: string;

  exists?: (expression: Alg.ExistenceExpression, mapping: Bindings) => boolean;
  aggregate?: (expression: Alg.AggregateExpression) => RDF.Term;
  bnode?: (input?: string) => RDF.BlankNode;
  extensionFunctionCreator?: SyncExtensionFunctionCreator;
}

export type SyncExtensionFunction = (args: RDF.Term[]) => RDF.Term;
export type SyncExtensionFunctionCreator = (functionNamedNode: RDF.NamedNode) => SyncExtensionFunction | undefined;

export type SyncEvaluatorContext = ISyncEvaluatorConfig & {
  now: Date;
};

export class SyncEvaluator {
  private readonly expr: Expression;
  private readonly evaluator: IExpressionEvaluator<Expression, Term>;

  public constructor(public algExpr: Alg.Expression, public config: ISyncEvaluatorConfig = {}) {
    const context: SyncEvaluatorContext = {
      now: config.now || new Date(Date.now()),
      bnode: config.bnode || undefined,
      baseIRI: config.baseIRI || undefined,
      exists: config.exists,
      aggregate: config.aggregate,
    };

    const extensionFunctionCreator: SyncExtensionFunctionCreator =
      // eslint-disable-next-line unicorn/no-useless-undefined
      config.extensionFunctionCreator || (() => undefined);
    this.expr = transformAlgebra(algExpr, { type: 'sync', creator: extensionFunctionCreator });
    this.evaluator = new SyncRecursiveEvaluator(context);
  }

  public evaluate(mapping: Bindings): RDF.Term {
    const result = this.evaluator.evaluate(this.expr, mapping);
    return result.toRDF();
  }

  public evaluateAsEBV(mapping: Bindings): boolean {
    const result = this.evaluator.evaluate(this.expr, mapping);
    return result.coerceEBV();
  }

  public evaluateAsInternal(mapping: Bindings): Term {
    const result = this.evaluator.evaluate(this.expr, mapping);
    return result;
  }
}
