import type { IAggregator, MediatorExpressionEvaluatorAggregate } from '@comunica/bus-expression-evaluator-aggregate';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { LRUCache } from 'lru-cache';
import type { Algebra as Alg } from 'sparqlalgebrajs';
import type * as E from '../expressions/Expressions';
import { AlgebraTransformer } from '../transformers/AlgebraTransformer';
import type { IExpressionEvaluator } from '../Types';
import { extractTimeZone } from '../util/DateTimeHelpers';
import type { ICompleteAsyncEvaluatorContext } from './evaluatorHelpers/AsyncRecursiveEvaluator';
import { AsyncRecursiveEvaluator } from './evaluatorHelpers/AsyncRecursiveEvaluator';
import type { ISharedContext } from './evaluatorHelpers/BaseExpressionEvaluator';

export type AsyncExtensionFunction = (args: RDF.Term[]) => Promise<RDF.Term>;
export type AsyncExtensionFunctionCreator = (functionNamedNode: RDF.NamedNode) => AsyncExtensionFunction | undefined;

export interface IAsyncEvaluatorContext extends ISharedContext {
  exists?: (expression: Alg.ExistenceExpression, mapping: RDF.Bindings) => Promise<boolean>;
  aggregate?: (expression: Alg.AggregateExpression) => Promise<RDF.Term>;
  bnode?: (input?: string) => Promise<RDF.BlankNode>;
  extensionFunctionCreator?: AsyncExtensionFunctionCreator;
}

export interface IAsyncEvaluatorOptions {
  mediatorExpressionEvaluatorAggregate: MediatorExpressionEvaluatorAggregate;
}

export class AsyncEvaluator {
  private readonly transformer: AlgebraTransformer;
  private readonly evaluator: IExpressionEvaluator<E.Expression, Promise<E.TermExpression>>;
  public readonly context: ICompleteAsyncEvaluatorContext;

  private readonly mediatorExpressionEvaluatorAggregate: MediatorExpressionEvaluatorAggregate;

  public static completeContext(context: IAsyncEvaluatorContext): ICompleteAsyncEvaluatorContext {
    const now = context.now || new Date(Date.now());
    return {
      now,
      baseIRI: context.baseIRI || undefined,
      functionArgumentsCache: context.functionArgumentsCache || {},
      superTypeProvider: {
        cache: context.typeCache || new LRUCache({ max: 1_000 }),
        discoverer: context.getSuperType || (() => 'term'),
      },
      extensionFunctionCreator: context.extensionFunctionCreator,
      exists: context.exists,
      aggregate: context.aggregate,
      bnode: context.bnode,
      defaultTimeZone: context.defaultTimeZone || extractTimeZone(now),
    };
  }

  public constructor(args: IAsyncEvaluatorOptions) {
    const { mediatorExpressionEvaluatorAggregate } = args;
    const context: any = {};
    this.mediatorExpressionEvaluatorAggregate = mediatorExpressionEvaluatorAggregate;
    // eslint-disable-next-line unicorn/no-useless-undefined
    const creator = context.extensionFunctionCreator || (() => undefined);
    this.context = AsyncEvaluator.completeContext(context);

    this.transformer = new AlgebraTransformer({
      type: 'async',
      creator,
      ...this.context,
    });

    this.evaluator = new AsyncRecursiveEvaluator(this.context, this.transformer);
  }

  public async getAggregateEvaluator(algExpr: Alg.AggregateExpression, context: IActionContext): Promise<IAggregator> {
    return (await this.mediatorExpressionEvaluatorAggregate.mediate({
      expr: algExpr,
      evaluator: this,
      context,
    })).aggregator;
  }

  public internalize(expression: Alg.Expression): E.Expression {
    return this.transformer.transformAlgebra(expression);
  }

  public async evaluate(expr: E.Expression, mapping: RDF.Bindings): Promise<RDF.Term> {
    const result = await this.evaluator.evaluate(expr, mapping);
    return result.toRDF();
  }

  public async evaluateAsEBV(expr: E.Expression, mapping: RDF.Bindings): Promise<boolean> {
    const result = await this.evaluator.evaluate(expr, mapping);
    return result.coerceEBV();
  }

  public async evaluateAsInternal(expr: E.Expression, mapping: RDF.Bindings): Promise<E.TermExpression> {
    return await this.evaluator.evaluate(expr, mapping);
  }
}
