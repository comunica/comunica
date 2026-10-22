import { TermFunctionEquality } from '@comunica/actor-function-factory-term-equality';
import {
  TermFunctionLesserThan,
} from '@comunica/actor-function-factory-term-lesser-than';
import type { ITermComparator } from '@comunica/bus-term-comparator-factory';
import { KeysExpressionEvaluator } from '@comunica/context-entries';
import type { SuperTypeCallback } from '@comunica/types';
import * as Eval from '@comunica/utils-expression-evaluator';
import { getMockEEActionContext, getMockInternalEvaluator } from '@comunica/utils-jest';
import type * as RDF from '@rdfjs/types';
import { LRUCache } from 'lru-cache';
import { DataFactory } from 'rdf-data-factory';
import { TermComparatorExpressionEvaluator } from '../lib/TermComparatorExpressionEvaluator';

const DF = new DataFactory();

function int(value: string): RDF.Literal {
  return DF.literal(value, DF.namedNode(Eval.TypeURL.XSD_INTEGER));
}

function bool(value: string): RDF.Literal {
  return DF.literal(value, DF.namedNode(Eval.TypeURL.XSD_BOOLEAN));
}

function float(value: string): RDF.Literal {
  return DF.literal(value, DF.namedNode(Eval.TypeURL.XSD_FLOAT));
}

function decimal(value: string): RDF.Literal {
  return DF.literal(value, DF.namedNode(Eval.TypeURL.XSD_DECIMAL));
}

function double(value: string): RDF.Literal {
  return DF.literal(value, DF.namedNode(Eval.TypeURL.XSD_DOUBLE));
}

function string(value: string): RDF.Literal {
  return DF.literal(value, DF.namedNode(Eval.TypeURL.XSD_STRING));
}

function dateTime(value: string): RDF.Literal {
  return DF.literal(value, DF.namedNode(Eval.TypeURL.XSD_DATE_TIME));
}

function orderByFactory(typeDiscoveryCallback?: SuperTypeCallback): ITermComparator {
  const context = (() => {
    if (typeDiscoveryCallback) {
      return getMockEEActionContext().set(KeysExpressionEvaluator.superTypeProvider, {
        discoverer: typeDiscoveryCallback,
        cache: new LRUCache<string, any>({ max: 1_000 }),
      });
    }

    return getMockEEActionContext()
      .set(KeysExpressionEvaluator.nonLexicalComparison, true)
      .set(KeysExpressionEvaluator.fullTermComparison, true);
  })();

  const equal = new TermFunctionEquality();
  return new TermComparatorExpressionEvaluator(
    getMockInternalEvaluator(undefined, context),
    equal,
    new TermFunctionLesserThan(equal),
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
    await orderTestIsEqual(DF.literal('a', 'en'), DF.literal('a', 'en'));
    await orderTestIsLower(DF.literal('a', 'de'), DF.literal('a', 'en'));
    await orderTestIsLower(DF.literal('a', 'en'), DF.literal('b', 'de'));
  });
  it('boolean type comparison', async() => {
    const bool = DF.namedNode(Eval.TypeURL.XSD_BOOLEAN);
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
    await orderTestIsLower(int('1'), decimal('011'));
    await orderTestIsLower(DF.literal('011', DF.namedNode(Eval.TypeURL.XSD_ENTITY)), int('1'));
    await orderTestIsLower(DF.literal('011', DF.namedNode(Eval.TypeURL.XSD_ENTITY)), decimal('011'));
  });

  it('handles unknown extended types as basic literals', async() => {
    const someType = DF.namedNode('https://example.org/some-decimal');
    await orderTestIsLower(DF.literal('11', someType), DF.literal('2', someType));
  });

  it('handles extended types', async() => {
    const discover: SuperTypeCallback = _ => Eval.TypeURL.XSD_DECIMAL;
    const someType = DF.namedNode('https://example.org/some-decimal');
    await orderTestIsEqual(
      DF.literal('2', DF.namedNode(Eval.TypeURL.XSD_DECIMAL)),
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
    await orderTestIsEqual(dateTime('a'), dateTime('a'));
    await orderTestIsLower(bool('a'), bool('b'));
    await orderTestIsLower(bool('a'), bool('true'));
    // Except for numeric literals, data types are first compared,
    // making xsd:bool < xsd:dateTime < xsd:integer < xsd:string
    // See packages/actor-function-factory-term-lesser-than/lib/TermFunctionLesserThan.ts
    await orderTestIsEqual(int('a'), decimal('a'));
    await orderTestIsLower(bool('a'), dateTime('a'));
    await orderTestIsLower(bool('true'), int('a'));
    await orderTestIsLower(int('b'), string('a'));
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

describe('the paths that short-circuit the lesser-than operator', () => {
  // Every pair the fast path answers must get the same answer as the general path it short-circuits.
  const terms: RDF.Term[] = [
    DF.namedNode('ex:a'),
    DF.namedNode('ex:b'),
    DF.namedNode('ex:B'),
    DF.namedNode('ex:aa'),
    DF.namedNode('ex:a/b'),
    DF.namedNode('http://example.org/1'),
    DF.namedNode('http://example.org/10'),
    DF.namedNode('http://example.org/2'),
    DF.namedNode(''),
    DF.namedNode('_:looksLikeABlankNode'),
    DF.blankNode('a'),
    DF.blankNode('b'),
    DF.literal('a'),
    DF.literal('b'),
    string('a'),
    string('B'),
    int('1'),
    int('10'),
    int('2'),
    bool('true'),
    dateTime('2001-01-01T00:00:00Z'),
    DF.literal('a', 'en'),
    DF.literal('b', 'nl'),
    DF.defaultGraph(),
    DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:a'), DF.namedNode('ex:a')),
  ];

  it('agrees with the general path for every pair of terms', () => {
    const evaluator = orderByFactory();
    const general = (a: RDF.Term, b: RDF.Term): number => (<any> evaluator).orderTypesGeneral(a, b);
    // Only distinct objects reach either path, since orderTypes short-circuits on reference equality.
    const pairs = terms.flatMap(termA => terms
      .filter(termB => termA !== termB)
      .map(termB => ({ termA, termB })));
    const actual = pairs.map(({ termA, termB }) =>
      `${termA.value}|${termB.value}|${evaluator.orderTypes(termA, termB)}`);
    const expected = pairs.map(({ termA, termB }) => `${termA.value}|${termB.value}|${general(termA, termB)}`);
    expect(actual).toEqual(expected);

    // Each path that can answer without the operator has to be reached, or the agreement above is vacuous.
    const reaching = (predicate: (termA: RDF.Term, termB: RDF.Term) => boolean): number =>
      pairs.filter(({ termA, termB }) => predicate(termA, termB)).length;
    expect(reaching((a, b) => a.termType === 'NamedNode' && b.termType === 'NamedNode')).toBeGreaterThan(0);
    expect(reaching((a, b) => a.termType === 'BlankNode' && b.termType === 'BlankNode')).toBeGreaterThan(0);
    expect(reaching((a, b) => a.termType !== b.termType)).toBeGreaterThan(0);
    // And every term type in the corpus has to be one the differing-types path can look up.
    for (const term of terms) {
      expect(Object.keys(TermFunctionLesserThan.TERM_ORDERING_PRIORITY))
        .toContain(term.termType[0].toLowerCase() + term.termType.slice(1));
    }
  });

  it('orders IRIs by their value', () => {
    const evaluator = orderByFactory();
    expect(evaluator.orderTypes(DF.namedNode('ex:a'), DF.namedNode('ex:b'))).toBe(-1);
    expect(evaluator.orderTypes(DF.namedNode('ex:b'), DF.namedNode('ex:a'))).toBe(1);
    expect(evaluator.orderTypes(DF.namedNode('ex:a'), DF.namedNode('ex:a'))).toBe(0);
  });

  it('orders blank nodes by their label', () => {
    const evaluator = orderByFactory();
    expect(evaluator.orderTypes(DF.blankNode('a'), DF.blankNode('b'))).toBe(-1);
    expect(evaluator.orderTypes(DF.blankNode('b'), DF.blankNode('a'))).toBe(1);
    expect(evaluator.orderTypes(DF.blankNode('a'), DF.blankNode('a'))).toBe(0);
  });

  it('keeps blank nodes before IRIs and IRIs before literals', () => {
    const evaluator = orderByFactory();
    expect(evaluator.orderTypes(DF.blankNode('z'), DF.namedNode('ex:a'))).toBe(-1);
    expect(evaluator.orderTypes(DF.namedNode('ex:z'), DF.literal('a'))).toBe(-1);
  });

  it('orders differing types by the operator\'s own priority table', () => {
    const evaluator = orderByFactory();
    const byType: [RDF.Term, keyof typeof TermFunctionLesserThan.TERM_ORDERING_PRIORITY][] = [
      [ DF.blankNode('x'), 'blankNode' ],
      [ DF.namedNode('ex:x'), 'namedNode' ],
      [ DF.literal('x'), 'literal' ],
      [ DF.quad(DF.namedNode('ex:x'), DF.namedNode('ex:x'), DF.namedNode('ex:x')), 'quad' ],
      [ DF.defaultGraph(), 'defaultGraph' ],
    ];
    for (const [ termA, keyA ] of byType) {
      for (const [ termB, keyB ] of byType) {
        if (keyA === keyB) {
          continue;
        }
        const priority = TermFunctionLesserThan.TERM_ORDERING_PRIORITY;
        expect(evaluator.orderTypes(termA, termB)).toBe(priority[keyA] < priority[keyB] ? -1 : 1);
      }
    }
  });

  it('leaves a term type the table does not cover to the operator', () => {
    const evaluator = orderByFactory();
    const general = (a: RDF.Term, b: RDF.Term): number => (<any> evaluator).orderTypesGeneral(a, b);
    // A variable has no place in the priority table, so it has to fall through rather than be guessed at.
    for (const other of [ DF.namedNode('ex:a'), DF.blankNode('a'), DF.literal('a'), DF.defaultGraph() ]) {
      expect(evaluator.orderTypes(DF.variable('v'), other)).toBe(general(DF.variable('v'), other));
      expect(evaluator.orderTypes(other, DF.variable('v'))).toBe(general(other, DF.variable('v')));
    }
  });
});
