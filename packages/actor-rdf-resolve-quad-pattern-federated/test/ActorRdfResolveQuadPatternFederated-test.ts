import { ActorRdfResolveQuadPattern } from '@comunica/bus-rdf-resolve-quad-pattern';
import { ActionContext, Bus } from '@comunica/core';
import { ArrayIterator } from 'asynciterator';
import { ActorRdfResolveQuadPatternFederated } from '../lib/ActorRdfResolveQuadPatternFederated';
import 'jest-rdf';
const arrayifyStream = require('arrayify-stream');
const squad = require('rdf-quad');

describe('ActorRdfResolveQuadPatternFederated', () => {
  let bus: any;
  let mediatorResolveQuadPattern: any;
  let skipEmptyPatterns: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorResolveQuadPattern = {
      mediate() {
        const data = new ArrayIterator([
          squad('s1', 'p1', 'o1'),
          squad('s1', 'p1', 'o2'),
        ], { autoStart: false });
        data.setProperty('metadata', { totalItems: 2 });
        return Promise.resolve({ data });
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
        { name: 'actor', bus, mediatorResolveQuadPattern, skipEmptyPatterns },
      ))
        .toBeInstanceOf(ActorRdfResolveQuadPatternFederated);
      expect(new (<any> ActorRdfResolveQuadPatternFederated)(
        { name: 'actor', bus, mediatorResolveQuadPattern, skipEmptyPatterns },
      ))
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
        { name: 'actor', bus, mediatorResolveQuadPattern, skipEmptyPatterns },
      );
    });

    it('should test with sources', () => {
      return expect(actor.test({ pattern: <any> null,
        context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:sources': 'something' },
        ) })).resolves.toBeTruthy();
    });

    it('should not test with a single source', () => {
      return expect(actor.test({ pattern: <any> null,
        context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': {}},
        ) })).rejects.toBeTruthy();
    });

    it('should not test without sources', () => {
      return expect(actor.test({ pattern: <any> null,
        context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:sources': null },
        ) })).rejects.toBeTruthy();
    });

    it('should not test without context', () => {
      return expect(actor.test({ pattern: <any> null, context: undefined })).rejects.toBeTruthy();
    });

    it('should run for default graph', () => {
      const pattern = squad('?s', 'p', 'o');
      const context = ActionContext({
        '@comunica/bus-rdf-resolve-quad-pattern:sources':
          [
            { type: 'nonEmptySource', value: 'I will not be empty' },
            { type: 'nonEmptySource', value: 'I will not be empty' },
          ],
      });
      return actor.run({ pattern, context })
        .then(async output => {
          expect(await new Promise(resolve => output.data.getProperty('metadata', resolve)))
            .toEqual({ totalItems: 4 });
          expect(await arrayifyStream(output.data)).toBeRdfIsomorphic([
            squad('s1', 'p1', 'o1'),
            squad('s1', 'p1', 'o1'),
            squad('s1', 'p1', 'o2'),
            squad('s1', 'p1', 'o2'),
          ]);
        });
    });

    it('should run for variable graph', () => {
      const pattern = squad('?s', 'p', 'o', '?g');
      const context = ActionContext({
        '@comunica/bus-rdf-resolve-quad-pattern:sources':
          [
            { type: 'nonEmptySource', value: 'I will not be empty' },
            { type: 'nonEmptySource', value: 'I will not be empty' },
          ],
      });
      return actor.run({ pattern, context })
        .then(async output => {
          expect(await new Promise(resolve => output.data.getProperty('metadata', resolve)))
            .toEqual({ totalItems: 4 });
          expect(await arrayifyStream(output.data)).toBeRdfIsomorphic([]);
        });
    });

    it('should run when only metadata is called', () => {
      const pattern = squad('?s', 'p', 'o', '?g');
      const context = ActionContext({
        '@comunica/bus-rdf-resolve-quad-pattern:sources':
          [
            { type: 'nonEmptySource', value: 'I will not be empty' },
            { type: 'nonEmptySource', value: 'I will not be empty' },
          ],
      });
      return expect(actor.run({ pattern, context })
        .then(output => new Promise(resolve => output.data.getProperty('metadata', resolve))))
        .resolves.toEqual({ totalItems: 4 });
    });

    it('should run when only data is called', () => {
      const pattern = squad('?s', 'p', 'o');
      const context = ActionContext({
        '@comunica/bus-rdf-resolve-quad-pattern:sources':
          [
            { type: 'nonEmptySource', value: 'I will not be empty' },
            { type: 'nonEmptySource', value: 'I will not be empty' },
          ],
      });
      return actor.run({ pattern, context })
        .then(async output => {
          expect(await arrayifyStream(output.data)).toBeRdfIsomorphic([
            squad('s1', 'p1', 'o1'),
            squad('s1', 'p1', 'o1'),
            squad('s1', 'p1', 'o2'),
            squad('s1', 'p1', 'o2'),
          ]);
        });
    });
  });
});
