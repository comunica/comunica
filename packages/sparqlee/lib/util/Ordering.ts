import type * as RDF from '@rdfjs/types';
import * as LRUCache from 'lru-cache';
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
    const aType = getValueClassName(myLitA.typedValue);
    const bType = getValueClassName(myLitB.typedValue);
    if (aType !== bType) {
      return aType < bType;
    }
    return myLitA.typedValue < myLitB.typedValue;
  }
  // Order is not defined yet for other terms.
  return true;
}

function getValueClassName(value: any): string {
  const type = typeof value;
  return type === 'object' ? value.constructor.name : type;
}
