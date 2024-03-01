import type * as RDF from '@rdfjs/types';
import type { Algebra as Alg } from 'sparqlalgebrajs';
import * as E from '../../expressions';
import type { SyncExtension } from '../../expressions';
import type { EvalContextSync } from '../../functions';
import type { ITermTransformer } from '../../transformers/TermTransformer';
import { TermTransformer } from '../../transformers/TermTransformer';
import type { IExpressionEvaluator } from '../../Types';
import * as Err from '../../util/Errors';
import type { ISuperTypeProvider } from '../../util/TypeHandling';
import type { SyncExtensionFunctionCreator } from '../SyncEvaluator';
import type { ICompleteSharedContext } from './BaseExpressionEvaluator';
import { BaseExpressionEvaluator } from './BaseExpressionEvaluator';

export interface ICompleteSyncEvaluatorContext extends ICompleteSharedContext {
  exists?: (expression: Alg.ExistenceExpression, mapping: RDF.Bindings) => boolean;
  aggregate?: (expression: Alg.AggregateExpression) => RDF.Term;
  bnode?: (input?: string) => RDF.BlankNode;
  extensionFunctionCreator?: SyncExtensionFunctionCreator;
}

export class SyncRecursiveEvaluator extends BaseExpressionEvaluator
  implements IExpressionEvaluator<E.Expression, E.Term> {
  protected openWorldType: ISuperTypeProvider;
  private readonly subEvaluators: Record<string, (expr: E.Expression, mapping: RDF.Bindings) => E.Term> = {
    // Shared
    [E.ExpressionType.Term]: (expr, _mapping) => this.term(<E.Term> expr),
    [E.ExpressionType.Variable]: (expr, mapping) => this.variable(<E.Variable> expr, mapping),

    // Sync
    [E.ExpressionType.Operator]: (expr, mapping) => this.evalOperator(<E.Operator> expr, mapping),
    [E.ExpressionType.SpecialOperator]: (expr, mapping) => this.evalSpecialOperator(<E.SpecialOperator> expr, mapping),
    [E.ExpressionType.Named]: (expr, mapping) => this.evalNamed(<E.Named> expr, mapping),
    [E.ExpressionType.Existence]: (expr, mapping) => this.evalExistence(<E.Existence> expr, mapping),
    [E.ExpressionType.Aggregate]: (expr, _mapping) => this.evalAggregate(<E.Aggregate> expr),
    [E.ExpressionType.SyncExtension]: (expr, mapping) => this.evalSyncExtension(<E.SyncExtension> expr, mapping),
  };

  public constructor(private readonly context: ICompleteSyncEvaluatorContext, termTransformer?: ITermTransformer) {
    super(termTransformer ?? new TermTransformer(context.superTypeProvider));
  }

  public evaluate(expr: E.Expression, mapping: RDF.Bindings): E.Term {
    const evaluator = this.subEvaluators[expr.expressionType];
    if (!evaluator) {
      throw new Err.InvalidExpressionType(expr);
    }
    return evaluator.bind(this)(expr, mapping);
  }

  private evalOperator(expr: E.Operator, mapping: RDF.Bindings): E.Term {
    const args = expr.args.map(arg => this.evaluate(arg, mapping));
    return expr.apply(args);
  }

  private evalSpecialOperator(expr: E.SpecialOperator, mapping: RDF.Bindings): E.Term {
    const evaluate = this.evaluate.bind(this);
    const context: EvalContextSync = {
      args: expr.args,
      mapping,

      superTypeProvider: this.context.superTypeProvider,
      now: this.context.now,
      baseIRI: this.context.baseIRI,
      functionArgumentsCache: this.context.functionArgumentsCache,

      evaluate,
      bnode: this.context.bnode,
      defaultTimeZone: this.context.defaultTimeZone,
    };
    return expr.applySynchronously(context);
  }

  private evalNamed(expr: E.Named, mapping: RDF.Bindings): E.Term {
    const args = expr.args.map(arg => this.evaluate(arg, mapping));
    return expr.apply(args);
  }

  private evalSyncExtension(expr: SyncExtension, mapping: RDF.Bindings): E.Term {
    const args = expr.args.map(arg => this.evaluate(arg, mapping));
    return expr.apply(args);
  }

  private evalExistence(expr: E.Existence, mapping: RDF.Bindings): E.Term {
    if (!this.context.exists) {
      throw new Err.NoExistenceHook();
    }

    return new E.BooleanLiteral(this.context.exists(expr.expression, mapping));
  }

  private evalAggregate(expr: E.Aggregate): E.Term {
    if (!this.context.aggregate) {
      throw new Err.NoAggregator();
    }

    return this.termTransformer.transformRDFTermUnsafe(this.context.aggregate(expr.expression));
  }
}
