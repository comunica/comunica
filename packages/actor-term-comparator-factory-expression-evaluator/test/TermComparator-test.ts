import type { ITermComparator } from '@comunica/bus-term-comparator-factory';
import { KeysExpressionEvaluator } from '@comunica/context-entries';
import { TypeURL, TypeURL as DT } from '@comunica/expression-evaluator/lib/util/Consts';
import { getMockEEActionContext, getMockInternalEvaluator } from '@comunica/jest';
import type { SuperTypeCallback } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { LRUCache } from 'lru-cache';
import { sparqlFunctions } from 'packages/actor-function-factory-wrapper-all/lib/implementation/SparqlFunctions';
import { DataFactory } from 'rdf-data-factory';
import { TermComparatorExpressionEvaluator } from '../lib/TermComparatorExpressionEvaluator';

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

function orderByFactory(typeDiscoveryCallback?: SuperTypeCallback): ITermComparator {
  const context = typeDiscoveryCallback ?
    getMockEEActionContext().set(KeysExpressionEvaluator.superTypeProvider, {
      discoverer: typeDiscoveryCallback,
      cache: new LRUCache<string, any>({ max: 1_000 }),
    }) :
    getMockEEActionContext();
  return new TermComparatorExpressionEvaluator(
    getMockInternalEvaluator(undefined, context),
    sparqlFunctions['='],
    sparqlFunctions['<'],
  );
}

async function orderTestIsLower(
  litA: RDF.Term | undefined,
  litB: RDF.Term | undefined,
  typeDiscoveryCallback?: SuperTypeCallback,
) {
  const evaluator = orderByFactory(typeDiscoveryCallback);
  expect(evaluator.orderTypes(litA, litB)).toBe(-1);
  expect(evaluator.orderTypes(litB, litA)).toBe(1);
}

async function orderTestIsEqual(
  litA: RDF.Term | undefined,
  litB: RDF.Term | undefined,
  typeDiscoveryCallback?: SuperTypeCallback,
) {
  const evaluator = orderByFactory(typeDiscoveryCallback);
  expect(evaluator.orderTypes(litA, litB)).toBe(0);
  expect(evaluator.orderTypes(litB, litA)).toBe(0);
}

describe('terms order', () => {
  it('undefined is equal to undefined', async() => {
    await orderTestIsEqual(undefined, undefined);
  });

  it('undefined is lower than everything else', async() => {
    await orderTestIsLower(undefined, DF.blankNode());
    await orderTestIsLower(undefined, DF.namedNode('http://example.com'));
    await orderTestIsLower(undefined, DF.literal('foo'));
  });

  it('blank nodes are ordered based on their ids', async() => {
    await orderTestIsEqual(DF.blankNode('a'), DF.blankNode('a'));
    await orderTestIsLower(DF.blankNode('a'), DF.blankNode('b'));
  });

  it('blank nodes are lower than other terms', async() => {
    await orderTestIsLower(DF.blankNode(), DF.namedNode('http://example.com'));
    await orderTestIsLower(DF.blankNode(), DF.literal('foo'));
  });

  it('named nodes are ordered based on their IRI strings', async() => {
    await orderTestIsEqual(DF.namedNode('http://example.com/a'), DF.namedNode('http://example.com/a'));
    await orderTestIsLower(DF.namedNode('http://example.com/a'), DF.namedNode('http://example.com/b'));
  });

  it('named nodes are lower than literals', async() => {
    await orderTestIsLower(DF.namedNode('http://example.com'), DF.literal('foo'));
  });

  it('integers type identical', async() => {
    await orderTestIsEqual(int('11'), int('11'));
  });

  it('string type identical', async() => {
    await orderTestIsEqual(string('11'), string('11'));
  });

  it('string type comparison', async() => {
    await orderTestIsLower(string('11'), string('2'));
  });
  it('integer type comparison', async() => {
    await orderTestIsLower(int('2'), int('11'));
  });
  it('double type comparison', async() => {
    await orderTestIsLower(double('2'), double('11'));
  });
  it('decimal type comparison', async() => {
    await orderTestIsLower(decimal('2'), decimal('11'));
  });
  it('float type comparison', async() => {
    await orderTestIsLower(float('2'), float('11'));
  });
  it('dateTime type comparison', async() => {
    await orderTestIsLower(dateTime('2000-01-01T00:00:00Z'), dateTime('2001-01-01T00:00:00Z'));
  });
  it('langString type comparison', async() => {
    await orderTestIsEqual(DF.literal('a', 'de'), DF.literal('a', 'en'));
    await orderTestIsLower(DF.literal('a', 'en'), DF.literal('b', 'en'));
  });
  it('boolean type comparison', async() => {
    const bool = DF.namedNode(DT.XSD_BOOLEAN);
    await orderTestIsLower(DF.literal('false', bool), DF.literal('true', bool));
  });

  it('mixed string integer comparison', async() => {
    await orderTestIsLower(int('11'), string('11'));
    await orderTestIsLower(int('2'), string('11'));
  });

  it('mixed string dateTime comparison', async() => {
    await orderTestIsLower(dateTime('2000-01-01T00:00:00Z'), string('2000-01-01T00:00:00Z'));
    await orderTestIsLower(dateTime('2001-01-01T00:00:00Z'), string('2000-01-01T00:00:00Z'));
  });

  it('mixed unknown integer comparison', async() => {
    // OrderTestIsLower(int('1'), decimal('011'));
    await orderTestIsLower(DF.literal('011', DF.namedNode(DT.XSD_ENTITY)), int('1'));
    await orderTestIsLower(DF.literal('011', DF.namedNode(DT.XSD_ENTITY)), decimal('011'));
  });

  it('handles unknown extended types as basic literals', async() => {
    const someType = DF.namedNode('https://example.org/some-decimal');
    await orderTestIsLower(DF.literal('11', someType), DF.literal('2', someType));
  });

  it('handles extended types', async() => {
    const discover: SuperTypeCallback = _ => TypeURL.XSD_DECIMAL;
    const someType = DF.namedNode('https://example.org/some-decimal');
    await orderTestIsEqual(
      DF.literal('2', DF.namedNode(TypeURL.XSD_DECIMAL)),
      DF.literal('2', someType),
      discover,
    );
    await orderTestIsLower(DF.literal('2', someType), DF.literal('11', someType), discover);
  });

  it('custom literals comparison', async() => {
    const dt1 = DF.namedNode('http://example.org/dt1');
    const dt2 = DF.namedNode('http://example.org/dt2');
    await orderTestIsLower(DF.literal('a', dt1), DF.literal('b', dt1));
    await orderTestIsLower(DF.literal('b', dt1), DF.literal('a', dt2));
  });

  it('invalid literals comparison', async() => {
    await orderTestIsLower(dateTime('a'), dateTime('b'));
  });

  it('quoted triples comparison', async() => {
    await orderTestIsLower(
      DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:a'), DF.namedNode('ex:a')),
      DF.quad(DF.namedNode('ex:b'), DF.namedNode('ex:b'), DF.namedNode('ex:b')),
    );
    await orderTestIsLower(
      DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:a'), DF.namedNode('ex:a')),
      DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:b'), DF.namedNode('ex:b')),
    );
    await orderTestIsLower(
      DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:a'), DF.namedNode('ex:a')),
      DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:a'), DF.namedNode('ex:b')),
    );
    await orderTestIsLower(
      DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:a'), DF.namedNode('ex:a'), DF.namedNode('ex:a')),
      DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:a'), DF.namedNode('ex:a'), DF.namedNode('ex:b')),
    );
  });
});
