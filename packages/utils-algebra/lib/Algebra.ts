/**
 * We redefine our algebra components to use interfaces instead of type unions.
 * Thereby opening up the algebra for unknown extensions
 */

import type * as RDF from '@rdfjs/types';
import type { Algebra } from '@traqula/algebra-transformations-1-2';
import type { Patch } from '@traqula/core';
import type { QuadTermName } from 'rdf-terms';
import type { TypesComunica } from './TypesComunica';

export { Types, ExpressionTypes } from '@traqula/algebra-transformations-1-2';

type withMeta = { metadata?: Record<string, unknown> };

// Base types
/**
 * Represents the base interface for all SPARQL algebra operations, extended with optional metadata.
 */
export type BaseOperation = Algebra.BaseOperation & withMeta;
/**
 * Represents the base interface for all SPARQL algebra expressions, extended with optional metadata.
 */
export type BaseExpression = Algebra.BaseExpression & withMeta;
/**
 * Represents any SPARQL algebra operation.
 */
export type Operation = BaseOperation;
/**
 * Represents any SPARQL algebra expression.
 */
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
/**
 * Union of all recognized SPARQL algebra operation types, including queries, expressions,
 * property paths, and update operations.
 */
export type KnownOperation = Ask | KnownExpression | Bgp | Construct | Describe | Distinct | Extend | From | Filter
  | Graph | Group | Join | LeftJoin | Minus | Nop | OrderBy | Path | Pattern | Project | KnownPropertyPathSymbol
  | Reduced | Service | Slice | Union | Values | KnownUpdate | CompositeUpdate | Nodes | DistinctTerms;
/**
 * Union of all recognized SPARQL algebra expression types, such as aggregates, existence checks,
 * named functions, operators, terms, and wildcards.
 */
export type KnownExpression = AggregateExpression | GroupConcatExpression | ExistenceExpression | NamedExpression |
  OperatorExpression | TermExpression | WildcardExpression | BoundAggregate;
/**
 * Union of all recognized SPARQL property path symbol types, including alternatives, inverses,
 * links, negated property sets, and repetition paths.
 */
export type KnownPropertyPathSymbol = Alt | Inv | Link | Nps | OneOrMorePath | Seq | ZeroOrMorePath | ZeroOrOnePath;
/**
 * Union of all recognized SPARQL Update operation types, such as DELETE/INSERT, LOAD, CLEAR,
 * CREATE, DROP, ADD, MOVE, and COPY.
 */
export type KnownUpdate = DeleteInsert | Load | Clear | Create | Drop | Add | Move | Copy;

/**
 * Extracts the specific operation type from {@link KnownOperation} that matches the given algebra type identifier.
 * @template T The algebra type identifier to match against.
 */
export type TypedOperation<T extends Algebra.Types> = Extract<KnownOperation, { type: T }>;
/**
 * Extracts the specific expression type from {@link KnownOperation} that matches the given expression type identifier.
 * @template T The expression type identifier to match against.
 */
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
/**
 * Represents a SPARQL aggregate expression such as COUNT, SUM, MIN, MAX, AVG, or SAMPLE.
 * @see https://www.w3.org/TR/sparql11-query/#aggregates
 */
export type AggregateExpression = Opened<Algebra.AggregateExpression>;
/**
 * Represents the SPARQL GROUP_CONCAT aggregate expression that concatenates string values.
 * @see https://www.w3.org/TR/sparql11-query/#defn_aggGroupConcat
 */
export type GroupConcatExpression = Opened<Algebra.GroupConcatExpression>;
/**
 * Represents a SPARQL EXISTS or NOT EXISTS expression that tests for the presence of a pattern.
 * @see https://www.w3.org/TR/sparql11-query/#neg-pattern
 */
export type ExistenceExpression = Opened<Algebra.ExistenceExpression>;
/**
 * Represents a named function call expression in SPARQL, identified by an IRI.
 * @see https://www.w3.org/TR/sparql11-query/#funcex
 */
export type NamedExpression = Opened<Algebra.NamedExpression>;
/**
 * Represents a built-in operator expression in SPARQL, such as arithmetic or logical operators.
 * @see https://www.w3.org/TR/sparql11-query/#expressions
 */
export type OperatorExpression = Opened<Algebra.OperatorExpression>;
/**
 * Represents a SPARQL expression wrapping a single RDF term literal or variable.
 */
export type TermExpression = Opened<Algebra.TermExpression>;
/**
 * Represents the wildcard (`*`) expression, typically used with `COUNT(*)`.
 */
export type WildcardExpression = Opened<Algebra.WildcardExpression>;
/**
 * Algebra operation representing the [Property path](https://www.w3.org/TR/sparql11-query/#propertypaths) alternative (`|`).
 * Property paths have a specific [SPARQL definition](https://www.w3.org/TR/sparql11-query/#sparqlPropertyPaths)
 */
export type Alt = Opened<Algebra.Alt>;
/**
 * Represents a SPARQL ASK query that tests whether a graph pattern has any solution.
 * @see https://www.w3.org/TR/sparql11-query/#ask
 */
export type Ask = Opened<Algebra.Ask>;
/**
 * Represents a Basic Graph Pattern (BGP) containing a set of triple patterns to match.
 * @see https://www.w3.org/TR/sparql11-query/#BasicGraphPatterns
 */
export type Bgp = Opened<Algebra.Bgp>;
/**
 * Represents a SPARQL CONSTRUCT query that builds an RDF graph from a template and pattern.
 * @see https://www.w3.org/TR/sparql11-query/#construct
 */
export type Construct = Opened<Algebra.Construct>;
/**
 * Represents a SPARQL DESCRIBE query that returns information about specified resources.
 * @see https://www.w3.org/TR/sparql11-query/#describe
 */
export type Describe = Opened<Algebra.Describe>;
/**
 * Represents the SPARQL DISTINCT solution modifier that eliminates duplicate solutions.
 * @see https://www.w3.org/TR/sparql11-query/#modDuplicates
 */
export type Distinct = Opened<Algebra.Distinct>;
/**
 * Represents a SPARQL BIND operation that assigns the result of an expression to a variable.
 * @see https://www.w3.org/TR/sparql11-query/#bind
 */
export type Extend = Opened<Algebra.Extend>;
/**
 * Represents the SPARQL FROM and FROM NAMED clauses that specify the default and named graphs of a dataset.
 * @see https://www.w3.org/TR/sparql11-query/#specifyingDataset
 */
export type From = Opened<Algebra.From>;
/**
 * Represents a SPARQL FILTER operation that restricts solutions based on a boolean expression.
 * @see https://www.w3.org/TR/sparql11-query/#expressions
 */
export type Filter = Opened<Algebra.Filter>;
/**
 * Represents a SPARQL GRAPH clause for matching patterns against a specific named graph.
 * @see https://www.w3.org/TR/sparql11-query/#queryDataset
 */
export type Graph = Opened<Algebra.Graph>;
/**
 * Represents an aggregate expression bound to a specific output variable.
 */
export type BoundAggregate = Opened<Algebra.BoundAggregate>;
/**
 * Represents a SPARQL GROUP BY operation that partitions solutions into groups based on expressions.
 * @see https://www.w3.org/TR/sparql11-query/#groupby
 */
export type Group = Patch<Opened<Algebra.Group>, { aggregates: BoundAggregate[] }>;
/**
 * Algebra operation representing the [Property path](https://www.w3.org/TR/sparql11-query/#propertypaths) inverse (`^`).
 * Having a specific [SPARQL definition](https://www.w3.org/TR/sparql11-query/#sparqlPropertyPaths)
 * This operation, besides basic mode is the reason SPARQL can contain literals in the subject position.
 */
export type Inv = Opened<Algebra.Inv>;
/**
 * Represents a SPARQL join of two or more graph patterns, producing combined solution mappings.
 * @see https://www.w3.org/TR/sparql11-query/#sparqlAlgebra
 */
export type Join = Opened<Algebra.Join>;
/**
 * Represents a SPARQL OPTIONAL (left outer join) operation that preserves all left-side solutions.
 * @see https://www.w3.org/TR/sparql11-query/#optionals
 */
export type LeftJoin = Opened<Algebra.LeftJoin>;
/**
 * Algebra operation representing the property of a [Property path](https://www.w3.org/TR/sparql11-query/#propertypaths).
 * Property paths have a specific [SPARQL definition](https://www.w3.org/TR/sparql11-query/#sparqlPropertyPaths)
 * This operation, is just a way of saying to a Propery Path operation that nothing fancy is going on,
 * and it should just match this property.
 */
export type Link = Opened<Algebra.Link>;
/**
 * Represents a SPARQL MINUS operation that removes solutions compatible with a given pattern.
 * @see https://www.w3.org/TR/sparql11-query/#neg-minus
 */
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
/**
 * Represents a SPARQL ORDER BY clause that sorts query solutions by one or more expressions.
 * @see https://www.w3.org/TR/sparql11-query/#modOrderBy
 */
export type OrderBy = Opened<Algebra.OrderBy>;
/**
 * Represents a SPARQL property path expression used in a triple pattern.
 * @see https://www.w3.org/TR/sparql11-query/#propertypaths
 */
export type Path = Opened<Algebra.Path>;
/**
 * Simple BGP entry (triple)
 */
export type Pattern = Algebra.Pattern & withMeta;
/**
 * Represents a SPARQL SELECT projection that restricts solutions to specified variables.
 * @see https://www.w3.org/TR/sparql11-query/#select
 */
export type Project = Opened<Algebra.Project>;
/**
 * Represents the SPARQL REDUCED solution modifier that permits elimination of some duplicate solutions.
 * @see https://www.w3.org/TR/sparql11-query/#modDuplicates
 */
export type Reduced = Opened<Algebra.Reduced>;
/**
 * Algebra operation representing the [Property path](https://www.w3.org/TR/sparql11-query/#propertypaths) sequence (`/`).
 * Property paths have a specific [SPARQL definition](https://www.w3.org/TR/sparql11-query/#sparqlPropertyPaths)
 */
export type Seq = Opened<Algebra.Seq>;
/**
 * Represents a SPARQL SERVICE clause for executing a graph pattern against a remote SPARQL endpoint.
 * @see https://www.w3.org/TR/sparql11-federated-query/
 */
export type Service = Opened<Algebra.Service>;
/**
 * Represents SPARQL LIMIT and OFFSET modifiers that select a subset of solutions.
 * @see https://www.w3.org/TR/sparql11-query/#modResultLimit
 */
export type Slice = Opened<Algebra.Slice>;
/**
 * Represents a SPARQL UNION operation that combines solutions from alternative graph patterns.
 * @see https://www.w3.org/TR/sparql11-query/#alternatives
 */
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
/**
 * Represents a sequence of SPARQL Update operations executed in order.
 * @see https://www.w3.org/TR/sparql11-update/
 */
export type CompositeUpdate = Opened<Algebra.CompositeUpdate>;
/**
 * Represents a SPARQL DELETE/INSERT update operation that modifies graph data based on a pattern.
 * @see https://www.w3.org/TR/sparql11-update/#deleteInsert
 */
export type DeleteInsert = Opened<Algebra.DeleteInsert>;
/**
 * Represents a graph specification within a SPARQL Update operation, identifying the target graph.
 */
export type UpdateGraph = Opened<Algebra.UpdateGraph>;
/**
 * Represents a SPARQL LOAD operation that loads an RDF document into a graph.
 * @see https://www.w3.org/TR/sparql11-update/#load
 */
export type Load = Opened<Algebra.Load>;
/**
 * Represents a SPARQL CLEAR operation that removes all triples from one or more graphs.
 * @see https://www.w3.org/TR/sparql11-update/#clear
 */
export type Clear = Opened<Algebra.Clear>;
/**
 * Represents a SPARQL CREATE operation that creates a new empty named graph.
 * @see https://www.w3.org/TR/sparql11-update/#create
 */
export type Create = Opened<Algebra.Create>;
/**
 * Represents a SPARQL DROP operation that removes a named graph entirely.
 * @see https://www.w3.org/TR/sparql11-update/#drop
 */
export type Drop = Opened<Algebra.Drop>;
/**
 * Represents the base type for graph management shortcut operations (ADD, MOVE, COPY).
 * @see https://www.w3.org/TR/sparql11-update/#graphManagement
 */
export type UpdateGraphShortcut = Opened<Algebra.UpdateGraphShortcut>;
/**
 * Represents a SPARQL ADD operation that copies all triples from one graph into another.
 * @see https://www.w3.org/TR/sparql11-update/#add
 */
export type Add = Opened<Algebra.Add>;
/**
 * Represents a SPARQL MOVE operation that moves all triples from one graph to another, replacing the destination.
 * @see https://www.w3.org/TR/sparql11-update/#move
 */
export type Move = Opened<Algebra.Move>;
/**
 * Represents a SPARQL COPY operation that replaces a destination graph with the contents of a source graph.
 * @see https://www.w3.org/TR/sparql11-update/#copy
 */
export type Copy = Opened<Algebra.Copy>;

/**
 * A non-standard operator to represent the nodes of a graph.
 * It returns all nodes (subjects or objects) in the graph.
 * https://www.w3.org/TR/sparql12-query/#defn_nodeSet
 */
export interface NodesUnopened extends BaseOperation {
  type: TypesComunica.NODES;
  graph: RDF.Term;
  variable: RDF.Variable;
}
/**
 * Represents the opened variant of the non-standard nodes operator that returns all nodes in a graph.
 * @see https://www.w3.org/TR/sparql12-query/#defn_nodeSet
 */
export type Nodes = Opened<NodesUnopened>;

/**
 * A non-standard operator to represent distinct values of specific terms.
 * It returns distinct combinations of the specified quad term positions.
 */
export interface DistinctTermsUnopened extends BaseOperation {
  type: TypesComunica.DISTINCT_TERMS;
  variables: RDF.Variable[];
  terms: Record<string, QuadTermName>;
}
/**
 * Represents the opened variant of the non-standard distinct terms operator
 * that returns distinct quad term combinations.
 */
export type DistinctTerms = Opened<DistinctTermsUnopened>;
