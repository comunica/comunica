import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';
import type { EvalContextAsync, EvalContextSync } from '../functions';
export declare enum ExpressionType {
    Aggregate = "aggregate",
    Existence = "existence",
    Named = "named",
    Operator = "operator",
    SpecialOperator = "specialOperator",
    Term = "term",
    Variable = "variable",
    AsyncExtension = "asyncExtension",
    SyncExtension = "syncExtension"
}
export type Expression = AggregateExpression | ExistenceExpression | NamedExpression | OperatorExpression | SpecialOperatorExpression | TermExpression | VariableExpression | AsyncExtensionExpression | SyncExtensionExpression;
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
    apply: SimpleApplication;
    args: Expression[];
};
export type AsyncExtensionExpression = IExpressionProps & {
    expressionType: ExpressionType.AsyncExtension;
    name: RDF.NamedNode;
    apply: AsyncExtensionApplication;
    args: Expression[];
};
export type SyncExtensionExpression = IExpressionProps & {
    expressionType: ExpressionType.SyncExtension;
    name: RDF.NamedNode;
    apply: SimpleApplication;
    args: Expression[];
};
export type OperatorExpression = IExpressionProps & {
    expressionType: ExpressionType.Operator;
    args: Expression[];
    apply: SimpleApplication;
};
export type SpecialOperatorExpression = IExpressionProps & {
    expressionType: ExpressionType.SpecialOperator;
    args: Expression[];
    applyAsync: SpecialApplicationAsync;
    applySynchronously: SpecialApplicationSync;
};
export declare function asTermType(type: string): TermType | undefined;
export type TermType = 'namedNode' | 'literal' | 'blankNode' | 'quad';
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
export type SimpleApplicationTuple<T> = (args: T) => TermExpression;
export type AsyncExtensionApplication = (args: TermExpression[]) => Promise<TermExpression>;
export type SpecialApplicationAsync = (context: EvalContextAsync) => Promise<TermExpression>;
export type SpecialApplicationSync = (context: EvalContextSync) => TermExpression;
