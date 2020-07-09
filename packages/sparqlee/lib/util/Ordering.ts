import * as RDF from 'rdf-js';
import * as T from '../expressions/Term';
import { transformLiteral } from '../Transformation';

// Determine the relative numerical order of the two given terms.
export function orderTypes(litA: RDF.Term | undefined, litB: RDF.Term | undefined, isAscending:boolean){
    if (litA && litA.termType === 'Literal' && litB && litB.termType === 'Literal') {
        const a = transformLiteral(litA);
        const b = transformLiteral(litB);
        return order(a, b, isAscending);
    } else {
        return 0;
    }
}

// Effective ordering
export function order(orderA: T.Literal<any>, orderB: T.Literal<any>, isAscending:boolean){
    if (orderA.typedValue === orderB.typedValue) {
        return 0;
    }
    return orderA.typedValue > orderB.typedValue === isAscending ? 1 : -1;
}
