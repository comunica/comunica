import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';
import type { FunctionApplication } from '../functions/OverloadTree';

export enum ExpressionType {
  Aggregate = 'aggregate',
  Existence = 'existence',
  Named = 'named',
  Operator = 'operator',
  SpecialOperator = 'specialOperator',
  Term = 'term',
  Variable = 'variable',
}

export type Expression =
  AggregateExpression |
  ExistenceExpression |
  NamedExpression |
  OperatorExpression |
  SpecialOperatorExpression |
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

export type NamedExpression = IExpressionProps & {
  expressionType: ExpressionType.Named;
  name: RDF.NamedNode;
  apply: FunctionApplication;
  args: Expression[];
};

export type OperatorExpression = IExpressionProps & {
  expressionType: ExpressionType.Operator;
  args: Expression[];
  apply: FunctionApplication;
};

export type SpecialOperatorExpression = IExpressionProps & {
  expressionType: ExpressionType.SpecialOperator;
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
  toRDF: () => RDF.Term;
};

export type VariableExpression = IExpressionProps & {
  expressionType: ExpressionType.Variable;
  name: string;
};

export type SimpleApplication = (args: TermExpression[]) => TermExpression;
