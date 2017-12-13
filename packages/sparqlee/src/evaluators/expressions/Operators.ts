import { Expression, ExpressionType } from './Types';
import { BooleanLiteral, Literal, NumericLiteral, Term } from './Terms';
import { InvalidOperationError, UnimplementedError } from '../../util/Errors';
import { BooleanImpl, DateTimeImpl, Impl, NumericImpl, SimpleImpl, StringImpl,
         TermImpl, ImplType } from './BinOpImplementation';

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
    MULTIPLICATION,
    DIVISION,
    ADDITION,
    SUBTRACTION
}

export abstract class BaseOperation implements Operation {
    abstract operator: Operator;

    exprType: ExpressionType.Operation = ExpressionType.Operation;
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
        let type = `${args[0].implType} ${args[1].implType}`;
        let impl = typeMap.get(type);
        return this.applyBin(impl, args[0], args[1]);
    }

    abstract applyBin(impl: Impl, left: Term, right: Term): Term;
}

export abstract class BinaryBoolOperation extends BinaryOperation {
    abstract func(impl: Impl): ((left: Term, right: Term) => boolean);
    applyBin(impl: Impl, left: Term, right: Term): Term {
        return new BooleanLiteral(this.func(impl)(left, right))
    }
}

export abstract class BinaryArithmeticOperation extends BinaryOperation {
    abstract func(impl: Impl): ((left: Term, right: Term) => number);
    applyBin(impl: Impl, left: Term, right: Term): Term {
        return new NumericLiteral(this.func(impl)(left, right))
    }
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

export class Not extends UnaryOperation {
    operator = Operator.NOT;
    applyUn(arg: Term): BooleanLiteral {
        return new BooleanLiteral(arg.not());
    }
}

// TODO: Maybe just extend BinaryOperation for performance
// TODO: Correctly handle error + false
export class And extends BinaryBoolOperation {
    operator = Operator.AND;
    func(impl: Impl) {
        return (left: Term, right: Term) => {
            return left.toEBV() && right.toEBV();
        }
    };
}

// TODO: Correctly handle error + true
export class Or extends BinaryBoolOperation {
    operator = Operator.OR;
    func(impl: Impl) {
        return (left: Term, right: Term) => {
            return left.toEBV() || right.toEBV();
        }
    };
}

export class Equal extends BinaryBoolOperation {
    operator = Operator.EQUAL;
    func(impl: Impl) { return impl.rdfEqual; }
}

export class NotEqual extends BinaryBoolOperation {
    operator = Operator.NOTEQUAL;
    func(impl: Impl) { return impl.rdfNotEqual; }
}

export class LesserThan extends BinaryBoolOperation {
    operator = Operator.LT;
    func(impl: Impl) { return impl.lt; }
}

export class GreaterThan extends BinaryBoolOperation {
    operator = Operator.GT;
    func(impl: Impl) { return impl.gt; }
}

export class LesserThanEqual extends BinaryBoolOperation {
    operator = Operator.LTE;
    func(impl: Impl) { return impl.lte; }
}

export class GreaterThanEqual extends BinaryBoolOperation {
    operator = Operator.GTE;
    func(impl: Impl) { return impl.gte; }
}

export class Multiplication extends BinaryArithmeticOperation {
    operator = Operator.MULTIPLICATION;
    func(impl: Impl) { return impl.multiply; }
}

export class Division extends BinaryArithmeticOperation {
    operator = Operator.DIVISION;
    func(impl: Impl) { return impl.divide; }
}

export class Addition extends BinaryArithmeticOperation {
    operator = Operator.ADDITION;
    func(impl: Impl) { return impl.add; }
}

export class Subtraction extends BinaryArithmeticOperation {
    operator = Operator.SUBTRACTION;
    func(impl: Impl) { return impl.subtract; }
}

// Generate typeMap so no branching is needed;
// interface TypeKey { left: ImplType, right: ImplType }
type TypeKey = string;
const typeMap: Map<TypeKey, Impl> = (() => {
    let keyValues: [TypeKey, Impl][] = [];
    let term = new TermImpl();
    let num = new NumericImpl();
    let sim = new SimpleImpl();
    let str = new StringImpl();
    let bool = new BooleanImpl();
    let date = new DateTimeImpl();
    for (let t in ImplType) {
        for (let tt in ImplType) {
            let left: ImplType = (<any>ImplType)[t];
            let right: ImplType = (<any>ImplType)[tt];
            let impl: Impl = term;
            if (left === right) {
                switch (left) {
                    case ImplType.Term: impl = term; break;
                    case ImplType.Numeric: impl = num; break;
                    case ImplType.Simple: impl = sim; break;
                    case ImplType.String: impl = str; break;
                    case ImplType.Boolean: impl = bool; break;
                    case ImplType.DateTime: impl = date; break;
                    default: throw Error("ImplType was somehow not defined");
                }
            }
            keyValues.push([`${left} ${right}`, impl])
        }
    }
    return new Map(keyValues);
})();