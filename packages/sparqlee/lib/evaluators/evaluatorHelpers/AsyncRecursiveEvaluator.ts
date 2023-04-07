import type * as RDF from '@rdfjs/types';
import type { Algebra as Alg } from 'sparqlalgebrajs';
import * as E from '../../expressions';
import type { AsyncExtension } from '../../expressions';
import type { EvalContextAsync } from '../../functions';
import type { ITermTransformer } from '../../transformers/TermTransformer';
import { TermTransformer } from '../../transformers/TermTransformer';
import type { IExpressionEvaluator } from '../../Types';
import * as Err from '../../util/Errors';
import type { ISuperTypeProvider } from '../../util/TypeHandling';
import type { AsyncExtensionFunctionCreator } from '../AsyncEvaluator';
import { BaseExpressionEvaluator } from './BaseExpressionEvaluator';
import type { ICompleteSharedContext } from './BaseExpressionEvaluator';

export interface ICompleteAsyncEvaluatorContext extends ICompleteSharedContext {
  exists?: (expression: Alg.ExistenceExpression, mapping: RDF.Bindings) => Promise<boolean>;
  aggregate?: (expression: Alg.AggregateExpression) => Promise<RDF.Term>;
  bnode?: (input?: string) => Promise<RDF.BlankNode>;
  extensionFunctionCreator?: AsyncExtensionFunctionCreator;
}

export class AsyncRecursiveEvaluator extends BaseExpressionEvaluator
  implements IExpressionEvaluator<E.Expression, Promise<E.Term>> {
  protected openWorldType: ISuperTypeProvider;
  private readonly subEvaluators: Record<string, (expr: E.Expression, mapping: RDF.Bindings) =>
  Promise<E.Term> | E.Term> = {
    // Shared
    [E.ExpressionType.Term]: this.term.bind(this),
    [E.ExpressionType.Variable]: this.variable.bind(this),

    // Async
    [E.ExpressionType.Operator]: this.evalOperator.bind(this),
    [E.ExpressionType.SpecialOperator]: this.evalSpecialOperator.bind(this),
    [E.ExpressionType.Named]: this.evalNamed.bind(this),
    [E.ExpressionType.Existence]: this.evalExistence.bind(this),
    [E.ExpressionType.Aggregate]: this.evalAggregate.bind(this),
    [E.ExpressionType.AsyncExtension]: this.evalAsyncExtension.bind(this),
  };

  public constructor(private readonly context: ICompleteAsyncEvaluatorContext, termTransformer?: ITermTransformer) {
    super(termTransformer || new TermTransformer(context.superTypeProvider));
  }

  public async evaluate(expr: E.Expression, mapping: RDF.Bindings): Promise<E.Term> {
    const evaluator = this.subEvaluators[expr.expressionType];
    if (!evaluator) {
      throw new Err.InvalidExpressionType(expr);
    }
    return evaluator.bind(this)(expr, mapping);
  }

  private async evalOperator(expr: E.Operator, mapping: RDF.Bindings): Promise<E.Term> {
    const argPromises = expr.args.map(arg => this.evaluate(arg, mapping));
    const argResults = await Promise.all(argPromises);
    return expr.apply(argResults);
  }

  private async evalSpecialOperator(expr: E.SpecialOperator, mapping: RDF.Bindings): Promise<E.Term> {
    const evaluate = this.evaluate.bind(this);
    const context: EvalContextAsync = {
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
    return expr.applyAsync(context);
  }

  private async _evalAsyncArgs(args: E.Expression[], mapping: RDF.Bindings): Promise<E.TermExpression[]> {
    const argPromises = args.map(arg => this.evaluate(arg, mapping));
    return await Promise.all(argPromises);
  }

  private async evalNamed(expr: E.Named, mapping: RDF.Bindings): Promise<E.Term> {
    return expr.apply(await this._evalAsyncArgs(expr.args, mapping));
  }

  private async evalAsyncExtension(expr: AsyncExtension, mapping: RDF.Bindings): Promise<E.Term> {
    return await expr.apply(await this._evalAsyncArgs(expr.args, mapping));
  }

  private async evalExistence(expr: E.Existence, mapping: RDF.Bindings): Promise<E.Term> {
    if (!this.context.exists) {
      throw new Err.NoExistenceHook();
    }

    return new E.BooleanLiteral(await this.context.exists(expr.expression, mapping));
  }

  // TODO: Remove?
  private async evalAggregate(expr: E.Aggregate, _mapping: RDF.Bindings): Promise<E.Term> {
    if (!this.context.aggregate) {
      throw new Err.NoAggregator();
    }

    return this.termTransformer.transformRDFTermUnsafe(await this.context.aggregate(expr.expression));
  }
}
