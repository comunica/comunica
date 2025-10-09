import { QuerySourceRdfJs } from '@comunica/actor-query-source-identify-rdfjs';
import { ActionContext } from '@comunica/core';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { DataFactory } from 'rdf-data-factory';
import { storeStream } from 'rdf-store-stream';
import { Readable } from 'readable-stream';
import { AggregatedStoreMemory } from '../lib/AggregatedStoreMemory';
import 'jest-rdf';
import {MetadataValidationState} from "@comunica/utils-metadata";

describe('AggregatedStoreMemory', () => {
  const DF = new DataFactory();
  const ctx = new ActionContext();
  let store: AggregatedStoreMemory;
  let rdfjsSource: QuerySourceRdfJs;
  let rdfjsSource2: QuerySourceRdfJs;
  beforeEach(async() => {
    store = new AggregatedStoreMemory(
      undefined,
      async(first, second) => ({ ...first, ...second }),
      true,
      DF,
    );
    rdfjsSource = new QuerySourceRdfJs(
      await storeStream(Readable.from([
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
        DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
      ])),
      DF,
      new BindingsFactory(DF),
    );
    rdfjsSource2 = new QuerySourceRdfJs(
      await storeStream(Readable.from([
        DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.namedNode('o3')),
        DF.quad(DF.namedNode('s4'), DF.namedNode('p4'), DF.namedNode('o4')),
      ])),
      DF,
      new BindingsFactory(DF),
    );
  });

  describe('import', () => {
    it('should import quads', async() => {
      const ret = store.import(Readable.from([
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
        DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
      ]));
      await new Promise(resolve => ret.on('end', resolve));
      store.end();
      await expect(store.match().toArray()).resolves.toHaveLength(2);
    });

    it('should not import quads after end', async() => {
      store.end();
      store.import(Readable.from([
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
        DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
      ]));
      await expect(store.match().toArray()).resolves.toHaveLength(0);
    });

    it('should be skipped if already ended', () => {
      const store = new AggregatedStoreMemory(
        undefined,
        () => Promise.reject(new Error('AggregatedStoreMemory error')),
        true,
        DF,
      );
      const readable = Readable.from([]);
      const spy = jest.spyOn(readable, 'on');
      store.end();
      store.import(readable);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('importSource', () => {
    it('should import quads', async() => {
      await store.importSource('a', rdfjsSource, ctx);
      store.end();
      await expect(store.match().toArray()).resolves.toHaveLength(2);
      expect([ ...store.containedSources ]).toEqual([ 'a' ]);
    });

    it('should not import quads after end', async() => {
      store.end();
      await store.importSource('a', rdfjsSource, ctx);
      await expect(store.match().toArray()).resolves.toHaveLength(0);
      expect([ ...store.containedSources ]).toEqual([]);
    });
  });

  describe('hasRunningIterators', () => {
    it('is false when no iterators are running', () => {
      expect(store.hasRunningIterators()).toBe(false);
    });

    it('is true when no iterators are running', () => {
      store.match();
      expect(store.hasRunningIterators()).toBe(true);
    });

    it('becomes false when iterators are closed', async() => {
      const it1 = store.match();
      expect(store.hasRunningIterators()).toBe(true);
      it1.destroy();
      await new Promise(setImmediate);
      expect(store.hasRunningIterators()).toBe(false);
    });
  });

  describe('match', () => {
    it('returns a stream over stored quads in an ended store', async() => {
      await store.importSource('a', rdfjsSource, ctx);
      store.end();
      await expect(store.match().toArray()).resolves.toEqualRdfQuadArray([
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
        DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
      ]);
    });

    it('returns a stream over stored and streaming quads in an ended store', async() => {
      await store.importSource('a', rdfjsSource, ctx);
      const it1 = store.match();
      const p1 = store.importSource('b', rdfjsSource2, ctx);
      store.end();
      await p1;
      await expect(it1.toArray()).resolves.toEqualRdfQuadArray([
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
        DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
        DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.namedNode('o3')),
        DF.quad(DF.namedNode('s4'), DF.namedNode('p4'), DF.namedNode('o4')),
      ]);
    });

    it('returns a stream with metadata over stored quads in an ended store', async() => {
      await store.importSource('a', rdfjsSource, ctx);
      store.end();
      expect(store.match().getProperty('metadata')).toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'estimate', value: 2 },
      });
    });

    it('returns a stream with metadata over stored and streaming quads in an ended store', async() => {
      await store.importSource('a', rdfjsSource, ctx);
      const it1 = store.match();
      const p1 = store.importSource('b', rdfjsSource2, ctx);
      store.end();
      expect(it1.getProperty('metadata')).toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'estimate', value: 2 },
      });
      await p1;
    });
  });

  describe('addIteratorCreatedListener', () => {
    it('listens to iterator creation events', () => {
      const listener = jest.fn();
      store.addIteratorCreatedListener(listener);
      store.match();
      store.match();
      expect(listener).toHaveBeenCalledTimes(2);
      store.removeIteratorCreatedListener(listener);
      store.match();
      expect(listener).toHaveBeenCalledTimes(2);
    });
  });

  describe('addAllIteratorsClosedListener', () => {
    it('listens to all iterators closed events', async() => {
      const listener = jest.fn();
      store.addAllIteratorsClosedListener(listener);
      const it1 = store.match();
      const it2 = store.match();
      it1.destroy();
      await new Promise(setImmediate);
      expect(listener).toHaveBeenCalledTimes(0);
      it2.destroy();
      await new Promise(setImmediate);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('listens to all iterators closed events and supports removal', async() => {
      const listener = jest.fn();
      store.addAllIteratorsClosedListener(listener);
      const it1 = store.match();
      const it2 = store.match();
      it1.destroy();
      await new Promise(setImmediate);
      expect(listener).toHaveBeenCalledTimes(0);
      store.removeAllIteratorsClosedListener(listener);
      it2.destroy();
      await new Promise(setImmediate);
      expect(listener).toHaveBeenCalledTimes(0);
    });
  });

  describe('setBaseMetadata', () => {
    it('should ignore metadataAccumulator rejections', () => {
      const store = new AggregatedStoreMemory(
        undefined,
        () => Promise.reject(new Error('AggregatedStoreMemory error')),
        true,
        DF,
      );
      const _it1 = store.match();
      store.setBaseMetadata(<any>{}, true);
    });
  });
});
