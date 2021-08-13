import type * as RDF from '@rdfjs/types';
import type * as T from '../expressions/Term';
import { transformLiteral } from '../Transformation';

// Determine the relative numerical order of the two given terms.
export function orderTypes(litA: RDF.Term | undefined, litB: RDF.Term | undefined, isAscending: boolean): -1 | 0 | 1 {
  if (litA && litA.termType === 'Literal' && litB && litB.termType === 'Literal') {
    const myLitA = transformLiteral(litA);
    const myLitB = transformLiteral(litB);
    return order(myLitA, myLitB, isAscending);
  }
  return 0;
}

// Effective ordering
export function order(orderA: T.Literal<any>, orderB: T.Literal<any>, isAscending: boolean): -1 | 0 | 1 {
  if (orderA.typedValue === orderB.typedValue) {
    return 0;
  }
  return orderA.typedValue > orderB.typedValue === isAscending ? 1 : -1;
}
