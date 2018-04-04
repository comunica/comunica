import { InvalidOperationError, UnimplementedError } from '../util/Errors';
import { ITerm } from './Expressions';
import {
  BooleanLiteral, DateTimeLiteral, NumericLiteral, SimpleLiteral,
  StringLiteral,
} from './Terms';

export enum ImplType {
  Term = 'Term',
  String = 'String',
  Numeric = 'Numeric',
  Boolean = 'Boolean',
  DateTime = 'DateTime',
  Simple = 'Simple',
}

export interface Impl {
  rdfEqual(left: ITerm, right: ITerm): boolean;

  rdfNotEqual(left: ITerm, right: ITerm): boolean;

  lt(left: ITerm, right: ITerm): boolean;
  gt(left: ITerm, right: ITerm): boolean;
  lte(left: ITerm, right: ITerm): boolean;
  gte(left: ITerm, right: ITerm): boolean;

  multiply(left: ITerm, right: ITerm): number;
  divide(left: ITerm, right: ITerm): number;
  add(left: ITerm, right: ITerm): number;
  subtract(left: ITerm, right: ITerm): number;
}

export class TermImpl implements Impl {

  public rdfEqual(left: ITerm, right: ITerm): boolean {
    throw new UnimplementedError();
  }

  public rdfNotEqual(left: ITerm, right: ITerm): boolean {
    return !this.rdfEqual(left, right);
  }

  public lt(left: ITerm, right: ITerm): boolean { throw new InvalidOperationError(); }
  public gt(left: ITerm, right: ITerm): boolean { throw new InvalidOperationError(); }
  public lte(left: ITerm, right: ITerm): boolean { throw new InvalidOperationError(); }
  public gte(left: ITerm, right: ITerm): boolean { throw new InvalidOperationError(); }
  public multiply(left: ITerm, right: ITerm): number { throw new InvalidOperationError(); }
  public divide(left: ITerm, right: ITerm): number { throw new InvalidOperationError(); }
  public add(left: ITerm, right: ITerm): number { throw new InvalidOperationError(); }
  public subtract(left: ITerm, right: ITerm): number { throw new InvalidOperationError(); }
}

export class NumericImpl extends TermImpl {

  public rdfEqual(left: NumericLiteral, right: NumericLiteral): boolean {
    return left.value === right.value;
  }

  public rdfNotEqual(left: NumericLiteral, right: NumericLiteral): boolean {
    return left.value !== right.value;
  }

  public lt(left: NumericLiteral, right: NumericLiteral): boolean {
    return left.value < right.value;
  }

  public gt(left: NumericLiteral, right: NumericLiteral): boolean {
    return left.value > right.value;
  }

  public lte(left: NumericLiteral, right: NumericLiteral): boolean {
    return left.value <= right.value;
  }

  public gte(left: NumericLiteral, right: NumericLiteral): boolean {
    return left.value >= right.value;
  }

  public multiply(left: NumericLiteral, right: NumericLiteral): number {
    return left.value * right.value;
  }

  public divide(left: NumericLiteral, right: NumericLiteral): number {
    return left.value / right.value;
  }

  public add(left: NumericLiteral, right: NumericLiteral): number {
    return left.value + right.value;
  }

  public subtract(left: NumericLiteral, right: NumericLiteral): number {
    return left.value - right.value;
  }
}

export class StringImpl extends TermImpl {
  public rdfEqual(left: StringLiteral, right: StringLiteral): boolean {
    return left.value === right.value;
  }

  public rdfNotEqual(left: StringLiteral, right: StringLiteral): boolean {
    return left.value !== right.value;
  }

  public lt(left: StringLiteral, right: StringLiteral): boolean {
    return left.value < right.value;
  }

  public gt(left: StringLiteral, right: StringLiteral): boolean {
    return left.value > right.value;
  }

  public lte(left: StringLiteral, right: StringLiteral): boolean {
    return left.value <= right.value;
  }

  public gte(left: StringLiteral, right: StringLiteral): boolean {
    return left.value >= right.value;
  }
}

export class DateTimeImpl extends TermImpl {

  public rdfEqual(left: DateTimeLiteral, right: DateTimeLiteral): boolean {
    return left.value.getTime() === right.value.getTime();
  }

  public rdfNotEqual(left: DateTimeLiteral, right: DateTimeLiteral): boolean {
    return left.value.getTime() !== right.value.getTime();
  }

  public lt(left: DateTimeLiteral, right: DateTimeLiteral): boolean {
    return left.value < right.value;
  }

  public gt(left: DateTimeLiteral, right: DateTimeLiteral): boolean {
    return left.value > right.value;
  }

  public lte(left: DateTimeLiteral, right: DateTimeLiteral): boolean {
    return left.value.getTime() <= right.value.getTime();
  }

  public gte(left: DateTimeLiteral, right: DateTimeLiteral): boolean {
    return left.value.getTime() >= right.value.getTime();
  }
}

export class BooleanImpl extends TermImpl {
  public rdfEqual(left: BooleanLiteral, right: BooleanLiteral): boolean {
    return left.value === right.value;
  }

  public rdfNotEqual(left: BooleanLiteral, right: BooleanLiteral): boolean {
    return left.value !== right.value;
  }

  public lt(left: BooleanLiteral, right: BooleanLiteral): boolean {
    return left.value < right.value;
  }

  public gt(left: BooleanLiteral, right: BooleanLiteral): boolean {
    return left.value > right.value;
  }

  public lte(left: BooleanLiteral, right: BooleanLiteral): boolean {
    return left.value <= right.value;
  }

  public gte(left: BooleanLiteral, right: BooleanLiteral): boolean {
    return left.value >= right.value;
  }
}

export class SimpleImpl extends TermImpl {
  public rdfEqual(left: SimpleLiteral, right: SimpleLiteral): boolean {
    return left.value === right.value;
  }

  public rdfNotEqual(left: SimpleLiteral, right: SimpleLiteral): boolean {
    return left.value !== right.value;
  }

  public lt(left: SimpleLiteral, right: SimpleLiteral): boolean {
    return left.value < right.value;
  }

  public gt(left: SimpleLiteral, right: SimpleLiteral): boolean {
    return left.value > right.value;
  }

  public lte(left: SimpleLiteral, right: SimpleLiteral): boolean {
    return left.value <= right.value;
  }

  public gte(left: SimpleLiteral, right: SimpleLiteral): boolean {
    return left.value >= right.value;
  }
}
