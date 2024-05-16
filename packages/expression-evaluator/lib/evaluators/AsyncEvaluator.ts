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

export class AsyncEvaluator {
  private readonly expr: E.Expression;
  private readonly evaluator: IExpressionEvaluator<E.Expression, Promise<E.TermExpression>>;

  public static completeContext(context: IAsyncEvaluatorContext): ICompleteAsyncEvaluatorContext {
    const now = context.now ?? new Date(Date.now());
    return {
      now,
      baseIRI: context.baseIRI ?? undefined,
      functionArgumentsCache: context.functionArgumentsCache ?? {},
      superTypeProvider: {
        cache: context.typeCache ?? new LRUCache({ max: 1_000 }),
        discoverer: context.getSuperType ?? (() => 'term'),
      },
      extensionFunctionCreator: context.extensionFunctionCreator,
      exists: context.exists,
      aggregate: context.aggregate,
      bnode: context.bnode,
      defaultTimeZone: context.defaultTimeZone ?? extractTimeZone(now),
    };
  }

  public constructor(public algExpr: Alg.Expression, context: IAsyncEvaluatorContext = {}) {
    // eslint-disable-next-line unicorn/no-useless-undefined
    const creator = context.extensionFunctionCreator ?? (() => undefined);
    const baseContext = AsyncEvaluator.completeContext(context);

    const transformer = new AlgebraTransformer({
      type: 'async',
      creator,
      ...baseContext,
    });
    this.expr = transformer.transformAlgebra(algExpr);

    this.evaluator = new AsyncRecursiveEvaluator(baseContext, transformer);
  }

  public async evaluate(mapping: RDF.Bindings): Promise<RDF.Term> {
    const result = await this.evaluator.evaluate(this.expr, mapping);
    return result.toRDF();
  }

  public async evaluateAsEBV(mapping: RDF.Bindings): Promise<boolean> {
    const result = await this.evaluator.evaluate(this.expr, mapping);
    return result.coerceEBV();
  }

  public async evaluateAsInternal(mapping: RDF.Bindings): Promise<E.TermExpression> {
    return await this.evaluator.evaluate(this.expr, mapping);
  }
}
