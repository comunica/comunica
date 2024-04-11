import { Readable } from 'node:stream';
import { BindingsFactory } from '@comunica/bindings-factory';
import { KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import { MetadataValidationState } from '@comunica/metadata';
import type { IActionContext } from '@comunica/types';
import arrayifyStream from 'arrayify-stream';
import { Store } from 'n3';
import { DataFactory } from 'rdf-data-factory';
import { RdfStore } from 'rdf-stores';
import { Factory } from 'sparqlalgebrajs';
import { QuerySourceRdfJs } from '../lib';
import '@comunica/jest';

const DF = new DataFactory();
const AF = new Factory();
const BF = new BindingsFactory();

describe('QuerySourceRdfJs', () => {
  let ctx: IActionContext;

  let store: RdfStore | Store;
  let source: QuerySourceRdfJs;
  beforeEach(() => {
    ctx = new ActionContext({});
    store = RdfStore.createDefault();
    source = new QuerySourceRdfJs(store, BF);
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
          canContainUndefs: false,
          state: expect.any(MetadataValidationState),
          variables: [ DF.variable('s'), DF.variable('o') ],
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
          canContainUndefs: false,
          state: expect.any(MetadataValidationState),
          variables: [ DF.variable('s'), DF.variable('o') ],
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
          canContainUndefs: false,
          state: expect.any(MetadataValidationState),
          variables: [ DF.variable('s'), DF.variable('o'), DF.variable('g') ],
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
          canContainUndefs: false,
          state: expect.any(MetadataValidationState),
          variables: [ DF.variable('s'), DF.variable('o'), DF.variable('g') ],
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
          canContainUndefs: false,
          state: expect.any(MetadataValidationState),
          variables: [ DF.variable('s'), DF.variable('o') ],
        });
    });

    it('should fallback to match if countQuads is not available', async() => {
      store = new Store();
      (<any> store).countQuads = undefined;
      source = new QuerySourceRdfJs(store, BF);

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
          canContainUndefs: false,
          state: expect.any(MetadataValidationState),
          variables: [ DF.variable('s'), DF.variable('o') ],
        });
    });

    it('should delegate errors', async() => {
      const it = new Readable();
      it._read = () => {
        it.emit('error', new Error('RdfJsSource error'));
      };
      store = <any> { match: () => it };
      source = new QuerySourceRdfJs(store, BF);

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
          source = new QuerySourceRdfJs(store, BF);
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
              canContainUndefs: false,
              state: expect.any(MetadataValidationState),
              variables: [ DF.variable('s'), DF.variable('o') ],
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
              canContainUndefs: false,
              state: expect.any(MetadataValidationState),
              variables: [ DF.variable('s'), DF.variable('s1'), DF.variable('p1'), DF.variable('o1') ],
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
              canContainUndefs: false,
              state: expect.any(MetadataValidationState),
              variables: [ DF.variable('s'), DF.variable('p'), DF.variable('s1'), DF.variable('o1') ],
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
              canContainUndefs: false,
              state: expect.any(MetadataValidationState),
              variables: [
                DF.variable('s'),
                DF.variable('p'),
                DF.variable('s1'),
                DF.variable('s2'),
                DF.variable('pcx'),
                DF.variable('o2'),
              ],
            });
        });
      });

      describe('with a store not supporting quoted triple filtering', () => {
        beforeEach(() => {
          store = new Store();
          source = new QuerySourceRdfJs(store, BF);
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
              canContainUndefs: false,
              state: expect.any(MetadataValidationState),
              variables: [ DF.variable('s'), DF.variable('o') ],
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
              canContainUndefs: false,
              state: expect.any(MetadataValidationState),
              variables: [ DF.variable('s'), DF.variable('s1'), DF.variable('p1'), DF.variable('o1') ],
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
              canContainUndefs: false,
              state: expect.any(MetadataValidationState),
              variables: [ DF.variable('s'), DF.variable('p'), DF.variable('s1'), DF.variable('o1') ],
            });
        });
      });
    });
  });

  describe('queryQuads', () => {
    it('should throw', () => {
      expect(() => source.queryQuads(<any> undefined, ctx))
        .toThrow(`queryQuads is not implemented in QuerySourceQpf`);
    });
  });

  describe('queryBoolean', () => {
    it('should throw', () => {
      expect(() => source.queryBoolean(<any> undefined, ctx))
        .toThrow(`queryBoolean is not implemented in QuerySourceQpf`);
    });
  });

  describe('queryVoid', () => {
    it('should throw', () => {
      expect(() => source.queryVoid(<any> undefined, ctx))
        .toThrow(`queryVoid is not implemented in QuerySourceQpf`);
    });
  });
});
