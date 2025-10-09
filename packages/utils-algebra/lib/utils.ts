import type { Algebra as TraqulaAlgebra } from '@traqula/algebra-transformations-1-2';
import { algebraUtils } from '@traqula/algebra-transformations-1-2';
import { TransformerSubType } from '@traqula/core';
import type { KnownOperation, Operation } from './Algebra';

export const resolveIRI = algebraUtils.resolveIRI;
export const objectify = algebraUtils.objectify;
export const inScopeVariables = algebraUtils.inScopeVariables;

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
const transformer = new TransformerSubType<KnownOperation>({
  /**
   * Metadata often contains references to actors,
   * the transformer should not copy these actors, nor should it traverse the actors when visitingOperations.
   * (since there can be cycles involved).
   * It should however still make a shallowCopy from the metadata object, but not map over it.
   */
  shallowKeys: [ 'metadata' ],
  ignoreKeys: [ 'metadata' ],
});

export const mapOperation: (typeof transformer.transformNode<'unsafe', Operation>) = <any>
  transformer.transformNode.bind(transformer);

export const mapOperationStrict = transformer.transformNode.bind(transformer);

export const mapOperationSub: (typeof transformer.transformNodeSpecific<'unsafe', Operation>) = <any>
  transformer.transformNodeSpecific.bind(transformer);
export const mapOperationSubStrict = transformer.transformNodeSpecific.bind(transformer);

export const visitOperation = transformer.visitNode.bind(transformer);
export const visitOperationSub = transformer.visitNodeSpecific.bind(transformer);
