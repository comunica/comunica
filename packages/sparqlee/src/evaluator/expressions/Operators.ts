import { Expression, ExpressionType } from './Types';
import { Term, Literal, BooleanLiteral } from './Terms';

export interface Operation extends Expression {
    operator: Operator,
    args: Expression[]
}

export enum Operator {
    AND,
    OR,
    NOT,
    EQUAL,
    NOTEQUAL,
    LT,
    GT,
    LTE,
    GTE
    // TODO: Unary + -
    // TODO: Arithmetic
}

export abstract class BaseOperation {
    exprType = ExpressionType.Operation;
    args: Expression[];

    constructor(args: Expression[]) {
        this.args = args
    }
}

export abstract class BinaryOperation extends BaseOperation {
    left: Expression;
    right: Expression;

    constructor(args: Expression[]) {
        super(args);
        if (args.length != 2) {
            throw Error(`Incorrect number of arguments, was ${args.length} but should be 2`);
        }
        this.left = args[0];
        this.right = args[1];
    }

    abstract apply(left: Term, right: Term): Term;
}

export class And extends BinaryOperation {
    operator = Operator.AND;

    apply(left: Term, right: Term): BooleanLiteral {
        let result = left.toEBV() && right.toEBV();
        return new BooleanLiteral(result);
    }
}

export class Or extends BinaryOperation {
    operator = Operator.OR;

    apply(left: Term, right: Term): BooleanLiteral {
        let result = left.toEBV() || right.toEBV();
        return new BooleanLiteral(result);
    }
}

