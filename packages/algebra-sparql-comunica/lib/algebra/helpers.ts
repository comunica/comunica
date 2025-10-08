import type { Algebra } from '@traqula/algebra-transformations-1-2';
import { TransformerSubType } from '@traqula/core';
import type { CloseSingle, OpenSingle, KnownOperation } from './remapping';

export function asKnown<T extends object>(arg: T): CloseSingle<T> {
  return <any> arg;
}

export function asOpen<T extends object>(arg: T): OpenSingle<T> {
  return <any> arg;
}

export function isKnownOperation<T extends string>(val: { type: unknown }, type: T):
  val is Extract<KnownOperation, { type: T }> extends object ?
    Extract<KnownOperation, { type: T }> : { type: T } {
  return val.type === type;
}

export function isKnownSub<T extends string, Obj extends { type: string; subType: unknown }>(val: Obj, type: T):
  val is Extract<KnownOperation, { type: Obj['type']; subType: T }> extends object ?
    Obj & Extract<KnownOperation, { type: Obj['type']; subType: T }> : Obj & { subType: T } {
  return val.subType === type;
}

export function isKnownOperationSub<Type extends string, SubType extends string>(
  val: { type: unknown; subType?: unknown },
  type: Type,
  subType: SubType,
):
  val is Extract<KnownOperation, { type: Type; subType: SubType }> extends object ?
    Extract<KnownOperation, { type: Type; subType: SubType }> : { type: Type; subType: SubType } {
  return val.type === type && val.subType === subType;
}

// ----------------------- manipulators --------------------

type _NeedRef = Algebra.Operation;
const transformer = new TransformerSubType<KnownOperation>({ shallowKeys: [ 'metadata' ], ignoreKeys: [ 'metadata' ]});
export const mapOperation = transformer.transformNode.bind(transformer);
export const mapOperationSub = transformer.transformNodeSpecific.bind(transformer);
export const visitOperation = transformer.visitNode.bind(transformer);
export const visitOperationSub = transformer.visitNodeSpecific.bind(transformer);
