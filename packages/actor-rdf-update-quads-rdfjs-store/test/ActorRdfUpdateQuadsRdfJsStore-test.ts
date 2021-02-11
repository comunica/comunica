import { ActionContext, Bus } from '@comunica/core';
import { ArrayIterator } from 'asynciterator';
import { Store } from 'n3';
import { DataFactory } from 'rdf-data-factory';
import type * as RDF from 'rdf-js';
import { ActorRdfUpdateQuadsRdfJsStore } from '../lib/ActorRdfUpdateQuadsRdfJsStore';
import { RdfJsQuadDestination } from '../lib/RdfJsQuadDestination';
import 'jest-rdf';

const DF = new DataFactory();
const arrayifyStream = require('arrayify-stream');

describe('ActorRdfUpdateQuadsRdfJsStore', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
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
        context: ActionContext(
          { '@comunica/bus-rdf-update-quads:destination': { type: 'rdfjsStore', value: store }},
        ),
      })).resolves.toBeTruthy();
    });

    it('should test on raw store form', () => {
      return expect(actor.test({
        quadStreamInsert: <any> null,
        quadStreamDelete: <any> null,
        context: ActionContext(
          { '@comunica/bus-rdf-update-quads:destination': store },
        ),
      })).resolves.toBeTruthy();
    });

    it('should not test without a context', () => {
      return expect(actor.test({
        quadStreamInsert: <any> null,
        quadStreamDelete: <any> null,
        context: undefined,
      })).rejects.toBeTruthy();
    });

    it('should not test without a destination', () => {
      return expect(actor.test({
        quadStreamInsert: <any> null,
        quadStreamDelete: <any> null,
        context: ActionContext({}),
      })).rejects.toBeTruthy();
    });

    it('should not test on an invalid destination', () => {
      return expect(actor.test({
        quadStreamInsert: <any> null,
        quadStreamDelete: <any> null,
        context: ActionContext(
          { '@comunica/bus-rdf-update-quads:destination': { type: 'rdfjsStore', value: undefined }},
        ),
      })).rejects.toBeTruthy();
    });

    it('should not test on an invalid destination type', () => {
      return expect(actor.test({
        quadStreamInsert: <any> null,
        quadStreamDelete: <any> null,
        context: ActionContext(
          { '@comunica/bus-rdf-update-quads:destination': { type: 'rdfjsStore', value: {}}},
        ),
      })).rejects.toBeTruthy();
    });

    it('should not test on no destination', () => {
      return expect(actor.test({
        quadStreamInsert: <any> null,
        quadStreamDelete: <any> null,
        context: ActionContext(
          { '@comunica/bus-rdf-update-quads:destination': { type: 'entrypoint', value: null }},
        ),
      })).rejects.toBeTruthy();
    });

    it('should get the destination', () => {
      return expect((<any> actor).getDestination(ActionContext({
        '@comunica/bus-rdf-update-quads:destination': { type: 'rdfjsStore', value: store },
      })))
        .resolves.toMatchObject(new RdfJsQuadDestination(store));
    });

    it('should get the destination on raw destination form', () => {
      return expect((<any> actor).getDestination(ActionContext({
        '@comunica/bus-rdf-update-quads:destination': store,
      })))
        .resolves.toMatchObject(new RdfJsQuadDestination(store));
    });

    it('should run without streams', async() => {
      const context = ActionContext({ '@comunica/bus-rdf-update-quads:destination': store });
      const quadStreamInsert = undefined;
      const quadStreamDelete = undefined;
      const { updateResult } = await actor.run({ quadStreamInsert, quadStreamDelete, context });
      await expect(updateResult).resolves.toBeUndefined();
      expect(await arrayifyStream(store.match())).toBeRdfIsomorphic([
        DF.quad(DF.namedNode('sd1'), DF.namedNode('pd1'), DF.namedNode('od1')),
      ]);
    });

    it('should run with streams', async() => {
      const context = ActionContext({ '@comunica/bus-rdf-update-quads:destination': store });
      const quadStreamInsert = new ArrayIterator([
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
      ]);
      const quadStreamDelete = new ArrayIterator([
        DF.quad(DF.namedNode('sd1'), DF.namedNode('pd1'), DF.namedNode('od1')),
      ]);
      const { updateResult } = await actor.run({ quadStreamInsert, quadStreamDelete, context });
      await expect(updateResult).resolves.toBeUndefined();
      expect(await arrayifyStream(store.match())).toBeRdfIsomorphic([
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
      ]);
    });
  });
});
