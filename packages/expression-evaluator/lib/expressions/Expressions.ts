import type { ComunicaDataFactory } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';
import type { FunctionApplication } from '../functions/OverloadTree';

export enum ExpressionType {
  Aggregate = 'aggregate',
  Existence = 'existence',
  Operator = 'operator',
  Term = 'term',
  Variable = 'variable',
}

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

// TODO: Create alias Term = TermExpression
export function asTermType(type: string): TermType | undefined {
  if (type === 'namedNode' || type === 'literal' || type === 'blankNode' || type === 'quad') {
    return type;
  }
  return undefined;
}
export type TermType = 'namedNode' | 'literal' | 'blankNode' | 'quad' | 'defaultGraph';
export type TermExpression = IExpressionProps & {
  expressionType: ExpressionType.Term;
  termType: TermType;
  str: () => string;
  coerceEBV: () => boolean;
  toRDF: (dataFactory: ComunicaDataFactory) => RDF.Term;
};

export type VariableExpression = IExpressionProps & {
  expressionType: ExpressionType.Variable;
  name: string;
};

export type SimpleApplication = (args: TermExpression[]) => TermExpression;
export type SimpleApplicationTuple<T> = (args: T) => TermExpression;
