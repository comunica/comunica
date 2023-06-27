import type * as RDF from '@rdfjs/types';
import * as LRUCache from 'lru-cache';
import type { LangStringLiteral } from '../expressions';
import { isNonLexicalLiteral } from '../expressions';
import { TermTransformer } from '../transformers/TermTransformer';
import { TypeAlias, TypeURL } from './Consts';
import type { ITimeZoneRepresentation } from './DateTimeHelpers';
import { toUTCDate } from './DateTimeHelpers';
import * as Err from './Errors';
import type { ISuperTypeProvider, SuperTypeCallback, TypeCache, GeneralSuperTypeDict } from './TypeHandling';
import { getSuperTypeDict } from './TypeHandling';

// Determine the relative numerical order of the two given terms.
/**
 * @param enableExtendedXSDTypes System will behave like when this was true. @deprecated
 */
export function orderTypes(termA: RDF.Term | undefined, termB: RDF.Term | undefined,
  strict = false,
  typeDiscoveryCallback?: SuperTypeCallback, typeCache?: TypeCache, enableExtendedXSDTypes?: boolean): -1 | 0 | 1 {
  // Check if terms are the same by reference
  if (termA === termB) {
    return 0;
  }

  // We handle undefined that is lower than everything else.
  if (termA === undefined) {
    return -1;
  }
  if (termB === undefined) {
    return 1;
  }

  //
  if (termA.termType !== termB.termType) {
    return _TERM_ORDERING_PRIORITY[termA.termType] < _TERM_ORDERING_PRIORITY[termB.termType] ? -1 : 1;
  }

  // Check exact term equality
  if (termA.equals(termB)) {
    return 0;
  }

  // Handle quoted triples
  if (termA.termType === 'Quad' && termB.termType === 'Quad') {
    const orderSubject = orderTypes(
      termA.subject, termB.subject, strict, typeDiscoveryCallback, typeCache, enableExtendedXSDTypes,
    );
    if (orderSubject !== 0) {
      return orderSubject;
    }
    const orderPredicate = orderTypes(
      termA.predicate, termB.predicate, strict, typeDiscoveryCallback, typeCache, enableExtendedXSDTypes,
    );
    if (orderPredicate !== 0) {
      return orderPredicate;
    }
    const orderObject = orderTypes(
      termA.object, termB.object, strict, typeDiscoveryCallback, typeCache, enableExtendedXSDTypes,
    );
    if (orderObject !== 0) {
      return orderObject;
    }
    return orderTypes(
      termA.graph, termB.graph, strict, typeDiscoveryCallback, typeCache, enableExtendedXSDTypes,
    );
  }

  // Handle literals
  if (termA.termType === 'Literal') {
    return orderLiteralTypes(termA, <RDF.Literal>termB, typeDiscoveryCallback, typeCache);
  }

  // Handle all other types
  if (strict) {
    throw new Err.InvalidCompareArgumentTypes(termA, termB);
  }
  return comparePrimitives(termA.value, termB.value);
}

function orderLiteralTypes(litA: RDF.Literal, litB: RDF.Literal,
  typeDiscoveryCallback?: SuperTypeCallback, typeCache?: TypeCache): -1 | 0 | 1 {
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

  // Special handling of specific datatypes
  if (!isNonLexicalLiteral(myLitA) && !isNonLexicalLiteral(myLitB)) {
    if (TypeURL.XSD_BOOLEAN in superTypeDictA && TypeURL.XSD_BOOLEAN in superTypeDictB ||
      TypeAlias.SPARQL_NUMERIC in superTypeDictA && TypeAlias.SPARQL_NUMERIC in superTypeDictB ||
      TypeURL.XSD_STRING in superTypeDictA && TypeURL.XSD_STRING in superTypeDictB) {
      return comparePrimitives(myLitA.typedValue, myLitB.typedValue);
    }
    if (TypeURL.XSD_DATE_TIME in superTypeDictA && TypeURL.XSD_DATE_TIME in superTypeDictB) {
      return comparePrimitives(
        toUTCDate(myLitA.typedValue, defaultTimezone).getTime(),
        toUTCDate(myLitB.typedValue, defaultTimezone).getTime(),
      );
    }
    if (TypeURL.RDF_LANG_STRING in superTypeDictA && TypeURL.RDF_LANG_STRING in superTypeDictB) {
      const compareType = comparePrimitives(myLitA.typedValue, myLitB.typedValue);
      if (compareType !== 0) {
        return compareType;
      }
      return comparePrimitives((<LangStringLiteral>myLitA).language, (<LangStringLiteral>myLitB).language);
    }
  }

  // Fallback to string-based comparison
  const compareType = comparePrimitives(typeA, typeB);
  if (compareType !== 0) {
    return compareType;
  }
  return comparePrimitives(myLitA.str(), myLitB.str());
}

function comparePrimitives(valueA: any, valueB: any): -1 | 0 | 1 {
  // eslint-disable-next-line @typescript-eslint/no-extra-parens
  return valueA === valueB ? 0 : (valueA < valueB ? -1 : 1);
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
