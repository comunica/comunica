import { ActionContextKey } from '@comunica/core';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import type { IBindingsDictionary } from '../lib';
import { Bindings, BindingsFactory, BindingsShape, EncodedBindingsCreator } from '../lib';

const DF = new DataFactory();
const KEY = new ActionContextKey<string>('k');

/**
 * A dictionary that encodes terms as numbers.
 */
class Dictionary implements IBindingsDictionary {
  private readonly terms: RDF.Term[] = [];

  public encode(term: RDF.Term): number {
    let index = this.terms.findIndex(other => other.equals(term));
    if (index < 0) {
      index = this.terms.length;
      this.terms.push(term);
    }
    return index;
  }

  public decode(encoding: number): RDF.Term {
    return this.terms[encoding];
  }
}

describe('Encoded bindings', () => {
  let BF: BindingsFactory;
  let dict: Dictionary;
  let dictOther: Dictionary;
  let a: RDF.NamedNode;
  let b: RDF.NamedNode;
  let c: RDF.NamedNode;

  function encoded(dictionary: Dictionary, entries: Record<string, RDF.Term>): Bindings {
    const names = Object.keys(entries);
    const values = names.map(name => dictionary.encode(entries[name]));
    return new Bindings(DF, BindingsShape.of(names), undefined, values, dictionary);
  }

  beforeEach(() => {
    BF = new BindingsFactory(DF);
    dict = new Dictionary();
    dictOther = new Dictionary();
    a = DF.namedNode('ex:a');
    b = DF.namedNode('ex:b');
    c = DF.namedNode('ex:c');
    // Make encodings of the same terms differ between both dictionaries.
    dictOther.encode(c);
  });

  describe('reading', () => {
    it('decodes values on get', () => {
      const bindings = encoded(dict, { x: a, y: b });
      expect(bindings.get('x')).toBe(a);
      expect(bindings.get(DF.variable('y'))).toBe(b);
      expect(bindings.get('z')).toBeUndefined();
      expect(bindings.rawValues).toEqual([ 0, 1 ]);
    });

    it('decodes values when iterating', () => {
      const bindings = encoded(dict, { x: a, y: b });
      expect([ ...bindings.values() ]).toEqual([ a, b ]);
      expect([ ...bindings ]).toEqual([[ DF.variable('x'), a ], [ DF.variable('y'), b ]]);
      const cb = jest.fn();
      // eslint-disable-next-line unicorn/no-array-for-each
      bindings.forEach(cb);
      expect(cb).toHaveBeenCalledWith(a, DF.variable('x'));
      expect(cb).toHaveBeenCalledWith(b, DF.variable('y'));
      expect(bindings.toString()).toBe(`{
  "x": "ex:a",
  "y": "ex:b"
}`);
    });

    it('shares variables between bindings of the same shape', () => {
      expect(encoded(dict, { x: a }).keys()).toBe(encoded(dict, { x: b }).keys());
    });
  });

  describe('valuesEqual', () => {
    it('compares terms', () => {
      expect(Bindings.valuesEqual(a, undefined, a, undefined)).toBe(true);
      expect(Bindings.valuesEqual(a, undefined, DF.namedNode('ex:a'), undefined)).toBe(true);
      expect(Bindings.valuesEqual(a, undefined, b, undefined)).toBe(false);
    });

    it('compares a term with an encoding', () => {
      expect(Bindings.valuesEqual(a, undefined, dict.encode(a), dict)).toBe(true);
      expect(Bindings.valuesEqual(dict.encode(a), dict, a, undefined)).toBe(true);
      expect(Bindings.valuesEqual(dict.encode(a), dict, b, undefined)).toBe(false);
    });

    it('compares encodings of the same dictionary without decoding them', () => {
      const decode = jest.spyOn(dict, 'decode');
      expect(Bindings.valuesEqual(dict.encode(a), dict, dict.encode(a), dict)).toBe(true);
      expect(Bindings.valuesEqual(dict.encode(a), dict, dict.encode(b), dict)).toBe(false);
      expect(decode).not.toHaveBeenCalled();
    });

    it('compares encodings of different dictionaries by decoding them', () => {
      const dict1 = new Dictionary();
      const dict2 = new Dictionary();
      dict1.encode(a);
      dict1.encode(b);
      dict2.encode(b);
      dict2.encode(a);
      // The same encoding of different terms
      expect(Bindings.valuesEqual(0, dict1, 0, dict2)).toBe(false);
      // Different encodings of the same term
      expect(Bindings.valuesEqual(0, dict1, 1, dict2)).toBe(true);
    });
  });

  describe('equals', () => {
    it('compares encoded bindings of the same shape', () => {
      expect(encoded(dict, { x: a, y: b }).equals(encoded(dict, { x: a, y: b }))).toBe(true);
      expect(encoded(dict, { x: a, y: b }).equals(encoded(dict, { x: a, y: a }))).toBe(false);
      expect(encoded(dict, { x: a, y: b }).equals(encoded(dictOther, { x: a, y: b }))).toBe(true);
      expect(encoded(dict, { x: a, y: b }).equals(BF.fromRecord({ x: a, y: b }))).toBe(true);
    });

    it('compares encoded bindings of different shapes', () => {
      expect(encoded(dict, { x: a, y: b }).equals(encoded(dict, { y: b, x: a }))).toBe(true);
      expect(encoded(dict, { x: a, y: b }).equals(encoded(dict, { y: a, x: a }))).toBe(false);
      expect(encoded(dict, { x: a, y: b }).equals(encoded(dict, { x: a, z: b }))).toBe(false);
    });
  });

  describe('modifying', () => {
    it('keeps encodings on set, delete and filter', () => {
      const bindings = encoded(dict, { x: a, y: b });
      expect(bindings.set('z', c).rawValues).toEqual([ 0, 1, c ]);
      expect(bindings.set('x', c).rawValues).toEqual([ c, 1 ]);
      expect(bindings.delete('x').rawValues).toEqual([ 1 ]);
      expect(bindings.delete('x').get('y')).toBe(b);
      expect(bindings.filter(term => term.equals(b)).rawValues).toEqual([ 1 ]);
      expect(bindings.filter(() => true).rawValues).toBe(bindings.rawValues);
      expect(bindings.filter(term => term.equals(b)).dictionary).toBe(dict);
    });

    it('decodes on map', () => {
      const bindings = encoded(dict, { x: a, y: b }).map(term => term);
      expect(bindings.rawValues).toEqual([ a, b ]);
      expect(bindings.dictionary).toBeUndefined();
    });

    it('shares subset plans between bindings of the same shape', () => {
      const left = encoded(dict, { x: a, y: b }).delete('x');
      const right = encoded(dict, { x: b, y: a }).delete('x');
      expect(left.shape).toBe(right.shape);
    });

    it('subsets bindings with more variables than a bitmask can hold', () => {
      const entries: Record<string, RDF.Term> = {};
      for (let i = 0; i < 40; i++) {
        entries[`v${i}`] = DF.namedNode(`ex:${i}`);
      }
      const bindings = encoded(dict, entries);
      const deleted = bindings.delete('v35');
      expect(deleted.size).toBe(39);
      expect(deleted.has('v35')).toBe(false);
      expect(deleted.get('v39')).toEqual(DF.namedNode('ex:39'));
      const filtered = bindings.filter((_term, variable) => variable.value !== 'v0' && variable.value !== 'v39');
      expect(filtered.size).toBe(38);
      expect(filtered.get('v1')).toEqual(DF.namedNode('ex:1'));
    });
  });

  describe('merge', () => {
    it('merges encoded bindings of the same dictionary without decoding', () => {
      const left = encoded(dict, { x: a, y: b });
      const right = encoded(dict, { y: b, z: c });
      const decode = jest.spyOn(dict, 'decode');
      const merged = left.merge(right)!;
      expect(decode).not.toHaveBeenCalled();
      expect(merged.rawValues).toEqual([ 0, 1, 2 ]);
      expect(merged.dictionary).toBe(dict);
      expect([ ...merged.keys() ].map(variable => variable.value)).toEqual([ 'x', 'y', 'z' ]);
    });

    it('rejects conflicting encoded bindings of the same dictionary', () => {
      expect(encoded(dict, { x: a, y: b }).merge(encoded(dict, { y: c }))).toBeUndefined();
    });

    it('merges encoded bindings of different dictionaries by decoding the new values of the other', () => {
      const left = encoded(dict, { x: a, y: b });
      const right = encoded(dictOther, { y: b, z: c });
      const merged = left.merge(right)!;
      expect(merged.rawValues).toEqual([ 0, 1, c ]);
      expect(merged.dictionary).toBe(dict);
      expect(merged.get('z')).toBe(c);
      expect(left.merge(encoded(dictOther, { y: a }))).toBeUndefined();
    });

    it('takes over the dictionary of the other if it has none itself', () => {
      const left = BF.fromRecord({ x: a });
      const right = encoded(dict, { x: a, y: b });
      const merged = left.merge(right)!;
      expect(merged.rawValues).toEqual([ a, 1 ]);
      expect(merged.dictionary).toBe(dict);
      expect(merged.get('y')).toBe(b);
    });

    it('merges with other bindings implementations', () => {
      const left = encoded(dict, { x: a, y: b });
      const contained: RDF.Bindings = <any> { [Symbol.iterator]: () => [[ DF.variable('x'), a ]][Symbol.iterator]() };
      expect(left.merge(contained)!.rawValues).toBe(left.rawValues);
      const extended: RDF.Bindings = <any> { [Symbol.iterator]: () => [[ DF.variable('z'), c ]][Symbol.iterator]() };
      expect(left.merge(extended)!.rawValues).toEqual([ 0, 1, c ]);
      const conflicting: RDF.Bindings = <any> { [Symbol.iterator]: () => [[ DF.variable('x'), b ]][Symbol.iterator]() };
      expect(left.merge(conflicting)).toBeUndefined();
      expect(left.mergeWith(() => c, conflicting).rawValues).toEqual([ c, 1 ]);
    });

    it('merges terms with encodings', () => {
      expect(encoded(dict, { x: a }).merge(BF.fromRecord({ x: a, y: b }))!.rawValues).toEqual([ 0, b ]);
      expect(encoded(dict, { x: a }).merge(BF.fromRecord({ x: b }))).toBeUndefined();
    });

    it('shares the values if the other has no new variables', () => {
      const left = encoded(dict, { x: a, y: b });
      expect(left.merge(encoded(dict, { y: b }))!.rawValues).toBe(left.rawValues);
    });

    it('shares merge plans between bindings of the same shapes', () => {
      const merged1 = encoded(dict, { x: a }).merge(encoded(dict, { y: b }))!;
      const merged2 = encoded(dict, { x: b }).merge(encoded(dict, { y: a }))!;
      expect(merged1.shape).toBe(merged2.shape);
    });
  });

  describe('mergeWith', () => {
    it('resolves conflicts between encodings', () => {
      const merger = jest.fn((left: RDF.Term) => left);
      const merged = encoded(dict, { x: a, y: b }).mergeWith(merger, encoded(dict, { y: c, z: c }));
      expect(merger).toHaveBeenCalledWith(b, c, DF.variable('y'));
      expect(merged.rawValues).toEqual([ 0, b, 2 ]);
      expect(merged.get('z')).toBe(c);
    });

    it('resolves conflicts without new variables', () => {
      const left = encoded(dict, { x: a, y: b });
      const merged = left.mergeWith(() => c, encoded(dict, { y: a }));
      expect(merged.rawValues).toEqual([ 0, c ]);
      expect(left.rawValues).toEqual([ 0, 1 ]);
    });

    it('does not call the merger without conflicts', () => {
      const merger = jest.fn();
      const left = encoded(dict, { x: a, y: b });
      expect(left.mergeWith(merger, encoded(dictOther, { y: b })).rawValues).toBe(left.rawValues);
      expect(merger).not.toHaveBeenCalled();
    });
  });

  describe('BindingsFactory', () => {
    it('keeps the last value of duplicate variables', () => {
      const bindings = BF.bindings([[ DF.variable('x'), a ], [ DF.variable('x'), b ]]);
      expect(bindings.size).toBe(1);
      expect(bindings.get('x')).toBe(b);
    });

    it('copies other bindings implementations in fromBindings', () => {
      const other: RDF.Bindings = <any> { [Symbol.iterator]: () => [[ DF.variable('x'), a ]][Symbol.iterator]() };
      expect(BF.fromBindings(other).rawValues).toEqual([ a ]);
    });

    it('is created with the merge handlers of a mediator', async() => {
      const mediator: any = { mediate: jest.fn(async() => ({ mergeHandlers: {}})) };
      const factory = await BindingsFactory.create(mediator, <any> {}, DF);
      expect(factory.bindings().setContextEntry(KEY, 'v').getContextEntry(KEY)).toBe('v');
    });

    it('keeps encodings in fromBindings', () => {
      const bindings = encoded(dict, { x: a });
      const copy = BF.fromBindings(bindings);
      expect(copy.rawValues).toBe(bindings.rawValues);
      expect(copy.dictionary).toBe(dict);
    });

    describe('createEncodedBindingsCreator', () => {
      const quad = [ 10, 11, 12, 13 ];
      const dictionary = { decode: (encoding: number) => DF.namedNode(`ex:${encoding}`) };

      it.each([ 0, 1, 2, 3, 4 ])('creates bindings for %s variables', (count) => {
        const variables = [ 'g', 's', 'p', 'o' ].slice(0, count).map(name => DF.variable(name));
        const indexes = [ 3, 2, 1, 0 ].slice(0, count);
        const creator = BF.createEncodedBindingsCreator(dictionary, variables, indexes)!;
        expect(creator).toBeInstanceOf(EncodedBindingsCreator);
        const bindings = creator.create(quad);
        expect(bindings.rawValues).toEqual(indexes.map(index => quad[index]));
        expect(bindings.size).toBe(count);
        for (const [ i, variable ] of variables.entries()) {
          expect(bindings.get(variable)).toEqual(DF.namedNode(`ex:${quad[indexes[i]]}`));
        }
      });

      it('creates bindings of a shared shape', () => {
        const creator1 = BF.createEncodedBindingsCreator(dictionary, [ DF.variable('s') ], [ 0 ])!;
        const creator2 = BF.createEncodedBindingsCreator(dictionary, [ DF.variable('s') ], [ 1 ])!;
        expect(creator1.create(quad).shape).toBe(creator2.create(quad).shape);
      });

      it('refuses duplicate variables', () => {
        expect(BF.createEncodedBindingsCreator(dictionary, [ DF.variable('s'), DF.variable('s') ], [ 0, 1 ]))
          .toBeUndefined();
      });

      it('refuses mismatching indexes', () => {
        expect(BF.createEncodedBindingsCreator(dictionary, [ DF.variable('s') ], [ 0, 1 ])).toBeUndefined();
      });

      it('refuses more than four variables', () => {
        const variables = [ 'a', 'b', 'c', 'd', 'e' ].map(name => DF.variable(name));
        expect(BF.createEncodedBindingsCreator(dictionary, variables, [ 0, 1, 2, 3, 0 ])).toBeUndefined();
      });

      it('passes the context merge handlers', () => {
        const factory = new BindingsFactory(DF, {});
        const creator = factory.createEncodedBindingsCreator(dictionary, [ DF.variable('s') ], [ 0 ])!;
        expect(creator.create(quad).setContextEntry(KEY, 'v').getContextEntry(KEY)).toBe('v');
      });
    });
  });

  describe('BindingsShape', () => {
    it('stops interning shapes beyond the maximum', () => {
      const shapeClass: any = BindingsShape;
      const interned = shapeClass.interned;
      shapeClass.interned = BindingsShape.MAX_INTERNED;
      try {
        const shape1 = BindingsShape.of([ 'not-interned-a', 'not-interned-b' ]);
        const shape2 = BindingsShape.of([ 'not-interned-a', 'not-interned-b' ]);
        expect(shape1).not.toBe(shape2);
        expect(shape1.names).toEqual(shape2.names);

        // Plans for shapes that are not interned are not cached either.
        const other = BindingsShape.of([ 'not-interned-b', 'not-interned-c' ]);
        expect(shape1.getMergePlan(other)).not.toBe(shape1.getMergePlan(other));
        expect(shape1.getMergePlan(other).shape.names)
          .toEqual([ 'not-interned-a', 'not-interned-b', 'not-interned-c' ]);
        expect(shape1.getSubsetPlan([ 0 ], 1)).not.toBe(shape1.getSubsetPlan([ 0 ], 1));
      } finally {
        shapeClass.interned = interned;
      }
    });

    it('caches plans for interned shapes', () => {
      const shape = BindingsShape.of([ 'cached-a', 'cached-b' ]);
      const other = BindingsShape.of([ 'cached-b' ]);
      expect(shape.getMergePlan(other)).toBe(shape.getMergePlan(other));
      expect(shape.getSubsetPlan([ 1 ], 2)).toBe(shape.getSubsetPlan([ 1 ], 2));
      expect(shape.getSubsetPlan([ 1 ], undefined)).not.toBe(shape.getSubsetPlan([ 1 ], undefined));
      expect(shape.getSubsetPlan([ 1 ], undefined).shape).toBe(other);
    });
  });
});
