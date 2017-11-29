import { InvalidOperationError, UnimplementedError } from '../../util/Errors';
import { BooleanLiteral, DateTimeLiteral, NumericLiteral, SimpleLiteral,
         StringLiteral, Term } from './Terms';

export enum ImplType {
  Term ='Term',
  String = 'String',
  Numeric = 'Numeric',
  Boolean = 'Boolean',
  DateTime = 'DateTime',
  Simple = 'Simple',
}

export interface Impl {
  rdfEqual(left: Term, right: Term): boolean,

  rdfNotEqual(left: Term, right: Term): boolean,

  lt(left: Term, right: Term): boolean,
  gt(left: Term, right: Term): boolean,
  lte(left: Term, right: Term): boolean,
  gte(left: Term, right: Term): boolean,

  multiply(left: Term, right: Term): number,
  divide(left: Term, right: Term): number,
  add(left: Term, right: Term): number,
  subtract(left: Term, right: Term): number,
}

export class TermImpl implements Impl {
  
    rdfEqual(left: Term, right: Term): boolean {
        throw new UnimplementedError();
    }

    rdfNotEqual(left: Term, right: Term): boolean {
        return !this.rdfEqual(left, right);
    }

    lt(left: Term, right: Term): boolean { throw new InvalidOperationError(); }
    gt(left: Term, right: Term): boolean { throw new InvalidOperationError(); }
    lte(left: Term, right: Term): boolean { throw new InvalidOperationError(); }
    gte(left: Term, right: Term): boolean { throw new InvalidOperationError(); }
    multiply(left: Term, right: Term): number { throw new InvalidOperationError(); }
    divide(left: Term, right: Term): number { throw new InvalidOperationError(); }
    add(left: Term, right: Term): number { throw new InvalidOperationError(); }
    subtract(left: Term, right: Term): number { throw new InvalidOperationError(); }
}

export class NumericImpl extends TermImpl {

    rdfEqual(left: NumericLiteral, right: NumericLiteral): boolean {
        return left.value === right.value;
    }

    rdfNotEqual(left: NumericLiteral, right: NumericLiteral): boolean {
        return left.value !== right.value;
    }

    lt(left: NumericLiteral, right: NumericLiteral): boolean {
        return left.value < right.value;
    }

    gt(left: NumericLiteral, right: NumericLiteral): boolean {
        return left.value > right.value;
    }

    lte(left: NumericLiteral, right: NumericLiteral): boolean {
        return left.value <= right.value;
    }

    gte(left: NumericLiteral, right: NumericLiteral): boolean {
        return left.value >= right.value;
    }

    multiply(left: NumericLiteral, right: NumericLiteral): number {
        return left.value * right.value;
    }

    divide(left: NumericLiteral, right: NumericLiteral): number {
        return left.value / right.value;
    }

    add(left: NumericLiteral, right: NumericLiteral): number {
        return left.value + right.value;
    }

    subtract(left: NumericLiteral, right: NumericLiteral): number {
        return left.value - right.value;
    }
}

export class StringImpl extends TermImpl {
    rdfEqual(left: StringLiteral, right: StringLiteral): boolean {
        return left.value === right.value;
    }

    rdfNotEqual(left: StringLiteral, right: StringLiteral): boolean {
        return left.value !== right.value;
    }

    lt(left: StringLiteral, right: StringLiteral): boolean {
        return left.value < right.value;
    }

    gt(left: StringLiteral, right: StringLiteral): boolean {
        return left.value > right.value;
    }

    lte(left: StringLiteral, right: StringLiteral): boolean {
        return left.value <= right.value;
    }

    gte(left: StringLiteral, right: StringLiteral): boolean {
        return left.value >= right.value;
    }
}

export class DateTimeImpl extends TermImpl {

    rdfEqual(left: DateTimeLiteral, right: DateTimeLiteral): boolean {
        return left.value.getTime() === right.value.getTime();
    }

    rdfNotEqual(left: DateTimeLiteral, right: DateTimeLiteral): boolean {
        return left.value.getTime() !== right.value.getTime();
    }

    lt(left: DateTimeLiteral, right: DateTimeLiteral): boolean {
        return left.value < right.value;
    }

    gt(left: DateTimeLiteral, right: DateTimeLiteral): boolean {
        return left.value > right.value;
    }

    lte(left: DateTimeLiteral, right: DateTimeLiteral): boolean {
        return left.value.getTime() <= right.value.getTime();
    }

    gte(left: DateTimeLiteral, right: DateTimeLiteral): boolean {
        return left.value.getTime() >= right.value.getTime();
    }
}

export class BooleanImpl extends TermImpl {
    rdfEqual(left: BooleanLiteral, right: BooleanLiteral): boolean {
        return left.value === right.value;
    }

    rdfNotEqual(left: BooleanLiteral, right: BooleanLiteral): boolean {
        return left.value !== right.value;
    }

    lt(left: BooleanLiteral, right: BooleanLiteral): boolean {
        return left.value < right.value;
    }

    gt(left: BooleanLiteral, right: BooleanLiteral): boolean {
        return left.value > right.value;
    }

    lte(left: BooleanLiteral, right: BooleanLiteral): boolean {
        return left.value <= right.value;
    }

    gte(left: BooleanLiteral, right: BooleanLiteral): boolean {
        return left.value >= right.value;
    }
}

export class SimpleImpl extends TermImpl {
    rdfEqual(left: SimpleLiteral, right: SimpleLiteral): boolean {
        return left.value === right.value;
    }

    rdfNotEqual(left: SimpleLiteral, right: SimpleLiteral): boolean {
        return left.value !== right.value;
    }

    lt(left: SimpleLiteral, right: SimpleLiteral): boolean {
        return left.value < right.value;
    }

    gt(left: SimpleLiteral, right: SimpleLiteral): boolean {
        return left.value > right.value;
    }

    lte(left: SimpleLiteral, right: SimpleLiteral): boolean {
        return left.value <= right.value;
    }

    gte(left: SimpleLiteral, right: SimpleLiteral): boolean {
        return left.value >= right.value;
    }
}