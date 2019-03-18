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
  name: string;
  expression: Algebra.AggregateExpression;
  aggregate(): Promise<RDF.Term>;
};

export type ExistenceExpression = ExpressionProps & {
  expressionType: ExpressionType.Existence;
  expression: Algebra.ExistenceExpression;
  exists_with(mapping: Bindings): Promise<boolean>
};

export type NamedExpression = ExpressionProps & {
  expressionType: ExpressionType.Named;
  name: RDF.NamedNode;
  apply: SimpleApplication;
  args: Expression[];
};

// export type Application = SimpleApplication | SpecialApplication;
export type SimpleApplication = (args: TermExpression[]) => TermExpression;

export type OperatorExpression = ExpressionProps & {
  expressionType: ExpressionType.Operator;
  args: Expression[];
  apply: SimpleApplication;
};

// TODO: Move to Types.ts?
export type EvaluatorAsync = (expr: Expression, mapping: Bindings) => Promise<TermExpression>;
export type EvalContextAsync = { args: Expression[], mapping: Bindings, evaluate: EvaluatorAsync };
export type SpecialApplicationAsync = (context: EvalContextAsync) => Promise<TermExpression>;

export type EvaluatorSync = (expr: Expression, mapping: Bindings) => TermExpression;
export type EvalContextSync = { args: Expression[], mapping: Bindings, evaluate: EvaluatorSync };
export type SpecialApplicationSync = (context: EvalContextSync) => TermExpression;

export type SpecialOperatorExpression = ExpressionProps & {
  expressionType: ExpressionType.SpecialOperator,
  args: Expression[],
  applyAsync: SpecialApplicationAsync,
  applySync: SpecialApplicationSync,
};

// TODO: Create alias Term = TermExpression
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
