import { ExpressionType, IExpression, ITerm } from '../core/Expressions';
import {
  BooleanImpl, DateTimeImpl, Impl, ImplType, NumericImpl, SimpleImpl,
  StringImpl, TermImpl,
} from '../core/Operators';
import { BooleanLiteral, ILiteral, NumericLiteral } from '../core/Terms';
import { InvalidOperationError, UnimplementedError } from '../util/Errors';

// TODO: Maybe should be in core?
export interface IOperation extends IExpression {
  operator: OpType;
  args: IExpression[];
  apply(args: ITerm[]): ITerm;
}

export enum OpType {
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
  SUBTRACTION,
}

export abstract class BaseOperation implements IOperation {
  public operator: OpType;
  public exprType: ExpressionType.Operation = ExpressionType.Operation;
  public args: IExpression[];
  private argNum: number;

  constructor(operator: OpType, args: IExpression[], argNum: number) {
    this.args = args;
    this.argNum = argNum;
    this.operator = operator;
    if (args.length !== argNum) {
      throw new Error(`Incorrect number of arguments, was ${args.length} but should be 2`);
    }
  }

  public abstract apply(args: ITerm[]): ITerm;
}

export function getOp(op: OpType, args: IExpression[]): IOperation {
  switch (op) {
    case OpType.UN_PLUS:
    case OpType.UN_MIN:
    case OpType.NOT: return new UnaryOperation(op, args);

    case OpType.AND:
    case OpType.OR:
    case OpType.EQUAL:
    case OpType.NOTEQUAL:
    case OpType.LT:
    case OpType.GT:
    case OpType.LTE:
    case OpType.GTE:
    case OpType.MULTIPLICATION:
    case OpType.DIVISION:
    case OpType.ADDITION:
    case OpType.SUBTRACTION: return new BinaryOperation(op, args);

    default: throw new UnimplementedError();
  }
}

class UnaryOperation extends BaseOperation {
  public operator: OpType;

  private arg: IExpression;
  private operation: ((arg: ITerm) => ITerm);

  constructor(operator: OpType, args: IExpression[]) {
    super(operator, args, 1);
    this.arg = args[0];
    this.operation = unOpMap[operator];
  }

  public apply(args: ITerm[]): ITerm {
    return this.operation(args[0]);
  }
}

class BinaryOperation extends BaseOperation {
  public operator: OpType;

  private left: IExpression;
  private right: IExpression;
  private operation: (impl: Impl) => ((left: ITerm, right: ITerm) => ITerm);

  constructor(operator: OpType, args: IExpression[]) {
    super(operator, args, 2);
    this.left = args[0];
    this.right = args[1];
    this.operator = operator;
    this.operation = binOpMap[operator];
  }

  public apply(args: ITerm[]): ITerm {
    const type = `${args[0].implType} ${args[1].implType}`;
    const impl = typeMap.get(type);
    return this.operation(impl)(args[0], args[1]);
  }
}

// Bind unary operators the the correct method
// TODO: Maybe remove Impl requirement
type UnOp = (arg: ITerm) => ITerm;
interface IUnOpMap {
  [key: string]: UnOp;
}
const unOpMap: IUnOpMap = {
  [OpType.UN_PLUS]: (arg: ITerm) => new NumericLiteral(arg.unPlus()),
  [OpType.UN_MIN]: (arg: ITerm) => new NumericLiteral(arg.unMin()),
  [OpType.NOT]: (arg: ITerm) => new BooleanLiteral(arg.not()),
};

// Bind binary operators to the correct method
type BinOp = (left: ITerm, right: ITerm) => ITerm;
interface IBinOpMap {
  [key: string]: (impl: Impl) => BinOp;
}
const binOpMap: IBinOpMap = {
  // Boolean
  [OpType.AND]: (impl: Impl) => binBoolBinding(EBVAnd),
  [OpType.OR]: (impl: Impl) => binBoolBinding(EBVOr),
  [OpType.EQUAL]: (impl: Impl) => binBoolBinding(impl.rdfEqual),
  [OpType.NOTEQUAL]: (impl: Impl) => binBoolBinding(impl.rdfNotEqual),
  [OpType.LT]: (impl: Impl) => binBoolBinding(impl.lt),
  [OpType.GT]: (impl: Impl) => binBoolBinding(impl.gt),
  [OpType.LTE]: (impl: Impl) => binBoolBinding(impl.lte),
  [OpType.GTE]: (impl: Impl) => binBoolBinding(impl.gte),

  // Numeric
  [OpType.MULTIPLICATION]: (impl: Impl) => binNumBinding(impl.multiply),
  [OpType.DIVISION]: (impl: Impl) => binNumBinding(impl.divide),
  [OpType.ADDITION]: (impl: Impl) => binNumBinding(impl.multiply),
  [OpType.SUBTRACTION]: (impl: Impl) => binNumBinding(impl.subtract),
};

type NumOp = (left: ITerm, right: ITerm) => number;
function binNumBinding(op: NumOp): BinOp {
  return (left: ITerm, right: ITerm) => {
    return new NumericLiteral(op(left, right));
  };
}

type BoolOp = (left: ITerm, right: ITerm) => boolean;
function binBoolBinding(op: BoolOp): BinOp {
  return (left: ITerm, right: ITerm) => {
    return new BooleanLiteral(op(left, right));
  };
}

function EBVAnd(left: ITerm, right: ITerm): boolean {
  return left.toEBV() && right.toEBV();
}

function EBVOr(left: ITerm, right: ITerm) {
  return left.toEBV() || right.toEBV();
}

// Generate typeMap so no branching is needed;
// interface TypeKey { left: ImplType, right: ImplType }
type TypeKey = string;
const typeMap: Map<TypeKey, Impl> = (() => {
  const keyValues: [TypeKey, Impl][] = [];
  const term = new TermImpl();
  const num = new NumericImpl();
  const sim = new SimpleImpl();
  const str = new StringImpl();
  const bool = new BooleanImpl();
  const date = new DateTimeImpl();
  for (const t in ImplType) {
    for (const tt in ImplType) {
      const left: ImplType = (<any> ImplType)[t];
      const right: ImplType = (<any> ImplType)[tt];
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
      keyValues.push([`${left} ${right}`, impl]);
    }
  }
  return new Map(keyValues);
})();
