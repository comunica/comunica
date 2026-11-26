import { KeysInitQuery, KeysRdfUpdateQuads } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { Store } from 'n3';
import { DataFactory } from 'rdf-data-factory';
import { ActorRdfUpdateQuadsRdfJsStore } from '../lib/ActorRdfUpdateQuadsRdfJsStore';
import { RdfJsQuadDestination } from '../lib/RdfJsQuadDestination';
import 'jest-rdf';
import '@comunica/utils-jest';

const DF = new DataFactory();

/**
 * A view of a store without the methods to count, get, add and remove quads synchronously.
 */
function asynchronous(store: Store): RDF.Store {
  const hidden = new Set([ 'countQuads', 'getQuads', 'addQuad', 'removeQuad' ]);
  return new Proxy(store, {
    get(target, key) {
      if (hidden.has(<string> key)) {
        return undefined;
      }
      const value = (<any> target)[key];
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

describe('ActorRdfUpdateQuadsRdfJsStore', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
  });

  // Synchronous stores are changed through transactions, and other ones directly
  describe.each([
    'synchronous',
    'asynchronous',
  ])('An ActorRdfUpdateQuadsRdfJsStore instance with a %s store', (kind) => {
    let actor: ActorRdfUpdateQuadsRdfJsStore;
    let store: RDF.Store;

    beforeEach(() => {
      actor = new ActorRdfUpdateQuadsRdfJsStore({ name: 'actor', bus });
      const n3Store = new Store();
      n3Store.addQuads([
        DF.quad(DF.namedNode('sd1'), DF.namedNode('pd1'), DF.namedNode('od1')),
      ]);
      store = kind === 'synchronous' ? n3Store : asynchronous(n3Store);
    });

    it('should change the store through transactions only if it is synchronous', () => {
      expect(RdfJsQuadDestination.isSynchronous(store)).toBe(kind === 'synchronous');
    });

    it('should test', async() => {
      await expect(actor.test({
        quadStreamInsert: <any> null,
        quadStreamDelete: <any> null,
        context: new ActionContext(
          { '@comunica/bus-rdf-update-quads:destination': { type: 'rdfjsStore', value: store }},
        ),
      })).resolves.toPassTestVoid();
    });

    it('should test on raw store form', async() => {
      await expect(actor.test({
        quadStreamInsert: <any> null,
        quadStreamDelete: <any> null,
        context: new ActionContext(
          { '@comunica/bus-rdf-update-quads:destination': store },
        ),
      })).resolves.toPassTestVoid();
    });

    it('should not test without a destination', async() => {
      await expect(actor.test({
        quadStreamInsert: <any> null,
        quadStreamDelete: <any> null,
        context: new ActionContext({}),
      })).resolves.toFailTest(`actor received an invalid rdfjsStore.`);
    });

    it('should not test on an invalid destination', async() => {
      await expect(actor.test({
        quadStreamInsert: <any> null,
        quadStreamDelete: <any> null,
        context: new ActionContext(
          { '@comunica/bus-rdf-update-quads:destination': { type: 'rdfjsStore', value: undefined }},
        ),
      })).resolves.toFailTest(`actor received an invalid rdfjsStore.`);
    });

    it('should not test on an invalid destination type', async() => {
      await expect(actor.test({
        quadStreamInsert: <any> null,
        quadStreamDelete: <any> null,
        context: new ActionContext(
          { '@comunica/bus-rdf-update-quads:destination': { type: 'rdfjsStore', value: {}}},
        ),
      })).resolves.toFailTest(`actor received an invalid rdfjsStore.`);
    });

    it('should not test on no destination', async() => {
      await expect(actor.test({
        quadStreamInsert: <any> null,
        quadStreamDelete: <any> null,
        context: new ActionContext(
          { '@comunica/bus-rdf-update-quads:destination': { type: 'entrypoint', value: null }},
        ),
      })).resolves.toFailTest(`actor received an invalid rdfjsStore.`);
    });

    it('should get the destination', async() => {
      const destination = await (<any> actor).getDestination(new ActionContext({
        [KeysInitQuery.dataFactory.name]: DF,
        [KeysRdfUpdateQuads.destination.name]: { type: 'rdfjsStore', value: store },
      }));
      expect(destination).toBeInstanceOf(RdfJsQuadDestination);
      expect(destination.transactionKey).toBe(store);
      expect(Boolean(destination.beginTransaction)).toBe(kind === 'synchronous');
    });

    it('should get the destination on raw destination form', async() => {
      const destination = await (<any> actor).getDestination(new ActionContext({
        [KeysInitQuery.dataFactory.name]: DF,
        [KeysRdfUpdateQuads.destination.name]: store,
      }));
      expect(destination).toBeInstanceOf(RdfJsQuadDestination);
      expect(destination.transactionKey).toBe(store);
      expect(Boolean(destination.beginTransaction)).toBe(kind === 'synchronous');
    });

    it('should run without streams', async() => {
      context = new ActionContext({
        [KeysInitQuery.dataFactory.name]: DF,
        '@comunica/bus-rdf-update-quads:destination': store,
      });
      const quadStreamInsert = undefined;
      const quadStreamDelete = undefined;
      const { execute } = await actor.run({ quadStreamInsert, quadStreamDelete, context });
      await expect(execute()).resolves.toBeUndefined();
      await expect(arrayifyStream(store.match())).resolves.toBeRdfIsomorphic([
        DF.quad(DF.namedNode('sd1'), DF.namedNode('pd1'), DF.namedNode('od1')),
      ]);
    });

    describe('for insert and delete', () => {
      it('should run with insert stream', async() => {
        context = new ActionContext({
          [KeysInitQuery.dataFactory.name]: DF,
          '@comunica/bus-rdf-update-quads:destination': store,
        });
        const quadStreamInsert = new ArrayIterator([
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
        ], { autoStart: false });
        const { execute } = await actor.run({ quadStreamInsert, context });
        await expect(execute()).resolves.toBeUndefined();
        await expect(arrayifyStream(store.match())).resolves.toBeRdfIsomorphic([
          DF.quad(DF.namedNode('sd1'), DF.namedNode('pd1'), DF.namedNode('od1')),
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
        ]);
      });

      it('should run with delete stream', async() => {
        context = new ActionContext({
          [KeysInitQuery.dataFactory.name]: DF,
          '@comunica/bus-rdf-update-quads:destination': store,
        });
        const quadStreamDelete = new ArrayIterator([
          DF.quad(DF.namedNode('sd1'), DF.namedNode('pd1'), DF.namedNode('od1')),
        ], { autoStart: false });
        const { execute } = await actor.run({ quadStreamDelete, context });
        await expect(execute()).resolves.toBeUndefined();
        await expect(arrayifyStream(store.match())).resolves.toBeRdfIsomorphic([]);
      });

      it('should run with insert and delete streams', async() => {
        context = new ActionContext({
          [KeysInitQuery.dataFactory.name]: DF,
          '@comunica/bus-rdf-update-quads:destination': store,
        });
        const quadStreamInsert = new ArrayIterator([
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
        ], { autoStart: false });
        const quadStreamDelete = new ArrayIterator([
          DF.quad(DF.namedNode('sd1'), DF.namedNode('pd1'), DF.namedNode('od1')),
        ], { autoStart: false });
        const { execute } = await actor.run({ quadStreamInsert, quadStreamDelete, context });
        await expect(execute()).resolves.toBeUndefined();
        await expect(arrayifyStream(store.match())).resolves.toBeRdfIsomorphic([
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
        ]);
      });

      it('should run with insert and delete streams and not delete inserted quads', async() => {
        context = new ActionContext({
          [KeysInitQuery.dataFactory.name]: DF,
          '@comunica/bus-rdf-update-quads:destination': store,
        });
        const quadStreamInsert = new ArrayIterator([
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
          DF.quad(DF.namedNode('sd1'), DF.namedNode('pd1'), DF.namedNode('od1')),
        ], { autoStart: false });
        const quadStreamDelete = new ArrayIterator([
          DF.quad(DF.namedNode('sd1'), DF.namedNode('pd1'), DF.namedNode('od1')),
        ], { autoStart: false });
        const { execute } = await actor.run({ quadStreamInsert, quadStreamDelete, context });
        await expect(execute()).resolves.toBeUndefined();
        await expect(arrayifyStream(store.match())).resolves.toBeRdfIsomorphic([
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
          DF.quad(DF.namedNode('sd1'), DF.namedNode('pd1'), DF.namedNode('od1')),
        ]);
      });
    });

    describe('for graph deletion', () => {
      it('should run for default graph', async() => {
        context = new ActionContext({
          [KeysInitQuery.dataFactory.name]: DF,
          '@comunica/bus-rdf-update-quads:destination': store,
        });
        const deleteGraphs = <any> {
          graphs: DF.defaultGraph(),
        };
        const { execute } = await actor.run({ deleteGraphs, context });
        await expect(execute()).resolves.toBeUndefined();
        await expect(arrayifyStream(store.match())).resolves.toBeRdfIsomorphic([]);
      });

      it('should run for a named graph graph', async() => {
        (<Store> store).addQuads([
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1'), DF.namedNode('g1')),
          DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2'), DF.namedNode('g1')),
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1'), DF.namedNode('g2')),
        ]);

        context = new ActionContext({
          [KeysInitQuery.dataFactory.name]: DF,
          '@comunica/bus-rdf-update-quads:destination': store,
        });
        const deleteGraphs = <any> {
          graphs: [ DF.namedNode('g1') ],
        };
        const { execute } = await actor.run({ deleteGraphs, context });
        await expect(execute()).resolves.toBeUndefined();
        await expect(arrayifyStream(store.match())).resolves.toBeRdfIsomorphic([
          DF.quad(DF.namedNode('sd1'), DF.namedNode('pd1'), DF.namedNode('od1')),
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1'), DF.namedNode('g2')),
        ]);
      });

      it('should run for all named graphs', async() => {
        (<Store> store).addQuads([
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1'), DF.namedNode('g1')),
          DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2'), DF.namedNode('g1')),
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1'), DF.namedNode('g2')),
        ]);

        context = new ActionContext({
          [KeysInitQuery.dataFactory.name]: DF,
          '@comunica/bus-rdf-update-quads:destination': store,
        });
        const deleteGraphs = <any> {
          graphs: 'NAMED',
        };
        const { execute } = await actor.run({ deleteGraphs, context });
        await expect(execute()).resolves.toBeUndefined();
        await expect(arrayifyStream(store.match())).resolves.toBeRdfIsomorphic([
          DF.quad(DF.namedNode('sd1'), DF.namedNode('pd1'), DF.namedNode('od1')),
        ]);
      });

      it('should run for all graphs', async() => {
        (<Store> store).addQuads([
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1'), DF.namedNode('g1')),
          DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2'), DF.namedNode('g1')),
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1'), DF.namedNode('g2')),
        ]);

        context = new ActionContext({
          [KeysInitQuery.dataFactory.name]: DF,
          '@comunica/bus-rdf-update-quads:destination': store,
        });
        const deleteGraphs = <any> {
          graphs: 'ALL',
        };
        const { execute } = await actor.run({ deleteGraphs, context });
        await expect(execute()).resolves.toBeUndefined();
        await expect(arrayifyStream(store.match())).resolves.toBeRdfIsomorphic([]);
      });
    });

    describe('for graph creation', () => {
      it('should run for a non-existing graph with requireNonExistence', async() => {
        context = new ActionContext({
          [KeysInitQuery.dataFactory.name]: DF,
          '@comunica/bus-rdf-update-quads:destination': store,
        });
        const createGraphs = {
          graphs: [ DF.namedNode('g1') ],
          requireNonExistence: true,
        };
        const { execute } = await actor.run({ createGraphs, context });
        await expect(execute()).resolves.toBeUndefined();
      });

      it('should run for a non-existing graph without requireNonExistence', async() => {
        context = new ActionContext({
          [KeysInitQuery.dataFactory.name]: DF,
          '@comunica/bus-rdf-update-quads:destination': store,
        });
        const createGraphs = {
          graphs: [ DF.namedNode('g1') ],
          requireNonExistence: false,
        };
        const { execute } = await actor.run({ createGraphs, context });
        await expect(execute()).resolves.toBeUndefined();
      });

      it('should not run for an existing graph with requireNonExistence', async() => {
        context = new ActionContext({
          [KeysInitQuery.dataFactory.name]: DF,
          '@comunica/bus-rdf-update-quads:destination': store,
        });
        (<Store> store).addQuads([
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1'), DF.namedNode('g1')),
        ]);
        const createGraphs = {
          graphs: [ DF.namedNode('g1') ],
          requireNonExistence: true,
        };
        const { execute } = await actor.run({ createGraphs, context });
        await expect(execute()).rejects.toThrow('Unable to create graph g1 as it already exists');
      });

      it('should run for an existing graph without requireNonExistence', async() => {
        context = new ActionContext({
          [KeysInitQuery.dataFactory.name]: DF,
          '@comunica/bus-rdf-update-quads:destination': store,
        });
        (<Store> store).addQuads([
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1'), DF.namedNode('g1')),
        ]);
        const createGraphs = {
          graphs: [ DF.namedNode('g1') ],
          requireNonExistence: false,
        };
        const { execute } = await actor.run({ createGraphs, context });
        await expect(execute()).resolves.toBeUndefined();
      });
    });
  });
});
