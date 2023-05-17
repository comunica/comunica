import { ActorRdfResolveQuadPattern } from '@comunica/bus-rdf-resolve-quad-pattern';
import { ActionContext, Bus } from '@comunica/core';
import { MetadataValidationState } from '@comunica/metadata';
import type { IActionContext } from '@comunica/types';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { ActorRdfResolveQuadPatternFederated } from '../lib/ActorRdfResolveQuadPatternFederated';
import 'jest-rdf';

const squad = require('rdf-quad');

describe('ActorRdfResolveQuadPatternFederated', () => {
  let bus: any;
  let context: IActionContext;
  let mediatorResolveQuadPattern: any;
  let skipEmptyPatterns: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
    mediatorResolveQuadPattern = {
      mediate() {
        const data = new ArrayIterator([
          squad('s1', 'p1', 'o1'),
          squad('s1', 'p1', 'o2'),
        ], { autoStart: false });
        data.setProperty('metadata', {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 2 },
          requestTime: 10,
          pageSize: 100,
          canContainUndefs: true,
        });
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
            .toEqual({
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 4 },
              canContainUndefs: true,
              pageSize: 200,
              requestTime: 20,
            });
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
            .toEqual({
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 4 },
              canContainUndefs: true,
              pageSize: 200,
              requestTime: 20,
            });
          expect(await arrayifyStream(output.data)).toBeRdfIsomorphic([
            squad('s1', 'p1', 'o1'),
            squad('s1', 'p1', 'o1'),
            squad('s1', 'p1', 'o2'),
            squad('s1', 'p1', 'o2'),
          ]);
        });
    });

    it('should run when only metadata is called', async() => {
      const pattern = squad('?s', 'p', 'o', '?g');
      context = new ActionContext({
        '@comunica/bus-rdf-resolve-quad-pattern:sources':
          [
            { type: 'nonEmptySource', value: 'I will not be empty' },
            { type: 'nonEmptySource', value: 'I will not be empty' },
          ],
      });
      const { data } = await actor.run({ pattern, context });
      expect(await arrayifyStream(data)).toBeRdfIsomorphic([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
        squad('s1', 'p1', 'o2'),
      ]);

      await expect(new Promise(resolve => data.getProperty('metadata', resolve)))
        .resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: 4 },
          canContainUndefs: true,
          pageSize: 200,
          requestTime: 20,
        });
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

    it('should run if cardinality is Infinity', () => {
      mediatorResolveQuadPattern.mediate = () => {
        const data = new ArrayIterator([
          squad('s1', 'p1', 'o1'),
          squad('s1', 'p1', 'o2'),
        ], { autoStart: false });
        data.setProperty('metadata', {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
          requestTime: 10,
          pageSize: 100,
          canContainUndefs: true,
        });
        return Promise.resolve({ data });
      };

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
            .toEqual({
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
              canContainUndefs: true,
              pageSize: 200,
              requestTime: 20,
            });
          expect(await arrayifyStream(output.data)).toBeRdfIsomorphic([
            squad('s1', 'p1', 'o1'),
            squad('s1', 'p1', 'o1'),
            squad('s1', 'p1', 'o2'),
            squad('s1', 'p1', 'o2'),
          ]);
        });
    });

    it('should run if metadata is only set the first time', () => {
      let call = 0;
      mediatorResolveQuadPattern.mediate = () => {
        const data = new ArrayIterator([
          squad('s1', 'p1', 'o1'),
          squad('s1', 'p1', 'o2'),
        ], { autoStart: false });
        data.setProperty('metadata', {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
          requestTime: call === 0 ? 10 : undefined,
          pageSize: call === 0 ? 100 : undefined,
          canContainUndefs: true,
        });
        call++;
        return Promise.resolve({ data });
      };

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
            .toEqual({
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
              canContainUndefs: true,
              pageSize: 100,
              requestTime: 10,
            });
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
