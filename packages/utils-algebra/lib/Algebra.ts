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
/**
 * Algebra operation taking a single operation as input.
 */
export type Single = Opened<Algebra.Single>;
/**
 * Algebra operation taking multiple operations as input.
 */
export type Multi = Opened<Algebra.Multi>;
/**
 * Algebra operation taking exactly two input operations.
 */
export type Double = Opened<Algebra.Double>;
export type AggregateExpression = Opened<Algebra.AggregateExpression>;
export type GroupConcatExpression = Opened<Algebra.GroupConcatExpression>;
export type ExistenceExpression = Opened<Algebra.ExistenceExpression>;
export type NamedExpression = Opened<Algebra.NamedExpression>;
export type OperatorExpression = Opened<Algebra.OperatorExpression>;
export type TermExpression = Opened<Algebra.TermExpression>;
export type WildcardExpression = Opened<Algebra.WildcardExpression>;
/**
 * Algebra operation representing the [Property path](https://www.w3.org/TR/sparql11-query/#propertypaths) alternative (`|`).
 * Property paths have a specific [SPARQL definition](https://www.w3.org/TR/sparql11-query/#sparqlPropertyPaths)
 */
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
/**
 * Algebra operation representing the [Property path](https://www.w3.org/TR/sparql11-query/#propertypaths) inverse (`^`).
 * Having a specific [SPARQL definition](https://www.w3.org/TR/sparql11-query/#sparqlPropertyPaths)
 * This operation, besides basic mode is the reason SPARQL can contain literals in the subject position.
 */
export type Inv = Opened<Algebra.Inv>;
export type Join = Opened<Algebra.Join>;
export type LeftJoin = Opened<Algebra.LeftJoin>;
/**
 * Algebra operation representing the property of a [Property path](https://www.w3.org/TR/sparql11-query/#propertypaths).
 * Property paths have a specific [SPARQL definition](https://www.w3.org/TR/sparql11-query/#sparqlPropertyPaths)
 * This operation, is just a way of saying to a Propery Path operation that nothing fancy is going on,
 * and it should just match this property.
 */
export type Link = Opened<Algebra.Link>;
export type Minus = Opened<Algebra.Minus>;
/**
 * An empty operation.
 * For example used for the algebra representation of a query string that does not contain any operation.
 */
export type Nop = Opened<Algebra.Nop>;
/**
 * Algebra operation representing the [Property path](https://www.w3.org/TR/sparql11-query/#propertypaths) negated property set (`!`).
 * Property paths have a specific [SPARQL definition](https://www.w3.org/TR/sparql11-query/#sparqlPropertyPaths)
 */
export type Nps = Opened<Algebra.Nps>;
/**
 * Algebra operation representing the [Property path](https://www.w3.org/TR/sparql11-query/#propertypaths) one or more (`+`).
 * Property paths have a specific [SPARQL definition](https://www.w3.org/TR/sparql11-query/#sparqlPropertyPaths)
 */
export type OneOrMorePath = Opened<Algebra.OneOrMorePath>;
export type OrderBy = Opened<Algebra.OrderBy>;
export type Path = Opened<Algebra.Path>;
/**
 * Simple BGP entry (triple)
 */
export type Pattern = Algebra.Pattern & withMeta;
export type Project = Opened<Algebra.Project>;
export type Reduced = Opened<Algebra.Reduced>;
/**
 * Algebra operation representing the [Property path](https://www.w3.org/TR/sparql11-query/#propertypaths) sequence (`/`).
 * Property paths have a specific [SPARQL definition](https://www.w3.org/TR/sparql11-query/#sparqlPropertyPaths)
 */
export type Seq = Opened<Algebra.Seq>;
export type Service = Opened<Algebra.Service>;
export type Slice = Opened<Algebra.Slice>;
export type Union = Opened<Algebra.Union>;
/**
 * Algebra operation representing the [VALUES pattern](https://www.w3.org/TR/sparql11-query/#inline-data)
 * Has a list of variables that will be assigned.
 * The assignments are represented as a list of object containing bindings.
 * Each binging links the variable value to the appropriate Term for this binding.
 * Does not take any input.
 */
export type Values = Opened<Algebra.Values>;
/**
 * Algebra operation representing the [Property path](https://www.w3.org/TR/sparql11-query/#propertypaths) zero or more (`*`).
 * The having specific [SPARQL definition](https://www.w3.org/TR/sparql11-query/#sparqlPropertyPaths)
 */
export type ZeroOrMorePath = Opened<Algebra.ZeroOrMorePath>;
/**
 * Algebra operation representing the [Property path](https://www.w3.org/TR/sparql11-query/#propertypaths) zero or one (`?`).
 * The having specific [SPARQL definition](https://www.w3.org/TR/sparql11-query/#sparqlPropertyPaths)
 */
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
