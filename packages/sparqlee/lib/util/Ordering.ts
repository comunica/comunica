import type * as RDF from '@rdfjs/types';
import * as LRUCache from 'lru-cache';
import * as T from '../expressions/Term';
import { TermTransformer } from '../transformers/TermTransformer';
import type { ISuperTypeProvider, SuperTypeCallback, TypeCache } from './TypeHandling';

// Determine the relative numerical order of the two given terms.
export function orderTypes(litA: RDF.Term | undefined, litB: RDF.Term | undefined, isAscending: boolean,
  typeDiscoveryCallback?: SuperTypeCallback, typeCache?: TypeCache, enableExtendedXSDTypes?: boolean): -1 | 0 | 1 {
  if (litA === undefined || litB === undefined || litA.equals(litB)) {
    return 0;
  }
  return isLowerThan(litA, litB, typeDiscoveryCallback, typeCache, enableExtendedXSDTypes) === isAscending ? -1 : 1;
}

function isLowerThan(litA: RDF.Term, litB: RDF.Term,
  typeDiscoveryCallback?: SuperTypeCallback, typeCache?: TypeCache, enableExtendedXSDTypes?: boolean): boolean {
  const openWorldType: ISuperTypeProvider = {
    discoverer: typeDiscoveryCallback || (() => 'term'),
    cache: typeCache || new LRUCache(),
  };
  const termTransformer = new TermTransformer(openWorldType, enableExtendedXSDTypes || false);
  if (litA.termType === 'Literal' && litB.termType === 'Literal') {
    const myLitA = termTransformer.transformLiteral(litA);
    const myLitB = termTransformer.transformLiteral(litB);
    const typeA = _TYPE_BUCKETS.get(myLitA.constructor) || 'unknown';
    const typeB = _TYPE_BUCKETS.get(myLitB.constructor) || 'unknown';
    if (typeA !== typeB) {
      return typeA < typeB;
    }
    switch (typeA) {
      case 'boolean':
      case 'dateTime':
      case 'number':
      case 'string':
        return myLitA.typedValue < myLitB.typedValue;
      case 'langString':
        return myLitA.typedValue < myLitB.typedValue ||
            (myLitA.typedValue === myLitB.typedValue && (myLitA.language || '') < (myLitB.language || ''));
      default:
        return myLitA.dataType < myLitB.dataType ||
            (myLitA.dataType === myLitB.dataType && myLitA.str() < myLitB.str());
    }
  }
  // Order is not defined yet for other terms.
  return true;
}

const _TYPE_BUCKETS = new Map<any, string>();
_TYPE_BUCKETS.set(T.BooleanLiteral, 'boolean');
_TYPE_BUCKETS.set(T.DateTimeLiteral, 'dateTime');
_TYPE_BUCKETS.set(T.DecimalLiteral, 'number');
_TYPE_BUCKETS.set(T.DoubleLiteral, 'number');
_TYPE_BUCKETS.set(T.FloatLiteral, 'number');
_TYPE_BUCKETS.set(T.IntegerLiteral, 'number');
_TYPE_BUCKETS.set(T.LangStringLiteral, 'langString');
_TYPE_BUCKETS.set(T.StringLiteral, 'string');
