import type { IActorRdfResolveQuadPatternOutput } from '@comunica/bus-rdf-resolve-quad-pattern';
import { KeysRdfResolveQuadPattern } from '@comunica/context-entries';
import { Bus, ActionContext } from '@comunica/core';
import { fromArray } from 'asynciterator';
import { DataFactory } from 'n3';
import { Factory } from 'sparqlalgebrajs';
import { ActorRdfResolveQuadPatternPromise } from '../lib/ActorRdfResolveQuadPatternPromise';
const { namedNode, quad } = DataFactory;

const factory = new Factory();

describe('ActorRdfResolveQuadPatternPromise', () => {
  let bus: any;
  let mediatorResolveQuadPattern: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfResolveQuadPatternPromise instance', () => {
    let actor: ActorRdfResolveQuadPatternPromise;

    beforeEach(() => {
      mediatorResolveQuadPattern = {
        async mediate(): Promise<IActorRdfResolveQuadPatternOutput> {
          return {
            data: <any> fromArray([
              quad(namedNode('a'), namedNode('a'), namedNode('a'), namedNode('a')),
            ]),
          };
        },
      };
      actor = new ActorRdfResolveQuadPatternPromise({
        name: 'actor',
        bus,
        mediatorResolveQuadPattern,
      });
    });

    it('should test', async() => {
      await expect(actor.test({ context: new ActionContext({
        [KeysRdfResolveQuadPattern.source.name]: Promise.resolve('http://example.org/'),
      }),
      pattern: factory.createPattern(
        namedNode('http://example.org/s'),
        namedNode('http://example.org/s'),
        namedNode('http://example.org/s'),
      ) })).resolves.toBe(true);

      await expect(actor.test({ context: new ActionContext({
        [KeysRdfResolveQuadPattern.source.name]: 'http://example.org/',
      }),
      pattern: factory.createPattern(
        namedNode('http://example.org/s'),
        namedNode('http://example.org/s'),
        namedNode('http://example.org/s'),
      ) })).rejects.toThrowError();
    });

    it('should run', async() => {
      const { data } = await actor.run({ context: new ActionContext({
        [KeysRdfResolveQuadPattern.source.name]: Promise.resolve('http://example.org/'),
      }),
      pattern: factory.createPattern(
        namedNode('http://example.org/s'),
        namedNode('http://example.org/s'),
        namedNode('http://example.org/s'),
      ) });
      expect(await data.toArray()).toEqual([ quad(namedNode('a'), namedNode('a'), namedNode('a'), namedNode('a')) ]);
    });
  });
});
