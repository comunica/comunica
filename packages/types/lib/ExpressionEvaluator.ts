import type { Algebra } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';
import type { LRUCache } from 'lru-cache';
import type { ComunicaDataFactory } from './ComunicaDataFactory';
import type { IActionContext } from './IActionContext';

export interface ITimeZoneRepresentation {
  // https://www.w3.org/TR/xpath-functions/#func-implicit-timezone
  // Type is a dayTimeDuration.
  // We use a separate dataType since it makes TS type modifications and JS object copying easier.
  zoneHours: number;
  zoneMinutes: number;
}

export interface IDateRepresentation extends Partial<ITimeZoneRepresentation> {
  year: number;
  month: number;
  day: number;
}

export interface ITimeRepresentation extends Partial<ITimeZoneRepresentation> {
  hours: number;
  minutes: number;
  seconds: number;
}

export interface IDayTimeDurationRepresentation {
  hours: number;
  minutes: number;
  seconds: number;
  day: number;
}

export interface IYearMonthDurationRepresentation {
  year: number;
  month: number;
}

export type IDurationRepresentation = IYearMonthDurationRepresentation & IDayTimeDurationRepresentation;
export type IDateTimeRepresentation = IDateRepresentation & ITimeRepresentation;
export type AsyncExtensionFunction = (args: RDF.Term[]) => Promise<RDF.Term>;
export type AsyncExtensionFunctionCreator = (functionNamedNode: RDF.NamedNode) =>
Promise<AsyncExtensionFunction | undefined>;

/**
 * Resolves a SPARQL `EXISTS` or `NOT EXISTS` expression against the given bindings.
 *
 * The resolver receives the expression as it appears in the algebra, so it is responsible for both
 * materializing `expression.input` against the bindings (see `materializeOperation` in
 * `@comunica/utils-query-operation`) and for applying `expression.not`.
 * Inside a query engine, that is the optimized algebra, as the engine would evaluate it.
 * The resolver also receives the context in which the expression is evaluated, which is especially useful
 * for resolvers that distinguish between the sources that the operations in `expression.input` target.
 * Throw an `ExpressionError` to have the failure treated as a SPARQL error, for example so that
 * `FILTER` drops the bindings instead of failing the query.
 */
export type ExistenceResolver = (
  expression: Algebra.ExistenceExpression,
  mapping: RDF.Bindings,
  context: IActionContext,
) => Promise<boolean>;

/**
 * The key 'term' is not included in these keys. Something that is just a term will map to number 0.
 */
export type GeneralSuperTypeDict = Record<string, number> & { __depth: number };
export type TypeCache = LRUCache<string, GeneralSuperTypeDict>;
export type SuperTypeCallback = (unknownType: string) => string;

export interface ISuperTypeProvider {
  cache: TypeCache;
  discoverer: SuperTypeCallback;
}

/**
 * An evaluator for RDF expressions.
 */
export interface IExpressionEvaluator extends IInternalEvaluator {
  /**
   * Evaluates the provided bindings in terms of the context the evaluator was created.
   * @param mapping the RDF bindings to evaluate against.
   */
  evaluate: (mapping: RDF.Bindings) => Promise<RDF.Term>;

  /**
   * Evaluates the provided bindings in terms of the context the evaluator was created,
   * returning the effective boolean value.
   * @param mapping the RDF bindings to evaluate against.
   */
  evaluateAsEBV: (mapping: RDF.Bindings) => Promise<boolean>;

  evaluateAsEvaluatorExpression: (mapping: RDF.Bindings) => Promise<TermExpression>;
}

/**
 * Orders RDF terms.
 */
export interface ITermComparator {
  /**
   * Orders two RDF terms according to: https://www.w3.org/TR/sparql11-query/#modOrderBy
   * @param termA the first term
   * @param termB the second term
   */
  orderTypes: (termA: RDF.Term | undefined, termB: RDF.Term | undefined) => -1 | 0 | 1;
}

/**
 * Instances of this interface perform a specific aggregation of bindings.
 * You can put bindings and when all bindings have been put, request the result.
 */
export interface IBindingsAggregator {
  /**
   * Registers bindings to the aggregator. Each binding you put has the ability to change the aggregation result.
   * @param bindings the bindings to put.
   */
  putBindings: (bindings: RDF.Bindings) => Promise<void>;

  /**
   * Request the result term of aggregating the bindings you have put in the aggregator.
   */
  result: () => Promise<RDF.Term | undefined>;
}

export interface IInternalEvaluator {
  evaluatorExpressionEvaluation: (expr: Expression, mapping: RDF.Bindings) => Promise<TermExpression>;

  context: IActionContext;
}

export enum ExpressionType {
  Aggregate = 'aggregate',
  Existence = 'existence',
  Operator = 'operator',
  Term = 'term',
  Variable = 'variable',
}

// TODO: next/major - edit these to reflect the RDFJS capitalization (and general typings?)
export type TermType = 'namedNode' | 'literal' | 'blankNode' | 'quad' | 'defaultGraph';

export type TermExpression = IExpressionProps & {
  expressionType: ExpressionType.Term;
  termType: TermType;
  str: () => string;
  coerceEBV: () => boolean;
  toRDF: (dataFactory: ComunicaDataFactory) => RDF.Term;
};

export type Expression =
  AggregateExpression |
  ExistenceExpression |
  OperatorExpression |
  TermExpression |
  VariableExpression;

export interface IExpressionProps {
  expressionType: ExpressionType;
}

export type AggregateExpression = IExpressionProps & {
  expressionType: ExpressionType.Aggregate;
  name: string;
  expression: Algebra.AggregateExpression;
};

export type ExistenceExpression = IExpressionProps & {
  expressionType: ExpressionType.Existence;
  expression: Algebra.ExistenceExpression;
};

export type OperatorExpression = IExpressionProps & {
  expressionType: ExpressionType.Operator;
  name: string;
  args: Expression[];
  apply: FunctionApplication;
};

export type VariableExpression = IExpressionProps & {
  expressionType: ExpressionType.Variable;
  name: string;
};

export type SimpleApplication = (args: TermExpression[]) => TermExpression;
export type SimpleApplicationTuple<T> = (args: T) => TermExpression;

export type FunctionApplication = (evalContext: IEvalContext) => Promise<TermExpression>;

export type ImplementationFunction = (expressionEvaluator: IInternalEvaluator) => SimpleApplication;
export type ImplementationFunctionTuple<T> = (expressionEvaluator: IInternalEvaluator) => SimpleApplicationTuple<T>;

export interface IFunctionArgumentsCacheObj {
  func?: ImplementationFunction;
  cache?: FunctionArgumentsCache;
}
export type FunctionArgumentsCache = Record<string, IFunctionArgumentsCacheObj>;

export interface IEvalContext {
  args: Expression[];
  mapping: RDF.Bindings;
  exprEval: IInternalEvaluator;
}
