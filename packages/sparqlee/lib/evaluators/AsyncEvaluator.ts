import type * as RDF from '@rdfjs/types';
import * as LRUCache from 'lru-cache';
import type { Algebra as Alg } from 'sparqlalgebrajs';
import type * as E from '../expressions/Expressions';
import { AlgebraTransformer } from '../transformers/AlgebraTransformer';
import type { Bindings, IExpressionEvaluator } from '../Types';
import type { ICompleteAsyncEvaluatorContext } from './evaluatorHelpers/AsyncRecursiveEvaluator';
import { AsyncRecursiveEvaluator } from './evaluatorHelpers/AsyncRecursiveEvaluator';
import type { ISharedContext } from './evaluatorHelpers/BaseExpressionEvaluator';

export type AsyncExtensionFunction = (args: RDF.Term[]) => Promise<RDF.Term>;
export type AsyncExtensionFunctionCreator = (functionNamedNode: RDF.NamedNode) => AsyncExtensionFunction | undefined;

export interface IAsyncEvaluatorContext extends ISharedContext {
  exists?: (expression: Alg.ExistenceExpression, mapping: Bindings) => Promise<boolean>;
  aggregate?: (expression: Alg.AggregateExpression) => Promise<RDF.Term>;
  bnode?: (input?: string) => Promise<RDF.BlankNode>;
  extensionFunctionCreator?: AsyncExtensionFunctionCreator;
}

export class AsyncEvaluator {
  private readonly expr: E.Expression;
  private readonly evaluator: IExpressionEvaluator<E.Expression, Promise<E.TermExpression>>;

  public static completeContext(context: IAsyncEvaluatorContext): ICompleteAsyncEvaluatorContext {
    return {
      now: context.now || new Date(Date.now()),
      baseIRI: context.baseIRI || undefined,
      overloadCache: context.overloadCache || new LRUCache(),
      superTypeProvider: {
        cache: context.typeCache || new LRUCache(),
        discoverer: context.getSuperType || (() => 'term'),
      },
      extensionFunctionCreator: context.extensionFunctionCreator,
      exists: context.exists,
      aggregate: context.aggregate,
      bnode: context.bnode,
      enableExtendedXsdTypes: context.enableExtendedXsdTypes || false,
    };
  }

  public constructor(public algExpr: Alg.Expression, context: IAsyncEvaluatorContext = {}) {
    // eslint-disable-next-line unicorn/no-useless-undefined
    const creator = context.extensionFunctionCreator || (() => undefined);
    const baseContext = AsyncEvaluator.completeContext(context);

    const transformer = new AlgebraTransformer({
      type: 'async',
      creator,
      ...baseContext,
    });
    this.expr = transformer.transformAlgebra(algExpr);

    this.evaluator = new AsyncRecursiveEvaluator(baseContext, transformer);
  }

  public async evaluate(mapping: Bindings): Promise<RDF.Term> {
    const result = await this.evaluator.evaluate(this.expr, mapping);
    return result.toRDF();
  }

  public async evaluateAsEBV(mapping: Bindings): Promise<boolean> {
    const result = await this.evaluator.evaluate(this.expr, mapping);
    return result.coerceEBV();
  }

  public async evaluateAsInternal(mapping: Bindings): Promise<E.TermExpression> {
    const result = await this.evaluator.evaluate(this.expr, mapping);
    return result;
  }
}
