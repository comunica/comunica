import type * as RDF from '@rdfjs/types';
import * as LRUCache from 'lru-cache';
import { DataFactory } from 'rdf-data-factory';

import { TypeURL, TypeURL as DT } from '../../../lib/util/Consts';
import { orderTypes } from '../../../lib/util/Ordering';
import type { SuperTypeCallback, TypeCache } from '../../../lib/util/TypeHandling';

const DF = new DataFactory();

function int(value: string): RDF.Literal {
  return DF.literal(value, DF.namedNode(DT.XSD_INTEGER));
}

function float(value: string): RDF.Literal {
  return DF.literal(value, DF.namedNode(DT.XSD_FLOAT));
}

function decimal(value: string): RDF.Literal {
  return DF.literal(value, DF.namedNode(DT.XSD_DECIMAL));
}

function double(value: string): RDF.Literal {
  return DF.literal(value, DF.namedNode(DT.XSD_DOUBLE));
}

function string(value: string): RDF.Literal {
  return DF.literal(value, DF.namedNode(DT.XSD_STRING));
}

function dateTime(value: string): RDF.Literal {
  return DF.literal(value, DF.namedNode(DT.XSD_DATE_TIME));
}

function orderTestBothSystems(conditionCallBack: (res: -1 | 0 | 1) => void, litA: RDF.Term | undefined,
  litB: RDF.Term | undefined, isAscending: boolean, typeDiscoveryCallback?: SuperTypeCallback, typeCache?: TypeCache) {
  conditionCallBack(orderTypes(litA, litB, isAscending, typeDiscoveryCallback, typeCache, false));
  conditionCallBack(orderTypes(litA, litB, isAscending, typeDiscoveryCallback, typeCache, true));
}

describe('ordering literals', () => {
  it('undefined passed to ordertypes', () => {
    const numB = int('11');
    orderTestBothSystems(arg => expect(arg).toEqual(0), undefined, numB, true);
    orderTestBothSystems(arg => expect(arg).toEqual(0), undefined, undefined, true);
    orderTestBothSystems(arg => expect(arg).toEqual(0), numB, undefined, true);
  });

  it('integers type identical', () => {
    const numA = int('11');
    const numB = int('11');
    orderTestBothSystems(arg => expect(arg).toEqual(0), numA, numB, true);
  });

  it('integer decimal type identical', () => {
    const numA = int('11');
    const numB = decimal('11.0');
    orderTestBothSystems(arg => expect(arg).toEqual(0), numA, numB, true);
  });

  it('string type identical', () => {
    const numA = string('11');
    const numB = string('11');
    orderTestBothSystems(arg => expect(arg).toEqual(0), numA, numB, true);
    orderTestBothSystems(arg => expect(arg).toEqual(0), numB, numA, true);
  });

  it('string type comparison', () => {
    const numA = string('11');
    const numB = string('2');
    orderTestBothSystems(arg => expect(arg).toEqual(-1), numA, numB, true);
    orderTestBothSystems(arg => expect(arg).toEqual(1), numB, numA, true);
    orderTestBothSystems(arg => expect(arg).toEqual(1), numA, numB, false);
    orderTestBothSystems(arg => expect(arg).toEqual(-1), numB, numA, false);
  });
  it('integer type comparison', () => {
    const numA = int('11');
    const numB = int('2');
    orderTestBothSystems(arg => expect(arg).toEqual(1), numA, numB, true);
    orderTestBothSystems(arg => expect(arg).toEqual(-1), numB, numA, true);
    orderTestBothSystems(arg => expect(arg).toEqual(-1), numA, numB, false);
    orderTestBothSystems(arg => expect(arg).toEqual(1), numB, numA, false);
  });
  it('double type comparison', () => {
    const numA = double('11');
    const numB = double('2');
    orderTestBothSystems(arg => expect(arg).toEqual(1), numA, numB, true);
    orderTestBothSystems(arg => expect(arg).toEqual(-1), numB, numA, true);
    orderTestBothSystems(arg => expect(arg).toEqual(-1), numA, numB, false);
    orderTestBothSystems(arg => expect(arg).toEqual(1), numB, numA, false);
  });
  it('decimal type comparison', () => {
    const numA = decimal('11');
    const numB = decimal('2');
    orderTestBothSystems(arg => expect(arg).toEqual(1), numA, numB, true);
    orderTestBothSystems(arg => expect(arg).toEqual(-1), numB, numA, true);
    orderTestBothSystems(arg => expect(arg).toEqual(-1), numA, numB, false);
    orderTestBothSystems(arg => expect(arg).toEqual(1), numB, numA, false);
  });
  it('float type comparison', () => {
    const numA = float('11');
    const numB = float('2');
    orderTestBothSystems(arg => expect(arg).toEqual(1), numA, numB, true);
    orderTestBothSystems(arg => expect(arg).toEqual(-1), numB, numA, true);
  });
  it('dateTime type comparison', () => {
    const numA = dateTime('2001-01-01T00:00:00Z');
    const numB = dateTime('2000-01-01T00:00:00Z');
    orderTestBothSystems(arg => expect(arg).toEqual(1), numA, numB, true);
    orderTestBothSystems(arg => expect(arg).toEqual(-1), numB, numA, true);
  });

  it('mixed string integer comparison', () => {
    const numA = string('11');
    const numB = int('2');
    const numD = int('11');
    orderTestBothSystems(arg => expect(arg).toEqual(1), numA, numB, true);
    orderTestBothSystems(arg => expect(arg).toEqual(-1), numB, numA, true);
    orderTestBothSystems(arg => expect(arg).toEqual(-1), numA, numD, true);
  });

  it('mixed unknown integer comparison', () => {
    const numA = int('1');
    const numB = decimal('011');
    const numC = DF.literal('011', DF.namedNode('https://example.org/some-decimal'));
    orderTestBothSystems(arg => expect(arg).toEqual(-1), numA, numB, true);
    orderTestBothSystems(arg => expect(arg).toEqual(-1), numB, numC, true);
    orderTestBothSystems(arg => expect(arg).toEqual(-1), numA, numC, true);
  });

  it('handles unknown extended types as basic literals', () => {
    const cache: TypeCache = new LRUCache();
    const someType = DF.namedNode('https://example.org/some-decimal');
    const numA = DF.literal('11', someType);
    const numB = DF.literal('2', someType);
    orderTestBothSystems(arg => expect(arg).toEqual(-1), numA, numB, true, undefined, cache);
    orderTestBothSystems(arg => expect(arg).toEqual(1), numB, numA, true, undefined, cache);
    orderTestBothSystems(arg => expect(arg).toEqual(1), numA, numB, false, undefined, cache);
    orderTestBothSystems(arg => expect(arg).toEqual(-1), numB, numA, false, undefined, cache);
  });

  it('handles extended types', () => {
    const discover: SuperTypeCallback = unknownType => TypeURL.XSD_DECIMAL;
    const cache: TypeCache = new LRUCache();
    const someType = DF.namedNode('https://example.org/some-decimal');
    const numA = DF.literal('11', someType);
    const numB = DF.literal('2', someType);
    expect(orderTypes(numA, numB, true, discover, cache, true)).toEqual(1);
    expect(orderTypes(numB, numA, true, discover, cache, true)).toEqual(-1);
    expect(orderTypes(numA, numB, false, discover, cache, true)).toEqual(-1);
    expect(orderTypes(numB, numA, false, discover, cache, true)).toEqual(1);
  });
});
