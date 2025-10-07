import type { Patch } from '@traqula/core';
import { TransformerSubType } from '@traqula/core';
import type * as Algebra from './KnownAlgebra';

export {
  BaseOperation,
  BaseExpression,
  Types,
  ExpressionTypes,
} from './KnownAlgebra';

export function asKnown<T extends object>(arg: T): CloseSingle<T> {
  return <any> arg;
}

export function asSemiKnown<T extends object>(arg: T): Extract<SemiOperation, T> {
  return <any> arg;
}

export function asOpen<T extends object>(arg: T): OpenSingle<T> {
  return <any> arg;
}

export function isKnownOperation<T extends string>(val: { type: unknown }, type: T):
  val is Extract<SemiOperation, { type: T }> extends object ?
    Extract<SemiOperation, { type: T }> : { type: T } {
  return val.type === type;
}

export function isKnownSub<T extends string, Obj extends { type: string; subType: unknown }>(val: Obj, type: T):
  val is Extract<SemiOperation, { type: Obj['type']; subType: T }> extends object ?
    Obj & Extract<SemiOperation, { type: Obj['type']; subType: T }> : Obj & { subType: T } {
  return val.subType === type;
}

export function isKnownOperationSub<Type extends string, SubType extends string>(
  val: { type: unknown; subType?: unknown },
  type: Type,
  subType: SubType,
):
  val is Extract<SemiOperation, { type: Type; subType: SubType }> extends object ?
    Extract<SemiOperation, { type: Type; subType: SubType }> : { type: Type; subType: SubType } {
  return val.type === type && val.subType === subType;
}

// ----------------------- manipulators --------------------

const transformer = new TransformerSubType<SemiOperation>({ shallowKeys: [ 'metadata' ], ignoreKeys: [ 'metadata' ]});
export const mapOperationReplace = transformer.transformNode.bind(transformer);
export const mapOperationSubReplace = transformer.transformNodeSpecific.bind(transformer);
export const recurseOperationReplace = transformer.visitNode.bind(transformer);
export const recurseOperationSubReplace = transformer.visitNodeSpecific.bind(transformer);

// https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types
export type OpenSingle<T> = [T] extends [any[]] ? OpenSingle<T[number]>[] :
    [T] extends [Algebra.Pattern] ? Algebra.Pattern :
        [T] extends [Algebra.Expression] ? Algebra.BaseExpression :
            [T] extends [Algebra.Operation] ? Algebra.BaseOperation : T;

export type CloseSingle<T> = T extends any[] ? CloseSingle<T[number]>[] :
  T extends BoundAggregate ? Algebra.BoundAggregate :
    T extends Algebra.BaseExpression ? Algebra.Expression :
      T extends Algebra.BaseOperation ? Algebra.Operation : T;

export type Opened<T extends object> = {[K in keyof T]: OpenSingle<T[K]> };
export type Closed<T extends object > = {[K in keyof T]: CloseSingle<T[K]> };

export type Operation = Algebra.BaseOperation;
export type Expression = Algebra.BaseExpression;

export type SemiOperation = Ask | SemiExpression | Bgp | Construct | Describe | Distinct | Extend | From | Filter
  | Graph | Group | Join | LeftJoin | Minus | Nop | OrderBy | Path | Pattern | Project | SemiPropertyPathSymbol
  | Reduced | Service | Slice | Union | Values | SemiUpdate | CompositeUpdate;
export type SemiExpression = AggregateExpression | GroupConcatExpression | ExistenceExpression | NamedExpression |
  OperatorExpression | TermExpression | WildcardExpression | BoundAggregate;
export type SemiPropertyPathSymbol = Alt | Inv | Link | Nps | OneOrMorePath | Seq | ZeroOrMorePath | ZeroOrOnePath;
export type SemiUpdate = DeleteInsert | Load | Clear | Create | Drop | Add | Move | Copy;

export type TypedOperation<T extends Algebra.Types> = Extract<SemiOperation, { type: T }>;
export type TypedExpression<T extends Algebra.ExpressionTypes> = Extract<SemiOperation, { subType: T }>;

export type Single = Opened<Algebra.Single>;
export type Multi = Opened<Algebra.Multi>;
export type Double = Opened<Algebra.Double>;
export type AggregateExpression = Opened<Algebra.AggregateExpression>;
export type GroupConcatExpression = Opened<Algebra.GroupConcatExpression>;
export type ExistenceExpression = Opened<Algebra.ExistenceExpression>;
export type NamedExpression = Opened<Algebra.NamedExpression>;
export type OperatorExpression = Opened<Algebra.OperatorExpression>;
export type TermExpression = Opened<Algebra.TermExpression>;
export type WildcardExpression = Opened<Algebra.WildcardExpression>;
export type Alt = Opened<Algebra.Alt>;
export type Ask = Opened<Algebra.Ask>;
export type Bgp = Opened<Algebra.Bgp>;
export type Construct = Opened<Algebra.Construct>;
export type Describe = Opened<Algebra.Describe>;
export type Distinct = Opened<Algebra.Distinct>;
export type Extend = Opened<Algebra.Extend>;
export type From = Opened<Algebra.From>;
export type Filter = Opened<Algebra.Filter>;
export type Graph = Opened<Algebra.Graph>;
export type BoundAggregate = Opened<Algebra.BoundAggregate>;
export type Group = Patch<Opened<Algebra.Group>, { aggregates: BoundAggregate[] }>;
export type Inv = Opened<Algebra.Inv>;
export type Join = Opened<Algebra.Join>;
export type LeftJoin = Opened<Algebra.LeftJoin>;
export type Link = Opened<Algebra.Link>;
export type Minus = Opened<Algebra.Minus>;
export type Nop = Opened<Algebra.Nop>;
export type Nps = Opened<Algebra.Nps>;
export type OneOrMorePath = Opened<Algebra.OneOrMorePath>;
export type OrderBy = Opened<Algebra.OrderBy>;
export type Path = Opened<Algebra.Path>;
export type Pattern = Algebra.Pattern;
export type Project = Opened<Algebra.Project>;
export type Reduced = Opened<Algebra.Reduced>;
export type Seq = Opened<Algebra.Seq>;
export type Service = Opened<Algebra.Service>;
export type Slice = Opened<Algebra.Slice>;
export type Union = Opened<Algebra.Union>;
export type Values = Opened<Algebra.Values>;
export type ZeroOrMorePath = Opened<Algebra.ZeroOrMorePath>;
export type ZeroOrOnePath = Opened<Algebra.ZeroOrOnePath>;
export type CompositeUpdate = Opened<Algebra.CompositeUpdate>;
export type DeleteInsert = Opened<Algebra.DeleteInsert>;
export type UpdateGraph = Opened<Algebra.UpdateGraph>;
export type Load = Opened<Algebra.Load>;
export type Clear = Opened<Algebra.Clear>;
export type Create = Opened<Algebra.Create>;
export type Drop = Opened<Algebra.Drop>;
export type UpdateGraphShortcut = Opened<Algebra.UpdateGraphShortcut>;
export type Add = Opened<Algebra.Add>;
export type Move = Opened<Algebra.Move>;
export type Copy = Opened<Algebra.Copy>;
