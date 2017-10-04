import { Term } from './Term'

export interface Expression {
    type: string;
}

// Kill this wrapper
export class ExpTerm {
    type: string;
    term: Term;

    constructor(term: Term) {
        this.type = 'term';
        this.term = term; // TODO
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
