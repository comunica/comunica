import { Expression, ExpressionType } from './Types';
import { Term, Literal, BooleanLiteral, NumericLiteral } from './Terms';

export interface Operation extends Expression {
    operator: Operator,
    args: Expression[],
    apply(args: Term[]): Term
}

export enum Operator {
    UN_PLUS,
    UN_MIN,
    NOT,
    AND,
    OR,
    EQUAL,
    NOTEQUAL,
    LT,
    GT,
    LTE,
    GTE,
    PRODUCT,
    DIVISION,
    ADDITION,
    SUBTACTION
}

export abstract class BaseOperation implements Operation {
    abstract operator: Operator;

    exprType:ExpressionType.Operation = ExpressionType.Operation;
    args: Expression[];

    constructor(args: Expression[]) {
        this.args = args
    }

    abstract apply(args: Term[]): Term
}

export abstract class BinaryOperation extends BaseOperation {
    left: Expression;
    right: Expression;

    constructor(args: Expression[]) {
        super(args);
        if (args.length != 2) {
            throw new Error(`Incorrect number of arguments, was ${args.length} but should be 2`);
        }
        this.left = args[0];
        this.right = args[1];
    }

    apply(args: Term[]): Term {
        return this.applyBin(args[0], args[1]);
    }

    abstract applyBin(left: Term, right: Term): Term;
}

export abstract class UnaryOperation extends BaseOperation {
    arg: Expression;

    constructor(args: Expression[]) {
        super(args);
        if (args.length != 1) {
            throw new Error(`Incorrect number of arguments, was ${args.length} but should be 1`);
        }
        this.arg = args[0];
    }

    apply(args: Term[]): Term {
        return this.applyUn(args[0]);
    }

    abstract applyUn(arg: Term): Term;
}

// TODO: Correctly handle error + false
export class And extends BinaryOperation {
    operator = Operator.AND;

    applyBin(left: Term, right: Term): BooleanLiteral {
        let result = left.toEBV() && right.toEBV();
        return new BooleanLiteral(result);
    }
}

// TODO: Correctly handle error + true
export class Or extends BinaryOperation {
    operator = Operator.OR;

    applyBin(left: Term, right: Term): BooleanLiteral {
        let result = left.toEBV() || right.toEBV();
        return new BooleanLiteral(result);
    }
}

export class Not extends UnaryOperation {
    operator = Operator.NOT;

    applyUn(arg: Term): BooleanLiteral {
        return new BooleanLiteral(arg.not());
    }
}

export class Addition extends BinaryOperation {
    operator = Operator.ADDITION

    public applyBin(left: Term, right: Term): Term {
        return new NumericLiteral(left.add(right));
    }
}

export class GreaterThan extends BinaryOperation {
    operator = Operator.LT;

    applyBin(left: Term, right: Term): Term {
        return new BooleanLiteral(left.gt(right));
    }
}

export class Equal extends BinaryOperation {
    operator = Operator.EQUAL;

    applyBin(left: Term, right: Term): Term {
        return new BooleanLiteral(left.rdfEqual(right));
    }
}