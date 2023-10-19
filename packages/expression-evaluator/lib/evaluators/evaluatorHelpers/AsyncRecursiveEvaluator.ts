import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { Algebra as Alg } from 'sparqlalgebrajs';
import type { AsyncExtension } from '../../expressions';
import * as E from '../../expressions';
import type { EvalContextAsync } from '../../functions';
import { expressionToVar } from '../../functions/Helpers';
import type { FunctionArgumentsCache } from '../../functions/OverloadTree';
import type { ITermTransformer } from '../../transformers/TermTransformer';
import { TermTransformer } from '../../transformers/TermTransformer';
import type { ITimeZoneRepresentation } from '../../util/DateTimeHelpers';
import * as Err from '../../util/Errors';
import type { ISuperTypeProvider } from '../../util/TypeHandling';
import type { AsyncExtensionFunctionCreator, ExpressionEvaluator } from '../ExpressionEvaluator';

export interface ICompleteEEContext {
  exists: (expression: Alg.ExistenceExpression, mapping: RDF.Bindings) => Promise<boolean>;
  aggregate?: (expression: Alg.AggregateExpression) => Promise<RDF.Term>;
  bnode: (input?: string) => Promise<RDF.BlankNode>;
  extensionFunctionCreator?: AsyncExtensionFunctionCreator;
  now: Date;
  baseIRI?: string;
  functionArgumentsCache: FunctionArgumentsCache;
  superTypeProvider: ISuperTypeProvider;
  defaultTimeZone: ITimeZoneRepresentation;
  actionContext: IActionContext;
}

export class AsyncRecursiveEvaluator {
  protected openWorldType: ISuperTypeProvider;
  protected readonly termTransformer: ITermTransformer;
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

  public constructor(private readonly context: ICompleteEEContext,
    private readonly expressionEvaluator: ExpressionEvaluator, termTransformer?: ITermTransformer) {
    this.termTransformer = termTransformer || new TermTransformer(context.superTypeProvider);
  }

  private term(expr: E.Term, _: RDF.Bindings): E.Term {
    return expr;
  }

  private variable(expr: E.Variable, mapping: RDF.Bindings): E.Term {
    const term = mapping.get(expressionToVar(expr));
    if (!term) {
      throw new Err.UnboundVariableError(expr.name, mapping);
    }
    return this.termTransformer.transformRDFTermUnsafe(term);
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
    const context: EvalContextAsync = {
      args: expr.args,
      mapping,
      evaluate: this.expressionEvaluator,

      ...this.context,
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
