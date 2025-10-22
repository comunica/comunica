import { Readable } from 'node:stream';
import { KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { Store } from 'n3';
import { DataFactory } from 'rdf-data-factory';
import { RdfStore } from 'rdf-stores';
import { QuerySourceRdfJs } from '../lib';
import '@comunica/utils-jest';
import 'jest-rdf';

const DF = new DataFactory();
const AF = new AlgebraFactory();
const BF = new BindingsFactory(DF);

describe('QuerySourceRdfJs', () => {
  let ctx: IActionContext;

  let store: RdfStore | Store;
  let source: QuerySourceRdfJs;
  beforeEach(() => {
    ctx = new ActionContext({});
    store = RdfStore.createDefault();
    source = new QuerySourceRdfJs(store, DF, BF);
  });

  describe('getSelectorShape', () => {
    it('should return a selector shape', async() => {
      await expect(source.getSelectorShape()).resolves.toEqual({
        type: 'operation',
        operation: {
          operationType: 'pattern',
          pattern: AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
        },
        variablesOptional: [
          DF.variable('s'),
          DF.variable('p'),
          DF.variable('o'),
        ],
      });
    });
  });

  describe('getFilterFactor', () => {
    it('should return a filter factor', async() => {
      await expect(source.getFilterFactor()).resolves.toBe(0);
    });
  });

  describe('toString', () => {
    it('should return a string representation', async() => {
      expect(source.toString()).toBe('QuerySourceRdfJs(RdfStore)');
    });
  });

  describe('queryBindings', () => {
    it('should throw when passing non-pattern', async() => {
      expect(() => source.queryBindings(
        AF.createNop(),
        ctx,
      )).toThrow(`Attempted to pass non-pattern operation 'nop' to QuerySourceRdfJs`);
    });

    it('should return triples in the default graph', async() => {
      store.addQuad(DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.namedNode('o1')));
      store.addQuad(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o2')));
      store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('px'), DF.namedNode('o3')));

      const data = source.queryBindings(
        AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
        ctx,
      );
      await expect(data).toEqualBindingsStream([
        BF.fromRecord({
          s: DF.namedNode('s1'),
          o: DF.namedNode('o1'),
        }),
        BF.fromRecord({
          s: DF.namedNode('s2'),
          o: DF.namedNode('o2'),
        }),
      ]);
      await expect(new Promise(resolve => data.getProperty('metadata', resolve))).resolves
        .toEqual({
          cardinality: { type: 'exact', value: 2 },
          state: expect.any(MetadataValidationState),
          variables: [
            { variable: DF.variable('s'), canBeUndef: false },
            { variable: DF.variable('o'), canBeUndef: false },
          ],
          requestTime: 0,
        });
    });

    it('should not override metadata if already set', async() => {
      (<any> store).matchBindings = () => {
        const it = new ArrayIterator([], { autoStart: false });
        it.setProperty('metadata', { a: 1 });
        return it;
      };

      const data = source.queryBindings(
        AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
        ctx,
      );
      await expect(data).toEqualBindingsStream([]);
      await expect(new Promise(resolve => data.getProperty('metadata', resolve))).resolves
        .toEqual({ a: 1 });
    });

    it('should return triples in the default graph when matchBindings is unavailable', async() => {
      (<any> store).matchBindings = undefined;
      store.addQuad(DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.namedNode('o1')));
      store.addQuad(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o2')));
      store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('px'), DF.namedNode('o3')));

      const data = source.queryBindings(
        AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
        ctx,
      );
      await expect(data).toEqualBindingsStream([
        BF.fromRecord({
          s: DF.namedNode('s1'),
          o: DF.namedNode('o1'),
        }),
        BF.fromRecord({
          s: DF.namedNode('s2'),
          o: DF.namedNode('o2'),
        }),
      ]);
      await expect(new Promise(resolve => data.getProperty('metadata', resolve))).resolves
        .toEqual({
          cardinality: { type: 'exact', value: 2 },
          state: expect.any(MetadataValidationState),
          variables: [
            { variable: DF.variable('s'), canBeUndef: false },
            { variable: DF.variable('o'), canBeUndef: false },
          ],
          requestTime: 0,
        });
    });

    it('should not override metadata if already set when matchBindings is unavailable', async() => {
      (<any> store).matchBindings = undefined;
      (<any> store).match = () => {
        const it = new ArrayIterator([], { autoStart: false });
        it.setProperty('metadata', { a: 1, cardinality: { type: 'exact', value: 2 }});
        return it;
      };

      const data = source.queryBindings(
        AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
        ctx,
      );
      await expect(data).toEqualBindingsStream([]);
      await expect(new Promise(resolve => data.getProperty('metadata', resolve))).resolves
        .toEqual({
          a: 1,
          cardinality: { type: 'exact', value: 2 },
          variables: [
            { variable: DF.variable('s'), canBeUndef: false },
            { variable: DF.variable('o'), canBeUndef: false },
          ],
        });
    });

    it('should return triples in a named graph', async() => {
      store.addQuad(DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.namedNode('o1'), DF.namedNode('g1')));
      store.addQuad(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o2'), DF.namedNode('g2')));
      store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('px'), DF.namedNode('o3'), DF.namedNode('g3')));

      const data = source.queryBindings(
        AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o'), DF.namedNode('g1')),
        ctx,
      );
      await expect(data).toEqualBindingsStream([
        BF.fromRecord({
          s: DF.namedNode('s1'),
          o: DF.namedNode('o1'),
        }),
      ]);
      await expect(new Promise(resolve => data.getProperty('metadata', resolve))).resolves
        .toEqual({
          cardinality: { type: 'exact', value: 1 },
          state: expect.any(MetadataValidationState),
          variables: [
            { variable: DF.variable('s'), canBeUndef: false },
            { variable: DF.variable('o'), canBeUndef: false },
          ],
          requestTime: 0,
        });
    });

    it('should return triples in a named graph when matchBindings is unavailable', async() => {
      (<any> store).matchBindings = undefined;
      store.addQuad(DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.namedNode('o1'), DF.namedNode('g1')));
      store.addQuad(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o2'), DF.namedNode('g2')));
      store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('px'), DF.namedNode('o3'), DF.namedNode('g3')));

      const data = source.queryBindings(
        AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o'), DF.namedNode('g1')),
        ctx,
      );
      await expect(data).toEqualBindingsStream([
        BF.fromRecord({
          s: DF.namedNode('s1'),
          o: DF.namedNode('o1'),
        }),
      ]);
      await expect(new Promise(resolve => data.getProperty('metadata', resolve))).resolves
        .toEqual({
          cardinality: { type: 'exact', value: 1 },
          state: expect.any(MetadataValidationState),
          variables: [
            { variable: DF.variable('s'), canBeUndef: false },
            { variable: DF.variable('o'), canBeUndef: false },
          ],
          requestTime: 0,
        });
    });

    it('should return quads in named graphs', async() => {
      store.addQuad(DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.namedNode('o1'), DF.namedNode('g1')));
      store.addQuad(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o2')));
      store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('px'), DF.namedNode('o3')));

      const data = source.queryBindings(
        AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o'), DF.variable('g')),
        ctx,
      );
      await expect(data).toEqualBindingsStream([
        BF.fromRecord({
          s: DF.namedNode('s1'),
          o: DF.namedNode('o1'),
          g: DF.namedNode('g1'),
        }),
      ]);
      await expect(new Promise(resolve => data.getProperty('metadata', resolve))).resolves
        .toEqual({
          cardinality: { type: 'estimate', value: 2 },
          state: expect.any(MetadataValidationState),
          variables: [
            { variable: DF.variable('s'), canBeUndef: false },
            { variable: DF.variable('o'), canBeUndef: false },
            { variable: DF.variable('g'), canBeUndef: false },
          ],
          requestTime: 0,
        });
    });

    it('should return quads in named graphs when matchBindings is unavailable', async() => {
      (<any> store).matchBindings = undefined;
      store.addQuad(DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.namedNode('o1'), DF.namedNode('g1')));
      store.addQuad(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o2')));
      store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('px'), DF.namedNode('o3')));

      const data = source.queryBindings(
        AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o'), DF.variable('g')),
        ctx,
      );
      await expect(data).toEqualBindingsStream([
        BF.fromRecord({
          s: DF.namedNode('s1'),
          o: DF.namedNode('o1'),
          g: DF.namedNode('g1'),
        }),
      ]);
      await expect(new Promise(resolve => data.getProperty('metadata', resolve))).resolves
        .toEqual({
          cardinality: { type: 'estimate', value: 2 },
          state: expect.any(MetadataValidationState),
          variables: [
            { variable: DF.variable('s'), canBeUndef: false },
            { variable: DF.variable('o'), canBeUndef: false },
            { variable: DF.variable('g'), canBeUndef: false },
          ],
          requestTime: 0,
        });
    });

    it('should return triples in named graphs and the default graph with union default graph', async() => {
      ctx = ctx.set(KeysQueryOperation.unionDefaultGraph, true);

      store.addQuad(DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.namedNode('o1'), DF.namedNode('g1')));
      store.addQuad(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o2')));
      store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('px'), DF.namedNode('o3')));

      const data = source.queryBindings(
        AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
        ctx,
      );
      await expect(data).toEqualBindingsStream([
        BF.fromRecord({
          s: DF.namedNode('s1'),
          o: DF.namedNode('o1'),
        }),
        BF.fromRecord({
          s: DF.namedNode('s2'),
          o: DF.namedNode('o2'),
        }),
      ]);
      await expect(new Promise(resolve => data.getProperty('metadata', resolve))).resolves
        .toEqual({
          cardinality: { type: 'exact', value: 2 },
          state: expect.any(MetadataValidationState),
          variables: [
            { variable: DF.variable('s'), canBeUndef: false },
            { variable: DF.variable('o'), canBeUndef: false },
          ],
          requestTime: 0,
        });
    });

    // eslint-disable-next-line max-len
    it('should return triples in named graphs and the default graph with union default graph when matchBindings is unavailable', async() => {
      ctx = ctx.set(KeysQueryOperation.unionDefaultGraph, true);

      (<any> store).matchBindings = undefined;
      store.addQuad(DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.namedNode('o1'), DF.namedNode('g1')));
      store.addQuad(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o2')));
      store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('px'), DF.namedNode('o3')));

      const data = source.queryBindings(
        AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
        ctx,
      );
      await expect(data).toEqualBindingsStream([
        BF.fromRecord({
          s: DF.namedNode('s1'),
          o: DF.namedNode('o1'),
        }),
        BF.fromRecord({
          s: DF.namedNode('s2'),
          o: DF.namedNode('o2'),
        }),
      ]);
      await expect(new Promise(resolve => data.getProperty('metadata', resolve))).resolves
        .toEqual({
          cardinality: { type: 'exact', value: 2 },
          state: expect.any(MetadataValidationState),
          variables: [
            { variable: DF.variable('s'), canBeUndef: false },
            { variable: DF.variable('o'), canBeUndef: false },
          ],
          requestTime: 0,
        });
    });

    it('should return quads in named graphs and the default graph with union default graph', async() => {
      ctx = ctx.set(KeysQueryOperation.unionDefaultGraph, true);

      store.addQuad(DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.namedNode('o1'), DF.namedNode('g1')));
      store.addQuad(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o2')));
      store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('px'), DF.namedNode('o3')));

      const data = source.queryBindings(
        AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o'), DF.variable('g')),
        ctx,
      );
      await expect(data).toEqualBindingsStream([
        BF.fromRecord({
          s: DF.namedNode('s1'),
          o: DF.namedNode('o1'),
          g: DF.namedNode('g1'),
        }),
        BF.fromRecord({
          s: DF.namedNode('s2'),
          o: DF.namedNode('o2'),
          g: DF.defaultGraph(),
        }),
      ]);
      await expect(new Promise(resolve => data.getProperty('metadata', resolve))).resolves
        .toEqual({
          cardinality: { type: 'exact', value: 2 },
          state: expect.any(MetadataValidationState),
          variables: [
            { variable: DF.variable('s'), canBeUndef: false },
            { variable: DF.variable('o'), canBeUndef: false },
            { variable: DF.variable('g'), canBeUndef: false },
          ],
          requestTime: 0,
        });
    });

    // eslint-disable-next-line max-len
    it('should return quads in named graphs and the default graph with union default graph when matchBindings is unavailable', async() => {
      ctx = ctx.set(KeysQueryOperation.unionDefaultGraph, true);

      (<any> store).matchBindings = undefined;
      store.addQuad(DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.namedNode('o1'), DF.namedNode('g1')));
      store.addQuad(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o2')));
      store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('px'), DF.namedNode('o3')));

      const data = source.queryBindings(
        AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o'), DF.variable('g')),
        ctx,
      );
      await expect(data).toEqualBindingsStream([
        BF.fromRecord({
          s: DF.namedNode('s1'),
          o: DF.namedNode('o1'),
          g: DF.namedNode('g1'),
        }),
        BF.fromRecord({
          s: DF.namedNode('s2'),
          o: DF.namedNode('o2'),
          g: DF.defaultGraph(),
        }),
      ]);
      await expect(new Promise(resolve => data.getProperty('metadata', resolve))).resolves
        .toEqual({
          cardinality: { type: 'exact', value: 2 },
          state: expect.any(MetadataValidationState),
          variables: [
            { variable: DF.variable('s'), canBeUndef: false },
            { variable: DF.variable('o'), canBeUndef: false },
            { variable: DF.variable('g'), canBeUndef: false },
          ],
          requestTime: 0,
        });
    });

    it('should use countQuads if available', async() => {
      (<any> store).countQuads = () => 123;

      store.addQuad(DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.namedNode('o1')));
      store.addQuad(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o2')));
      store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('px'), DF.namedNode('o3')));

      const data = source.queryBindings(
        AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
        ctx,
      );
      await expect(data).toEqualBindingsStream([
        BF.fromRecord({
          s: DF.namedNode('s1'),
          o: DF.namedNode('o1'),
        }),
        BF.fromRecord({
          s: DF.namedNode('s2'),
          o: DF.namedNode('o2'),
        }),
      ]);
      await expect(new Promise(resolve => data.getProperty('metadata', resolve))).resolves
        .toEqual({
          cardinality: { type: 'exact', value: 123 },
          state: expect.any(MetadataValidationState),
          variables: [
            { variable: DF.variable('s'), canBeUndef: false },
            { variable: DF.variable('o'), canBeUndef: false },
          ],
          requestTime: 0,
        });
    });

    it('should fallback to match if countQuads is not available', async() => {
      store = new Store();
      (<any> store).countQuads = undefined;
      source = new QuerySourceRdfJs(store, DF, BF);

      store.addQuad(DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.namedNode('o1')));
      store.addQuad(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o2')));
      store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('px'), DF.namedNode('o3')));

      const data = source.queryBindings(
        AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
        ctx,
      );
      await expect(data).toEqualBindingsStream([
        BF.fromRecord({
          s: DF.namedNode('s1'),
          o: DF.namedNode('o1'),
        }),
        BF.fromRecord({
          s: DF.namedNode('s2'),
          o: DF.namedNode('o2'),
        }),
      ]);
      await expect(new Promise(resolve => data.getProperty('metadata', resolve))).resolves
        .toEqual({
          cardinality: { type: 'exact', value: 2 },
          state: expect.any(MetadataValidationState),
          variables: [
            { variable: DF.variable('s'), canBeUndef: false },
            { variable: DF.variable('o'), canBeUndef: false },
          ],
          requestTime: 0,
        });
    });

    it('should delegate errors', async() => {
      const it = new Readable();
      it._read = () => {
        it.emit('error', new Error('RdfJsSource error'));
      };
      store = <any> { matchBindings: () => it, match: () => it };
      source = new QuerySourceRdfJs(store, DF, BF);

      const data = source.queryBindings(
        AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
        ctx,
      );
      await expect(arrayifyStream(data)).rejects.toThrow(new Error('RdfJsSource error'));
    });

    it('should delegate errors when matchBindings is unavailable', async() => {
      const it = new Readable();
      it._read = () => {
        it.emit('error', new Error('RdfJsSource error'));
      };
      store = <any> { match: () => it };
      source = new QuerySourceRdfJs(store, DF, BF);

      const data = source.queryBindings(
        AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
        ctx,
      );
      await expect(arrayifyStream(data)).rejects.toThrow(new Error('RdfJsSource error'));
    });

    describe('for quoted triples', () => {
      describe('with a store supporting quoted triple filtering', () => {
        beforeEach(() => {
          store = RdfStore.createDefault();
          source = new QuerySourceRdfJs(store, DF, BF);
        });

        it('should run when containing quoted triples', async() => {
          store.addQuad(DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.namedNode('o1')));
          store.addQuad(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o2')));
          store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('px'), DF.namedNode('o3')));
          store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('p'), DF.quad(
            DF.namedNode('sa3'),
            DF.namedNode('pax'),
            DF.namedNode('oa3'),
          )));
          store.addQuad(DF.quad(DF.namedNode('s4'), DF.namedNode('px'), DF.quad(
            DF.namedNode('sb3'),
            DF.namedNode('pbx'),
            DF.namedNode('ob3'),
          )));

          const data = source.queryBindings(
            AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
            ctx,
          );
          await expect(data).toEqualBindingsStream([
            BF.fromRecord({
              s: DF.namedNode('s1'),
              o: DF.namedNode('o1'),
            }),
            BF.fromRecord({
              s: DF.namedNode('s2'),
              o: DF.namedNode('o2'),
            }),
            BF.fromRecord({
              s: DF.namedNode('s3'),
              o: DF.quad(
                DF.namedNode('sa3'),
                DF.namedNode('pax'),
                DF.namedNode('oa3'),
              ),
            }),
          ]);
          await expect(new Promise(resolve => data.getProperty('metadata', resolve))).resolves
            .toEqual({
              cardinality: { type: 'exact', value: 3 },
              state: expect.any(MetadataValidationState),
              variables: [
                { variable: DF.variable('s'), canBeUndef: false },
                { variable: DF.variable('o'), canBeUndef: false },
              ],
              requestTime: 0,
            });
        });

        it('should run when containing quoted triples with a quoted pattern (1)', async() => {
          store.addQuad(DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.namedNode('o1')));
          store.addQuad(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o2')));
          store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('px'), DF.namedNode('o3')));
          store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('p'), DF.quad(
            DF.namedNode('sa3'),
            DF.namedNode('pax'),
            DF.namedNode('oa3'),
          )));
          store.addQuad(DF.quad(DF.namedNode('s4'), DF.namedNode('px'), DF.quad(
            DF.namedNode('sb3'),
            DF.namedNode('pbx'),
            DF.namedNode('ob3'),
          )));

          const data = source.queryBindings(
            AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.quad(
              DF.variable('s1'),
              DF.variable('p1'),
              DF.variable('o1'),
            )),
            ctx,
          );
          await expect(data).toEqualBindingsStream([
            BF.fromRecord({
              s: DF.namedNode('s3'),
              s1: DF.namedNode('sa3'),
              p1: DF.namedNode('pax'),
              o1: DF.namedNode('oa3'),
            }),
          ]);
          await expect(new Promise(resolve => data.getProperty('metadata', resolve))).resolves
            .toEqual({
              cardinality: { type: 'exact', value: 1 },
              state: expect.any(MetadataValidationState),
              variables: [
                { variable: DF.variable('s'), canBeUndef: false },
                { variable: DF.variable('s1'), canBeUndef: false },
                { variable: DF.variable('p1'), canBeUndef: false },
                { variable: DF.variable('o1'), canBeUndef: false },
              ],
              requestTime: 0,
            });
        });

        it('should run when containing quoted triples with a quoted pattern (2)', async() => {
          store.addQuad(DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.namedNode('o1')));
          store.addQuad(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o2')));
          store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('px'), DF.namedNode('o3')));
          store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('p'), DF.quad(
            DF.namedNode('sa3'),
            DF.namedNode('pax'),
            DF.namedNode('oa3'),
          )));
          store.addQuad(DF.quad(DF.namedNode('s4'), DF.namedNode('px'), DF.quad(
            DF.namedNode('sb3'),
            DF.namedNode('pbx'),
            DF.namedNode('ob3'),
          )));

          const data = source.queryBindings(
            AF.createPattern(DF.variable('s'), DF.variable('p'), DF.quad(
              DF.variable('s1'),
              DF.namedNode('pbx'),
              DF.variable('o1'),
            )),
            ctx,
          );
          await expect(data).toEqualBindingsStream([
            BF.fromRecord({
              s: DF.namedNode('s4'),
              p: DF.namedNode('px'),
              s1: DF.namedNode('sb3'),
              o1: DF.namedNode('ob3'),
            }),
          ]);
          await expect(new Promise(resolve => data.getProperty('metadata', resolve))).resolves
            .toEqual({
              cardinality: { type: 'exact', value: 1 },
              state: expect.any(MetadataValidationState),
              variables: [
                { variable: DF.variable('s'), canBeUndef: false },
                { variable: DF.variable('p'), canBeUndef: false },
                { variable: DF.variable('s1'), canBeUndef: false },
                { variable: DF.variable('o1'), canBeUndef: false },
              ],
              requestTime: 0,
            });
        });

        it('should run when containing quoted triples with a nested quoted pattern', async() => {
          store.addQuad(DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.namedNode('o1')));
          store.addQuad(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o2')));
          store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('px'), DF.namedNode('o3')));
          store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('p'), DF.quad(
            DF.namedNode('sa3'),
            DF.namedNode('pax'),
            DF.namedNode('oa3'),
          )));
          store.addQuad(DF.quad(DF.namedNode('s4'), DF.namedNode('px'), DF.quad(
            DF.namedNode('sb3'),
            DF.namedNode('pbx'),
            DF.namedNode('ob3'),
          )));
          store.addQuad(DF.quad(DF.namedNode('s4'), DF.namedNode('px'), DF.quad(
            DF.namedNode('sb3'),
            DF.namedNode('pbx'),
            DF.quad(
              DF.namedNode('sb3'),
              DF.namedNode('pbx'),
              DF.namedNode('ob3'),
            ),
          )));

          const data = source.queryBindings(
            AF.createPattern(DF.variable('s'), DF.variable('p'), DF.quad(
              DF.variable('s1'),
              DF.namedNode('pbx'),
              DF.quad(
                DF.variable('s2'),
                DF.variable('pcx'),
                DF.variable('o2'),
              ),
            )),
            ctx,
          );
          await expect(data).toEqualBindingsStream([
            BF.fromRecord({
              s: DF.namedNode('s4'),
              p: DF.namedNode('px'),
              s1: DF.namedNode('sb3'),
              s2: DF.namedNode('sb3'),
              pcx: DF.namedNode('pbx'),
              o2: DF.namedNode('ob3'),
            }),
          ]);
          await expect(new Promise(resolve => data.getProperty('metadata', resolve))).resolves
            .toEqual({
              cardinality: { type: 'exact', value: 1 },
              state: expect.any(MetadataValidationState),
              variables: [
                { variable: DF.variable('s'), canBeUndef: false },
                { variable: DF.variable('p'), canBeUndef: false },
                { variable: DF.variable('s1'), canBeUndef: false },
                { variable: DF.variable('s2'), canBeUndef: false },
                { variable: DF.variable('pcx'), canBeUndef: false },
                { variable: DF.variable('o2'), canBeUndef: false },
              ],
              requestTime: 0,
            });
        });
      });

      describe('with a store not supporting quoted triple filtering', () => {
        beforeEach(() => {
          store = new Store();
          source = new QuerySourceRdfJs(store, DF, BF);
        });

        it('should run when containing quoted triples', async() => {
          store.addQuad(DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.namedNode('o1')));
          store.addQuad(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o2')));
          store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('px'), DF.namedNode('o3')));
          store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('p'), DF.quad(
            DF.namedNode('sa3'),
            DF.namedNode('pax'),
            DF.namedNode('oa3'),
          )));
          store.addQuad(DF.quad(DF.namedNode('s4'), DF.namedNode('px'), DF.quad(
            DF.namedNode('sb3'),
            DF.namedNode('pbx'),
            DF.namedNode('ob3'),
          )));

          const data = source.queryBindings(
            AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
            ctx,
          );
          await expect(data).toEqualBindingsStream([
            BF.fromRecord({
              s: DF.namedNode('s1'),
              o: DF.namedNode('o1'),
            }),
            BF.fromRecord({
              s: DF.namedNode('s2'),
              o: DF.namedNode('o2'),
            }),
            BF.fromRecord({
              s: DF.namedNode('s3'),
              o: DF.quad(
                DF.namedNode('sa3'),
                DF.namedNode('pax'),
                DF.namedNode('oa3'),
              ),
            }),
          ]);
          await expect(new Promise(resolve => data.getProperty('metadata', resolve))).resolves
            .toEqual({
              cardinality: { type: 'exact', value: 3 },
              state: expect.any(MetadataValidationState),
              variables: [
                { variable: DF.variable('s'), canBeUndef: false },
                { variable: DF.variable('o'), canBeUndef: false },
              ],
              requestTime: 0,
            });
        });

        it('should run when containing quoted triples with a quoted pattern (1)', async() => {
          store.addQuad(DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.namedNode('o1')));
          store.addQuad(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o2')));
          store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('px'), DF.namedNode('o3')));
          store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('p'), DF.quad(
            DF.namedNode('sa3'),
            DF.namedNode('pax'),
            DF.namedNode('oa3'),
          )));
          store.addQuad(DF.quad(DF.namedNode('s4'), DF.namedNode('px'), DF.quad(
            DF.namedNode('sb3'),
            DF.namedNode('pbx'),
            DF.namedNode('ob3'),
          )));

          const data = source.queryBindings(
            AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.quad(
              DF.variable('s1'),
              DF.variable('p1'),
              DF.variable('o1'),
            )),
            ctx,
          );
          await expect(data).toEqualBindingsStream([
            BF.fromRecord({
              s: DF.namedNode('s3'),
              s1: DF.namedNode('sa3'),
              p1: DF.namedNode('pax'),
              o1: DF.namedNode('oa3'),
            }),
          ]);
          await expect(new Promise(resolve => data.getProperty('metadata', resolve))).resolves
            .toEqual({
              cardinality: { type: 'estimate', value: 3 },
              state: expect.any(MetadataValidationState),
              variables: [
                { variable: DF.variable('s'), canBeUndef: false },
                { variable: DF.variable('s1'), canBeUndef: false },
                { variable: DF.variable('p1'), canBeUndef: false },
                { variable: DF.variable('o1'), canBeUndef: false },
              ],
              requestTime: 0,
            });
        });

        it('should run when containing quoted triples with a quoted pattern (2)', async() => {
          store.addQuad(DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.namedNode('o1')));
          store.addQuad(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o2')));
          store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('px'), DF.namedNode('o3')));
          store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('p'), DF.quad(
            DF.namedNode('sa3'),
            DF.namedNode('pax'),
            DF.namedNode('oa3'),
          )));
          store.addQuad(DF.quad(DF.namedNode('s4'), DF.namedNode('px'), DF.quad(
            DF.namedNode('sb3'),
            DF.namedNode('pbx'),
            DF.namedNode('ob3'),
          )));

          const data = source.queryBindings(
            AF.createPattern(DF.variable('s'), DF.variable('p'), DF.quad(
              DF.variable('s1'),
              DF.namedNode('pbx'),
              DF.variable('o1'),
            )),
            ctx,
          );
          await expect(data).toEqualBindingsStream([
            BF.fromRecord({
              s: DF.namedNode('s4'),
              p: DF.namedNode('px'),
              s1: DF.namedNode('sb3'),
              o1: DF.namedNode('ob3'),
            }),
          ]);
          await expect(new Promise(resolve => data.getProperty('metadata', resolve))).resolves
            .toEqual({
              cardinality: { type: 'estimate', value: 5 },
              state: expect.any(MetadataValidationState),
              variables: [
                { variable: DF.variable('s'), canBeUndef: false },
                { variable: DF.variable('p'), canBeUndef: false },
                { variable: DF.variable('s1'), canBeUndef: false },
                { variable: DF.variable('o1'), canBeUndef: false },
              ],
              requestTime: 0,
            });
        });
      });
    });
  });

  describe('queryQuads', () => {
    it('should forward patterns to match calls', async() => {
      store.addQuad(DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')));
      store.addQuad(DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o1')));
      await expect(source.queryQuads(AF.createPattern(
        DF.variable('s'),
        DF.namedNode('p1'),
        DF.variable('p'),
      ), ctx).toArray()).resolves.toEqualRdfQuadArray([
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
      ]);
    });

    it('should throw on random operations', () => {
      expect(() => source.queryQuads(AF.createNop(), ctx))
        .toThrow(`queryQuads is not implemented in QuerySourceRdfJs`);
    });
  });

  describe('queryBoolean', () => {
    it('should throw', () => {
      expect(() => source.queryBoolean(<any> undefined, ctx))
        .toThrow(`queryBoolean is not implemented in QuerySourceRdfJs`);
    });
  });

  describe('queryVoid', () => {
    it('should throw', () => {
      expect(() => source.queryVoid(<any> undefined, ctx))
        .toThrow(`queryVoid is not implemented in QuerySourceRdfJs`);
    });
  });
});
