import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { EqualityIndex } from '../lib/EqualityIndex';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const AF = new AlgebraFactory();
const XSD = 'http://www.w3.org/2001/XMLSchema#';

function metadata(variables: string[]): any {
  return {
    state: new MetadataValidationState(),
    cardinality: { type: 'estimate', value: 1 },
    variables: variables.map(name => ({ variable: DF.variable(name), canBeUndef: false })),
  };
}

function variable(name: string): any {
  return AF.createTermExpression(DF.variable(name));
}

describe('EqualityIndex', () => {
  describe('valueKey', () => {
    it('should be undefined for unbound terms', () => {
      expect(EqualityIndex.valueKey(undefined)).toBeUndefined();
    });

    it('should distinguish named nodes, blank nodes and strings', () => {
      const keys = [ DF.namedNode('a'), DF.blankNode('a'), DF.literal('a') ].map(EqualityIndex.valueKey);
      expect(new Set(keys).size).toBe(3);
    });

    it('should be the same for simple literals and strings', () => {
      expect(EqualityIndex.valueKey(DF.literal('a')))
        .toBe(EqualityIndex.valueKey(DF.literal('a', DF.namedNode(`${XSD}string`))));
    });

    it('should ignore the case of language tags', () => {
      expect(EqualityIndex.valueKey(DF.literal('a', 'en'))).toBe(EqualityIndex.valueKey(DF.literal('a', 'EN')));
      expect(EqualityIndex.valueKey(DF.literal('a', 'en'))).not.toBe(EqualityIndex.valueKey(DF.literal('a')));
    });

    it('should be the same for equal numbers of different datatypes', () => {
      expect(EqualityIndex.valueKey(DF.literal('1', DF.namedNode(`${XSD}integer`))))
        .toBe(EqualityIndex.valueKey(DF.literal('1.0', DF.namedNode(`${XSD}decimal`))));
      expect(EqualityIndex.valueKey(DF.literal('1', DF.namedNode(`${XSD}integer`))))
        .toBe(EqualityIndex.valueKey(DF.literal('1E0', DF.namedNode(`${XSD}double`))));
      expect(EqualityIndex.valueKey(DF.literal('1', DF.namedNode(`${XSD}long`))))
        .not.toBe(EqualityIndex.valueKey(DF.literal('2', DF.namedNode(`${XSD}long`))));
    });

    it('should be null for numbers that are not a number', () => {
      expect(EqualityIndex.valueKey(DF.literal('INF', DF.namedNode(`${XSD}double`)))).toBeNull();
    });

    it('should be null for other datatypes and terms', () => {
      expect(EqualityIndex.valueKey(DF.literal('2012-01-01T00:00:00Z', DF.namedNode(`${XSD}dateTime`))))
        .toBeNull();
      expect(EqualityIndex.valueKey(DF.literal('true', DF.namedNode(`${XSD}boolean`)))).toBeNull();
      expect(EqualityIndex.valueKey(DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')))).toBeNull();
    });
  });

  describe('findEquality', () => {
    const metadatas = [ metadata([ 'a', 'shared' ]), metadata([ 'b', 'shared' ]) ];

    it('should find an equality between a left and a right variable', () => {
      expect(EqualityIndex.findEquality(AF.createOperatorExpression('=', [ variable('a'), variable('b') ]), metadatas))
        .toEqual([ DF.variable('a'), DF.variable('b') ]);
    });

    it('should find an equality between a right and a left variable', () => {
      expect(EqualityIndex.findEquality(AF.createOperatorExpression('=', [ variable('b'), variable('a') ]), metadatas))
        .toEqual([ DF.variable('a'), DF.variable('b') ]);
    });

    it('should find an equality within conjunctions', () => {
      const other = AF.createOperatorExpression('!=', [ variable('a'), variable('b') ]);
      const equality = AF.createOperatorExpression('=', [ variable('b'), variable('a') ]);
      expect(EqualityIndex.findEquality(AF.createOperatorExpression('&&', [
        other,
        AF.createOperatorExpression('&&', [ other, equality ]),
      ]), metadatas)).toEqual([ DF.variable('a'), DF.variable('b') ]);
    });

    it('should not find equalities within conjunctions without them', () => {
      const other = AF.createOperatorExpression('!=', [ variable('a'), variable('b') ]);
      expect(EqualityIndex.findEquality(AF.createOperatorExpression('&&', [ other, other ]), metadatas))
        .toBeUndefined();
    });

    it('should not find equalities within disjunctions', () => {
      const equality = AF.createOperatorExpression('=', [ variable('a'), variable('b') ]);
      expect(EqualityIndex.findEquality(AF.createOperatorExpression('||', [ equality, equality ]), metadatas))
        .toBeUndefined();
    });

    it('should not find equalities with other terms', () => {
      expect(EqualityIndex.findEquality(AF.createOperatorExpression('=', [
        variable('a'),
        AF.createTermExpression(DF.literal('b')),
      ]), metadatas)).toBeUndefined();
    });

    it.each([
      [ 'a', 'a' ],
      [ 'b', 'b' ],
      [ 'a', 'shared' ],
      [ 'shared', 'b' ],
    ])('should not find equalities between ?%s and ?%s, of the same side or of both sides', (first, second) => {
      const equality = AF.createOperatorExpression('=', [ variable(first), variable(second) ]);
      expect(EqualityIndex.findEquality(equality, metadatas)).toBeUndefined();
    });

    it('should not find equalities in other expressions', () => {
      expect(EqualityIndex.findEquality(variable('a'), metadatas)).toBeUndefined();
    });
  });

  describe('candidates', () => {
    const date = DF.literal('2012-01-01T00:00:00Z', DF.namedNode(`${XSD}dateTime`));
    const right: RDF.Bindings[] = [
      BF.bindings([[ DF.variable('r'), DF.literal('1') ]]),
      BF.bindings([[ DF.variable('r'), date ]]),
      BF.bindings([[ DF.variable('r'), DF.literal('2') ]]),
      BF.bindings([]),
      BF.bindings([[ DF.variable('r'), DF.literal('1') ]]),
      BF.bindings([[ DF.variable('r'), date ]]),
    ];
    const index = new EqualityIndex(right, DF.variable('l'), DF.variable('r'));

    it('should return the bindings with an equal key and those without key, in their order', () => {
      expect([ ...index.candidates(BF.bindings([[ DF.variable('l'), DF.literal('1') ]])) ])
        .toEqual([ right[0], right[1], right[4], right[5] ]);
      expect([ ...index.candidates(BF.bindings([[ DF.variable('l'), DF.literal('2') ]])) ])
        .toEqual([ right[1], right[2], right[5] ]);
      expect([ ...index.candidates(BF.bindings([[ DF.variable('l'), DF.literal('3') ]])) ])
        .toEqual([ right[1], right[5] ]);
    });

    it('should return all bindings for a term without key', () => {
      expect([ ...index.candidates(BF.bindings([[ DF.variable('l'), date ]])) ]).toEqual(right);
    });

    it('should return no bindings for an unbound variable', () => {
      expect([ ...index.candidates(BF.bindings([])) ]).toEqual([]);
    });
  });
});
