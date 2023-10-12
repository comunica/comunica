import type { IActionContext, IExpressionEvaluator } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { LRUCache } from 'lru-cache';
import type { Algebra as Alg } from 'sparqlalgebrajs';
import type * as E from '../expressions';
import { regularFunctions } from '../functions';
import type { FunctionArgumentsCache } from '../functions/OverloadTree';
import { AlgebraTransformer } from '../transformers/AlgebraTransformer';
import { TermTransformer } from '../transformers/TermTransformer';
import * as C from '../util/Consts';
import type { ITimeZoneRepresentation } from '../util/DateTimeHelpers';
import { extractTimeZone } from '../util/DateTimeHelpers';
import * as Err from '../util/Errors';
import type { SuperTypeCallback, TypeCache } from '../util/TypeHandling';
import type { ICompleteEEContext } from './evaluatorHelpers/AsyncRecursiveEvaluator';
import { AsyncRecursiveEvaluator } from './evaluatorHelpers/AsyncRecursiveEvaluator';

export type AsyncExtensionFunction = (args: RDF.Term[]) => Promise<RDF.Term>;
export type AsyncExtensionFunctionCreator = (functionNamedNode: RDF.NamedNode) => AsyncExtensionFunction | undefined;

// TODO: make this fields of the EE
export interface IAsyncEvaluatorContext {
  exists: (expression: Alg.ExistenceExpression, mapping: RDF.Bindings) => Promise<boolean>;
  aggregate?: (expression: Alg.AggregateExpression) => Promise<RDF.Term>;
  bnode: (input?: string) => Promise<RDF.BlankNode>;
  extensionFunctionCreator?: AsyncExtensionFunctionCreator;
  now?: Date;
  baseIRI?: string;
  typeCache?: TypeCache;
  getSuperType?: SuperTypeCallback;
  functionArgumentsCache?: FunctionArgumentsCache;
  defaultTimeZone?: ITimeZoneRepresentation;
  actionContext: IActionContext;
}

export class ExpressionEvaluator implements IExpressionEvaluator {
  private readonly transformer: AlgebraTransformer;
  public readonly evaluator: AsyncRecursiveEvaluator;
  public readonly context: ICompleteEEContext;
  public readonly expr: E.Expression;

  public static completeContext(context: IAsyncEvaluatorContext): ICompleteEEContext {
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
      actionContext: context.actionContext,
    };
  }

  public constructor(public algExpr: Alg.Expression, context: IAsyncEvaluatorContext) {
    // eslint-disable-next-line unicorn/no-useless-undefined
    const creator = context.extensionFunctionCreator || (() => undefined);
    this.context = ExpressionEvaluator.completeContext(context);

    this.transformer = new AlgebraTransformer({
      creator,
      ...this.context,
    }, this);

    this.evaluator = new AsyncRecursiveEvaluator(this.context, this, this.transformer);
    this.expr = this.transformer.transformAlgebra(algExpr);
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

  // ==================================================================================================================
  // ==================================================================================================================
  // ==================================================================================================================
  // Determine the relative numerical order of the two given terms.
  // In accordance with https://www.w3.org/TR/sparql11-query/#modOrderBy
  public orderTypes(termA: RDF.Term | undefined, termB: RDF.Term | undefined, strict = false): -1 | 0 | 1 {
    // Check if terms are the same by reference
    if (termA === termB) {
      return 0;
    }

    // We handle undefined that is lower than everything else.
    if (termA === undefined) {
      return -1;
    }
    if (termB === undefined) {
      return 1;
    }

    //
    if (termA.termType !== termB.termType) {
      return this._TERM_ORDERING_PRIORITY[termA.termType] < this._TERM_ORDERING_PRIORITY[termB.termType] ? -1 : 1;
    }

    // Check exact term equality
    if (termA.equals(termB)) {
      return 0;
    }

    // Handle quoted triples
    if (termA.termType === 'Quad' && termB.termType === 'Quad') {
      const orderSubject = this.orderTypes(
        termA.subject, termB.subject, strict,
      );
      if (orderSubject !== 0) {
        return orderSubject;
      }
      const orderPredicate = this.orderTypes(
        termA.predicate, termB.predicate, strict,
      );
      if (orderPredicate !== 0) {
        return orderPredicate;
      }
      const orderObject = this.orderTypes(
        termA.object, termB.object, strict,
      );
      if (orderObject !== 0) {
        return orderObject;
      }
      return this.orderTypes(
        termA.graph, termB.graph, strict,
      );
    }

    // Handle literals
    if (termA.termType === 'Literal') {
      return this.orderLiteralTypes(termA, <RDF.Literal>termB, this.context);
    }

    // Handle all other types
    if (strict) {
      throw new Err.InvalidCompareArgumentTypes(termA, termB);
    }
    return this.comparePrimitives(termA.value, termB.value);
  }

  private orderLiteralTypes(litA: RDF.Literal, litB: RDF.Literal, context: ICompleteEEContext): -1 | 0 | 1 {
    const isGreater = regularFunctions[C.RegularOperator.GT];
    const isEqual = regularFunctions[C.RegularOperator.EQUAL];

    const termTransformer = new TermTransformer(context.superTypeProvider);
    const myLitA = termTransformer.transformLiteral(litA);
    const myLitB = termTransformer.transformLiteral(litB);

    try {
      if ((<E.BooleanLiteral> isEqual.apply([ myLitA, myLitB ], this)).typedValue) {
        return 0;
      }
      if ((<E.BooleanLiteral> isGreater.apply([ myLitA, myLitB ], this)).typedValue) {
        return 1;
      }
      return -1;
    } catch {
      // Fallback to string-based comparison
      const compareType = this.comparePrimitives(myLitA.dataType, myLitB.dataType);
      if (compareType !== 0) {
        return compareType;
      }
      return this.comparePrimitives(myLitA.str(), myLitB.str());
    }
  }

  private comparePrimitives(valueA: any, valueB: any): -1 | 0 | 1 {
    // eslint-disable-next-line @typescript-eslint/no-extra-parens
    return valueA === valueB ? 0 : (valueA < valueB ? -1 : 1);
  }

  // SPARQL specifies that blankNode < namedNode < literal. Sparql star expands with < quads and we say < defaultGraph
  private readonly _TERM_ORDERING_PRIORITY = {
    Variable: 0,
    BlankNode: 1,
    NamedNode: 2,
    Literal: 3,
    Quad: 4,
    DefaultGraph: 5,
  };
}
