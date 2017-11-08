import * as RDFJS from 'rdf-js';
import * as RDFDM from 'rdf-data-model';

export interface Expression {
    exprType: ExpressionType
}

export enum ExpressionType {
    Operation,
    FunctionCall,
    Aggregate,
    BGP,
    Group,
    Tuple,
    Variable,
    Term
}

export class VariableExpression implements Expression {
    exprType: ExpressionType.Variable;
    name: string;
    
    constructor(name: string) {
        this.name = name;
    }

}

export class Tuple implements Expression {
    exprType: ExpressionType.Tuple
    exprs: Expression[]

    constructor(exprs: Expression[]) {
        this.exprs = exprs;
    }
}