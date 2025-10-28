import type * as RDF from '@rdfjs/types';
import type { Algebra as TraqulaAlgebra } from '@traqula/algebra-transformations-1-2';
import { algebraUtils, Types } from '@traqula/algebra-transformations-1-2';
import { TransformerSubTyped } from '@traqula/core';
import type { KnownOperation, Operation } from './Algebra';

export const resolveIRI = algebraUtils.resolveIRI;
export const objectify = algebraUtils.objectify;

/**
 * Type guard that checks if an operation is of a certain type and subType known by Comunica.
 * In case the type and subtype matches one known by Comunica,
 * the type guard will conclude the operation contains all member Comunica expects from this operation-type and subtype.
 * @param val
 * @param type
 * @param subType
 */
export function isKnownOperation<
  Type extends KnownOperation['type'],
  SubType extends Extract<KnownOperation, { type: Type }>['subType'] | undefined = undefined,
>(val: Operation, type: Type, subType?: SubType): val is
  SubType extends undefined ? (
    Extract<KnownOperation, { type: Type }> extends object ?
      Extract<KnownOperation, { type: Type }> : { type: Type }
  ) : Extract<KnownOperation, { type: Type; subType: SubType }> extends object ?
    Extract<KnownOperation, { type: Type; subType: SubType }> : { type: Type; subType: SubType } {
  return val.type === type && val.subType === subType;
}

/**
 * Type guard that checks if an operation is of a certain subType known by Comunica.
 * In case the subtype matches one known by Comunica,
 * the type guard will conclude the operation contains all member Comunica expects from this operation-subtype
 * @param val
 * @param subType
 */
export function isKnownSubType<
  SubType extends KnownOperation['subType'],
  Obj extends Operation,
>(val: Obj, subType: SubType):
  val is Extract<KnownOperation, { type: Obj['type']; subType: SubType }> extends object ?
    Obj & Extract<KnownOperation, { type: Obj['type']; subType: SubType }> : Obj & { subType: SubType } {
  return val.subType === subType;
}

// ----------------------- manipulators --------------------

type _NeedRefForReusabilityWithoutExplicitTypeDefinition = TraqulaAlgebra.Operation;
const transformer = new TransformerSubTyped<KnownOperation>({
  /**
   * Metadata often contains references to actors,
   * the transformer should not copy these actors, nor should it traverse the actors when visitingOperations.
   * (since there can be cycles involved).
   * It should however still make a shallowCopy from the metadata object, but not map over it.
   */
  shallowKeys: new Set([ 'metadata' ]),
  ignoreKeys: new Set([ 'metadata' ]),
}, {
  // Optimization that causes search tree pruning
  [Types.PATTERN]: { ignoreKeys: new Set([ 'subject', 'predicate', 'object', 'graph', 'metadata' ]) },
  [Types.EXPRESSION]: { ignoreKeys: new Set([ 'name', 'term', 'wildcard', 'variable', 'metadata' ]) },
  [Types.DESCRIBE]: { ignoreKeys: new Set([ 'terms', 'metadata' ]) },
  [Types.EXTEND]: { ignoreKeys: new Set([ 'variable', 'metadata' ]) },
  [Types.FROM]: { ignoreKeys: new Set([ 'default', 'named', 'metadata' ]) },
  [Types.GRAPH]: { ignoreKeys: new Set([ 'name', 'metadata' ]) },
  [Types.GROUP]: { ignoreKeys: new Set([ 'variables', 'metadata' ]) },
  [Types.LINK]: { ignoreKeys: new Set([ 'iri', 'metadata' ]) },
  [Types.NPS]: { ignoreKeys: new Set([ 'iris', 'metadata' ]) },
  [Types.PATH]: { ignoreKeys: new Set([ 'subject', 'object', 'graph', 'metadata' ]) },
  [Types.PROJECT]: { ignoreKeys: new Set([ 'variables', 'metadata' ]) },
  [Types.SERVICE]: { ignoreKeys: new Set([ 'name', 'metadata' ]) },
  [Types.VALUES]: { ignoreKeys: new Set([ 'variables', 'bindings', 'metadata' ]) },
  [Types.LOAD]: { ignoreKeys: new Set([ 'source', 'destination', 'metadata' ]) },
  [Types.CLEAR]: { ignoreKeys: new Set([ 'source', 'metadata' ]) },
  [Types.CREATE]: { ignoreKeys: new Set([ 'source', 'metadata' ]) },
  [Types.DROP]: { ignoreKeys: new Set([ 'source', 'metadata' ]) },
  [Types.ADD]: { ignoreKeys: new Set([ 'source', 'destination', 'metadata' ]) },
  [Types.MOVE]: { ignoreKeys: new Set([ 'source', 'destination', 'metadata' ]) },
  [Types.COPY]: { ignoreKeys: new Set([ 'source', 'destination', 'metadata' ]) },
});

/**
 * Transform a single operation.
 * The transformation calls the preVisitor starting from the startObject.
 * The preVisitor can dictate whether transformation should be stopped.
 * Note that stopping the transformation also prevets further copying.
 * The transformer itself transforms operations starting with the deepest one that can be visited.
 * The transformer callback is performed on a copy of the original.
 * @param startObject
 * @param nodeCallBacks
 */
export const mapOperation: (typeof transformer.transformNode<'unsafe', Operation>) = <any>
  transformer.transformNode.bind(transformer);

/**
 * Transform a single operation.
 * The transformation calls the preVisitor starting from the startObject.
 * The preVisitor can dictate whether transformation should be stopped.
 * Note that stopping the transformation also prevets further copying.
 * The transformer itself transforms operations starting with the deepest one that can be visited.
 * The transformer callback is performed on a copy of the original.
 * @param startObject
 * @param nodeCallBacks
 */
export const mapOperationStrict = transformer.transformNode.bind(transformer);

/**
 * Shares the functionality and first two arguments with {@link mapOperation}.
 * The third argument allows you to also transform based on the subType of operations.
 * Note that when a callback for the subtype is provided, the callback for the general type is NOT executed.
 */
export const mapOperationSub: (typeof transformer.transformNodeSpecific<'unsafe', Operation>) = <any>
  transformer.transformNodeSpecific.bind(transformer);
/**
 * Shares the functionality and first two arguments with {@link mapOperation}.
 * The third argument allows you to also transform based on the subType of operations.
 * Note that when a callback for the subtype is provided, the callback for the general type is NOT executed.
 */
export const mapOperationSubStrict = transformer.transformNodeSpecific.bind(transformer);

/**
 * Similar to {@link mapOperation}, but without copying the startObject.
 * The pre-visitor visits starting from the root, going deeper, while the actual visitor goes in reverse.
 */
export const visitOperation = transformer.visitNode.bind(transformer);
/**
 * Shares the functionality and first two arguments with {@link visitOperation}.
 * The third argument allows you to also transform based on the subType of operations.
 * Note that when a callback for the subtype is provided, the callback for the general type is NOT executed.
 */
export const visitOperationSub = transformer.visitNodeSpecific.bind(transformer);

/**
 * Detects all in-scope variables.
 * In practice this means iterating through the entire algebra tree, finding all variables,
 * and stopping when a project function is found.
 * @param {Operation} op - Input algebra tree.
 * @param visitor the visitor to be used to traverse the various nodes.
 *        Allows you to provide a visitor with different default preVisitor cotexts.
 * @returns {RDF.Variable[]} - List of unique in-scope variables.
 */
export const inScopeVariables: typeof algebraUtils.inScopeVariables =
  (op: Operation, visitor = <typeof algebraUtils.visitOperation>visitOperation): RDF.Variable[] =>
    algebraUtils.inScopeVariables(op, visitor);
