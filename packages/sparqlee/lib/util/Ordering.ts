import type * as RDF from '@rdfjs/types';
import * as LRUCache from 'lru-cache';
import { TermTransformer } from '../transformers/TermTransformer';
import type { MainSparqlType } from './Consts';
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
    const typeA = _SPARQL_TYPE_NORMALIZATION[myLitA.mainSparqlType];
    const typeB = _SPARQL_TYPE_NORMALIZATION[myLitB.mainSparqlType];
    if (typeA !== typeB) {
      return typeA < typeB;
    }
    switch (typeA) {
      case 'boolean':
      case 'dateTime':
      case 'decimal':
      case 'integer':
      case 'float':
      case 'double':
      case 'string':
        return myLitA.typedValue < myLitB.typedValue;
      case 'langString':
        return myLitA.typedValue < myLitB.typedValue ||
            (myLitA.typedValue === myLitB.typedValue && (myLitA.language || '') < (myLitB.language || ''));
      case 'other':
      case 'nonlexical':
        return myLitA.dataType < myLitB.dataType ||
            (myLitA.dataType === myLitB.dataType && myLitA.str() < myLitB.str());
    }
  }
  // Order is not defined yet for other terms.
  return true;
}

const _SPARQL_TYPE_NORMALIZATION: {[key in MainSparqlType]: MainSparqlType } = {
  string: 'string',
  langString: 'langString',
  dateTime: 'dateTime',
  boolean: 'boolean',
  integer: 'decimal',
  decimal: 'decimal',
  float: 'decimal',
  double: 'decimal',
  other: 'other',
  nonlexical: 'other',
};
