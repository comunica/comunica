import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';

import { TypeURL, TypeURL as DT } from '../../../lib/util/Consts';
import { orderTypes } from '../../../lib/util/Ordering';
import type { SuperTypeCallback } from '../../../lib/util/TypeHandling';

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

function orderTestIsLower(litA: RDF.Term | undefined, litB: RDF.Term | undefined,
  typeDiscoveryCallback?: SuperTypeCallback, enableExtendedXSDTypes?: boolean) {
  expect(orderTypes(litA, litB, true, typeDiscoveryCallback, undefined, enableExtendedXSDTypes)).toEqual(-1);
  expect(orderTypes(litA, litB, false, typeDiscoveryCallback, undefined, enableExtendedXSDTypes)).toEqual(1);
  expect(orderTypes(litB, litA, true, typeDiscoveryCallback, undefined, enableExtendedXSDTypes)).toEqual(1);
  expect(orderTypes(litB, litA, false, typeDiscoveryCallback, undefined, enableExtendedXSDTypes)).toEqual(-1);
}

function orderTestIsLowerBothSystems(litA: RDF.Term | undefined, litB: RDF.Term | undefined,
  typeDiscoveryCallback?: SuperTypeCallback) {
  orderTestIsLower(litA, litB, typeDiscoveryCallback, false);
  orderTestIsLower(litA, litB, typeDiscoveryCallback, true);
}

function orderTestIsEqual(litA: RDF.Term | undefined, litB: RDF.Term | undefined, enableExtendedXSDTypes?: boolean) {
  expect(orderTypes(litA, litB, true, undefined, undefined, enableExtendedXSDTypes)).toEqual(0);
  expect(orderTypes(litA, litB, false, undefined, undefined, enableExtendedXSDTypes)).toEqual(0);
  expect(orderTypes(litB, litA, true, undefined, undefined, enableExtendedXSDTypes)).toEqual(0);
  expect(orderTypes(litB, litA, false, undefined, undefined, enableExtendedXSDTypes)).toEqual(0);
}

function orderTestIsEqualBothSystems(litA: RDF.Term | undefined, litB: RDF.Term | undefined) {
  orderTestIsEqual(litA, litB, false);
  orderTestIsEqual(litA, litB, true);
}

describe('ordering literals', () => {
  it('undefined passed to ordertypes', () => {
    orderTestIsEqualBothSystems(undefined, int('11'));
    orderTestIsEqualBothSystems(undefined, undefined); // eslint-disable-line unicorn/no-useless-undefined
  });

  it('integers type identical', () => {
    orderTestIsEqualBothSystems(int('11'), int('11'));
  });

  it('string type identical', () => {
    orderTestIsEqualBothSystems(string('11'), string('11'));
  });

  it('string type comparison', () => {
    orderTestIsLowerBothSystems(string('11'), string('2'));
  });
  it('integer type comparison', () => {
    orderTestIsLowerBothSystems(int('2'), int('11'));
  });
  it('double type comparison', () => {
    orderTestIsLowerBothSystems(double('2'), double('11'));
  });
  it('decimal type comparison', () => {
    orderTestIsLowerBothSystems(decimal('2'), decimal('11'));
  });
  it('float type comparison', () => {
    orderTestIsLowerBothSystems(float('2'), float('11'));
  });
  it('dateTime type comparison', () => {
    orderTestIsLowerBothSystems(dateTime('2000-01-01T00:00:00Z'), dateTime('2001-01-01T00:00:00Z'));
  });
  it('langString type comparison', () => {
    orderTestIsLowerBothSystems(DF.literal('a', 'de'), DF.literal('a', 'en'));
    orderTestIsLowerBothSystems(DF.literal('a', 'en'), DF.literal('b', 'en'));
  });
  it('boolean type comparison', () => {
    const bool = DF.namedNode(DT.XSD_BOOLEAN);
    orderTestIsLowerBothSystems(DF.literal('false', bool), DF.literal('true', bool));
  });

  it('mixed string integer comparison', () => {
    orderTestIsLowerBothSystems(int('11'), string('11'));
    orderTestIsLowerBothSystems(int('2'), string('11'));
  });

  it('mixed string dateTime comparison', () => {
    orderTestIsLowerBothSystems(dateTime('2000-01-01T00:00:00Z'), string('2000-01-01T00:00:00Z'));
    orderTestIsLowerBothSystems(dateTime('2001-01-01T00:00:00Z'), string('2000-01-01T00:00:00Z'));
  });

  it('mixed unknown integer comparison', () => {
    orderTestIsLowerBothSystems(int('1'), decimal('011'));
    orderTestIsLowerBothSystems(int('1'), DF.literal('011', DF.namedNode(DT.XSD_ENTITY)));
    orderTestIsLowerBothSystems(decimal('011'), DF.literal('011', DF.namedNode(DT.XSD_ENTITY)));
  });

  it('handles unknown extended types as basic literals', () => {
    const someType = DF.namedNode('https://example.org/some-decimal');
    orderTestIsLowerBothSystems(DF.literal('11', someType), DF.literal('2', someType));
  });

  it('handles extended types', () => {
    const discover: SuperTypeCallback = _ => TypeURL.XSD_DECIMAL;
    const someType = DF.namedNode('https://example.org/some-decimal');
    orderTestIsLower(DF.literal('2', someType), DF.literal('11', someType), discover, true);
  });

  it('custom literals comparison', () => {
    const dt1 = DF.namedNode('http://example.org/dt1');
    const dt2 = DF.namedNode('http://example.org/dt2');
    orderTestIsLowerBothSystems(DF.literal('a', dt1), DF.literal('b', dt1));
    orderTestIsLowerBothSystems(DF.literal('b', dt1), DF.literal('a', dt2));
  });

  it('invalid literals comparison', () => {
    orderTestIsLowerBothSystems(dateTime('a'), dateTime('b'));
  });
});
