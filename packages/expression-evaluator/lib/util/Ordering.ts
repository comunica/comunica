import type * as RDF from '@rdfjs/types';
import { LRUCache } from 'lru-cache';
import type * as E from '../expressions';
import { regularFunctions } from '../functions';
import { TermTransformer } from '../transformers/TermTransformer';
import * as C from './Consts';
import * as Err from './Errors';
import type { SuperTypeCallback, TypeCache } from './TypeHandling';

// Determine the relative numerical order of the two given terms.
// In accordance with https://www.w3.org/TR/sparql11-query/#modOrderBy
export function orderTypes(termA: RDF.Term | undefined, termB: RDF.Term | undefined,
  strict = false,
  typeDiscoveryCallback?: SuperTypeCallback, typeCache?: TypeCache): -1 | 0 | 1 {
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
      termA.subject, termB.subject, strict, typeDiscoveryCallback, typeCache,
    );
    if (orderSubject !== 0) {
      return orderSubject;
    }
    const orderPredicate = orderTypes(
      termA.predicate, termB.predicate, strict, typeDiscoveryCallback, typeCache,
    );
    if (orderPredicate !== 0) {
      return orderPredicate;
    }
    const orderObject = orderTypes(
      termA.object, termB.object, strict, typeDiscoveryCallback, typeCache,
    );
    if (orderObject !== 0) {
      return orderObject;
    }
    return orderTypes(
      termA.graph, termB.graph, strict, typeDiscoveryCallback, typeCache,
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
  const isGreater = regularFunctions[C.RegularOperator.GT];
  const isEqual = regularFunctions[C.RegularOperator.EQUAL];
  const context = {
    now: new Date(),
    functionArgumentsCache: {},
    superTypeProvider: {
      discoverer: typeDiscoveryCallback || (() => 'term'),
      cache: typeCache || new LRUCache({ max: 1_000 }),
    },
    defaultTimeZone: { zoneHours: 0, zoneMinutes: 0 },
  };

  const termTransformer = new TermTransformer(context.superTypeProvider);
  const myLitA = termTransformer.transformLiteral(litA);
  const myLitB = termTransformer.transformLiteral(litB);

  try {
    if ((<E.BooleanLiteral> isEqual.apply([ myLitA, myLitB ], context)).typedValue) {
      return 0;
    }
    if ((<E.BooleanLiteral> isGreater.apply([ myLitA, myLitB ], context)).typedValue) {
      return 1;
    }
    return -1;
  } catch {
    // Fallback to string-based comparison
    const compareType = comparePrimitives(myLitA.dataType, myLitB.dataType);
    if (compareType !== 0) {
      return compareType;
    }
    return comparePrimitives(myLitA.str(), myLitB.str());
  }
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
