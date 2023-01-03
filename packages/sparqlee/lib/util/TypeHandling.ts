import type * as LRUCache from 'lru-cache';
import type { TermType } from '../expressions';
import { asTermType } from '../expressions';
import type { KnownLiteralTypes } from './Consts';
import { TypeAlias, TypeURL } from './Consts';

export type OverrideType = KnownLiteralTypes | 'term';

/**
 * Types that are not mentioned just map to 'term'.
 * When editing this, make sure type promotion and substituion don't start interfering.
 * e.g. when saying something like string -> stringly -> anyUri -> term.
 * This would make substitution on types that promote to each other possible. We and the specs don't want that!
 * A DAG will be created based on this. Make sure it doesn't have any cycles!
 */
export const extensionTableInput: Record<KnownLiteralTypes, OverrideType> = {
  // Datetime types
  [TypeURL.XSD_DATE_TIME_STAMP]: TypeURL.XSD_DATE_TIME,

  // Duration types
  [TypeURL.XSD_DAYTIME_DURATION]: TypeURL.XSD_DURATION,
  [TypeURL.XSD_YEAR_MONTH_DURATION]: TypeURL.XSD_DURATION,

  // Stringly types
  [TypeURL.RDF_LANG_STRING]: TypeAlias.SPARQL_STRINGLY,
  [TypeURL.XSD_STRING]: TypeAlias.SPARQL_STRINGLY,

  // String types
  [TypeURL.XSD_NORMALIZED_STRING]: TypeURL.XSD_STRING,
  [TypeURL.XSD_TOKEN]: TypeURL.XSD_NORMALIZED_STRING,
  [TypeURL.XSD_LANGUAGE]: TypeURL.XSD_TOKEN,
  [TypeURL.XSD_NM_TOKEN]: TypeURL.XSD_TOKEN,
  [TypeURL.XSD_NAME]: TypeURL.XSD_TOKEN,
  [TypeURL.XSD_NC_NAME]: TypeURL.XSD_NAME,
  [TypeURL.XSD_ENTITY]: TypeURL.XSD_NC_NAME,
  [TypeURL.XSD_ID]: TypeURL.XSD_NC_NAME,
  [TypeURL.XSD_ID_REF]: TypeURL.XSD_NC_NAME,

  // Numeric types
  // https://www.w3.org/TR/sparql11-query/#operandDataTypes
  // > numeric denotes typed literals with datatypes xsd:integer, xsd:decimal, xsd:float, and xsd:double
  [TypeURL.XSD_DOUBLE]: TypeAlias.SPARQL_NUMERIC,
  [TypeURL.XSD_FLOAT]: TypeAlias.SPARQL_NUMERIC,
  [TypeURL.XSD_DECIMAL]: TypeAlias.SPARQL_NUMERIC,

  // Decimal types
  [TypeURL.XSD_INTEGER]: TypeURL.XSD_DECIMAL,

  [TypeURL.XSD_NON_POSITIVE_INTEGER]: TypeURL.XSD_INTEGER,
  [TypeURL.XSD_NEGATIVE_INTEGER]: TypeURL.XSD_NON_POSITIVE_INTEGER,

  [TypeURL.XSD_LONG]: TypeURL.XSD_INTEGER,
  [TypeURL.XSD_INT]: TypeURL.XSD_LONG,
  [TypeURL.XSD_SHORT]: TypeURL.XSD_INT,
  [TypeURL.XSD_BYTE]: TypeURL.XSD_SHORT,

  [TypeURL.XSD_NON_NEGATIVE_INTEGER]: TypeURL.XSD_INTEGER,
  [TypeURL.XSD_POSITIVE_INTEGER]: TypeURL.XSD_NON_NEGATIVE_INTEGER,
  [TypeURL.XSD_UNSIGNED_LONG]: TypeURL.XSD_NON_NEGATIVE_INTEGER,
  [TypeURL.XSD_UNSIGNED_INT]: TypeURL.XSD_UNSIGNED_LONG,
  [TypeURL.XSD_UNSIGNED_SHORT]: TypeURL.XSD_UNSIGNED_INT,
  [TypeURL.XSD_UNSIGNED_BYTE]: TypeURL.XSD_UNSIGNED_SHORT,

  [TypeURL.XSD_DATE_TIME]: 'term',
  [TypeURL.XSD_BOOLEAN]: 'term',
  [TypeURL.XSD_DATE]: 'term',
  [TypeURL.XSD_DURATION]: 'term',
  [TypeAlias.SPARQL_NUMERIC]: 'term',
  [TypeAlias.SPARQL_STRINGLY]: 'term',
  [TypeAlias.SPARQL_NON_LEXICAL]: 'term',
  [TypeURL.XSD_ANY_URI]: 'term',
};
type SuperTypeDict = Record<KnownLiteralTypes, number> & { __depth: number };
type SuperTypeDictTable = Record<KnownLiteralTypes, SuperTypeDict>;
// The key 'term' is not included in these keys. Something that is just a term will map to number 0.
export type GeneralSuperTypeDict = Record<string, number> & { __depth: number };
export let superTypeDictTable: SuperTypeDictTable;

/**
 * This will return the super types of a type and cache them.
 * @param type IRI we will decide the super types of.
 * @param openWorldType the enabler that provides a way to find super types.
 */
export function getSuperTypes(type: string, openWorldType: ISuperTypeProvider): GeneralSuperTypeDict {
  const cached = openWorldType.cache.get(type);
  if (cached) {
    return cached;
  }
  const value = openWorldType.discoverer(type);
  if (value === 'term') {
    const res: GeneralSuperTypeDict = Object.create(null);
    res.__depth = 0;
    res[type] = 0;
    openWorldType.cache.set(type, res);
    return res;
  }
  let subExtension: GeneralSuperTypeDict;
  const knownValue = asKnownLiteralType(value);
  if (knownValue) {
    subExtension = { ...superTypeDictTable[knownValue] };
  } else {
    subExtension = { ...getSuperTypes(value, openWorldType) };
  }
  subExtension.__depth++;
  subExtension[type] = subExtension.__depth;
  openWorldType.cache.set(type, subExtension);
  return subExtension;
}

// No circular structure allowed! & No other keys allowed!
export function extensionTableInit(): void {
  const res: SuperTypeDictTable = Object.create(null);
  for (const [ _key, value ] of Object.entries(extensionTableInput)) {
    const key = <KnownLiteralTypes>_key;
    if (res[key]) {
      continue;
    }
    extensionTableBuilderInitKey(key, value, res);
  }
  superTypeDictTable = res;
}
extensionTableInit();

function extensionTableBuilderInitKey(key: KnownLiteralTypes, value: OverrideType, res: SuperTypeDictTable): void {
  if (value === 'term' || value === undefined) {
    const baseRes: SuperTypeDict = Object.create(null);
    baseRes.__depth = 0;
    baseRes[key] = 0;
    res[key] = baseRes;
    return;
  }
  if (!res[value]) {
    extensionTableBuilderInitKey(value, extensionTableInput[value], res);
  }
  res[key] = { ...res[value], [key]: res[value].__depth + 1, __depth: res[value].__depth + 1 };
}

export let typeAliasCheck: Record<TypeAlias, boolean>;
function initTypeAliasCheck(): void {
  typeAliasCheck = Object.create(null);
  for (const val of Object.values(TypeAlias)) {
    typeAliasCheck[val] = true;
  }
}
initTypeAliasCheck();

export function asTypeAlias(type: string): TypeAlias | undefined {
  if (type in typeAliasCheck) {
    return <TypeAlias> type;
  }
  return undefined;
}

export function asKnownLiteralType(type: string): KnownLiteralTypes | undefined {
  if (type in superTypeDictTable) {
    return <KnownLiteralTypes> type;
  }
  return undefined;
}

export function asOverrideType(type: string): OverrideType | undefined {
  if (asKnownLiteralType(type) || type === 'term') {
    return <OverrideType> type;
  }
  return undefined;
}

export function asGeneralType(type: string): 'term' | TermType | undefined {
  if (type === 'term' || asTermType(type)) {
    return <'term' | TermType> type;
  }
  return undefined;
}

export type TypeCache = LRUCache<string, GeneralSuperTypeDict>;
export type SuperTypeCallback = (unknownType: string) => string;
export interface ISuperTypeProvider {
  cache: TypeCache;
  discoverer: SuperTypeCallback;
}

/**
 * Internal type of @see isSubTypeOf This only takes knownTypes but doesn't need an enabler
 */
export function isInternalSubType(baseType: OverrideType, argumentType: KnownLiteralTypes): boolean {
  return baseType !== 'term' &&
    (superTypeDictTable[baseType] && superTypeDictTable[baseType][argumentType] !== undefined);
}

/**
 * This function can be used to check the base type is a restriction on a type in the dict.
 * If we want to check if type x is a restriction on string we do this by calling:
 * 'http://www.w3.org/2001/XMLSchema#string' in getSuperTypeDict(X, superTypeProvider)
 * @param baseType
 * @param superTypeProvider
 */
export function getSuperTypeDict(baseType: string, superTypeProvider: ISuperTypeProvider): GeneralSuperTypeDict {
  const concreteType: KnownLiteralTypes | undefined = asKnownLiteralType(baseType);
  if (concreteType) {
    // Concrete dataType is known by sparqlee.
    return superTypeDictTable[concreteType];
  }
  // Datatype is a custom datatype
  return getSuperTypes(baseType, superTypeProvider);
}

/**
 * This function needs do be O(1)! The execution time of this function is vital!
 * We define typeA isSubtypeOf typeA as true.
 * If you find yourself using this function a lot (e.g. in a case) please use getSuperTypeDict instead.
 * @param baseType type you want to provide.
 * @param argumentType type you want to provide @param baseType to.
 * @param superTypeProvider the enabler to discover super types of unknown types.
 */
export function isSubTypeOf(baseType: string, argumentType: KnownLiteralTypes,
  superTypeProvider: ISuperTypeProvider): boolean {
  if (baseType === 'term') {
    return false;
  }
  return getSuperTypeDict(baseType, superTypeProvider)[argumentType] !== undefined;
}
