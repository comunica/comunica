import { KeysRdfUpdateQuads } from '@comunica/context-entries';
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

const DF = new DataFactory();

describe('ActorRdfUpdateQuadsRdfJsStore', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('An ActorRdfUpdateQuadsRdfJsStore instance', () => {
    let actor: ActorRdfUpdateQuadsRdfJsStore;
    let store: RDF.Store;

    beforeEach(() => {
      actor = new ActorRdfUpdateQuadsRdfJsStore({ name: 'actor', bus });
      store = new Store();
      (<Store> store).addQuads([
        DF.quad(DF.namedNode('sd1'), DF.namedNode('pd1'), DF.namedNode('od1')),
      ]);
    });

    it('should test', () => {
      return expect(actor.test({
        quadStreamInsert: <any> null,
        quadStreamDelete: <any> null,
        context: new ActionContext(
          { '@comunica/bus-rdf-update-quads:destination': { type: 'rdfjsStore', value: store }},
        ),
      })).resolves.toBeTruthy();
    });

    it('should test on raw store form', () => {
      return expect(actor.test({
        quadStreamInsert: <any> null,
        quadStreamDelete: <any> null,
        context: new ActionContext(
          { '@comunica/bus-rdf-update-quads:destination': store },
        ),
      })).resolves.toBeTruthy();
    });

    it('should not test without a destination', () => {
      return expect(actor.test({
        quadStreamInsert: <any> null,
        quadStreamDelete: <any> null,
        context: new ActionContext({}),
      })).rejects.toBeTruthy();
    });

    it('should not test on an invalid destination', () => {
      return expect(actor.test({
        quadStreamInsert: <any> null,
        quadStreamDelete: <any> null,
        context: new ActionContext(
          { '@comunica/bus-rdf-update-quads:destination': { type: 'rdfjsStore', value: undefined }},
        ),
      })).rejects.toBeTruthy();
    });

    it('should not test on an invalid destination type', () => {
      return expect(actor.test({
        quadStreamInsert: <any> null,
        quadStreamDelete: <any> null,
        context: new ActionContext(
          { '@comunica/bus-rdf-update-quads:destination': { type: 'rdfjsStore', value: {}}},
        ),
      })).rejects.toBeTruthy();
    });

    it('should not test on no destination', () => {
      return expect(actor.test({
        quadStreamInsert: <any> null,
        quadStreamDelete: <any> null,
        context: new ActionContext(
          { '@comunica/bus-rdf-update-quads:destination': { type: 'entrypoint', value: null }},
        ),
      })).rejects.toBeTruthy();
    });

    it('should get the destination', () => {
      return expect((<any> actor).getDestination(new ActionContext({
        [KeysRdfUpdateQuads.destination.name]: { type: 'rdfjsStore', value: store },
      })))
        .resolves.toMatchObject(new RdfJsQuadDestination(store));
    });

    it('should get the destination on raw destination form', () => {
      return expect((<any> actor).getDestination(new ActionContext({
        [KeysRdfUpdateQuads.destination.name]: store,
      })))
        .resolves.toMatchObject(new RdfJsQuadDestination(store));
    });

    it('should run without streams', async() => {
      context = new ActionContext({ '@comunica/bus-rdf-update-quads:destination': store });
      const quadStreamInsert = undefined;
      const quadStreamDelete = undefined;
      const { execute } = await actor.run({ quadStreamInsert, quadStreamDelete, context });
      await expect(execute()).resolves.toBeUndefined();
      expect(await arrayifyStream(store.match())).toBeRdfIsomorphic([
        DF.quad(DF.namedNode('sd1'), DF.namedNode('pd1'), DF.namedNode('od1')),
      ]);
    });

    describe('for insert and delete', () => {
      it('should run with insert and delete streams', async() => {
        context = new ActionContext({ '@comunica/bus-rdf-update-quads:destination': store });
        const quadStreamInsert = new ArrayIterator([
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
        ]);
        const quadStreamDelete = new ArrayIterator([
          DF.quad(DF.namedNode('sd1'), DF.namedNode('pd1'), DF.namedNode('od1')),
        ]);
        const { execute } = await actor.run({ quadStreamInsert, quadStreamDelete, context });
        await expect(execute()).resolves.toBeUndefined();
        expect(await arrayifyStream(store.match())).toBeRdfIsomorphic([
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
        ]);
      });
    });

    describe('for graph deletion', () => {
      it('should run for default graph', async() => {
        context = new ActionContext({ '@comunica/bus-rdf-update-quads:destination': store });
        const deleteGraphs = <any> {
          graphs: DF.defaultGraph(),
        };
        const { execute } = await actor.run({ deleteGraphs, context });
        await expect(execute()).resolves.toBeUndefined();
        expect(await arrayifyStream(store.match())).toBeRdfIsomorphic([]);
      });

      it('should run for a named graph graph', async() => {
        (<Store> store).addQuads([
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1'), DF.namedNode('g1')),
          DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2'), DF.namedNode('g1')),
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1'), DF.namedNode('g2')),
        ]);

        context = new ActionContext({ '@comunica/bus-rdf-update-quads:destination': store });
        const deleteGraphs = <any> {
          graphs: [ DF.namedNode('g1') ],
        };
        const { execute } = await actor.run({ deleteGraphs, context });
        await expect(execute()).resolves.toBeUndefined();
        expect(await arrayifyStream(store.match())).toBeRdfIsomorphic([
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

        context = new ActionContext({ '@comunica/bus-rdf-update-quads:destination': store });
        const deleteGraphs = <any> {
          graphs: 'NAMED',
        };
        const { execute } = await actor.run({ deleteGraphs, context });
        await expect(execute()).resolves.toBeUndefined();
        expect(await arrayifyStream(store.match())).toBeRdfIsomorphic([
          DF.quad(DF.namedNode('sd1'), DF.namedNode('pd1'), DF.namedNode('od1')),
        ]);
      });

      it('should run for all graphs', async() => {
        (<Store> store).addQuads([
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1'), DF.namedNode('g1')),
          DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2'), DF.namedNode('g1')),
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1'), DF.namedNode('g2')),
        ]);

        context = new ActionContext({ '@comunica/bus-rdf-update-quads:destination': store });
        const deleteGraphs = <any> {
          graphs: 'ALL',
        };
        const { execute } = await actor.run({ deleteGraphs, context });
        await expect(execute()).resolves.toBeUndefined();
        expect(await arrayifyStream(store.match())).toBeRdfIsomorphic([]);
      });
    });

    describe('for graph creation', () => {
      it('should run for a non-existing graph with requireNonExistence', async() => {
        context = new ActionContext({ '@comunica/bus-rdf-update-quads:destination': store });
        const createGraphs = {
          graphs: [ DF.namedNode('g1') ],
          requireNonExistence: true,
        };
        const { execute } = await actor.run({ createGraphs, context });
        await expect(execute()).resolves.toBeUndefined();
      });

      it('should run for a non-existing graph without requireNonExistence', async() => {
        context = new ActionContext({ '@comunica/bus-rdf-update-quads:destination': store });
        const createGraphs = {
          graphs: [ DF.namedNode('g1') ],
          requireNonExistence: false,
        };
        const { execute } = await actor.run({ createGraphs, context });
        await expect(execute()).resolves.toBeUndefined();
      });

      it('should not run for an existing graph with requireNonExistence', async() => {
        context = new ActionContext({ '@comunica/bus-rdf-update-quads:destination': store });
        (<Store> store).addQuads([
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1'), DF.namedNode('g1')),
        ]);
        const createGraphs = {
          graphs: [ DF.namedNode('g1') ],
          requireNonExistence: true,
        };
        const { execute } = await actor.run({ createGraphs, context });
        await expect(execute()).rejects.toThrowError('Unable to create graph g1 as it already exists');
      });

      it('should run for an existing graph without requireNonExistence', async() => {
        context = new ActionContext({ '@comunica/bus-rdf-update-quads:destination': store });
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
