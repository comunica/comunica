import {ActionContext} from "@comunica/core";
import {blankNode, defaultGraph, literal, namedNode, quad, variable} from "@rdfjs/data-model";
import {ArrayIterator, EmptyIterator} from "asynciterator";
import {RoundRobinUnionIterator} from "asynciterator-union";
import {AsyncReiterableArray} from "asyncreiterable";
import {FederatedQuadSource} from "../lib/FederatedQuadSource";
const squad = require('rdf-quad');
const arrayifyStream = require('arrayify-stream');

describe('FederatedQuadSource', () => {
  let mediator;
  let context;

  beforeEach(() => {
    mediator = {
      mediate: (action) => {
        const type = action.context.get('@comunica/bus-rdf-resolve-quad-pattern:source').type;
        if (type === 'emptySource') {
          return Promise.resolve({ data: new EmptyIterator(),
            metadata: () => Promise.resolve({ totalItems: 0 }) });
        }
        if (type === 'nonEmptySourceNoMeta') {
          return Promise.resolve({ data: new ArrayIterator([
            squad('s1', 'p1', 'o1'),
            squad('s1', 'p1', 'o2'),
          ]), metadata: null });
        }
        if (type === 'nonEmptySourceInfMeta') {
          return Promise.resolve({ data: new ArrayIterator([
            squad('s1', 'p1', 'o1'),
            squad('s1', 'p1', 'o2'),
          ]), metadata: () => Promise.resolve({ totalItems: Infinity }) });
        }
        return Promise.resolve({ data: new ArrayIterator([
          squad('s1', 'p1', 'o1'),
          squad('s1', 'p1', 'o2'),
        ]), metadata: () => Promise.resolve({ totalItems: 2 }) });
      },
    };
    context = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
        AsyncReiterableArray.fromFixedData([ { type: 'myType', value: 'myValue' } ]) });
  });

  describe('The FederatedQuadSource module', () => {
    it('should be a function', () => {
      expect(FederatedQuadSource).toBeInstanceOf(Function);
    });

    it('should be a FederatedQuadSource constructor', () => {
      expect(new FederatedQuadSource(mediator, context, {}, true)).toBeInstanceOf(FederatedQuadSource);
    });

    it('should be a FederatedQuadSource constructor with optional bufferSize argument', () => {
      expect(new FederatedQuadSource(mediator, context, {}, true)).toBeInstanceOf(FederatedQuadSource);
    });
  });

  describe('#hashSource', () => {
    it('should convert an empty query source to a string', () => {
      return expect(FederatedQuadSource.hashSource(<any> {})).toEqual('{}');
    });

    it('should convert a non-empty query source to a string', () => {
      return expect(FederatedQuadSource.hashSource({ type: 'type', value: 'value' }))
        .toEqual('{"type":"type","value":"value"}');
    });
  });

  describe('#isTermBound', () => {
    it('should be false on a variable', () => {
      return expect(FederatedQuadSource.isTermBound(variable('var'))).toBeFalsy();
    });

    it('should be false on a blank node', () => {
      return expect(FederatedQuadSource.isTermBound(blankNode('bnode'))).toBeFalsy();
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
    let source: FederatedQuadSource;
    let emptyPatterns;

    beforeEach(() => {
      emptyPatterns = { '{}': [ squad('?a', '?b', '?c', '"d"') ] };
      source = new FederatedQuadSource(mediator, context, emptyPatterns, true);
    });

    it('should throw an error on a subject regex call', () => {
      return expect(() => source.match(/.*/)).toThrow();
    });

    it('should throw an error on a predicate regex call', () => {
      return expect(() => source.match(null, /.*/)).toThrow();
    });

    it('should throw an error on a object regex call', () => {
      return expect(() => source.match(null, null, /.*/)).toThrow();
    });

    it('should throw an error on a graph regex call', () => {
      return expect(() => source.match(null, null, null, /.*/)).toThrow();
    });

    it('should return an AsyncIterator', () => {
      return expect(source.match(variable('v'), variable('v'), variable('v'), variable('v')))
        .toBeInstanceOf(RoundRobinUnionIterator);
    });

    describe('when calling isSourceEmpty', () => {
      it('on ?a ?b ?c "d" for the source should return true', () => {
        return expect(source.isSourceEmpty(<any> {}, squad('?a', '?b', '?c', '"d"'))).toBeTruthy();
      });

      it('on "a" ?b ?c "d" for the source should return true', () => {
        return expect(source.isSourceEmpty(<any> {}, squad('"a"', '?b', '?c', '"d"'))).toBeTruthy();
      });

      it('on "a" ?b ?c "e" for the source should return false', () => {
        return expect(source.isSourceEmpty(<any> {}, squad('"a"', '?b', '?c', '"e"'))).toBeFalsy();
      });

      it('on ?a ?b ?c "d" for another source should return false', () => {
        return expect(source.isSourceEmpty(<any> { a: 'b' }, squad('?a', '?b', '?c', '"d"'))).toBeFalsy();
      });

      it('on "a" ?b ?c "d" for another source should return false', () => {
        return expect(source.isSourceEmpty(<any> { a: 'b' }, squad('"a"', '?b', '?c', '"d"'))).toBeFalsy();
      });
    });
  });

  describe('A FederatedQuadSource instance with skipEmptyPatterns set to false', () => {

    let source: FederatedQuadSource;
    let emptyPatterns;

    beforeEach(() => {
      emptyPatterns = { '{}': [ squad('?a', '?b', '?c', '"d"') ] };
      source = new FederatedQuadSource(mediator, context, emptyPatterns, false);
    });

    describe('when calling isSourceEmpty', () => {
      it('on ?a ?b ?c "d" for the source should return false', () => {
        return expect(source.isSourceEmpty(<any> {}, squad('?a', '?b', '?c', '"d"'))).toBeFalsy();
      });

      it('on "a" ?b ?c "d"d for the source should return false', () => {
        return expect(source.isSourceEmpty(<any> {}, squad('"a"', '?b', '?c', '"d"'))).toBeFalsy();
      });

      it('on "a" ?b ?c "e" for the source should return false', () => {
        return expect(source.isSourceEmpty(<any> {}, squad('"a"', '?b', '?c', '"e"'))).toBeFalsy();
      });

      it('on ?a ?b ?c "d" for another source should return false', () => {
        return expect(source.isSourceEmpty(<any> { a: 'b' }, squad('?a', '?b', '?c', '"d"'))).toBeFalsy();
      });

      it('on "a" ?b ?c "d" for another source should return false', () => {
        return expect(source.isSourceEmpty(<any> { a: 'b' }, squad('"a"', '?b', '?c', '"d"'))).toBeFalsy();
      });
    });
  });

  describe('A FederatedQuadSource instance over zero sources', () => {
    let source: FederatedQuadSource;
    let emptyPatterns;
    let contextEmpty;

    beforeEach(() => {
      emptyPatterns = {};
      contextEmpty = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
          AsyncReiterableArray.fromFixedData([]) });
      source = new FederatedQuadSource(mediator, contextEmpty, emptyPatterns, true);
    });

    it('should return an empty AsyncIterator', async () => {
      return expect(await arrayifyStream(source.match())).toEqual([]);
    });

    it('should emit metadata with 0 totalItems', async () => {
      const stream = source.match();
      return expect(new Promise((resolve, reject) => {
        stream.on('metadata', resolve);
        stream.on('end', reject);
      })).resolves.toEqual({ totalItems: 0 });
    });
  });

  describe('A FederatedQuadSource instance over one empty source', () => {
    let source: FederatedQuadSource;
    let emptyPatterns;
    let contextSingleEmpty;

    beforeEach(() => {
      emptyPatterns = {};
      contextSingleEmpty = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
          AsyncReiterableArray.fromFixedData([ { type: 'emptySource', value: 'I will be empty' } ]) });
      source = new FederatedQuadSource(mediator, contextSingleEmpty, emptyPatterns, true);
    });

    it('should return an empty AsyncIterator', async () => {
      return expect(await arrayifyStream(source.match())).toEqual([]);
    });

    it('should emit metadata with 0 totalItems', async () => {
      const stream = source.match();
      return expect(new Promise((resolve, reject) => {
        stream.on('metadata', resolve);
        stream.on('end', reject);
      })).resolves.toEqual({ totalItems: 0 });
    });

    it('should store the queried empty patterns in the emptyPatterns datastructure', async () => {
      await arrayifyStream(source.match(variable('s'), literal('p'), variable('o'), variable('g')));
      await arrayifyStream(source.match(variable('s'), literal('p'), literal('o'), variable('g')));

      await arrayifyStream(source.match(literal('s'), variable('p'), variable('o'), variable('g')));
      await arrayifyStream(source.match(literal('s'), variable('p'), literal('o'), variable('g')));
      await arrayifyStream(source.match(literal('s'), variable('p'), literal('o'), literal('g')));

      return expect(emptyPatterns).toEqual({
        '{"type":"emptySource","value":"I will be empty"}': [
          quad(variable('s'), literal('p'), variable('o'), variable('g')),
          quad(literal('s'), variable('p'), variable('o'), variable('g')),
        ],
      });
    });
  });

  describe('A FederatedQuadSource instance over one non-empty source', () => {
    let source: FederatedQuadSource;
    let emptyPatterns;
    let contextSingle;

    beforeEach(() => {
      emptyPatterns = {};
      contextSingle = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
          AsyncReiterableArray.fromFixedData([{ type: 'nonEmptySource', value: 'I will not be empty' }]) });
      source = new FederatedQuadSource(mediator, contextSingle, emptyPatterns, true);
    });

    it('should return a non-empty AsyncIterator', async () => {
      return expect(await arrayifyStream(source.match())).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should emit metadata with 2 totalItems', async () => {
      const stream = source.match();
      return expect(new Promise((resolve, reject) => {
        stream.on('metadata', resolve);
        stream.on('end', reject);
      })).resolves.toEqual({ totalItems: 2 });
    });

    it('should store no queried empty patterns in the emptyPatterns datastructure', async () => {
      await arrayifyStream(source.match(variable('s'), literal('p'), variable('o'), variable('g')));
      await arrayifyStream(source.match(variable('s'), literal('p'), literal('o'), variable('g')));

      await arrayifyStream(source.match(literal('s'), variable('p'), variable('o'), variable('g')));
      await arrayifyStream(source.match(literal('s'), variable('p'), literal('o'), variable('g')));
      await arrayifyStream(source.match(literal('s'), variable('p'), literal('o'), literal('g')));

      return expect(emptyPatterns).toEqual({
        '{"type":"nonEmptySource","value":"I will not be empty"}': [],
      });
    });
  });

  describe('A FederatedQuadSource instance over one empty source and one non-empty source', () => {
    let source: FederatedQuadSource;
    let emptyPatterns;
    let contextSingleEmpty;

    beforeEach(() => {
      emptyPatterns = {};
      contextSingleEmpty = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
          AsyncReiterableArray.fromFixedData([
            { type: 'emptySource', value: 'I will be empty' },
            { type: 'nonEmptySource', value: 'I will not be empty' },
          ]) });
      source = new FederatedQuadSource(mediator, contextSingleEmpty, emptyPatterns, true);
    });

    it('should return a non-empty AsyncIterator', async () => {
      const a = await arrayifyStream(source.match());
      return expect(a).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should emit metadata with 2 totalItems', async () => {
      const stream = source.match();
      return expect(new Promise((resolve, reject) => {
        stream.on('metadata', resolve);
        stream.on('end', reject);
      })).resolves.toEqual({ totalItems: 2 });
    });

    it('should store the queried empty patterns for the empty source in the emptyPatterns datastructure', async () => {
      await arrayifyStream(source.match(variable('s'), literal('p'), variable('o'), variable('g')));
      await arrayifyStream(source.match(variable('s'), literal('p'), literal('o'), variable('g')));

      await arrayifyStream(source.match(literal('s'), variable('p'), variable('o'), variable('g')));
      await arrayifyStream(source.match(literal('s'), variable('p'), literal('o'), variable('g')));
      await arrayifyStream(source.match(literal('s'), variable('p'), literal('o'), literal('g')));

      return expect(emptyPatterns).toEqual({
        '{"type":"emptySource","value":"I will be empty"}': [
          quad(variable('s'), literal('p'), variable('o'), variable('g')),
          quad(literal('s'), variable('p'), variable('o'), variable('g')),
        ],
        '{"type":"nonEmptySource","value":"I will not be empty"}': [],
      });
    });
  });

  describe('A FederatedQuadSource instance over two equal empty sources', () => {
    let source: FederatedQuadSource;
    let emptyPatterns;
    let contextSingleEmpty;

    beforeEach(() => {
      emptyPatterns = {};
      contextSingleEmpty = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
          AsyncReiterableArray.fromFixedData([
            { type: 'emptySource', value: 'I will be empty' },
            { type: 'emptySource', value: 'I will be empty' },
          ]) });
      source = new FederatedQuadSource(mediator, contextSingleEmpty, emptyPatterns, true);
    });

    it('should return an empty AsyncIterator', async () => {
      const a = await arrayifyStream(source.match());
      return expect(a).toEqual([]);
    });

    it('should emit metadata with 0 totalItems', async () => {
      const stream = source.match();
      return expect(new Promise((resolve, reject) => {
        stream.on('metadata', resolve);
        stream.on('end', reject);
      })).resolves.toEqual({ totalItems: 0 });
    });

    it('should store the queried empty patterns for the empty source in the emptyPatterns datastructure', async () => {
      await arrayifyStream(source.match(variable('s'), literal('p'), variable('o'), variable('g')));
      await arrayifyStream(source.match(variable('s'), literal('p'), literal('o'), variable('g')));

      await arrayifyStream(source.match(literal('s'), variable('p'), variable('o'), variable('g')));
      await arrayifyStream(source.match(literal('s'), variable('p'), literal('o'), variable('g')));
      await arrayifyStream(source.match(literal('s'), variable('p'), literal('o'), literal('g')));

      return expect(emptyPatterns).toEqual({
        '{"type":"emptySource","value":"I will be empty"}': [
          quad(variable('s'), literal('p'), variable('o'), variable('g')),
          quad(literal('s'), variable('p'), variable('o'), variable('g')),
        ],
      });
    });
  });

  describe('A FederatedQuadSource instance over two equal empty sources with skip empty sources false', () => {
    let source: FederatedQuadSource;
    let emptyPatterns;
    let contextSingleEmpty;

    beforeEach(() => {
      emptyPatterns = {};
      contextSingleEmpty = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
          AsyncReiterableArray.fromFixedData([
            { type: 'emptySource', value: 'I will be empty' },
            { type: 'emptySource', value: 'I will be empty' },
          ]) });
      source = new FederatedQuadSource(mediator, contextSingleEmpty, emptyPatterns, false);
    });

    it('should return an empty AsyncIterator', async () => {
      const a = await arrayifyStream(source.match());
      return expect(a).toEqual([]);
    });

    it('should emit metadata with 0 totalItems', async () => {
      const stream = source.match();
      return expect(new Promise((resolve, reject) => {
        stream.on('metadata', resolve);
        stream.on('end', reject);
      })).resolves.toEqual({ totalItems: 0 });
    });

    it('should store the queried empty patterns for the empty source in the emptyPatterns datastructure', async () => {
      await arrayifyStream(source.match(variable('s'), literal('p'), variable('o'), variable('g')));
      await arrayifyStream(source.match(variable('s'), literal('p'), literal('o'), variable('g')));

      await arrayifyStream(source.match(literal('s'), variable('p'), variable('o'), variable('g')));
      await arrayifyStream(source.match(literal('s'), variable('p'), literal('o'), variable('g')));
      await arrayifyStream(source.match(literal('s'), variable('p'), literal('o'), literal('g')));

      return expect(emptyPatterns).toEqual({});
    });
  });

  describe('A FederatedQuadSource instance over two non-empty sources', () => {
    let source: FederatedQuadSource;
    let emptyPatterns;
    let contextSingleEmpty;

    beforeEach(() => {
      emptyPatterns = {};
      contextSingleEmpty = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
          AsyncReiterableArray.fromFixedData([
            { type: 'nonEmptySource', value: 'I will not be empty' },
            { type: 'nonEmptySource2', value: 'I will also not be empty' },
          ]) });
      source = new FederatedQuadSource(mediator, contextSingleEmpty, emptyPatterns, true);
    });

    it('should return a non-empty AsyncIterator', async () => {
      const a = await arrayifyStream(source.match());
      return expect(a).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should emit metadata with 2 totalItems', async () => {
      const stream = source.match();
      return expect(new Promise((resolve, reject) => {
        stream.on('metadata', resolve);
        stream.on('end', reject);
      })).resolves.toEqual({ totalItems: 4 });
    });

    it('should store the queried empty patterns for the empty source in the emptyPatterns datastructure', async () => {
      await arrayifyStream(source.match(variable('s'), literal('p'), variable('o'), variable('g')));
      await arrayifyStream(source.match(variable('s'), literal('p'), literal('o'), variable('g')));

      await arrayifyStream(source.match(literal('s'), variable('p'), variable('o'), variable('g')));
      await arrayifyStream(source.match(literal('s'), variable('p'), literal('o'), variable('g')));
      await arrayifyStream(source.match(literal('s'), variable('p'), literal('o'), literal('g')));

      return expect(emptyPatterns).toEqual({
        '{"type":"nonEmptySource","value":"I will not be empty"}': [],
        '{"type":"nonEmptySource2","value":"I will also not be empty"}': [],
      });
    });
  });

  describe('A FederatedQuadSource instance over two non-empty sources, one without metadata', () => {
    let source: FederatedQuadSource;
    let emptyPatterns;
    let contextSingleEmpty;

    beforeEach(() => {
      emptyPatterns = {};
      contextSingleEmpty = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
          AsyncReiterableArray.fromFixedData([
            { type: 'nonEmptySource', value: 'I will not be empty' },
            { type: 'nonEmptySourceNoMeta', value: 'I will also not be empty, but have no metadata' },
          ]) });
      source = new FederatedQuadSource(mediator, contextSingleEmpty, emptyPatterns, true);
    });

    it('should return a non-empty AsyncIterator', async () => {
      const a = await arrayifyStream(source.match());
      return expect(a).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should emit metadata with Infinity totalItems', async () => {
      const stream = source.match();
      return expect(new Promise((resolve, reject) => {
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
      emptyPatterns = {};
      contextSingleEmpty = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
          AsyncReiterableArray.fromFixedData([
            { type: 'nonEmptySourceNoMeta', value: 'I will not be empty' },
            { type: 'nonEmptySourceNoMeta', value: 'I will also not be empty, but have no metadata' },
          ]) });
      source = new FederatedQuadSource(mediator, contextSingleEmpty, emptyPatterns, true);
    });

    it('should return a non-empty AsyncIterator', async () => {
      const a = await arrayifyStream(source.match());
      return expect(a).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should emit metadata with Infinity totalItems', async () => {
      const stream = source.match();
      return expect(new Promise((resolve, reject) => {
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
      emptyPatterns = {};
      contextSingleEmpty = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
          AsyncReiterableArray.fromFixedData([
            { type: 'nonEmptySource', value: 'I will not be empty' },
            { type: 'nonEmptySourceInfMeta', value: 'I will also not be empty, but have inf metadata' },
          ]) });
      source = new FederatedQuadSource(mediator, contextSingleEmpty, emptyPatterns, true);
    });

    it('should return a non-empty AsyncIterator', async () => {
      const a = await arrayifyStream(source.match());
      return expect(a).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should emit metadata with Infinity totalItems', async () => {
      const stream = source.match();
      return expect(new Promise((resolve, reject) => {
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
      emptyPatterns = {};
      contextSingleEmpty = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
          AsyncReiterableArray.fromFixedData([
            { type: 'nonEmptySourceInfMeta', value: 'I will not be empty' },
            { type: 'nonEmptySourceInfMeta', value: 'I will also not be empty, but have inf metadata' },
          ]) });
      source = new FederatedQuadSource(mediator, contextSingleEmpty, emptyPatterns, true);
    });

    it('should return a non-empty AsyncIterator', async () => {
      const a = await arrayifyStream(source.match());
      return expect(a).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should emit metadata with Infinity totalItems', async () => {
      const stream = source.match();
      return expect(new Promise((resolve, reject) => {
        stream.on('metadata', resolve);
        stream.on('end', reject);
      })).resolves.toEqual({ totalItems: Infinity });
    });
  });

});
