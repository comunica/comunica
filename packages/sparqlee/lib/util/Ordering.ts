import type * as RDF from '@rdfjs/types';
import * as LRUCache from 'lru-cache';
import type { LangStringLiteral } from '../expressions';
import { TermTransformer } from '../transformers/TermTransformer';
import type { MainSparqlType } from './Consts';
import type { ISuperTypeProvider, SuperTypeCallback, TypeCache } from './TypeHandling';

// Determine the relative numerical order of the two given terms.
export function orderTypes(termA: RDF.Term | undefined, termB: RDF.Term | undefined, isAscending: boolean,
  typeDiscoveryCallback?: SuperTypeCallback, typeCache?: TypeCache, enableExtendedXSDTypes?: boolean): -1 | 0 | 1 {
  if (termA === termB) {
    return 0;
  }

  // We handle undefined that is lower than everything else.
  if (termA === undefined) {
    return isAscending ? -1 : 1;
  }
  if (termB === undefined) {
    return isAscending ? 1 : -1;
  }

  // We handle terms
  if (termA.equals(termB)) {
    return 0;
  }
  return isTermLowerThan(termA, termB, typeDiscoveryCallback, typeCache, enableExtendedXSDTypes) === isAscending ?
    -1 :
    1;
}

function isTermLowerThan(termA: RDF.Term, termB: RDF.Term,
  typeDiscoveryCallback?: SuperTypeCallback, typeCache?: TypeCache, enableExtendedXSDTypes?: boolean): boolean {
  if (termA.termType !== termB.termType) {
    return _TERM_ORDERING_PRIORITY[termA.termType] < _TERM_ORDERING_PRIORITY[termB.termType];
  }
  return termA.termType === 'Literal' ?
    isLiteralLowerThan(termA, <RDF.Literal>termB, typeDiscoveryCallback, typeCache, enableExtendedXSDTypes) :
    termA.value < termB.value;
}

function isLiteralLowerThan(litA: RDF.Literal, litB: RDF.Literal,
  typeDiscoveryCallback?: SuperTypeCallback, typeCache?: TypeCache, enableExtendedXSDTypes?: boolean): boolean {
  const openWorldType: ISuperTypeProvider = {
    discoverer: typeDiscoveryCallback || (() => 'term'),
    cache: typeCache || new LRUCache(),
  };
  const termTransformer = new TermTransformer(openWorldType, enableExtendedXSDTypes || false);
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
          (myLitA.typedValue === myLitB.typedValue &&
              (<LangStringLiteral>myLitA).language < (<LangStringLiteral>myLitB).language);
    case 'other':
    case 'nonlexical':
      return myLitA.dataType < myLitB.dataType ||
          (myLitA.dataType === myLitB.dataType && myLitA.str() < myLitB.str());
  }
}

// SPARQL specifies that blankNode < namedNode < literal.
const _TERM_ORDERING_PRIORITY = {
  Variable: 0,
  BlankNode: 1,
  NamedNode: 2,
  Literal: 3,
  Quad: 4,
  DefaultGraph: 5,
};

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
