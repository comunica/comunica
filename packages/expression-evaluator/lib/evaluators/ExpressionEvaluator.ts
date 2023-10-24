import type { IActionContext, IExpressionEvaluator } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { LRUCache } from 'lru-cache';
import type { Algebra as Alg } from 'sparqlalgebrajs';
import * as E from '../expressions';
import { regularFunctions } from '../functions';
import { expressionToVar } from '../functions/Helpers';
import type { FunctionArgumentsCache } from '../functions/OverloadTree';
import { AlgebraTransformer } from '../transformers/AlgebraTransformer';
import * as C from '../util/Consts';
import type { ITimeZoneRepresentation } from '../util/DateTimeHelpers';
import { extractTimeZone } from '../util/DateTimeHelpers';
import * as Err from '../util/Errors';
import type { SuperTypeCallback, TypeCache, ISuperTypeProvider } from '../util/TypeHandling';

export type AsyncExtensionFunction = (args: RDF.Term[]) => Promise<RDF.Term>;
export type AsyncExtensionFunctionCreator = (functionNamedNode: RDF.NamedNode) => AsyncExtensionFunction | undefined;

export interface IAsyncEvaluatorContext {
  exists: (expression: Alg.ExistenceExpression, mapping: RDF.Bindings) => Promise<boolean>;
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
  public readonly expr: E.Expression;

  private readonly subEvaluators: Record<string,
  (expr: E.Expression, mapping: RDF.Bindings) => Promise<E.Term> | E.Term> =
      {
        [E.ExpressionType.Term]: this.term.bind(this),
        [E.ExpressionType.Variable]: this.variable.bind(this),
        [E.ExpressionType.Operator]: this.evalFunction.bind(this),
        [E.ExpressionType.SpecialOperator]: this.evalFunction.bind(this),
        [E.ExpressionType.Named]: this.evalFunction.bind(this),
        [E.ExpressionType.Existence]: this.evalExistence.bind(this),
        [E.ExpressionType.Aggregate]: this.evalAggregate.bind(this),
        [E.ExpressionType.AsyncExtension]: this.evalFunction.bind(this),
      };

  // Context items
  public readonly exists: (expression: Alg.ExistenceExpression, mapping: RDF.Bindings) => Promise<boolean>;
  public readonly bnode: (input?: string) => Promise<RDF.BlankNode>;
  public readonly extensionFunctionCreator?: AsyncExtensionFunctionCreator;
  public readonly now: Date;
  public readonly baseIRI?: string;
  public readonly functionArgumentsCache: FunctionArgumentsCache;
  public readonly superTypeProvider: ISuperTypeProvider;
  public readonly defaultTimeZone: ITimeZoneRepresentation;
  public readonly actionContext: IActionContext;

  public constructor(public algExpr: Alg.Expression, context: IAsyncEvaluatorContext) {
    this.now = context.now || new Date(Date.now());
    this.baseIRI = context.baseIRI || undefined;
    this.functionArgumentsCache = context.functionArgumentsCache || {};
    this.superTypeProvider = {
      cache: context.typeCache || new LRUCache({ max: 1_000 }),
      discoverer: context.getSuperType || (() => 'term'),
    };
    // eslint-disable-next-line unicorn/no-useless-undefined
    this.extensionFunctionCreator = context.extensionFunctionCreator || (() => undefined);
    this.exists = context.exists;
    this.bnode = context.bnode;
    this.defaultTimeZone = context.defaultTimeZone || extractTimeZone(this.now);
    this.actionContext = context.actionContext;

    this.transformer = new AlgebraTransformer(this.superTypeProvider);
    this.expr = this.transformer.transformAlgebra(algExpr);
  }

  public async evaluateAsInternal(expr: E.Expression, mapping: RDF.Bindings): Promise<E.Term> {
    const evaluator = this.subEvaluators[expr.expressionType];
    if (!evaluator) {
      throw new Err.InvalidExpressionType(expr);
    }
    return evaluator.bind(this)(expr, mapping);
  }

  public async evaluate(mapping: RDF.Bindings): Promise<RDF.Term> {
    const result = await this.evaluateAsInternal(this.expr, mapping);
    return result.toRDF();
  }

  public async evaluateAsEBV(mapping: RDF.Bindings): Promise<boolean> {
    const result = await this.evaluateAsInternal(this.expr, mapping);
    return result.coerceEBV();
  }

  // ==================================================================================================================
  // ==================================================================================================================
  // ==================================================================================================================
  // Determine the relative numerical order of the two given terms.
  // In accordance with https://www.w3.org/TR/sparql11-query/#modOrderBy
  public orderTypes(termA: RDF.Term | undefined, termB: RDF.Term | undefined): -1 | 0 | 1 {
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
        termA.subject, termB.subject,
      );
      if (orderSubject !== 0) {
        return orderSubject;
      }
      const orderPredicate = this.orderTypes(
        termA.predicate, termB.predicate,
      );
      if (orderPredicate !== 0) {
        return orderPredicate;
      }
      const orderObject = this.orderTypes(
        termA.object, termB.object,
      );
      if (orderObject !== 0) {
        return orderObject;
      }
      return this.orderTypes(
        termA.graph, termB.graph,
      );
    }

    // Handle literals
    if (termA.termType === 'Literal') {
      return this.orderLiteralTypes(termA, <RDF.Literal>termB);
    }

    return this.comparePrimitives(termA.value, termB.value);
  }

  private orderLiteralTypes(litA: RDF.Literal, litB: RDF.Literal): -1 | 0 | 1 {
    const isGreater = regularFunctions[C.RegularOperator.GT];
    const isEqual = regularFunctions[C.RegularOperator.EQUAL];

    const myLitA = this.transformer.transformLiteral(litA);
    const myLitB = this.transformer.transformLiteral(litB);

    try {
      if ((<E.BooleanLiteral> isEqual.applyOnTerms([ myLitA, myLitB ], this)).typedValue) {
        return 0;
      }
      if ((<E.BooleanLiteral> isGreater.applyOnTerms([ myLitA, myLitB ], this)).typedValue) {
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

  // ======================================= Sub evaluators ==========================================================
  private term(expr: E.Term, _: RDF.Bindings): E.Term {
    return expr;
  }

  private variable(expr: E.Variable, mapping: RDF.Bindings): E.Term {
    const term = mapping.get(expressionToVar(expr));
    if (!term) {
      throw new Err.UnboundVariableError(expr.name, mapping);
    }
    return this.transformer.transformRDFTermUnsafe(term);
  }

  private async evalFunction(expr: E.Operator | E.SpecialOperator | E.Named | E.AsyncExtension, mapping: RDF.Bindings):
  Promise<E.Term> {
    return expr.apply({
      args: expr.args,
      mapping,
      exprEval: this,
    });
  }

  private async evalExistence(expr: E.Existence, mapping: RDF.Bindings): Promise<E.Term> {
    return new E.BooleanLiteral(await this.exists(expr.expression, mapping));
  }

  private evalAggregate(): never {
    throw new Err.NoAggregator();
  }
}
