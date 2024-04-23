import type { EventEmitter } from 'node:stream';
import { skolemizeQuad } from '@comunica/actor-context-preprocess-query-source-skolemize';
import { KeysQuerySourceIdentify, KeysRdfUpdateQuads } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory, Store } from 'n3';
import type { IActorRdfUpdateQuadsOutput } from '../lib';
import { ActorRdfUpdateQuadsDestination, getContextDestinationUrl } from '../lib';

const { quad, namedNode, blankNode } = DataFactory;

describe('ActorRdfUpdateQuadsDestination', () => {
  const bus = new Bus({ name: 'bus' });

  describe('The ActorRdfUpdateQuadsDestination module', () => {
    it('should be a function', () => {
      expect(ActorRdfUpdateQuadsDestination).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfUpdateQuadsDestination constructor', () => {
      expect(new (<any> ActorRdfUpdateQuadsDestination)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfUpdateQuadsDestination);
    });

    it('should not be able to create new ActorRdfUpdateQuadsDestination objects without \'new\'', () => {
      expect(() => {
        (<any> ActorRdfUpdateQuadsDestination)();
      }).toThrow(`Class constructor ActorRdfUpdateQuadsDestination cannot be invoked without 'new'`);
    });
  });

  describe('An ActorRdfUpdateQuadsDestination instance', () => {
    const actor = new (<any> ActorRdfUpdateQuadsDestination)({ name: 'actor', bus });
    actor.getDestination = () => ({
      update: () => Promise.resolve(),
    });

    describe('getContextDestinationUrl', () => {
      it('should return undefined when no source is available', () => {
        expect(getContextDestinationUrl(undefined)).toBeUndefined();
      });

      it('should return undefined when no indirect source is available', () => {
        expect(getContextDestinationUrl({ value: <any> null })).toBeUndefined();
      });

      it('should return when a source is available', () => {
        expect(getContextDestinationUrl({ value: 'abc' })).toBe('abc');
      });

      it('should strip away everything after the hash', () => {
        expect(getContextDestinationUrl({ value: 'http://ex.org/#abcdef#xyz' })).toBe('http://ex.org/');
      });
    });

    it('should have a default test implementation', async() => {
      await expect(actor.test(null)).resolves.toBeTruthy();
    });

    it('should run without streams', async() => {
      await actor.run({ context: new ActionContext() }).then(async(output: any) => {
        await expect(output.execute()).resolves.toBeUndefined();
      });
    });

    it('should run with streams', async() => {
      await actor.run({
        quadStreamInsert: new ArrayIterator([]),
        quadStreamDelete: new ArrayIterator([]),
        context: new ActionContext(),
      }).then(async(output: any) => {
        await expect(output.execute()).resolves.toBeUndefined();
      });
    });
  });

  describe('An ActorRdfUpdateQuadsDestination instance with rdfjs source', () => {
    const actor = new (<any> ActorRdfUpdateQuadsDestination)({ name: 'actor', bus });
    actor.getDestination = (context: any) => {
      return Promise.resolve(new RdfJsQuadDestination(context.get(KeysRdfUpdateQuads.destination)));
    };

    it('should deskolemize quads retrieved from the same source', async() => {
      const q = quad(blankNode('i'), namedNode('http://example.org#type'), namedNode('http://example.org#thing'));

      const store = new Store();
      const context: IActionContext = new ActionContext({
        [KeysRdfUpdateQuads.destination.name]: store,
        [KeysQuerySourceIdentify.sourceIds.name]: new Map([[ store, '1' ]]),
      });

      const output: IActorRdfUpdateQuadsOutput = await actor.run({
        quadStreamInsert: new ArrayIterator([
          skolemizeQuad(q, '1'),
        ], { autoStart: false }),
        quadStreamDelete: new ArrayIterator([], { autoStart: false }),
        context,
      });

      await output.execute();

      expect(store.getQuads(null, null, null, null)).toEqual([ q ]);
    });

    it('should not deskolemize quads retrieved from a different source', async() => {
      const q = quad(blankNode('i'), namedNode('http://example.org#type'), namedNode('http://example.org#thing'));
      const skolemized = quad(
        blankNode('bc_1_i'),
        namedNode('http://example.org#type'),
        namedNode('http://example.org#thing'),
      );

      const store = new Store();
      const context: IActionContext = new ActionContext({
        [KeysRdfUpdateQuads.destination.name]: store,
        [KeysQuerySourceIdentify.sourceIds.name]: new Map([[ store, '2' ]]),
      });

      const output: IActorRdfUpdateQuadsOutput = await actor.run({
        quadStreamInsert: new ArrayIterator([
          skolemizeQuad(q, '1'),
        ], { autoStart: false }),
        quadStreamDelete: new ArrayIterator([], { autoStart: false }),
        context,
      });

      await output.execute();

      expect(store.getQuads(null, null, null, null)).toEqual([ skolemized ]);
    });
  });
});

/**
 * A quad destination that wraps around an {@link RDF.Store}.
 */
class RdfJsQuadDestination {
  private readonly store;

  public constructor(store: RDF.Store) {
    this.store = store;
  }

  protected promisifyEventEmitter(eventEmitter: EventEmitter): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      eventEmitter.on('end', resolve);
      eventEmitter.on('error', reject);
    });
  }

  public async update(
    quadStreams: { insert?: AsyncIterator<RDF.Quad>; delete?: AsyncIterator<RDF.Quad> },
  ): Promise<void> {
    if (quadStreams.delete) {
      await this.promisifyEventEmitter(this.store.remove(<any> quadStreams.delete));
    }
    if (quadStreams.insert) {
      await this.promisifyEventEmitter(this.store.import(<any> quadStreams.insert));
    }
  }
}
