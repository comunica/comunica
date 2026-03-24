import { QuerySourceRdfJs } from '@comunica/actor-query-source-identify-rdfjs';
import type { IActionQuerySourceIdentify, MediatorQuerySourceIdentify } from '@comunica/bus-query-source-identify';
import { ActionContext, Bus } from '@comunica/core';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { RdfStore } from 'rdf-stores';
import { ActorQuerySourceIdentifyCompositeFile } from '../lib/ActorQuerySourceIdentifyCompositeFile';
import '@comunica/utils-jest';

const DF = new DataFactory();
const AF = new AlgebraFactory(DF);
const BF = new BindingsFactory(DF);

const v1 = DF.variable('v1');
const v2 = DF.variable('v2');
const v3 = DF.variable('v3');

const mediatorMergeBindingsContext: any = {
  mediate: () => ({}),
};

function createStoreWithQuads(quads: RDF.Quad[]): RDF.Store {
  const store: RDF.Store = RdfStore.createDefault(true);
  for (const quad of quads) {
    (<any> store).addQuad(quad);
  }
  return store;
}

describe('ActorQuerySourceIdentifyCompositeFile', () => {
  let bus: any;
  let mediatorQuerySourceIdentify: MediatorQuerySourceIdentify;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });

    mediatorQuerySourceIdentify = <any> {
      async mediate(action: IActionQuerySourceIdentify) {
        const url = <string> action.querySourceUnidentified.value;
        let store: RDF.Store;
        if (url === 'http://example.org/file1.ttl') {
          store = createStoreWithQuads([
            DF.quad(DF.namedNode('ex:s1'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')),
          ]);
        } else if (url === 'http://example.org/file2.ttl') {
          store = createStoreWithQuads([
            DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2')),
          ]);
        } else {
          throw new Error(`Unknown URL: ${url}`);
        }
        const source = new QuerySourceRdfJs(store, DF, BF);
        source.referenceValue = url;
        return { querySource: { source }};
      },
    };
  });

  describe('An ActorQuerySourceIdentifyCompositeFile instance', () => {
    let actor: ActorQuerySourceIdentifyCompositeFile;

    beforeEach(() => {
      actor = new ActorQuerySourceIdentifyCompositeFile({
        name: 'actor',
        bus,
        mediatorQuerySourceIdentify,
        mediatorMergeBindingsContext,
      });
    });

    describe('test', () => {
      it('should test on compositefile type with array value', async() => {
        await expect(actor.test({
          querySourceUnidentified: {
            type: 'compositefile',
            value: [ 'http://example.org/file1.ttl', 'http://example.org/file2.ttl' ],
          },
          context: new ActionContext(),
        })).resolves.toPassTestVoid();
      });

      it('should not test on non-compositefile type', async() => {
        await expect(actor.test({
          querySourceUnidentified: {
            type: 'file',
            value: 'http://example.org/file1.ttl',
          },
          context: new ActionContext(),
        })).resolves.toFailTest(
          `actor requires a single query source with compositefile type to be present in the context.`,
        );
      });

      it('should not test when type is missing', async() => {
        await expect(actor.test({
          querySourceUnidentified: {
            value: 'http://example.org/file1.ttl',
          },
          context: new ActionContext(),
        })).resolves.toFailTest(
          `actor requires a single query source with compositefile type to be present in the context.`,
        );
      });

      it('should not test when value is not an array', async() => {
        await expect(actor.test({
          querySourceUnidentified: {
            type: 'compositefile',
            value: <any> 'http://example.org/file1.ttl',
          },
          context: new ActionContext(),
        })).resolves.toFailTest(`actor requires a compositefile source with an array of file URLs as value.`);
      });

      it('should not test on sparql type', async() => {
        await expect(actor.test({
          querySourceUnidentified: {
            type: 'sparql',
            value: 'http://example.org/sparql',
          },
          context: new ActionContext(),
        })).resolves.toFailTest(
          `actor requires a single query source with compositefile type to be present in the context.`,
        );
      });
    });

    describe('run', () => {
      it('should combine quads from multiple file sources', async() => {
        const context = new ActionContext({
          '@comunica/actor-init-query:dataFactory': DF,
        });

        const result = await actor.run({
          querySourceUnidentified: {
            type: 'compositefile',
            value: [ 'http://example.org/file1.ttl', 'http://example.org/file2.ttl' ],
          },
          context,
        });

        const { source } = result.querySource;
        expect(source).toBeInstanceOf(QuerySourceRdfJs);
        expect(source.referenceValue).toBe('http://example.org/file1.ttl\nhttp://example.org/file2.ttl');
        expect(source.toString()).toBe(`QuerySourceRdfJs(http://example.org/file1.ttl,http://example.org/file2.ttl)`);

        const stream = source.queryBindings(AF.createPattern(v1, v2, v3), context);
        await expect(new Promise((resolve, reject) => {
          stream.getProperty('metadata', resolve);
          stream.on('error', reject);
        })).resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'exact', value: 2 },
          availableOrders: undefined,
          order: undefined,
          variables: [
            { variable: v1, canBeUndef: false },
            { variable: v2, canBeUndef: false },
            { variable: v3, canBeUndef: false },
          ],
          requestTime: 0,
        });
        await expect(stream).toEqualBindingsStream([
          BF.fromRecord({ v1: DF.namedNode('ex:s1'), v2: DF.namedNode('ex:p1'), v3: DF.namedNode('ex:o1') }),
          BF.fromRecord({ v1: DF.namedNode('ex:s2'), v2: DF.namedNode('ex:p2'), v3: DF.namedNode('ex:o2') }),
        ]);
      });

      it('should use context from compositefile source', async() => {
        const sourceContext = new ActionContext({ myKey: 'myValue' });
        const context = new ActionContext({
          '@comunica/actor-init-query:dataFactory': DF,
        });

        const result = await actor.run({
          querySourceUnidentified: {
            type: 'compositefile',
            value: [ 'http://example.org/file1.ttl' ],
            context: sourceContext,
          },
          context,
        });

        expect(result.querySource.context).toBe(sourceContext);
      });

      it('should have undefined context if not set', async() => {
        const context = new ActionContext({
          '@comunica/actor-init-query:dataFactory': DF,
        });

        const result = await actor.run({
          querySourceUnidentified: {
            type: 'compositefile',
            value: [ 'http://example.org/file1.ttl' ],
          },
          context,
        });

        expect(result.querySource.context).toBeUndefined();
      });

      it('should handle a single file source', async() => {
        const context = new ActionContext({
          '@comunica/actor-init-query:dataFactory': DF,
        });

        const result = await actor.run({
          querySourceUnidentified: {
            type: 'compositefile',
            value: [ 'http://example.org/file1.ttl' ],
          },
          context,
        });

        const { source } = result.querySource;
        const stream = source.queryBindings(AF.createPattern(v1, v2, v3), context);
        await expect(stream).toEqualBindingsStream([
          BF.fromRecord({ v1: DF.namedNode('ex:s1'), v2: DF.namedNode('ex:p1'), v3: DF.namedNode('ex:o1') }),
        ]);
      });

      it('should handle an empty file list', async() => {
        const context = new ActionContext({
          '@comunica/actor-init-query:dataFactory': DF,
        });

        const result = await actor.run({
          querySourceUnidentified: {
            type: 'compositefile',
            value: [],
          },
          context,
        });

        const { source } = result.querySource;
        const stream = source.queryBindings(AF.createPattern(v1, v2, v3), context);
        await expect(stream).toEqualBindingsStream([]);
      });
    });
  });
});
