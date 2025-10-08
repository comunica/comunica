/**
 * We redefine our algebra components to use interfaces instead of type unions.
 * Thereby opening up the algebra for unknown extensions
 */

import type { Algebra } from '@traqula/algebra-transformations-1-2';
import type { Patch } from '@traqula/core';

export { Types, ExpressionTypes } from '@traqula/algebra-transformations-1-2';

type withMeta = { metadata?: Record<string, unknown> };

// Base types
export type BaseOperation = Algebra.BaseOperation & withMeta;
export type BaseExpression = Algebra.BaseExpression & withMeta;
export type Operation = BaseOperation;
export type Expression = BaseExpression;

// https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types
/**
 * Maps algebra operation (as union types) Algebra.baseOperations (as interface) as values,
 * staying as precises as possible, and also working on arrays.
 */
export type OpenSingle<T> = [T] extends [any[]] ? OpenSingle<T[number]>[] :
    [T] extends [Algebra.Pattern] ? Algebra.Pattern & withMeta :
        [T] extends [Algebra.Expression] ? Expression :
            [T] extends [Algebra.Operation] ? Operation : T;

/**
 * Reverse operation of OpenSingle
 */
export type CloseSingle<T> = T extends any[] ? CloseSingle<T[number]>[] :
  T extends BoundAggregate ? Algebra.BoundAggregate :
    T extends Algebra.BaseExpression ? Algebra.Expression :
      T extends Algebra.BaseOperation ? Algebra.Operation : T;

/**
 * Maps a single object or array containing values of type algebra operation (as union types)
 * the same type but having Algebra.baseOperations (as interface) as values.
 */
export type Opened<T extends object> = {[K in keyof T]: OpenSingle<T[K]> } & withMeta;
/**
 * Reversed of Opened
 */
export type Closed<T extends object > = {[K in keyof T]: CloseSingle<T[K]> };

// Redefinitions of types
export type KnownOperation = Ask | KnownExpression | Bgp | Construct | Describe | Distinct | Extend | From | Filter
  | Graph | Group | Join | LeftJoin | Minus | Nop | OrderBy | Path | Pattern | Project | KnownPropertyPathSymbol
  | Reduced | Service | Slice | Union | Values | KnownUpdate | CompositeUpdate;
export type KnownExpression = AggregateExpression | GroupConcatExpression | ExistenceExpression | NamedExpression |
  OperatorExpression | TermExpression | WildcardExpression | BoundAggregate;
export type KnownPropertyPathSymbol = Alt | Inv | Link | Nps | OneOrMorePath | Seq | ZeroOrMorePath | ZeroOrOnePath;
export type KnownUpdate = DeleteInsert | Load | Clear | Create | Drop | Add | Move | Copy;

export type TypedOperation<T extends Algebra.Types> = Extract<KnownOperation, { type: T }>;
export type TypedExpression<T extends Algebra.ExpressionTypes> = Extract<KnownOperation, { subType: T }>;

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
export type Pattern = Algebra.Pattern & withMeta;
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
