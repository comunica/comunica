import type * as RDF from '@rdfjs/types';
import * as LRUCache from 'lru-cache';
import type { Algebra as Alg } from 'sparqlalgebrajs';
import type * as E from '../expressions/Expressions';
import { AlgebraTransformer } from '../transformers/AlgebraTransformer';
import type { IExpressionEvaluator } from '../Types';
import type { ISharedContext } from './evaluatorHelpers/BaseExpressionEvaluator';
import type { ICompleteSyncEvaluatorContext } from './evaluatorHelpers/SyncRecursiveEvaluator';
import { SyncRecursiveEvaluator } from './evaluatorHelpers/SyncRecursiveEvaluator';

export interface ISyncEvaluatorContext extends ISharedContext {
  exists?: (expression: Alg.ExistenceExpression, mapping: RDF.Bindings) => boolean;
  aggregate?: (expression: Alg.AggregateExpression) => RDF.Term;
  bnode?: (input?: string) => RDF.BlankNode;
  extensionFunctionCreator?: SyncExtensionFunctionCreator;
}

export type SyncExtensionFunction = (args: RDF.Term[]) => RDF.Term;
export type SyncExtensionFunctionCreator = (functionNamedNode: RDF.NamedNode) => SyncExtensionFunction | undefined;

export class SyncEvaluator {
  private readonly expr: E.Expression;
  private readonly evaluator: IExpressionEvaluator<E.Expression, E.TermExpression>;

  public static completeContext(context: ISyncEvaluatorContext): ICompleteSyncEvaluatorContext {
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

  public constructor(public algExpr: Alg.Expression, public context: ISyncEvaluatorContext = {}) {
    // eslint-disable-next-line unicorn/no-useless-undefined
    const creator = context.extensionFunctionCreator || (() => undefined);
    const baseContext = SyncEvaluator.completeContext(context);

    const transformer = new AlgebraTransformer({
      type: 'sync',
      creator,
      ...baseContext,
    });
    this.expr = transformer.transformAlgebra(algExpr);

    this.evaluator = new SyncRecursiveEvaluator(baseContext, transformer);
  }

  public evaluate(mapping: RDF.Bindings): RDF.Term {
    const result = this.evaluator.evaluate(this.expr, mapping);
    return result.toRDF();
  }

  public evaluateAsEBV(mapping: RDF.Bindings): boolean {
    const result = this.evaluator.evaluate(this.expr, mapping);
    return result.coerceEBV();
  }

  public evaluateAsInternal(mapping: RDF.Bindings): E.TermExpression {
    return this.evaluator.evaluate(this.expr, mapping);
  }
}
