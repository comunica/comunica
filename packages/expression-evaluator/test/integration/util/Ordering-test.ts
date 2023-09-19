import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';

import { orderTypes } from '../../../lib';
import { TypeURL, TypeURL as DT } from '../../../lib/util/Consts';
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
  typeDiscoveryCallback?: SuperTypeCallback) {
  expect(orderTypes(litA, litB, false, typeDiscoveryCallback)).toEqual(-1);
  expect(orderTypes(litB, litA, false, typeDiscoveryCallback)).toEqual(1);
}

function genericOrderTestLower(litA: RDF.Term | undefined, litB: RDF.Term | undefined,
  typeDiscoveryCallback?: SuperTypeCallback) {
  orderTestIsLower(litA, litB, typeDiscoveryCallback);
}

function orderTestIsEqual(litA: RDF.Term | undefined, litB: RDF.Term | undefined) {
  expect(orderTypes(litA, litB)).toEqual(0);
  expect(orderTypes(litB, litA)).toEqual(0);
}

describe('terms order', () => {
  it('undefined is equal to undefined', () => {
    orderTestIsEqual(undefined, undefined); // eslint-disable-line unicorn/no-useless-undefined
  });

  it('undefined is lower than everything else', () => {
    genericOrderTestLower(undefined, DF.blankNode());
    genericOrderTestLower(undefined, DF.namedNode('http://example.com'));
    genericOrderTestLower(undefined, DF.literal('foo'));
  });

  it('blank nodes are ordered based on their ids', () => {
    orderTestIsEqual(DF.blankNode('a'), DF.blankNode('a'));
    genericOrderTestLower(DF.blankNode('a'), DF.blankNode('b'));
  });

  it('blank nodes are lower than other terms', () => {
    genericOrderTestLower(DF.blankNode(), DF.namedNode('http://example.com'));
    genericOrderTestLower(DF.blankNode(), DF.literal('foo'));
  });

  it('named nodes are ordered based on their IRI strings', () => {
    orderTestIsEqual(DF.namedNode('http://example.com/a'), DF.namedNode('http://example.com/a'));
    genericOrderTestLower(DF.namedNode('http://example.com/a'), DF.namedNode('http://example.com/b'));
  });

  it('named nodes are lower than literals', () => {
    genericOrderTestLower(DF.namedNode('http://example.com'), DF.literal('foo'));
  });

  it('integers type identical', () => {
    orderTestIsEqual(int('11'), int('11'));
  });

  it('string type identical', () => {
    orderTestIsEqual(string('11'), string('11'));
  });

  it('string type comparison', () => {
    genericOrderTestLower(string('11'), string('2'));
  });
  it('integer type comparison', () => {
    genericOrderTestLower(int('2'), int('11'));
  });
  it('double type comparison', () => {
    genericOrderTestLower(double('2'), double('11'));
  });
  it('decimal type comparison', () => {
    genericOrderTestLower(decimal('2'), decimal('11'));
  });
  it('float type comparison', () => {
    genericOrderTestLower(float('2'), float('11'));
  });
  it('dateTime type comparison', () => {
    genericOrderTestLower(dateTime('2000-01-01T00:00:00Z'), dateTime('2001-01-01T00:00:00Z'));
  });
  it('langString type comparison', () => {
    // Spec does not say anything about order of langStrings, but we use Operator Extensibility to define it.
    orderTestIsEqual(DF.literal('a', 'de'), DF.literal('a', 'en'));
    genericOrderTestLower(DF.literal('a', 'en'), DF.literal('b', 'en'));
  });
  it('boolean type comparison', () => {
    const bool = DF.namedNode(DT.XSD_BOOLEAN);
    genericOrderTestLower(DF.literal('false', bool), DF.literal('true', bool));
  });

  it('mixed string integer comparison', () => {
    genericOrderTestLower(int('11'), string('11'));
    genericOrderTestLower(int('2'), string('11'));
  });

  it('mixed string dateTime comparison', () => {
    genericOrderTestLower(dateTime('2000-01-01T00:00:00Z'), string('2000-01-01T00:00:00Z'));
    genericOrderTestLower(dateTime('2001-01-01T00:00:00Z'), string('2000-01-01T00:00:00Z'));
  });

  it('mixed unknown integer comparison', () => {
    // GenericOrderTestLower(int('1'), decimal('011'));
    genericOrderTestLower(DF.literal('011', DF.namedNode(DT.XSD_ENTITY)), int('1'));
    genericOrderTestLower(DF.literal('011', DF.namedNode(DT.XSD_ENTITY)), decimal('011'));
  });

  it('handles unknown extended types as basic literals', () => {
    const someType = DF.namedNode('https://example.org/some-decimal');
    genericOrderTestLower(DF.literal('11', someType), DF.literal('2', someType));
  });

  it('handles extended types', () => {
    const discover: SuperTypeCallback = _ => TypeURL.XSD_DECIMAL;
    const someType = DF.namedNode('https://example.org/some-decimal');
    orderTestIsLower(DF.literal('2', someType), DF.literal('11', someType), discover);
  });

  it('custom literals comparison', () => {
    const dt1 = DF.namedNode('http://example.org/dt1');
    const dt2 = DF.namedNode('http://example.org/dt2');
    genericOrderTestLower(DF.literal('a', dt1), DF.literal('b', dt1));
    genericOrderTestLower(DF.literal('b', dt1), DF.literal('a', dt2));
  });

  it('invalid literals comparison', () => {
    genericOrderTestLower(dateTime('a'), dateTime('b'));
  });

  it('quoted triples comparison', () => {
    genericOrderTestLower(
      DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:a'), DF.namedNode('ex:a')),
      DF.quad(DF.namedNode('ex:b'), DF.namedNode('ex:b'), DF.namedNode('ex:b')),
    );
    genericOrderTestLower(
      DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:a'), DF.namedNode('ex:a')),
      DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:b'), DF.namedNode('ex:b')),
    );
    genericOrderTestLower(
      DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:a'), DF.namedNode('ex:a')),
      DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:a'), DF.namedNode('ex:b')),
    );
  });
});
