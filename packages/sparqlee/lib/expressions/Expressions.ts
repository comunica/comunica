import * as RDF from 'rdf-js';
import { Algebra } from 'sparqlalgebrajs';

import { Bindings } from '../Types';

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

export interface ExpressionProps {
  expressionType: ExpressionType;
}

export type AggregateExpression = ExpressionProps & {
  expressionType: ExpressionType.Aggregate;
  aggregator: string;
  distinct: boolean;
  separator?: string; // used by GROUP_CONCAT
  expression: Expression;
};

export type ExistenceExpression = ExpressionProps & {
  expressionType: ExpressionType.Existence;
  not: boolean;
  input: Algebra.Operation;
};

export type NamedExpression = ExpressionProps & {
  expressionType: ExpressionType.Named;
  name: RDF.NamedNode;
  apply: SimpleApplication;
  args: Expression[];
};

export type Application = SimpleApplication | SpecialApplication;
export type SimpleApplication = (args: TermExpression[]) => TermExpression;

export type OperatorExpression = ExpressionProps & {
  expressionType: ExpressionType.Operator;
  args: Expression[];
  apply: SimpleApplication;
};

// TODO: Move to Types.ts?
export type Evaluator = (e: Expression, mapping: Bindings) => Promise<TermExpression>;
export type EvalContext = { args: Expression[], mapping: Bindings, evaluate: Evaluator };
export type SpecialApplication = (context: EvalContext) => Promise<TermExpression>;
export type SpecialOperatorExpression = ExpressionProps & {
  expressionType: ExpressionType.SpecialOperator,
  args: Expression[],
  apply: SpecialApplication,
};

export type TermType = 'namedNode' | 'literal' | 'blankNode';
export type TermExpression = ExpressionProps & {
  expressionType: ExpressionType.Term;
  termType: TermType;
  str(): string;
  coerceEBV(): boolean;
  toRDF(): RDF.Term;
};

export type VariableExpression = ExpressionProps & {
  expressionType: ExpressionType.Variable;
  name: string;
};
