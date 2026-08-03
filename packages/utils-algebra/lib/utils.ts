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

export const mapOperation: (typeof transformer.transformNode<'unsafe', Operation>) = <any>
  transformer.transformNode.bind(transformer);

export const mapOperationStrict = transformer.transformNode.bind(transformer);

export const mapOperationSub: (typeof transformer.transformNodeSpecific<'unsafe', Operation>) = <any>
  transformer.transformNodeSpecific.bind(transformer);
export const mapOperationSubStrict = transformer.transformNodeSpecific.bind(transformer);

export const visitOperation = transformer.visitNode.bind(transformer);
export const visitOperationSub = transformer.visitNodeSpecific.bind(transformer);

export const inScopeVariables: typeof algebraUtils.inScopeVariables =
  (op, visitor = <typeof algebraUtils.visitOperation> visitOperation) =>
    algebraUtils.inScopeVariables(op, visitor);
