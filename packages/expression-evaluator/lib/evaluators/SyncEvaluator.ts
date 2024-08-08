import type { ComunicaDataFactory } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { LRUCache } from 'lru-cache';
import type { Algebra as Alg } from 'sparqlalgebrajs';
import type * as E from '../expressions/Expressions.js';
import { AlgebraTransformer } from '../transformers/AlgebraTransformer.js';
import type { IExpressionEvaluator } from '../Types.js';
import { extractTimeZone } from '../util/DateTimeHelpers.js';
import type { ISharedContext } from './evaluatorHelpers/BaseExpressionEvaluator.js';
import type { ICompleteSyncEvaluatorContext } from './evaluatorHelpers/SyncRecursiveEvaluator.js';
import { SyncRecursiveEvaluator } from './evaluatorHelpers/SyncRecursiveEvaluator.js';

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
      dataFactory: context.dataFactory,
    };
  }

  public constructor(
    public dataFactory: ComunicaDataFactory,
    public algExpr: Alg.Expression,
    public context: ISyncEvaluatorContext = { dataFactory },
  ) {
    // eslint-disable-next-line unicorn/no-useless-undefined
    const creator = context.extensionFunctionCreator ?? (() => undefined);
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
    return result.toRDF(this.dataFactory);
  }

  public evaluateAsEBV(mapping: RDF.Bindings): boolean {
    const result = this.evaluator.evaluate(this.expr, mapping);
    return result.coerceEBV();
  }

  public evaluateAsInternal(mapping: RDF.Bindings): E.TermExpression {
    return this.evaluator.evaluate(this.expr, mapping);
  }
}
