import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import type { Algebra } from 'sparqlalgebrajs';
import type { BindingsStream } from './Bindings';
import type { IActionContext } from './IActionContext';
import type { MetadataBindings } from './IMetadata';

export interface IQuerySourceSerialized extends IQuerySourceUnidentifiedExpanded {
  type?: 'serialized';
  value: string;
  mediaType: string;
  baseIRI?: string;
}

export interface IQuerySourceUnidentifiedExpanded {
  type?: string;
  value: string | RDF.Source | RDF.Store;
  context?: IActionContext;
}

export interface IQuerySourceUnidentifiedExpandedRawContext {
  type?: string;
  value: string | RDF.Source | RDF.Store;
  context?: Record<string, any>;
}

export type QuerySourceUnidentifiedExpanded = IQuerySourceUnidentifiedExpanded | IQuerySourceSerialized;
export type QuerySourceUnidentified = string | RDF.Source | RDF.Store | QuerySourceUnidentifiedExpanded |
IQuerySourceUnidentifiedExpandedRawContext;

/**
 * Attaches a context to a query target.
 */
export interface IQuerySourceWrapper<Q extends IQuerySource = IQuerySource> {
  source: Q;
  context?: IActionContext;
}

export type QuerySourceReference = string | RDF.Source;

/**
 * A lazy query source.
 */
export interface IQuerySource {
  /**
   * The URL of RDF source of this source.
   */
  referenceValue: QuerySourceReference;

  /**
   * Get the selector type that is supported by this source.
   * @param context The action context.
   */
  getSelectorShape: (context: IActionContext) => Promise<FragmentSelectorShape>;

  /**
   * Returns a (possibly lazy) stream that returns all bindings matching the operation.
   *
   * Passed operations MUST conform to the query shape exposed by the selector type returned from `getSelectorShape`.
   * The given operation represents a Linked Data Fragments selector.
   *
   * The returned stream MUST expose the property 'metadata' of type `MetadataBindings`.
   * The implementor is reponsible for handling cases where 'metadata'
   * is being called without the stream being in flow-mode.
   * This metadata object can become invalidated (see `metadata.state`),
   * in which case the 'metadata' property must and will be updated.
   *
   * @param {Algebra.Operation} operation The query operation to execute.
   * @param {IActionContext} context      The query context.
   * @param {BindingsStream} options      Options for querying bindings
   * @return {AsyncIterator<RDF.Quad>} The resulting bindings stream.
   *
   * @see https://linkeddatafragments.org/specification/linked-data-fragments/#selectors
   */
  queryBindings: (
    operation: Algebra.Operation,
    context: IActionContext,
    options?: IQueryBindingsOptions,
  ) => BindingsStream;

  /**
   * Returns a (possibly lazy) stream that returns all quads matching the operation.
   *
   * This method should only be supported if the selector type returned from `getSelectorShape`
   * supports construct queries.
   *
   * @param {Algebra.Operation} operation The query operation to execute.
   * @param {IActionContext} context      The query context.
   * @return {AsyncIterator<RDF.Quad>}    The resulting quads stream.
   */
  queryQuads: (
    operation: Algebra.Operation,
    context: IActionContext,
  ) => AsyncIterator<RDF.Quad>;

  /**
   * Returns a promise resolving to the ask response of the given operation.
   *
   * This method should only be supported if the selector type returned from `getSelectorShape`
   * supports ask queries.
   *
   * @param {Algebra.Operation} operation The query operation to execute.
   * @param {IActionContext} context      The query context.
   * @return {Promise<boolean>}           The resulting ask reply.
   */
  queryBoolean: (
    operation: Algebra.Ask,
    context: IActionContext,
  ) => Promise<boolean>;

  /**
   * Returns a promise resolving when the given update operation succeeds.
   *
   * This method should only be supported if the selector type returned from `getSelectorShape`
   * supports update queries.
   *
   * @param {Algebra.Operation} operation The query operation to execute.
   * @param {IActionContext} context      The query context.
   * @return {Promise<boolean>}           The void response.
   */
  queryVoid: (
    operation: Algebra.Update,
    context: IActionContext,
  ) => Promise<void>;

  /**
   * Returns a string representation of this source.
   */
  toString: () => string;
}

export interface IQueryBindingsOptions {
  /**
   * Bindings that must be joined by the source together with the operation.
   * This can only be done if the source accepts joinBindings in the selector shape.
   *
   * The passed bindings may optionally apply to different variables than the query.
   * If this is not the case, then `filterBindings` should be used instead.
   */
  joinBindings?: { bindings: BindingsStream; metadata: MetadataBindings };
  /**
   * Bindings to filter the query operation's result by.
   * This can only be done if the source accepts filterBindings in the selector shape.
   *
   * The caller of this function should ensure that only bindings are being passed that are applicable to the query,
   * which means that a projection and filtering step might be needed beforehand.
   */
  filterBindings?: { bindings: BindingsStream; metadata: MetadataBindings };
}

/**
 * A fragment selector shape determines the shape of selectors that can be executed by a query source.
 * Selectors conforming to this shape represent boolean functions to decide if triples belong to a query response.
 * @see https://linkeddatafragments.org/specification/linked-data-fragments/#selectors
 */
export type FragmentSelectorShape = {
  type: 'operation';
  /**
   * The supported operation.
   */
  operation: {
    operationType: 'type';
    type: Algebra.types;
  } | {
    operationType: 'pattern';
    pattern: Algebra.Operation;
  } | {
    /**
     * All possible operations are accepted by this shape.
     */
    operationType: 'wildcard';
  };
  /**
   * Variables that are in-scope in this operation and its children.
   */
  scopedVariables?: RDF.Variable[];
  /**
   * Variables that must be passed to the selector when instantiated.
   */
  variablesRequired?: RDF.Variable[];
  /**
   * Variables that may be passed to the selector when instantiated.
   */
  variablesOptional?: RDF.Variable[];
  /**
   * Children of this operation.
   */
  children?: FragmentSelectorShape[];
  /**
   * If bindings can be passed into the source as a join.
   */
  joinBindings?: true;
  /**
   * If bindings can be passed into the source as a filter.
   */
  filterBindings?: true;
} | {
  type: 'conjunction';
  children: FragmentSelectorShape[];
} | {
  type: 'disjunction';
  children: FragmentSelectorShape[];
} | {
  type: 'arity';
  min?: number;
  max?: number;
  child: FragmentSelectorShape;
};

// ----- Examples of FragmentSelectorShapes -----
// const AF = new Factory();
// const DF = new DataFactory();
// const shapeTpf: FragmentSelectorShape = {
//   type: 'operation',
//   operation: { pattern: AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')) },
//   variablesOptional: [
//     DF.variable('s'),
//     DF.variable('p'),
//     DF.variable('o'),
//   ],
// };
//
// const shapeQpf: FragmentSelectorShape = {
//   type: 'operation',
//   operation: { pattern: AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.variable('g')) },
//   variablesOptional: [
//     DF.variable('s'),
//     DF.variable('p'),
//     DF.variable('o'),
//     DF.variable('g'),
//   ],
// };
//
// const shapeBrTpf: FragmentSelectorShape = {
//   type: 'operation',
//   operation: { pattern: AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')) },
//   variablesOptional: [
//     DF.variable('s'),
//     DF.variable('p'),
//     DF.variable('o'),
//   ],
//   addBindings: true,
// };
//
// const shapeSparqlEp: FragmentSelectorShape = { // Same as SaGe
//   type: 'disjunction',
//   children: [
//     {
//       type: 'operation',
//       operation: { type: Algebra.types.PROJECT },
//     },
//     {
//       type: 'operation',
//       operation: { type: Algebra.types.CONSTRUCT },
//     },
//     {
//       type: 'operation',
//       operation: { type: Algebra.types.DESCRIBE },
//     },
//     {
//       type: 'operation',
//       operation: { type: Algebra.types.ASK },
//     },
//     {
//       type: 'operation',
//       operation: { type: Algebra.types.COMPOSITE_UPDATE },
//     },
//   ],
// };
//
// // Example of request:
// //   Find ?s matching "?s dbo:country dbr:norway. ?s dbo:award ?o2. ?s dbo:birthDate ?o3."
// const shapeSpf: FragmentSelectorShape = {
//   type: 'operation',
//   operation: { type: Algebra.types.BGP },
//   scopedVariables: [
//     DF.variable('s'),
//   ],
//   children: [
//     {
//       type: 'arity',
//       min: 1,
//       max: Number.POSITIVE_INFINITY,
//       child: {
//         type: 'operation',
//         operation: { pattern: AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')) },
//         variablesOptional: [
//           DF.variable('p'),
//           DF.variable('o'),
//         ],
//       },
//     },
//   ],
//   addBindings: true,
// };
//
// // Example of requests:
// //   - brTPF
// //   - Find all ?s and ?o matching "?s db:country ?o"
// const shapeSmartKg: FragmentSelectorShape = {
//   type: 'disjunction',
//   children: [
//     {
//       type: 'operation',
//       operation: { pattern: AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')) },
//       variablesOptional: [
//         DF.variable('s'),
//         DF.variable('p'),
//         DF.variable('o'),
//       ],
//       addBindings: true,
//     },
//     {
//       type: 'operation',
//       operation: { type: Algebra.types.BGP },
//       children: [
//         {
//           type: 'arity',
//           min: 1,
//           max: Number.POSITIVE_INFINITY,
//           child: {
//             type: 'operation',
//             operation: { pattern: AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')) },
//             variablesRequired: [
//               DF.variable('p'),
//             ],
//           },
//         },
//       ],
//     },
//   ],
// };
