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

  it('integer decimal type identical', () => {
    orderTestIsEqualBothSystems(int('11'), decimal('11.0'));
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

  it('mixed string integer comparison', () => {
    const numA = string('11');
    const numB = int('2');
    const numD = int('11');
    expect(orderTypes(numA, numB, true)).toEqual(1);
    expect(orderTypes(numB, numA, true)).toEqual(-1);
    expect(orderTypes(numA, numD, true)).toEqual(-1);
  });

  it('mixed unknown integer comparison', () => {
    const numA = int('1');
    const numB = decimal('011');
    const numC = DF.literal('011', DF.namedNode('https://example.org/some-decimal'));
    expect(orderTypes(numA, numB, true)).toEqual(-1);
    expect(orderTypes(numB, numC, true)).toEqual(-1);
    expect(orderTypes(numA, numC, true)).toEqual(-1);
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
});
