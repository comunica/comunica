import type * as RDF from '@rdfjs/types';
import * as LRUCache from 'lru-cache';
import type { LangStringLiteral } from '../expressions';
import { isNonLexicalLiteral } from '../expressions';
import { TermTransformer } from '../transformers/TermTransformer';
import { TypeAlias, TypeURL } from './Consts';
import type { ITimeZoneRepresentation } from './DateTimeHelpers';
import { toUTCDate } from './DateTimeHelpers';
import type { ISuperTypeProvider, SuperTypeCallback, TypeCache, GeneralSuperTypeDict } from './TypeHandling';
import { getSuperTypeDict } from './TypeHandling';

// Determine the relative numerical order of the two given terms.
/**
 * @param enableExtendedXSDTypes System will behave like when this was true. @deprecated
 */
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
    isLiteralLowerThan(termA, <RDF.Literal>termB, typeDiscoveryCallback, typeCache) :
    termA.value < termB.value;
}

function isLiteralLowerThan(litA: RDF.Literal, litB: RDF.Literal,
  typeDiscoveryCallback?: SuperTypeCallback, typeCache?: TypeCache): boolean {
  const defaultTimezone: ITimeZoneRepresentation = { zoneHours: 0, zoneMinutes: 0 };

  const openWorldType: ISuperTypeProvider = {
    discoverer: typeDiscoveryCallback || (() => 'term'),
    cache: typeCache || new LRUCache(),
  };
  const termTransformer = new TermTransformer(openWorldType);
  const myLitA = termTransformer.transformLiteral(litA);
  const myLitB = termTransformer.transformLiteral(litB);
  const typeA = myLitA.dataType;
  const typeB = myLitB.dataType;

  const superTypeDictA: GeneralSuperTypeDict = getSuperTypeDict(typeA, openWorldType);
  const superTypeDictB: GeneralSuperTypeDict = getSuperTypeDict(typeB, openWorldType);

  if (!isNonLexicalLiteral(myLitA) && !isNonLexicalLiteral(myLitB)) {
    if (TypeURL.XSD_BOOLEAN in superTypeDictA && TypeURL.XSD_BOOLEAN in superTypeDictB ||
      TypeAlias.SPARQL_NUMERIC in superTypeDictA && TypeAlias.SPARQL_NUMERIC in superTypeDictB ||
      TypeURL.XSD_STRING in superTypeDictA && TypeURL.XSD_STRING in superTypeDictB) {
      return myLitA.typedValue < myLitB.typedValue;
    }
    if (TypeURL.XSD_DATE_TIME in superTypeDictA && TypeURL.XSD_DATE_TIME in superTypeDictB) {
      return toUTCDate(myLitA.typedValue, defaultTimezone).getTime() <
        toUTCDate(myLitB.typedValue, defaultTimezone).getTime();
    }
    if (TypeURL.RDF_LANG_STRING in superTypeDictA && TypeURL.RDF_LANG_STRING in superTypeDictB) {
      return myLitA.typedValue < myLitB.typedValue ||
        (myLitA.typedValue === myLitB.typedValue &&
          (<LangStringLiteral>myLitA).language < (<LangStringLiteral>myLitB).language);
    }
  }
  return typeA < typeB || (myLitA.dataType === myLitB.dataType && myLitA.str() < myLitB.str());
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
