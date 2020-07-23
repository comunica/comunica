import { ActionContext } from '@comunica/core';
import { BlankNodeScoped } from '@comunica/data-factory';
import { blankNode, defaultGraph, literal, namedNode, quad, variable } from '@rdfjs/data-model';
import { ArrayIterator, UnionIterator } from 'asynciterator';
import { AsyncReiterableArray } from 'asyncreiterable';
import 'jest-rdf';
import * as RDF from 'rdf-js';
import Factory from 'sparqlalgebrajs/lib/factory';
import { FederatedQuadSource } from '../lib/FederatedQuadSource';

const arrayifyStream = require('arrayify-stream');
const squad = require('rdf-quad');
const factory = new Factory();

describe('FederatedQuadSource', () => {
  let mediator: any;
  let context: ActionContext;

  beforeEach(() => {
    mediator = {
      mediate(action: any) {
        const type = action.context.get('@comunica/bus-rdf-resolve-quad-pattern:source').type;
        if (type === 'emptySource') {
          return Promise.resolve({ data: new ArrayIterator([], { autoStart: false }),
            metadata: () => Promise.resolve({ totalItems: 0 }) });
        }
        if (type === 'nonEmptySourceNoMeta') {
          return Promise.resolve({ data: new ArrayIterator([
            squad('s1', 'p1', 'o1'),
            squad('s1', 'p1', 'o2'),
          ], { autoStart: false }),
          metadata: null });
        }
        if (type === 'nonEmptySourceInfMeta') {
          return Promise.resolve({ data: new ArrayIterator([
            squad('s1', 'p1', 'o1'),
            squad('s1', 'p1', 'o2'),
          ], { autoStart: false }),
          metadata: () => Promise.resolve({ totalItems: Infinity }) });
        }
        if (type === 'blankNodeSource') {
          return Promise.resolve({ data: new ArrayIterator([
            squad('_:s1', '_:p1', '_:o1'),
            squad('_:s2', '_:p2', '_:o2'),
          ], { autoStart: false }),
          metadata: () => Promise.resolve({ totalItems: Infinity }) });
        }
        if (type === 'rejectingMetadata') {
          return Promise.resolve({
            data: new ArrayIterator([], { autoStart: false }),
            metadata: () => Promise.reject(new Error('federated metadata reject')),
          });
        }
        return Promise.resolve({ data: new ArrayIterator([
          squad('s1', 'p1', 'o1'),
          squad('s1', 'p1', 'o2'),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({ totalItems: 2, otherMetadata: true }) });
      },
    };
    context = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
        AsyncReiterableArray.fromFixedData([{ type: 'myType', value: 'myValue' }]) });
  });

  describe('The FederatedQuadSource module', () => {
    it('should be a function', () => {
      expect(FederatedQuadSource).toBeInstanceOf(Function);
    });

    it('should be a FederatedQuadSource constructor', () => {
      expect(new FederatedQuadSource(mediator, context, new Map(), true)).toBeInstanceOf(FederatedQuadSource);
    });

    it('should be a FederatedQuadSource constructor with optional bufferSize argument', () => {
      expect(new FederatedQuadSource(mediator, context, new Map(), true)).toBeInstanceOf(FederatedQuadSource);
    });
  });

  describe('#skolemizeTerm', () => {
    it('should not change a variable', () => {
      expect(FederatedQuadSource.skolemizeTerm(variable('abc'), '0'))
        .toEqualRdfTerm(variable('abc'));
    });

    it('should not change a named node', () => {
      expect(FederatedQuadSource.skolemizeTerm(namedNode('abc'), '0'))
        .toEqualRdfTerm(namedNode('abc'));
    });

    it('should not change a literal', () => {
      expect(FederatedQuadSource.skolemizeTerm(literal('abc'), '0'))
        .toEqualRdfTerm(literal('abc'));
    });

    it('should not change a default graph', () => {
      expect(FederatedQuadSource.skolemizeTerm(defaultGraph(), '0'))
        .toEqualRdfTerm(defaultGraph());
    });

    it('should change a blank node', () => {
      expect(FederatedQuadSource.skolemizeTerm(blankNode('abc'), '0'))
        .toEqualRdfTerm(blankNode('urn:comunica_skolem:source_0:abc'));
      expect((<BlankNodeScoped> FederatedQuadSource.skolemizeTerm(blankNode('abc'), '0')).skolemized)
        .toEqualRdfTerm(namedNode('urn:comunica_skolem:source_0:abc'));
    });
  });

  describe('#skolemizeQuad', () => {
    it('should not skolemize named nodes', () => {
      expect(FederatedQuadSource.skolemizeQuad(
        quad(namedNode('s'), namedNode('p'), namedNode('o'), namedNode('g')), '0',
      ))
        .toEqualRdfQuad(quad(namedNode('s'), namedNode('p'), namedNode('o'), namedNode('g')));
    });

    it('should not skolemize blank nodes', () => {
      expect(FederatedQuadSource.skolemizeQuad(
        quad<RDF.BaseQuad>(blankNode('s'), blankNode('p'), blankNode('o'), blankNode('g')), '0',
      ))
        .toEqualRdfQuad(quad<RDF.BaseQuad>(
          blankNode('urn:comunica_skolem:source_0:s'),
          blankNode('urn:comunica_skolem:source_0:p'),
          blankNode('urn:comunica_skolem:source_0:o'),
          blankNode('urn:comunica_skolem:source_0:g'),
        ));
    });
  });

  describe('#deskolemizeTerm', () => {
    it('should not change a variable', () => {
      expect(FederatedQuadSource.deskolemizeTerm(variable('abc'), '0'))
        .toEqual(variable('abc'));
    });

    it('should not change a non-skolemized named node', () => {
      expect(FederatedQuadSource.deskolemizeTerm(namedNode('abc'), '0'))
        .toEqual(namedNode('abc'));
    });

    it('should not change a literal', () => {
      expect(FederatedQuadSource.deskolemizeTerm(literal('abc'), '0'))
        .toEqual(literal('abc'));
    });

    it('should not change a default graph', () => {
      expect(FederatedQuadSource.deskolemizeTerm(defaultGraph(), '0'))
        .toEqual(defaultGraph());
    });

    it('should not change a plain blank node', () => {
      expect(FederatedQuadSource.deskolemizeTerm(blankNode('abc'), '0'))
        .toEqual(blankNode('abc'));
    });

    it('should change a skolemized blank node in the proper source', () => {
      expect(FederatedQuadSource.deskolemizeTerm(new BlankNodeScoped('abc',
        namedNode('urn:comunica_skolem:source_0:abc')), '0'))
        .toEqual(blankNode('abc'));
    });

    it('should change a skolemized named node in the proper source', () => {
      expect(FederatedQuadSource.deskolemizeTerm(namedNode('urn:comunica_skolem:source_0:abc'), '0'))
        .toEqual(blankNode('abc'));
    });

    it('should change a skolemized blank node in the wrong source', () => {
      expect(FederatedQuadSource.deskolemizeTerm(new BlankNodeScoped('abc',
        namedNode('urn:comunica_skolem:source_0:abc')), '1'))
        .toBeFalsy();
    });

    it('should change a skolemized named node in the wrong source', () => {
      expect(FederatedQuadSource.deskolemizeTerm(new BlankNodeScoped('abc',
        namedNode('urn:comunica_skolem:source_0:abc')), '1'))
        .toBeFalsy();
    });
  });

  describe('#isTermBound', () => {
    it('should be false on a variable', () => {
      return expect(FederatedQuadSource.isTermBound(variable('var'))).toBeFalsy();
    });

    it('should be true on a blank node', () => {
      return expect(FederatedQuadSource.isTermBound(blankNode('bnode'))).toBeTruthy();
    });

    it('should be true on a named node', () => {
      return expect(FederatedQuadSource.isTermBound(namedNode('http://example.org'))).toBeTruthy();
    });

    it('should be true on a literal', () => {
      return expect(FederatedQuadSource.isTermBound(literal('lit'))).toBeTruthy();
    });

    it('should be true on the default graph', () => {
      return expect(FederatedQuadSource.isTermBound(defaultGraph())).toBeTruthy();
    });
  });

  describe('#isSubPatternOf', () => {
    it('should be true on equal patterns', () => {
      expect(FederatedQuadSource.isSubPatternOf(
        squad('', '', '', ''),
        squad('', '', '', ''),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('a', 'b', 'c', 'd'),
        squad('a', 'b', 'c', 'd'),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('a', '"b"', 'c', '"d"'),
        squad('a', '"b"', 'c', '"d"'),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('a', '"b"', '?c', '"d"'),
        squad('a', '"b"', '?c', '"d"'),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('?a', '"b"', 'c', '"d"'),
        squad('?a', '"b"', 'c', '"d"'),
      )).toBeTruthy();
    });

    it('should be false on non-sub-patterns', () => {
      expect(FederatedQuadSource.isSubPatternOf(
        squad('?v', '?v', '?v', '?v'),
        squad('a', 'b', 'c', 'd'),
      )).toBeFalsy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('?v', '?v', '?v', '?v'),
        squad('a', 'b', '?v', 'd'),
      )).toBeFalsy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('?v', '?v', '?v', '?v'),
        squad('?v', 'b', 'c', '?v'),
      )).toBeFalsy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('e', 'f', 'g', 'h'),
        squad('a', 'b', 'c', 'd'),
      )).toBeFalsy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('?v', 'f', '?v', 'h'),
        squad('?v', 'b', '?v', 'd'),
      )).toBeFalsy();
    });

    it('should be true on sub-patterns', () => {
      expect(FederatedQuadSource.isSubPatternOf(
        squad('?v', '?v', '?v', '?v'),
        squad('?v', '?v', '?v', '?v'),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('a', '?v', '?v', '?v'),
        squad('?v', '?v', '?v', '?v'),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('?v', 'b', '?v', '?v'),
        squad('?v', '?v', '?v', '?v'),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('a', 'b', '?v', '?v'),
        squad('?v', '?v', '?v', '?v'),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('?v', '?v', 'c', 'd'),
        squad('?v', '?v', '?v', '?v'),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('a', '?v', 'c', 'd'),
        squad('?v', '?v', '?v', '?v'),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('?v', 'b', 'c', 'd'),
        squad('?v', '?v', '?v', '?v'),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('a', 'b', 'c', 'd'),
        squad('?v', '?v', '?v', '?v'),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('?v', '?v', 'c', 'd'),
        squad('?v', '?v', '?v', '?v'),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('a', '?v', 'c', 'd'),
        squad('?v', '?v', '?v', '?v'),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('?v', 'b', 'c', 'd'),
        squad('?v', '?v', '?v', '?v'),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('a', 'b', 'c', 'd'),
        squad('?v', '?v', '?v', '?v'),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('a', 'b', '?v', 'd'),
        squad('a', 'b', '?v', 'd'),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('a', 'b', 'c', 'd'),
        squad('a', 'b', '?v', 'd'),
      )).toBeTruthy();
    });
  });

  describe('A FederatedQuadSource instance with predefined empty patterns', () => {
    let subSource: any;
    let source: FederatedQuadSource;
    let emptyPatterns;

    beforeEach(() => {
      subSource = {};
      emptyPatterns = new Map();
      emptyPatterns.set(subSource, [ squad('?a', '?b', '?c', '"d"') ]);
      source = new FederatedQuadSource(mediator, context, emptyPatterns, true);
    });

    it('should throw an error on a subject regex call', () => {
      return expect(() => source.match(/.*/u)).toThrow();
    });

    it('should throw an error on a predicate regex call', () => {
      return expect(() => source.match(undefined, /.*/u)).toThrow();
    });

    it('should throw an error on a object regex call', () => {
      return expect(() => source.match(undefined, undefined, /.*/u)).toThrow();
    });

    it('should throw an error on a graph regex call', () => {
      return expect(() => source.match(undefined, undefined, undefined, /.*/u)).toThrow();
    });

    it('should return an AsyncIterator', () => {
      return expect(source.match(variable('v'), variable('v'), variable('v'), variable('v')))
        .toBeInstanceOf(UnionIterator);
    });

    describe('when calling isSourceEmpty', () => {
      it('on ?a ?b ?c "d" for the source should return true', () => {
        return expect(source.isSourceEmpty(subSource, squad('?a', '?b', '?c', '"d"'))).toBeTruthy();
      });

      it('on "a" ?b ?c "d" for the source should return true', () => {
        return expect(source.isSourceEmpty(subSource, squad('"a"', '?b', '?c', '"d"'))).toBeTruthy();
      });

      it('on "a" ?b ?c "e" for the source should return false', () => {
        return expect(source.isSourceEmpty(subSource, squad('"a"', '?b', '?c', '"e"'))).toBeFalsy();
      });

      it('on ?a ?b ?c "d" for another source should return false', () => {
        return expect(source.isSourceEmpty(<any> {}, squad('?a', '?b', '?c', '"d"'))).toBeFalsy();
      });

      it('on "a" ?b ?c "d" for another source should return false', () => {
        return expect(source.isSourceEmpty(<any> {}, squad('"a"', '?b', '?c', '"d"'))).toBeFalsy();
      });
    });
  });

  describe('A FederatedQuadSource instance with skipEmptyPatterns set to false', () => {
    let subSource: any;
    let source: FederatedQuadSource;
    let emptyPatterns;

    beforeEach(() => {
      subSource = {};
      emptyPatterns = new Map();
      emptyPatterns.set(subSource, [ squad('?a', '?b', '?c', '"d"') ]);
      source = new FederatedQuadSource(mediator, context, emptyPatterns, false);
    });

    describe('when calling isSourceEmpty', () => {
      it('on ?a ?b ?c "d" for the source should return false', () => {
        return expect(source.isSourceEmpty(subSource, squad('?a', '?b', '?c', '"d"'))).toBeFalsy();
      });

      it('on "a" ?b ?c "d"d for the source should return false', () => {
        return expect(source.isSourceEmpty(subSource, squad('"a"', '?b', '?c', '"d"'))).toBeFalsy();
      });

      it('on "a" ?b ?c "e" for the source should return false', () => {
        return expect(source.isSourceEmpty(subSource, squad('"a"', '?b', '?c', '"e"'))).toBeFalsy();
      });

      it('on ?a ?b ?c "d" for another source should return false', () => {
        return expect(source.isSourceEmpty(<any> {}, squad('?a', '?b', '?c', '"d"'))).toBeFalsy();
      });

      it('on "a" ?b ?c "d" for another source should return false', () => {
        return expect(source.isSourceEmpty(<any> {}, squad('"a"', '?b', '?c', '"d"'))).toBeFalsy();
      });
    });
  });

  describe('A FederatedQuadSource instance over zero sources', () => {
    let source: FederatedQuadSource;
    let emptyPatterns;
    let contextEmpty;

    beforeEach(() => {
      emptyPatterns = new Map();
      contextEmpty = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
          AsyncReiterableArray.fromFixedData([]) });
      source = new FederatedQuadSource(mediator, contextEmpty, emptyPatterns, true);
    });

    it('should return an empty AsyncIterator', async() => {
      expect(await arrayifyStream(source.match())).toEqual([]);
    });

    it('should emit metadata with 0 totalItems', async() => {
      const stream = source.match();
      await expect(new Promise((resolve, reject) => {
        stream.on('metadata', resolve);
        stream.on('end', reject);
      })).resolves.toEqual({ totalItems: 0 });
    });
  });

  describe('A FederatedQuadSource instance over one empty source', () => {
    let subSource: any;
    let source: FederatedQuadSource;
    let emptyPatterns: any;
    let contextSingleEmpty;

    beforeEach(() => {
      subSource = { type: 'emptySource', value: 'I will be empty' };
      emptyPatterns = new Map();
      contextSingleEmpty = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
          AsyncReiterableArray.fromFixedData([ subSource ]) });
      source = new FederatedQuadSource(mediator, contextSingleEmpty, emptyPatterns, true);
    });

    it('should return an empty AsyncIterator', async() => {
      expect(await arrayifyStream(source.match())).toEqual([]);
    });

    it('should emit metadata with 0 totalItems', async() => {
      const stream = source.match();
      await expect(new Promise((resolve, reject) => {
        stream.on('metadata', resolve);
        stream.on('end', reject);
      })).resolves.toEqual({ totalItems: 0 });
    });

    it('should store the queried empty patterns in the emptyPatterns datastructure', async() => {
      await arrayifyStream(source.match(variable('s'), literal('p'), variable('o'), variable('g')));
      await arrayifyStream(source.match(variable('s'), literal('p'), literal('o'), variable('g')));

      await arrayifyStream(source.match(literal('s'), variable('p'), variable('o'), variable('g')));
      await arrayifyStream(source.match(literal('s'), variable('p'), literal('o'), variable('g')));
      await arrayifyStream(source.match(literal('s'), variable('p'), literal('o'), literal('g')));

      expect([ ...emptyPatterns.entries() ]).toEqual([
        [ subSource, [
          factory.createPattern(variable('s'), literal('p'), variable('o'), variable('g')),
          factory.createPattern(literal('s'), variable('p'), variable('o'), variable('g')),
        ]],
      ]);
    });
  });

  describe('A FederatedQuadSource instance over one non-empty source', () => {
    let subSource: any;
    let source: FederatedQuadSource;
    let emptyPatterns: any;
    let contextSingle;

    beforeEach(() => {
      subSource = { type: 'nonEmptySource', value: 'I will not be empty' };
      emptyPatterns = new Map();
      contextSingle = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
          AsyncReiterableArray.fromFixedData([ subSource ]) });
      source = new FederatedQuadSource(mediator, contextSingle, emptyPatterns, true);
    });

    it('should return a non-empty AsyncIterator', async() => {
      expect(await arrayifyStream(source.match())).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should emit metadata with 2 totalItems', async() => {
      const stream = source.match();
      await expect(new Promise((resolve, reject) => {
        stream.on('metadata', resolve);
        stream.on('end', reject);
      })).resolves.toEqual({ totalItems: 2, otherMetadata: true });
    });

    it('should store no queried empty patterns in the emptyPatterns datastructure', async() => {
      await arrayifyStream(source.match(variable('s'), literal('p'), variable('o'), variable('g')));
      await arrayifyStream(source.match(variable('s'), literal('p'), literal('o'), variable('g')));

      await arrayifyStream(source.match(literal('s'), variable('p'), variable('o'), variable('g')));
      await arrayifyStream(source.match(literal('s'), variable('p'), literal('o'), variable('g')));
      await arrayifyStream(source.match(literal('s'), variable('p'), literal('o'), literal('g')));

      expect([ ...emptyPatterns.entries() ]).toEqual([
        [ subSource, []],
      ]);
    });
  });

  describe('A FederatedQuadSource instance over one empty source and one non-empty source', () => {
    let subSource1: any;
    let subSource2: any;
    let source: FederatedQuadSource;
    let emptyPatterns: any;
    let contextSingleEmpty;

    beforeEach(() => {
      subSource1 = { type: 'emptySource', value: 'I will be empty' };
      subSource2 = { type: 'nonEmptySource', value: 'I will not be empty' };
      emptyPatterns = new Map();
      contextSingleEmpty = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
          AsyncReiterableArray.fromFixedData([
            subSource1,
            subSource2,
          ]) });
      source = new FederatedQuadSource(mediator, contextSingleEmpty, emptyPatterns, true);
    });

    it('should return a non-empty AsyncIterator', async() => {
      const a = await arrayifyStream(source.match());
      expect(a).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should emit metadata with 2 totalItems', async() => {
      const stream = source.match();
      await expect(new Promise((resolve, reject) => {
        stream.on('metadata', resolve);
        stream.on('end', reject);
      })).resolves.toEqual({ totalItems: 2 });
    });

    it('should store the queried empty patterns for the empty source in the emptyPatterns datastructure', async() => {
      await arrayifyStream(source.match(variable('s'), literal('p'), variable('o'), variable('g')));
      await arrayifyStream(source.match(variable('s'), literal('p'), literal('o'), variable('g')));

      await arrayifyStream(source.match(literal('s'), variable('p'), variable('o'), variable('g')));
      await arrayifyStream(source.match(literal('s'), variable('p'), literal('o'), variable('g')));
      await arrayifyStream(source.match(literal('s'), variable('p'), literal('o'), literal('g')));

      expect([ ...emptyPatterns.entries() ]).toEqual([
        [ subSource1, [
          factory.createPattern(variable('s'), literal('p'), variable('o'), variable('g')),
          factory.createPattern(literal('s'), variable('p'), variable('o'), variable('g')),
        ]],
        [ subSource2, []],
      ]);
    });
  });

  describe('A FederatedQuadSource instance over two equal empty sources', () => {
    let subSource1: any;
    let subSource2: any;
    let source: FederatedQuadSource;
    let emptyPatterns: any;
    let contextSingleEmpty;

    beforeEach(() => {
      subSource1 = { type: 'emptySource', value: 'I will be empty' };
      subSource2 = { type: 'emptySource', value: 'I will be empty' };
      emptyPatterns = new Map();
      contextSingleEmpty = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
          AsyncReiterableArray.fromFixedData([
            subSource1,
            subSource2,
          ]) });
      source = new FederatedQuadSource(mediator, contextSingleEmpty, emptyPatterns, true);
    });

    it('should return an empty AsyncIterator', async() => {
      const a = await arrayifyStream(source.match());
      expect(a).toEqual([]);
    });

    it('should emit metadata with 0 totalItems', async() => {
      const stream = source.match();
      await expect(new Promise((resolve, reject) => {
        stream.on('metadata', resolve);
        stream.on('end', reject);
      })).resolves.toEqual({ totalItems: 0 });
    });

    it('should store the queried empty patterns for the empty source in the emptyPatterns datastructure', async() => {
      await arrayifyStream(source.match(variable('s'), literal('p'), variable('o'), variable('g')));
      await arrayifyStream(source.match(variable('s'), literal('p'), literal('o'), variable('g')));

      await arrayifyStream(source.match(literal('s'), variable('p'), variable('o'), variable('g')));
      await arrayifyStream(source.match(literal('s'), variable('p'), literal('o'), variable('g')));
      await arrayifyStream(source.match(literal('s'), variable('p'), literal('o'), literal('g')));

      expect([ ...emptyPatterns.entries() ]).toEqual([
        [ subSource1, [
          factory.createPattern(variable('s'), literal('p'), variable('o'), variable('g')),
          factory.createPattern(literal('s'), variable('p'), variable('o'), variable('g')),
        ]],
        [ subSource2, [
          factory.createPattern(variable('s'), literal('p'), variable('o'), variable('g')),
          factory.createPattern(literal('s'), variable('p'), variable('o'), variable('g')),
        ]],
      ]);
    });
  });

  describe('A FederatedQuadSource instance over two identical empty sources', () => {
    let subSource: any;
    let source: FederatedQuadSource;
    let emptyPatterns: any;
    let contextSingleEmpty;

    beforeEach(() => {
      subSource = { type: 'emptySource', value: 'I will be empty' };
      emptyPatterns = new Map();
      contextSingleEmpty = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
          AsyncReiterableArray.fromFixedData([
            subSource,
            subSource,
          ]) });
      source = new FederatedQuadSource(mediator, contextSingleEmpty, emptyPatterns, true);
    });

    it('should return an empty AsyncIterator', async() => {
      const a = await arrayifyStream(source.match());
      expect(a).toEqual([]);
    });

    it('should emit metadata with 0 totalItems', async() => {
      const stream = source.match();
      await expect(new Promise((resolve, reject) => {
        stream.on('metadata', resolve);
        stream.on('end', reject);
      })).resolves.toEqual({ totalItems: 0 });
    });

    it('should store the queried empty patterns for the empty source in the emptyPatterns datastructure', async() => {
      await arrayifyStream(source.match(variable('s'), literal('p'), variable('o'), variable('g')));
      await arrayifyStream(source.match(variable('s'), literal('p'), literal('o'), variable('g')));

      await arrayifyStream(source.match(literal('s'), variable('p'), variable('o'), variable('g')));
      await arrayifyStream(source.match(literal('s'), variable('p'), literal('o'), variable('g')));
      await arrayifyStream(source.match(literal('s'), variable('p'), literal('o'), literal('g')));

      expect([ ...emptyPatterns.entries() ]).toEqual([
        [ subSource, [
          factory.createPattern(variable('s'), literal('p'), variable('o'), variable('g')),
          factory.createPattern(literal('s'), variable('p'), variable('o'), variable('g')),
        ]],
      ]);
    });
  });

  describe('A FederatedQuadSource instance over two equal empty sources with skip empty sources false', () => {
    let source: FederatedQuadSource;
    let emptyPatterns: any;
    let contextSingleEmpty;

    beforeEach(() => {
      emptyPatterns = new Map();
      contextSingleEmpty = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
          AsyncReiterableArray.fromFixedData([
            { type: 'emptySource', value: 'I will be empty' },
            { type: 'emptySource', value: 'I will be empty' },
          ]) });
      source = new FederatedQuadSource(mediator, contextSingleEmpty, emptyPatterns, false);
    });

    it('should return an empty AsyncIterator', async() => {
      const a = await arrayifyStream(source.match());
      expect(a).toEqual([]);
    });

    it('should emit metadata with 0 totalItems', async() => {
      const stream = source.match();
      await expect(new Promise((resolve, reject) => {
        stream.on('metadata', resolve);
        stream.on('end', reject);
      })).resolves.toEqual({ totalItems: 0 });
    });

    it('should store the queried empty patterns for the empty source in the emptyPatterns datastructure', async() => {
      await arrayifyStream(source.match(variable('s'), literal('p'), variable('o'), variable('g')));
      await arrayifyStream(source.match(variable('s'), literal('p'), literal('o'), variable('g')));

      await arrayifyStream(source.match(literal('s'), variable('p'), variable('o'), variable('g')));
      await arrayifyStream(source.match(literal('s'), variable('p'), literal('o'), variable('g')));
      await arrayifyStream(source.match(literal('s'), variable('p'), literal('o'), literal('g')));

      expect([ ...emptyPatterns.entries() ]).toEqual([]);
    });
  });

  describe('A FederatedQuadSource instance over two non-empty sources', () => {
    let subSource1: any;
    let subSource2: any;
    let source: FederatedQuadSource;
    let emptyPatterns: any;
    let contextSingleEmpty;

    beforeEach(() => {
      subSource1 = { type: 'nonEmptySource', value: 'I will not be empty' };
      subSource2 = { type: 'nonEmptySource2', value: 'I will also not be empty' };
      emptyPatterns = new Map();
      contextSingleEmpty = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
          AsyncReiterableArray.fromFixedData([
            subSource1,
            subSource2,
          ]) });
      source = new FederatedQuadSource(mediator, contextSingleEmpty, emptyPatterns, true);
    });

    it('should return a non-empty AsyncIterator', async() => {
      const a = await arrayifyStream(source.match());
      expect(a).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should emit metadata with 2 totalItems', async() => {
      const stream = source.match();
      await expect(new Promise((resolve, reject) => {
        stream.on('metadata', resolve);
        stream.on('end', reject);
      })).resolves.toEqual({ totalItems: 4 });
    });

    it('should store the queried empty patterns for the empty source in the emptyPatterns datastructure', async() => {
      await arrayifyStream(source.match(variable('s'), literal('p'), variable('o'), variable('g')));
      await arrayifyStream(source.match(variable('s'), literal('p'), literal('o'), variable('g')));

      await arrayifyStream(source.match(literal('s'), variable('p'), variable('o'), variable('g')));
      await arrayifyStream(source.match(literal('s'), variable('p'), literal('o'), variable('g')));
      await arrayifyStream(source.match(literal('s'), variable('p'), literal('o'), literal('g')));

      expect([ ...emptyPatterns.entries() ]).toEqual([
        [ subSource1, []],
        [ subSource2, []],
      ]);
    });
  });

  describe('A FederatedQuadSource instance over two non-empty sources, one without metadata', () => {
    let source: FederatedQuadSource;
    let emptyPatterns;
    let contextSingleEmpty;

    beforeEach(() => {
      emptyPatterns = new Map();
      contextSingleEmpty = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
          AsyncReiterableArray.fromFixedData([
            { type: 'nonEmptySource', value: 'I will not be empty' },
            { type: 'nonEmptySourceNoMeta', value: 'I will also not be empty, but have no metadata' },
          ]) });
      source = new FederatedQuadSource(mediator, contextSingleEmpty, emptyPatterns, true);
    });

    it('should return a non-empty AsyncIterator', async() => {
      const a = await arrayifyStream(source.match());
      expect(a).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should emit metadata with Infinity totalItems', async() => {
      const stream = source.match();
      await expect(new Promise((resolve, reject) => {
        stream.on('metadata', resolve);
        stream.on('end', reject);
      })).resolves.toEqual({ totalItems: Infinity });
    });
  });

  describe('A FederatedQuadSource instance over two non-empty sources, each without metadata', () => {
    let source: FederatedQuadSource;
    let emptyPatterns;
    let contextSingleEmpty;

    beforeEach(() => {
      emptyPatterns = new Map();
      contextSingleEmpty = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
          AsyncReiterableArray.fromFixedData([
            { type: 'nonEmptySourceNoMeta', value: 'I will not be empty' },
            { type: 'nonEmptySourceNoMeta', value: 'I will also not be empty, but have no metadata' },
          ]) });
      source = new FederatedQuadSource(mediator, contextSingleEmpty, emptyPatterns, true);
    });

    it('should return a non-empty AsyncIterator', async() => {
      const a = await arrayifyStream(source.match());
      expect(a).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should emit metadata with Infinity totalItems', async() => {
      const stream = source.match();
      await expect(new Promise((resolve, reject) => {
        stream.on('metadata', resolve);
        stream.on('end', reject);
      })).resolves.toEqual({ totalItems: Infinity });
    });
  });

  describe('A FederatedQuadSource instance over two non-empty sources, one with infinity metadata', () => {
    let source: FederatedQuadSource;
    let emptyPatterns;
    let contextSingleEmpty;

    beforeEach(() => {
      emptyPatterns = new Map();
      contextSingleEmpty = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
          AsyncReiterableArray.fromFixedData([
            { type: 'nonEmptySource', value: 'I will not be empty' },
            { type: 'nonEmptySourceInfMeta', value: 'I will also not be empty, but have inf metadata' },
          ]) });
      source = new FederatedQuadSource(mediator, contextSingleEmpty, emptyPatterns, true);
    });

    it('should return a non-empty AsyncIterator', async() => {
      const a = await arrayifyStream(source.match());
      expect(a).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should emit metadata with Infinity totalItems', async() => {
      const stream = source.match();
      await expect(new Promise((resolve, reject) => {
        stream.on('metadata', resolve);
        stream.on('end', reject);
      })).resolves.toEqual({ totalItems: Infinity });
    });
  });

  describe('A FederatedQuadSource instance over two non-empty sources, each with infinity metadata', () => {
    let source: FederatedQuadSource;
    let emptyPatterns;
    let contextSingleEmpty;

    beforeEach(() => {
      emptyPatterns = new Map();
      contextSingleEmpty = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
          AsyncReiterableArray.fromFixedData([
            { type: 'nonEmptySourceInfMeta', value: 'I will not be empty' },
            { type: 'nonEmptySourceInfMeta', value: 'I will also not be empty, but have inf metadata' },
          ]) });
      source = new FederatedQuadSource(mediator, contextSingleEmpty, emptyPatterns, true);
    });

    it('should return a non-empty AsyncIterator', async() => {
      const a = await arrayifyStream(source.match());
      expect(a).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should emit metadata with Infinity totalItems', async() => {
      const stream = source.match();
      await expect(new Promise((resolve, reject) => {
        stream.on('metadata', resolve);
        stream.on('end', reject);
      })).resolves.toEqual({ totalItems: Infinity });
    });
  });

  describe('A FederatedQuadSource instance over two non-empty sources with blank nodes', () => {
    let subSource1;
    let subSource2;
    let source: FederatedQuadSource;
    let emptyPatterns;
    let contextSingleEmpty;

    beforeEach(() => {
      subSource1 = { type: 'blankNodeSource', value: 'I will contain blank nodes' };
      subSource2 = { type: 'blankNodeSource', value: 'I will also contain blank nodes' };
      emptyPatterns = new Map();
      contextSingleEmpty = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
          AsyncReiterableArray.fromFixedData([
            subSource1,
            subSource2,
          ]) });
      source = new FederatedQuadSource(mediator, contextSingleEmpty, emptyPatterns, true);
    });

    it('should return a non-empty AsyncIterator', async() => {
      const a = await arrayifyStream(source.match());
      expect(a).toEqual([
        quad<RDF.BaseQuad>(
          new BlankNodeScoped('bc_0_s1',
            namedNode('urn:comunica_skolem:source_0:s1')),
          new BlankNodeScoped('bc_0_p1',
            namedNode('urn:comunica_skolem:source_0:p1')),
          new BlankNodeScoped('bc_0_o1',
            namedNode('urn:comunica_skolem:source_0:o1')),
        ),
        quad<RDF.BaseQuad>(
          new BlankNodeScoped('bc_1_s1',
            namedNode('urn:comunica_skolem:source_1:s1')),
          new BlankNodeScoped('bc_1_p1',
            namedNode('urn:comunica_skolem:source_1:p1')),
          new BlankNodeScoped('bc_1_o1',
            namedNode('urn:comunica_skolem:source_1:o1')),
        ),
        quad<RDF.BaseQuad>(
          new BlankNodeScoped('bc_0_s2',
            namedNode('urn:comunica_skolem:source_0:s2')),
          new BlankNodeScoped('bc_0_p2',
            namedNode('urn:comunica_skolem:source_0:p2')),
          new BlankNodeScoped('bc_0_o2',
            namedNode('urn:comunica_skolem:source_0:o2')),
        ),
        quad<RDF.BaseQuad>(
          new BlankNodeScoped('bc_1_s2',
            namedNode('urn:comunica_skolem:source_1:s2')),
          new BlankNodeScoped('bc_1_p2',
            namedNode('urn:comunica_skolem:source_1:p2')),
          new BlankNodeScoped('bc_1_o2',
            namedNode('urn:comunica_skolem:source_1:o2')),
        ),
      ]);
    });

    it('should match will all sources for named nodes', async() => {
      const a = await arrayifyStream(source.match(namedNode('abc')));
      expect(a).toEqual([
        quad<RDF.BaseQuad>(
          new BlankNodeScoped('bc_0_s1',
            namedNode('urn:comunica_skolem:source_0:s1')),
          new BlankNodeScoped('bc_0_p1',
            namedNode('urn:comunica_skolem:source_0:p1')),
          new BlankNodeScoped('bc_0_o1',
            namedNode('urn:comunica_skolem:source_0:o1')),
        ),
        quad<RDF.BaseQuad>(
          new BlankNodeScoped('bc_1_s1',
            namedNode('urn:comunica_skolem:source_1:s1')),
          new BlankNodeScoped('bc_1_p1',
            namedNode('urn:comunica_skolem:source_1:p1')),
          new BlankNodeScoped('bc_1_o1',
            namedNode('urn:comunica_skolem:source_1:o1')),
        ),
        quad<RDF.BaseQuad>(
          new BlankNodeScoped('bc_0_s2',
            namedNode('urn:comunica_skolem:source_0:s2')),
          new BlankNodeScoped('bc_0_p2',
            namedNode('urn:comunica_skolem:source_0:p2')),
          new BlankNodeScoped('bc_0_o2',
            namedNode('urn:comunica_skolem:source_0:o2')),
        ),
        quad<RDF.BaseQuad>(
          new BlankNodeScoped('bc_1_s2',
            namedNode('urn:comunica_skolem:source_1:s2')),
          new BlankNodeScoped('bc_1_p2',
            namedNode('urn:comunica_skolem:source_1:p2')),
          new BlankNodeScoped('bc_1_o2',
            namedNode('urn:comunica_skolem:source_1:o2')),
        ),
      ]);
    });

    it('should match will all sources for plain blank nodes', async() => {
      const a = await arrayifyStream(source.match(new BlankNodeScoped('abc',
        namedNode('abc'))));
      expect(a).toEqual([
        quad<RDF.BaseQuad>(
          new BlankNodeScoped('bc_0_s1',
            namedNode('urn:comunica_skolem:source_0:s1')),
          new BlankNodeScoped('bc_0_p1',
            namedNode('urn:comunica_skolem:source_0:p1')),
          new BlankNodeScoped('bc_0_o1',
            namedNode('urn:comunica_skolem:source_0:o1')),
        ),
        quad<RDF.BaseQuad>(
          new BlankNodeScoped('bc_1_s1',
            namedNode('urn:comunica_skolem:source_1:s1')),
          new BlankNodeScoped('bc_1_p1',
            namedNode('urn:comunica_skolem:source_1:p1')),
          new BlankNodeScoped('bc_1_o1',
            namedNode('urn:comunica_skolem:source_1:o1')),
        ),
        quad<RDF.BaseQuad>(
          new BlankNodeScoped('bc_0_s2',
            namedNode('urn:comunica_skolem:source_0:s2')),
          new BlankNodeScoped('bc_0_p2',
            namedNode('urn:comunica_skolem:source_0:p2')),
          new BlankNodeScoped('bc_0_o2',
            namedNode('urn:comunica_skolem:source_0:o2')),
        ),
        quad<RDF.BaseQuad>(
          new BlankNodeScoped('bc_1_s2',
            namedNode('urn:comunica_skolem:source_1:s2')),
          new BlankNodeScoped('bc_1_p2',
            namedNode('urn:comunica_skolem:source_1:p2')),
          new BlankNodeScoped('bc_1_o2',
            namedNode('urn:comunica_skolem:source_1:o2')),
        ),
      ]);
    });

    it('should match the first source for blank nodes coming from the first source', async() => {
      const a = await arrayifyStream(source.match(new BlankNodeScoped('abc',
        namedNode('urn:comunica_skolem:source_0:s1'))));
      expect(a).toEqual([
        quad<RDF.BaseQuad>(
          new BlankNodeScoped('bc_0_s1',
            namedNode('urn:comunica_skolem:source_0:s1')),
          new BlankNodeScoped('bc_0_p1',
            namedNode('urn:comunica_skolem:source_0:p1')),
          new BlankNodeScoped('bc_0_o1',
            namedNode('urn:comunica_skolem:source_0:o1')),
        ),
        quad<RDF.BaseQuad>(
          new BlankNodeScoped('bc_0_s2',
            namedNode('urn:comunica_skolem:source_0:s2')),
          new BlankNodeScoped('bc_0_p2',
            namedNode('urn:comunica_skolem:source_0:p2')),
          new BlankNodeScoped('bc_0_o2',
            namedNode('urn:comunica_skolem:source_0:o2')),
        ),
      ]);
    });

    it('should match the second source for blank nodes coming from the second source', async() => {
      const a = await arrayifyStream(source.match(new BlankNodeScoped('abc',
        namedNode('urn:comunica_skolem:source_1:s1'))));
      expect(a).toEqual([
        quad<RDF.BaseQuad>(
          new BlankNodeScoped('bc_1_s1',
            namedNode('urn:comunica_skolem:source_1:s1')),
          new BlankNodeScoped('bc_1_p1',
            namedNode('urn:comunica_skolem:source_1:p1')),
          new BlankNodeScoped('bc_1_o1',
            namedNode('urn:comunica_skolem:source_1:o1')),
        ),
        quad<RDF.BaseQuad>(
          new BlankNodeScoped('bc_1_s2',
            namedNode('urn:comunica_skolem:source_1:s2')),
          new BlankNodeScoped('bc_1_p2',
            namedNode('urn:comunica_skolem:source_1:p2')),
          new BlankNodeScoped('bc_1_o2',
            namedNode('urn:comunica_skolem:source_1:o2')),
        ),
      ]);
    });

    it('should match no source for blank nodes coming from an unknown source', async() => {
      const a = await arrayifyStream(source.match(new BlankNodeScoped('abc',
        namedNode('urn:comunica_skolem:source_2:s1'))));
      expect(a).toEqual([]);
    });

    it('should match the first source for named nodes coming from the first source', async() => {
      const a = await arrayifyStream(source.match(namedNode('urn:comunica_skolem:source_0:s1')));
      expect(a).toEqual([
        quad<RDF.BaseQuad>(
          new BlankNodeScoped('bc_0_s1',
            namedNode('urn:comunica_skolem:source_0:s1')),
          new BlankNodeScoped('bc_0_p1',
            namedNode('urn:comunica_skolem:source_0:p1')),
          new BlankNodeScoped('bc_0_o1',
            namedNode('urn:comunica_skolem:source_0:o1')),
        ),
        quad<RDF.BaseQuad>(
          new BlankNodeScoped('bc_0_s2',
            namedNode('urn:comunica_skolem:source_0:s2')),
          new BlankNodeScoped('bc_0_p2',
            namedNode('urn:comunica_skolem:source_0:p2')),
          new BlankNodeScoped('bc_0_o2',
            namedNode('urn:comunica_skolem:source_0:o2')),
        ),
      ]);
    });

    it('should match the second source for named nodes coming from the second source', async() => {
      const a = await arrayifyStream(source.match(namedNode('urn:comunica_skolem:source_1:s1')));
      expect(a).toEqual([
        quad<RDF.BaseQuad>(
          new BlankNodeScoped('bc_1_s1',
            namedNode('urn:comunica_skolem:source_1:s1')),
          new BlankNodeScoped('bc_1_p1',
            namedNode('urn:comunica_skolem:source_1:p1')),
          new BlankNodeScoped('bc_1_o1',
            namedNode('urn:comunica_skolem:source_1:o1')),
        ),
        quad<RDF.BaseQuad>(
          new BlankNodeScoped('bc_1_s2',
            namedNode('urn:comunica_skolem:source_1:s2')),
          new BlankNodeScoped('bc_1_p2',
            namedNode('urn:comunica_skolem:source_1:p2')),
          new BlankNodeScoped('bc_1_o2',
            namedNode('urn:comunica_skolem:source_1:o2')),
        ),
      ]);
    });

    it('should match no source for named nodes coming from an unknown source', async() => {
      const a = await arrayifyStream(source.match(namedNode('urn:comunica_skolem:source_2:s1')));
      expect(a).toEqual([]);
    });
  });

  describe('A FederatedQuadSource instance with rejecting metadata', () => {
    let subSource: any;
    let source: FederatedQuadSource;
    let emptyPatterns: any;
    let contextSingleEmpty;

    beforeEach(() => {
      subSource = { type: 'rejectingMetadata', value: 'I will reject metadata' };
      emptyPatterns = new Map();
      contextSingleEmpty = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
          AsyncReiterableArray.fromFixedData([ subSource ]) });
      source = new FederatedQuadSource(mediator, contextSingleEmpty, emptyPatterns, true);
    });

    it('should emit metadata with Infinity totalItems', async() => {
      const stream = source.match();
      await expect(new Promise((resolve, reject) => {
        stream.on('metadata', resolve);
        stream.on('end', reject);
      })).resolves.toEqual({ totalItems: Infinity });
    });
  });
});
