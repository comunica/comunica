import { RDFTerm } from './RDFTerm'

export interface Expression {
    type: string;
}

export class Term {
    type: 'term';
    termType: string;
    value: string;

    constructor(termType: string, value: string) {
        this.termType = termType;
        this.value = value;
    }

    equals(other: Term) :boolean {
        return other.termType == this.termType &&
               other.value  == this.value;
    }
}

export class Literal extends Term {
    language: string;
    dataType: NamedNode;

    constructor(value: string, language?: string, dataType?: NamedNode){
        super(ExpTypes.Literal, value);
    }
}

export class Variable extends Term {
    constructor(value: string){
        super(ExpTypes.Variable, value);
    }
}

// Is this a term?
export class NamedNode extends Term {
    constructor(value: string){
        super(ExpTypes.NamedNode, value);
    }
}


export class Operator {
    type: string;
    operator: string;
    args: Array<Expression>;

    constructor(operator: string, args: Array<Expression>) {
        this.operator = operator;
        this.args = args;
    }
}

export enum ExpTypes {
    Literal = "Literal",
    Variable = "Variable",
    NamedNode = "NamedNode"
}
