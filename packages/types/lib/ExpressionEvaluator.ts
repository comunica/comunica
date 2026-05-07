import type { Algebra } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';
import type { LRUCache } from 'lru-cache';
import type { ComunicaDataFactory } from './ComunicaDataFactory';
import type { IActionContext } from './IActionContext';

/**
 * Represents a timezone as hour and minute offsets.
 */
export interface ITimeZoneRepresentation {
  // https://www.w3.org/TR/xpath-functions/#func-implicit-timezone
  // Type is a dayTimeDuration.
  // We use a separate dataType since it makes TS type modifications and JS object copying easier.
  zoneHours: number;
  zoneMinutes: number;
}

/**
 * Represents a date value with optional timezone.
 */
export interface IDateRepresentation extends Partial<ITimeZoneRepresentation> {
  year: number;
  month: number;
  day: number;
}

/**
 * Represents a time value with optional timezone.
 */
export interface ITimeRepresentation extends Partial<ITimeZoneRepresentation> {
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * Represents a day-time duration with days, hours, minutes, and seconds.
 */
export interface IDayTimeDurationRepresentation {
  hours: number;
  minutes: number;
  seconds: number;
  day: number;
}

/**
 * Represents a year-month duration with year and month components.
 */
export interface IYearMonthDurationRepresentation {
  year: number;
  month: number;
}

/**
 * A full duration representation combining year-month and day-time components.
 */
export type IDurationRepresentation = IYearMonthDurationRepresentation & IDayTimeDurationRepresentation;
/**
 * A date-time representation combining date and time components.
 */
export type IDateTimeRepresentation = IDateRepresentation & ITimeRepresentation;
/**
 * An asynchronous extension function that takes RDF terms and produces an RDF term.
 */
export type AsyncExtensionFunction = (args: RDF.Term[]) => Promise<RDF.Term>;
/**
 * A factory function that creates async extension functions from a named node.
 */
export type AsyncExtensionFunctionCreator = (functionNamedNode: RDF.NamedNode) =>
Promise<AsyncExtensionFunction | undefined>;

/**
 * The key 'term' is not included in these keys. Something that is just a term will map to number 0.
 */
export type GeneralSuperTypeDict = Record<string, number> & { __depth: number };
/**
 * A cache mapping type strings to their super type dictionaries.
 */
export type TypeCache = LRUCache<string, GeneralSuperTypeDict>;
/**
 * A callback that resolves an unknown type to its super type.
 */
export type SuperTypeCallback = (unknownType: string) => string;

/**
 * Provides super type discovery and caching for RDF types.
 */
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
 * An internal evaluator providing low-level expression evaluation and context access.
 */
export interface IInternalEvaluator {
  evaluatorExpressionEvaluation: (expr: Expression, mapping: RDF.Bindings) => Promise<TermExpression>;

  context: IActionContext;
}

/**
 * Enumerates the possible types of SPARQL expressions.
 */
export enum ExpressionType {
  Aggregate = 'aggregate',
  Existence = 'existence',
  Operator = 'operator',
  Term = 'term',
  Variable = 'variable',
}

// TODO: next/major - edit these to reflect the RDFJS capitalization (and general typings?)
/**
 * The possible RDF term types used in expressions.
 */
export type TermType = 'namedNode' | 'literal' | 'blankNode' | 'quad' | 'defaultGraph';

/**
 * An expression that evaluates to a concrete RDF term.
 */
export type TermExpression = IExpressionProps & {
  expressionType: ExpressionType.Term;
  termType: TermType;
  str: () => string;
  coerceEBV: () => boolean;
  toRDF: (dataFactory: ComunicaDataFactory) => RDF.Term;
};

/**
 * A union of all possible expression types.
 */
export type Expression =
  AggregateExpression |
  ExistenceExpression |
  OperatorExpression |
  TermExpression |
  VariableExpression;

/**
 * Base properties shared by all expression types.
 */
export interface IExpressionProps {
  expressionType: ExpressionType;
}

/**
 * An expression representing a SPARQL aggregate operation.
 */
export type AggregateExpression = IExpressionProps & {
  expressionType: ExpressionType.Aggregate;
  name: string;
  expression: Algebra.AggregateExpression;
};

/**
 * An expression representing a SPARQL EXISTS or NOT EXISTS test.
 */
export type ExistenceExpression = IExpressionProps & {
  expressionType: ExpressionType.Existence;
  expression: Algebra.ExistenceExpression;
};

/**
 * An expression representing a SPARQL function or operator application.
 */
export type OperatorExpression = IExpressionProps & {
  expressionType: ExpressionType.Operator;
  name: string;
  args: Expression[];
  apply: FunctionApplication;
};

/**
 * An expression representing a SPARQL variable reference.
 */
export type VariableExpression = IExpressionProps & {
  expressionType: ExpressionType.Variable;
  name: string;
};

/**
 * A simple synchronous function application over term expressions.
 */
export type SimpleApplication = (args: TermExpression[]) => TermExpression;
/**
 * A simple synchronous function application over a typed tuple of arguments.
 */
export type SimpleApplicationTuple<T> = (args: T) => TermExpression;

/**
 * An asynchronous function application over an evaluation context.
 */
export type FunctionApplication = (evalContext: IEvalContext) => Promise<TermExpression>;

/**
 * A factory that produces a simple application given an internal evaluator.
 */
export type ImplementationFunction = (expressionEvaluator: IInternalEvaluator) => SimpleApplication;
/**
 * A factory that produces a typed-tuple simple application given an internal evaluator.
 */
export type ImplementationFunctionTuple<T> = (expressionEvaluator: IInternalEvaluator) => SimpleApplicationTuple<T>;

/**
 * A cached entry storing an optional implementation function and nested cache.
 */
export interface IFunctionArgumentsCacheObj {
  func?: ImplementationFunction;
  cache?: FunctionArgumentsCache;
}
/**
 * A hierarchical cache mapping argument type strings to function implementations.
 */
export type FunctionArgumentsCache = Record<string, IFunctionArgumentsCacheObj>;

/**
 * The evaluation context providing arguments, bindings, and the internal evaluator.
 */
export interface IEvalContext {
  args: Expression[];
  mapping: RDF.Bindings;
  exprEval: IInternalEvaluator;
}
