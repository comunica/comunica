import type { IEvalContext, FunctionApplication } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';

export enum ExpressionType {
  Aggregate = 'aggregate',
  Existence = 'existence',
  Named = 'named',
  Operator = 'operator',
  SpecialOperator = 'specialOperator',
  Term = 'term',
  Variable = 'variable',
  AsyncExtension = 'asyncExtension',
  SyncExtension = 'syncExtension',
}

export type Expression =
  AggregateExpression |
  ExistenceExpression |
  NamedExpression |
  OperatorExpression |
  SpecialOperatorExpression |
  TermExpression |
  VariableExpression |
  AsyncExtensionExpression |
  SyncExtensionExpression;

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

// TODO: this can go since we will have an indexed bus to fund functions?
export type AsyncExtensionExpression = IExpressionProps & {
  expressionType: ExpressionType.AsyncExtension;
  name: RDF.NamedNode;
  apply: FunctionApplication;
  args: Expression[];
};

export type SyncExtensionExpression = IExpressionProps & {
  expressionType: ExpressionType.SyncExtension;
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

// Export type Application = SimpleApplication | SpecialApplication;
export type SimpleApplication = (args: TermExpression[]) => TermExpression;
export type AsyncExtensionApplication = (args: TermExpression[]) => Promise<TermExpression>;

export type SpecialApplicationAsync = (context: IEvalContext) => Promise<TermExpression>;
