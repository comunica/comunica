import {ActorRdfResolveQuadPattern} from "@comunica/bus-rdf-resolve-quad-pattern";
import {Bus} from "@comunica/core";
import {ArrayIterator} from "asynciterator";
import {ActorRdfResolveQuadPatternFederated} from "../lib/ActorRdfResolveQuadPatternFederated";
const squad = require('rdf-quad');
const arrayifyStream = require('arrayify-stream');

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
        ]), metadata: Promise.resolve({ totalItems: 2 }) });
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

    it('should not test with >= 2 sources', () => {
      return expect(actor.test({ pattern: null, context: { sources: [{}, {}] } })).resolves.toBeTruthy();
    });

    it('should not test with < 2 sources', () => {
      return expect(actor.test({ pattern: null, context: { sources: [{}] } })).rejects.toBeTruthy();
    });

    it('should not test without sources', () => {
      return expect(actor.test({ pattern: null, context: { sources: null } })).rejects.toBeTruthy();
    });

    it('should not test without context', () => {
      return expect(actor.test({ pattern: null, context: null })).rejects.toBeTruthy();
    });

    it('should run', () => {
      const pattern = squad('?s', 'p', 'o', '?g');
      const context = { sources: [
        { type: 'nonEmptySource', value: 'I will not be empty' },
        { type: 'nonEmptySource', value: 'I will not be empty' },
      ]};
      return actor.run({ pattern, context })
        .then(async (output) => {
          expect(await output.metadata).toEqual({ totalItems: 4 });
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
