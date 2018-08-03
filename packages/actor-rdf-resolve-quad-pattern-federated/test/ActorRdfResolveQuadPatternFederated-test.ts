import {ActorRdfResolveQuadPattern} from "@comunica/bus-rdf-resolve-quad-pattern";
import {ActionContext, Bus} from "@comunica/core";
import {ArrayIterator} from "asynciterator";
import {AsyncReiterableArray} from "asyncreiterable";
import {ActorRdfResolveQuadPatternFederated} from "../lib/ActorRdfResolveQuadPatternFederated";
const squad = require('rdf-quad');
const arrayifyStream = require('arrayify-stream');

// tslint:disable:object-literal-sort-keys

describe('ActorRdfResolveQuadPatternFederated', () => {
  let bus;
  let mediatorResolveQuadPattern;
  let skipEmptyPatterns;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorResolveQuadPattern = {
      mediate: () => {
        return Promise.resolve({ data: new ArrayIterator([
          squad('s1', 'p1', 'o1'),
          squad('s1', 'p1', 'o2'),
        ]), metadata: () => Promise.resolve({ totalItems: 2 }) });
      },
    };
    skipEmptyPatterns = true;
  });

  describe('The ActorRdfResolveQuadPatternFederated module', () => {
    it('should be a function', () => {
      expect(ActorRdfResolveQuadPatternFederated).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfResolveQuadPatternFederated constructor', () => {
      expect(new (<any> ActorRdfResolveQuadPatternFederated)(
        { name: 'actor', bus, mediatorResolveQuadPattern, skipEmptyPatterns }))
        .toBeInstanceOf(ActorRdfResolveQuadPatternFederated);
      expect(new (<any> ActorRdfResolveQuadPatternFederated)(
        { name: 'actor', bus, mediatorResolveQuadPattern, skipEmptyPatterns }))
        .toBeInstanceOf(ActorRdfResolveQuadPattern);
    });

    it('should not be able to create new ActorRdfResolveQuadPatternFederated objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfResolveQuadPatternFederated)(); }).toThrow();
    });
  });

  describe('An ActorRdfResolveQuadPatternFederated instance', () => {
    let actor: ActorRdfResolveQuadPatternFederated;

    beforeEach(() => {
      actor = new ActorRdfResolveQuadPatternFederated(
        { name: 'actor', bus, mediatorResolveQuadPattern, skipEmptyPatterns });
    });

    it('should test with sources', () => {
      return expect(actor.test({ pattern: null, context: ActionContext(
        { '@comunica/bus-rdf-resolve-quad-pattern:sources': 'something' }) })).resolves.toBeTruthy();
    });

    it('should not test with a single source', () => {
      return expect(actor.test({ pattern: null, context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': {} }) })).rejects.toBeTruthy();
    });

    it('should not test without sources', () => {
      return expect(actor.test({ pattern: null, context: ActionContext(
        { '@comunica/bus-rdf-resolve-quad-pattern:sources': null }) })).rejects.toBeTruthy();
    });

    it('should not test without context', () => {
      return expect(actor.test({ pattern: null, context: null })).rejects.toBeTruthy();
    });

    it('should run', () => {
      const pattern = squad('?s', 'p', 'o', '?g');
      const context = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
          AsyncReiterableArray.fromFixedData([
            { type: 'nonEmptySource', value: 'I will not be empty' },
            { type: 'nonEmptySource', value: 'I will not be empty' },
          ])});
      return actor.run({ pattern, context })
        .then(async (output) => {
          expect(await output.metadata()).toEqual({ totalItems: 4 });
          expect(await arrayifyStream(output.data)).toEqual([
            squad('s1', 'p1', 'o1'),
            squad('s1', 'p1', 'o1'),
            squad('s1', 'p1', 'o2'),
            squad('s1', 'p1', 'o2'),
          ]);
        });
    });

    it('should run lazily', () => {
      const thisMediator: any = { mediate: (action) => { throw new Error('This should not be called'); } };
      const thisActor = new ActorRdfResolveQuadPatternFederated(
        { name: 'actor', bus, mediatorResolveQuadPattern: thisMediator, skipEmptyPatterns });
      const pattern = squad('?s', 'p', 'o', '?g');
      const context = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
          AsyncReiterableArray.fromFixedData([
            { type: 'nonEmptySource', value: 'I will not be empty' },
            { type: 'nonEmptySource', value: 'I will not be empty' },
          ])});
      return expect(thisActor.run({ pattern, context })).resolves.toBeTruthy();
    });

    it('should run when only metadata is called', () => {
      const pattern = squad('?s', 'p', 'o', '?g');
      const context = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
          AsyncReiterableArray.fromFixedData([
            { type: 'nonEmptySource', value: 'I will not be empty' },
            { type: 'nonEmptySource', value: 'I will not be empty' },
          ])});
      return expect(actor.run({ pattern, context })
        .then((output) => output.metadata()))
        .resolves.toEqual({ totalItems: 4 });
    });

    it('should run when only data is called', () => {
      const pattern = squad('?s', 'p', 'o', '?g');
      const context = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:sources':
          AsyncReiterableArray.fromFixedData([
            { type: 'nonEmptySource', value: 'I will not be empty' },
            { type: 'nonEmptySource', value: 'I will not be empty' },
          ])});
      return actor.run({ pattern, context })
        .then(async (output) => {
          expect(await arrayifyStream(output.data)).toEqual([
            squad('s1', 'p1', 'o1'),
            squad('s1', 'p1', 'o1'),
            squad('s1', 'p1', 'o2'),
            squad('s1', 'p1', 'o2'),
          ]);
        });
    });
  });
});
