import { ActorRdfResolveQuadPattern, IActionRdfResolveQuadPattern, IActorRdfResolveQuadPatternOutput, getContextSource, getContextSources } from '@comunica/bus-rdf-resolve-quad-pattern';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator, AsyncIterator } from 'asynciterator';
import { ActorRdfResolveQuadPatternFederated } from '../lib/ActorRdfResolveQuadPatternFederated';
import 'jest-rdf';
import { resolve } from 'path';
const squad = require('rdf-quad');

function createData() {
  const data = new ArrayIterator([
    squad('s1', 'p1', 'o1'),
    squad('s1', 'p1', 'o2'),
  ], { autoStart: false });
  data.setProperty('metadata', {
    cardinality: { type: 'estimate', value: 2 },
    canContainUndefs: false,
  });
  return { data }
}

describe('ActorRdfResolveQuadPatternFederated', () => {
  let bus: any;
  let context: IActionContext;
  let mediatorResolveQuadPattern: any;
  let skipEmptyPatterns: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
    mediatorResolveQuadPattern = {
      async mediate(source: IActionRdfResolveQuadPattern): Promise<IActorRdfResolveQuadPatternOutput> {
        const s = getContextSource(source.context);
        if (!s || typeof s === 'string')
          throw new Error('No source in context');
        
        if ('type' in s && 'value' in s && s.type !== 'nonEmptySource')
          return s.value as any;

        return createData();
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
        context: new ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:sources': 'something' },
        ) })).resolves.toBeTruthy();
    });

    it('should not test with a single source', () => {
      return expect(actor.test({ pattern: <any> null,
        context: new ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': {}},
        ) })).rejects.toBeTruthy();
    });

    it('should not test without sources', () => {
      return expect(actor.test({ pattern: <any> null,
        context: new ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:sources': null },
        ) })).rejects.toBeTruthy();
    });

    it('should run for default graph', () => {
      const pattern = squad('?s', 'p', 'o');
      context = new ActionContext({
        '@comunica/bus-rdf-resolve-quad-pattern:sources':
          [
            { type: 'nonEmptySource', value: 'I will not be empty' },
            { type: 'nonEmptySource', value: 'I will not be empty' },
          ],
      });
      return actor.run({ pattern, context })
        .then(async output => {
          expect(await new Promise(resolve => output.data.getProperty('metadata', resolve)))
            .toEqual({ cardinality: { type: 'estimate', value: 4 }, canContainUndefs: false });
          expect(await arrayifyStream(output.data)).toBeRdfIsomorphic([
            squad('s1', 'p1', 'o1'),
            squad('s1', 'p1', 'o1'),
            squad('s1', 'p1', 'o2'),
            squad('s1', 'p1', 'o2'),
          ]);
        });
    });

    it('should resolve with an iterator when source is a promise', async () => {
      const pattern = squad('?s', 'p', 'o');
      let r: Function = () => {};
      context = new ActionContext({
        '@comunica/bus-rdf-resolve-quad-pattern:sources':
          [
            { type: 'promiseSource', value: new Promise((resolve) => { r = resolve }) },
          ],
      });

      // Testing that an iterator is returned *before* the promise is resolved
      const { data } = await actor.run({ pattern, context });
      expect(data).toBeInstanceOf(AsyncIterator);
      expect(data.read()).toBeNull();
      expect(data.readable).toBe(false);
      expect(data.done).toBe(false);

      // Resolve the promise
      r(createData());

      expect(await arrayifyStream(data)).toBeRdfIsomorphic([
        squad('s1', 'p1', 'o1'),
            squad('s1', 'p1', 'o2'),
      ]);
    });

    // describe('Testing promise-based sources', async () => {
    //   const pattern = squad('?s', 'p', 'o');
    //   let r: Function = () => {};

    //   desc

    // });


    it('should resolve with an iterator when one source is a promise and other is resolved', async () => {
      const pattern = squad('?s', 'p', 'o');
      let r: Function = () => {};
      context = new ActionContext({
        '@comunica/bus-rdf-resolve-quad-pattern:sources':
          [
            { type: 'nonEmptySource', value: 'I will not be empty' },
            { type: 'promiseSource', value: new Promise((resolve) => { r = resolve }) },
          ],
      });

      // Testing that an iterator is returned *before* the promise is resolved
      const { data } = await actor.run({ pattern, context });
      expect(data).toBeInstanceOf(AsyncIterator);
      // Allow time for things to get running
      expect(await data.toArray({ limit: 2 })).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
      ])

      expect(data.read()).toBeNull();
      expect(data.readable).toBe(false);
      expect(data.done).toBe(false);

      // Resolve the promise
      r(createData());

      expect(await data.toArray()).toBeRdfIsomorphic([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should resolve with an iterator when one source is a promise and other is resolved', async () => {
      const pattern = squad('?s', 'p', 'o');
      let r: Function = () => {};
      context = new ActionContext({
        '@comunica/bus-rdf-resolve-quad-pattern:sources':
          [
            { type: 'promiseSource', value: new Promise((resolve) => { r = resolve }) },
            { type: 'nonEmptySource', value: 'I will not be empty' },
          ],
      });

      // Testing that an iterator is returned *before* the promise is resolved
      const { data } = await actor.run({ pattern, context });
      expect(data).toBeInstanceOf(AsyncIterator);
      // Allow time for things to get running
      expect(await data.toArray({ limit: 2 })).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
      ])

      expect(data.read()).toBeNull();
      expect(data.readable).toBe(false);
      expect(data.done).toBe(false);

      // Resolve the promise
      r(createData());

      expect(await data.toArray()).toBeRdfIsomorphic([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should run for variable graph', () => {
      const pattern = squad('?s', 'p', 'o', '?g');
      context = new ActionContext({
        '@comunica/bus-rdf-resolve-quad-pattern:sources':
          [
            { type: 'nonEmptySource', value: 'I will not be empty' },
            { type: 'nonEmptySource', value: 'I will not be empty' },
          ],
      });
      return actor.run({ pattern, context })
        .then(async output => {
          expect(await new Promise(resolve => output.data.getProperty('metadata', resolve)))
            .toEqual({ cardinality: { type: 'estimate', value: 4 }, canContainUndefs: false });
          expect(await arrayifyStream(output.data)).toBeRdfIsomorphic([]);
        });
    });

    it('should run when only metadata is called', () => {
      const pattern = squad('?s', 'p', 'o', '?g');
      context = new ActionContext({
        '@comunica/bus-rdf-resolve-quad-pattern:sources':
          [
            { type: 'nonEmptySource', value: 'I will not be empty' },
            { type: 'nonEmptySource', value: 'I will not be empty' },
          ],
      });
      return expect(actor.run({ pattern, context })
        .then(output => new Promise(resolve => output.data.getProperty('metadata', resolve))))
        .resolves.toEqual({ cardinality: { type: 'estimate', value: 4 }, canContainUndefs: false });
    });

    it('should run when only data is called', () => {
      const pattern = squad('?s', 'p', 'o');
      context = new ActionContext({
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
