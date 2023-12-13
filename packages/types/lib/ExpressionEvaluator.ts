import type { IAction } from '@comunica/core';
import type { IExpressionFunction, IInternalEvaluator } from '@comunica/expression-evaluator';
import type * as E from '@comunica/expression-evaluator/lib/expressions';
import type * as RDF from '@rdfjs/types';
import type { LRUCache } from 'lru-cache';
import type { Algebra as Alg } from 'sparqlalgebrajs';

export interface ITermFunction extends IExpressionFunction {
  supportsTermExpressions: true;
  applyOnTerms: (args: E.TermExpression[], exprEval: IInternalEvaluator) => E.TermExpression;
}

export interface IFunctionBusActionContext {
  functionName: string;
  arguments?: Alg.Expression[];
  requireTermExpression?: boolean;
}

export interface IMediatorFunctions {
  mediate: <T extends IFunctionBusActionContext>(arg: T & IAction) =>
  Promise<T extends { requireTermExpression: true } ? ITermFunction : IExpressionFunction>;
}

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
 * The key 'term' is not included in these keys. Something that is just a term will map to number 0.
 */
export type GeneralSuperTypeDict = Record<string, number> & { __depth: number };
export type TypeCache = LRUCache<string, GeneralSuperTypeDict>;
export type SuperTypeCallback = (unknownType: string) => string;

export interface ISuperTypeProvider {
  cache: TypeCache;
  discoverer: SuperTypeCallback;
}
