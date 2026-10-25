import 'jest-rdf';
import { Readable } from 'node:stream';
import { Worker } from 'node:worker_threads';
import type { IActorDereferenceRdfOutput } from '@comunica/bus-dereference-rdf';
import { KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { PassThrough } from 'readable-stream';
import { streamifyArray } from 'streamify-array';
import { QuerySourceQpf } from '../lib/QuerySourceQpf';
import '@comunica/utils-jest';

const quad = require('rdf-quad');

const DF = new DataFactory();
const AF = new AlgebraFactory();
const BF = new BindingsFactory(DF);
const v1 = DF.variable('v1');
const v2 = DF.variable('v2');
const v3 = DF.variable('v3');
const v4 = DF.variable('v4');
const pAllQuad = AF.createPattern(v1, v2, v3, v4);
const pAllTriple = AF.createPattern(v1, v2, v3);

describe('QuerySourceQpf', () => {
  let metadata: any;
  let mediatorMetadata: any;
  let mediatorMetadataExtract: any;
  let mediatorDereferenceRdf: any;
  let ctx: IActionContext;

  let S: RDF.Term;
  let P: RDF.Term;
  let O: RDF.Term;
  let G: RDF.Term;

  beforeEach(() => {
    mediatorMetadata = {
      async mediate(args: any) {
        const data = new PassThrough({ objectMode: true });
        const metadataStream = new PassThrough({ objectMode: true });
        args.quads.pipe(data);
        args.quads.pipe(metadataStream);
        args.quads.on('error', (error: any) => metadataStream.emit('error', error));
        return { data, metadata: metadataStream };
      },
    };
    mediatorMetadataExtract = {
      mediate: (action: any) => new Promise((resolve, reject) => {
        action.metadata.on('data', () => {
          // This is just here to kickstart the stream
        });
        action.metadata.on('error', reject);
        action.metadata.on('end', () => resolve({
          metadata: { next: 'NEXT', cardinality: { type: 'exact', value: 2 }},
        }));
      }),
    };
    mediatorDereferenceRdf = {
      mediate: jest.fn((args: any) => Promise.resolve({
        url: args.url,
        data: streamifyArray([
          quad('s1', 'p1', 'o1'),
          quad('s2', 'p2', 'o2'),
        ]),
        metadata: { triples: false },
      })),
    };

    metadata = {
      searchForms: {
        values: [
          {
            getUri: (entries: any) => `${entries.s || '_'},${entries.p || '_'},${entries.o || '_'
            },${entries.g || '_'}`,
            mappings: {
              g: 'G',
              o: 'O',
              p: 'P',
              s: 'S',
            },
          },
        ],
      },
      cardinality: { type: 'exact', value: 2 },
    };
    ctx = new ActionContext();

    S = DF.namedNode('S');
    P = DF.namedNode('P');
    O = DF.namedNode('O');
    G = DF.namedNode('G');
  });

  describe('without a default graph', () => {
    let source: QuerySourceQpf;
    beforeEach(() => {
      source = new QuerySourceQpf(
        mediatorMetadata,
        mediatorMetadataExtract,
        mediatorDereferenceRdf,
        DF,
        AF,
        BF,
        's',
        'p',
        'o',
        'g',
        'url',
        metadata,
        false,
        streamifyArray([
          quad('s1', 'p1', 'o1'),
          quad('s2', 'p2', 'o2'),
        ]),
      );
    });

    describe('#constructor', () => {
      it('should be a function', () => {
        expect(QuerySourceQpf).toBeInstanceOf(Function);
      });

      it('should be constructable without initialQuads', () => {
        const s = new QuerySourceQpf(
          mediatorMetadata,
          mediatorMetadataExtract,
          mediatorDereferenceRdf,
          DF,
          AF,
          BF,
          'o',
          'p',
          's',
          'g',
          'url',
          metadata,
          false,
          undefined,
        );
        expect(s).toBeInstanceOf(QuerySourceQpf);
        expect((<any> s).initialQuads).toBeFalsy();
      });

      it('should invoke a subclass cacheQuads override during initialization', async() => {
        const cacheHook = jest.fn();
        class CustomQuerySourceQpf extends QuerySourceQpf {
          protected override cacheQuads(
            quads: AsyncIterator<RDF.Quad>,
            subject: RDF.Term,
            predicate: RDF.Term,
            object: RDF.Term,
            graph: RDF.Term,
          ): void {
            cacheHook(quads, subject, predicate, object, graph);
            super.cacheQuads(quads, subject, predicate, object, graph);
          }
        }
        const initialQuad = quad('s1', 'p1', 'o1', 'g1');
        const s = new CustomQuerySourceQpf(
          mediatorMetadata,
          mediatorMetadataExtract,
          mediatorDereferenceRdf,
          DF,
          AF,
          BF,
          's',
          'p',
          'o',
          'g',
          'url',
          metadata,
          false,
          streamifyArray([ initialQuad ]),
        );
        expect(cacheHook).toHaveBeenCalledTimes(1);
        expect(cacheHook).toHaveBeenCalledWith(
          expect.anything(),
          DF.variable(''),
          DF.variable(''),
          DF.variable(''),
          DF.variable(''),
        );
        await expect(s.queryBindings(pAllQuad, ctx).toArray()).resolves.toEqual([
          BF.fromRecord({
            v1: initialQuad.subject,
            v2: initialQuad.predicate,
            v3: initialQuad.object,
            v4: initialQuad.graph,
          }),
        ]);
        expect(mediatorDereferenceRdf.mediate).not.toHaveBeenCalled();
      });

      it('should be constructable with initialQuads', async() => {
        const s = new QuerySourceQpf(
          mediatorMetadata,
          mediatorMetadataExtract,
          mediatorDereferenceRdf,
          DF,
          AF,
          BF,
          'o',
          'p',
          's',
          'g',
          'url',
          metadata,
          false,
          streamifyArray([
            quad('s1', 'p1', 'o1'),
            quad('s2', 'p2', 'o2'),
          ]),
        );
        expect(s).toBeInstanceOf(QuerySourceQpf);
        await expect(arrayifyStream((<any> s).getCachedQuads(v1, v1, v1, v1))).resolves.toBeRdfIsomorphic([
          quad('s1', 'p1', 'o1'),
          quad('s2', 'p2', 'o2'),
        ]);
      });
    });

    describe('getFilterFactor', () => {
      it('should return 1', async() => {
        await expect(source.getFilterFactor()).resolves.toBe(1);
      });
    });

    describe('getSelectorShape', () => {
      it('should return a tpf shape', async() => {
        await expect(source.getSelectorShape()).resolves.toEqual({
          type: 'operation',
          operation: {
            operationType: 'pattern',
            pattern: AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.variable('g')),
          },
          variablesOptional: [
            DF.variable('s'),
            DF.variable('p'),
            DF.variable('o'),
            DF.variable('g'),
          ],
        });
      });
    });

    describe('getSearchForm', () => {
      it('should return a searchForm', () => {
        expect(source.getSearchForm(metadata)).toEqual(metadata.searchForms.values[0]);
      });

      it('should return a searchForm without graph', () => {
        metadata = {
          searchForms: {
            values: [
              {
                getUri: (entries: any) => `${entries.s || '_'},${entries.p || '_'},${entries.o || '_'
                },${entries.g || '_'}`,
                mappings: {
                  o: 'O',
                  p: 'P',
                  s: 'S',
                },
              },
            ],
          },
        };
        expect(source.getSearchForm(metadata)).toEqual(metadata.searchForms.values[0]);
      });

      it('should return null when no valid mappings are present', () => {
        metadata = {
          searchForms: {
            values: [
              {
                mappings: {},
              },
            ],
          },
        };
        expect(source.getSearchForm(metadata)).toBeUndefined();
      });

      it('should return null when no values are present', () => {
        metadata = {
          searchForms: {},
        };
        expect(source.getSearchForm(metadata)).toBeUndefined();
      });

      it('should return null when no search forms are present', () => {
        metadata = {};
        expect(source.getSearchForm(metadata)).toBeUndefined();
      });
    });

    describe('getPatternId', () => {
      it('for default graph', () => {
        expect(source.getPatternId(DF.defaultGraph(), DF.defaultGraph(), DF.defaultGraph(), DF.defaultGraph()))
          .toBe(`{"s":"|","p":"|","o":"|","g":"|"}`);
      });
    });

    describe('createFragmentUri', () => {
      it('should create a valid fragment URI with materialized terms', () => {
        expect(source.createFragmentUri(
          metadata.searchForms.values[0],
          DF.namedNode('S'),
          DF.namedNode('P'),
          DF.namedNode('O'),
          DF.namedNode('G'),
        ))
          .toBe('S,P,O,G');
      });

      it('should create a valid fragment URI with materialized quoted triple terms', () => {
        expect(source.createFragmentUri(metadata.searchForms.values[0], DF.quad(
          DF.namedNode('S'),
          DF.namedNode('P'),
          DF.namedNode('O'),
        ), DF.namedNode('P'), DF.namedNode('O'), DF.namedNode('G')))
          .toBe('<<S P O>>,P,O,G');
      });

      it('should create a valid fragment URI with only a few materialized terms', () => {
        expect(source.createFragmentUri(metadata.searchForms.values[0], v1, DF.namedNode('P'), v1, DF.namedNode('G')))
          .toBe('_,P,_,G');
      });

      it('should create a valid fragment URI with quoted triple terms with variables', () => {
        expect(source.createFragmentUri(metadata.searchForms.values[0], DF.quad(
          DF.namedNode('S'),
          v1,
          DF.namedNode('O'),
        ), DF.namedNode('P'), DF.namedNode('O'), DF.namedNode('G')))
          .toBe('_,P,O,G');
      });
    });

    describe('queryBindings', () => {
      it('should return a copy of the initial quads for the empty quad pattern with union default graph', async() => {
        ctx = ctx.set(KeysQueryOperation.unionDefaultGraph, true);
        await expect(source.queryBindings(pAllQuad, ctx)).toEqualBindingsStream([
          BF.fromRecord({
            v1: DF.namedNode('s1'),
            v2: DF.namedNode('p1'),
            v3: DF.namedNode('o1'),
            v4: DF.defaultGraph(),
          }),
          BF.fromRecord({
            v1: DF.namedNode('s2'),
            v2: DF.namedNode('p2'),
            v3: DF.namedNode('o2'),
            v4: DF.defaultGraph(),
          }),
        ]);
      });

      it('should return no quads for the empty quad pattern without union default graph', async() => {
        await expect(source.queryBindings(pAllQuad, ctx)).toEqualBindingsStream([]);
      });

      it('should return a copy of the initial quads for the empty triple pattern with union default graph', async() => {
        ctx = ctx.set(KeysQueryOperation.unionDefaultGraph, true);
        await expect(source.queryBindings(pAllTriple, ctx)).toEqualBindingsStream([
          BF.fromRecord({
            v1: DF.namedNode('s1'),
            v2: DF.namedNode('p1'),
            v3: DF.namedNode('o1'),
          }),
          BF.fromRecord({
            v1: DF.namedNode('s2'),
            v2: DF.namedNode('p2'),
            v3: DF.namedNode('o2'),
          }),
        ]);
      });

      it('should return no quads for the empty triple pattern without union default graph', async() => {
        await expect(source.queryBindings(pAllTriple, ctx)).toEqualBindingsStream([]);
      });

      it('should emit metadata for the empty quad pattern with union default graph', async() => {
        ctx = ctx.set(KeysQueryOperation.unionDefaultGraph, true);
        const output = source.queryBindings(pAllQuad, ctx);
        const metadataPromise = new Promise(resolve => output.getProperty('metadata', resolve));
        await expect(metadataPromise).resolves.toEqual({
          availableOrders: undefined,
          order: undefined,
          searchForms: {
            values: [
              {
                getUri: expect.anything(),
                mappings: {
                  g: 'G',
                  o: 'O',
                  p: 'P',
                  s: 'S',
                },
              },
            ],
          },
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'exact', value: 2 },
          variables: [
            { variable: DF.variable('v1'), canBeUndef: false },
            { variable: DF.variable('v2'), canBeUndef: false },
            { variable: DF.variable('v3'), canBeUndef: false },
            { variable: DF.variable('v4'), canBeUndef: false },
          ],
        });
      });

      it('should emit metadata for the empty quad pattern without union default graph', async() => {
        const output = source.queryBindings(pAllQuad, ctx);
        const metadataPromise = new Promise(resolve => output.getProperty('metadata', resolve));
        await expect(metadataPromise).resolves.toEqual({
          availableOrders: undefined,
          order: undefined,
          searchForms: {
            values: [
              {
                getUri: expect.anything(),
                mappings: {
                  g: 'G',
                  o: 'O',
                  p: 'P',
                  s: 'S',
                },
              },
            ],
          },
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: 2 },
          variables: [
            { variable: DF.variable('v1'), canBeUndef: false },
            { variable: DF.variable('v2'), canBeUndef: false },
            { variable: DF.variable('v3'), canBeUndef: false },
            { variable: DF.variable('v4'), canBeUndef: false },
          ],
        });
      });

      it('should emit metadata for the empty triple pattern with union default graph', async() => {
        ctx = ctx.set(KeysQueryOperation.unionDefaultGraph, true);
        const output = source.queryBindings(pAllTriple, ctx);
        const metadataPromise = new Promise(resolve => output.getProperty('metadata', resolve));
        await expect(metadataPromise).resolves.toEqual({
          availableOrders: undefined,
          order: undefined,
          searchForms: {
            values: [
              {
                getUri: expect.anything(),
                mappings: {
                  g: 'G',
                  o: 'O',
                  p: 'P',
                  s: 'S',
                },
              },
            ],
          },
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'exact', value: 2 },
          variables: [
            { variable: DF.variable('v1'), canBeUndef: false },
            { variable: DF.variable('v2'), canBeUndef: false },
            { variable: DF.variable('v3'), canBeUndef: false },
          ],
        });
      });

      it('should emit metadata for the empty triple pattern without union default graph', async() => {
        const output = source.queryBindings(pAllTriple, ctx);
        const metadataPromise = new Promise(resolve => output.getProperty('metadata', resolve));
        await expect(metadataPromise).resolves.toEqual({
          availableOrders: undefined,
          order: undefined,
          first: null,
          next: null,
          last: null,
          requestTime: 0,
          cardinality: { type: 'exact', value: 0 },
          variables: [
            { variable: DF.variable('v1'), canBeUndef: false },
            { variable: DF.variable('v2'), canBeUndef: false },
            { variable: DF.variable('v3'), canBeUndef: false },
          ],
          state: expect.any(MetadataValidationState),
        });
      });

      it('[TPF] should return a copy of the initial quads for the empty pattern with the default graph', async() => {
        metadata = {
          searchForms: {
            values: [
              {
                getUri: (entries: any) => `${entries.s || '_'},${entries.p || '_'},${entries.o || '_'}`,
                mappings: {
                  o: 'O',
                  p: 'P',
                  s: 'S',
                },
              },
            ],
          },
          cardinality: { type: 'exact', value: 2 },
        };

        source = new QuerySourceQpf(
          mediatorMetadata,
          mediatorMetadataExtract,
          mediatorDereferenceRdf,
          DF,
          AF,
          BF,
          's',
          'p',
          'o',
          undefined,
          'url',
          metadata,
          false,
          streamifyArray([
            quad('s1', 'p1', 'o1'),
            quad('s2', 'p2', 'o2'),
          ]),
        );

        await expect(source.queryBindings(pAllTriple, ctx)).toEqualBindingsStream([
          BF.fromRecord({
            v1: DF.namedNode('s1'),
            v2: DF.namedNode('p1'),
            v3: DF.namedNode('o1'),
          }),
          BF.fromRecord({
            v1: DF.namedNode('s2'),
            v2: DF.namedNode('p2'),
            v3: DF.namedNode('o2'),
          }),
        ]);
      });

      it('[QPF] should not return any quads if defaultGraph URI is not provided', async() => {
        await expect(source.queryBindings(
          AF.createPattern(v1, v2, v3),
          ctx,
        )).toEqualBindingsStream([]);
      });

      it('should return multiple copies of the initial quads for the empty pattern', async() => {
        ctx = ctx.set(KeysQueryOperation.unionDefaultGraph, true);
        await expect(source.queryBindings(pAllQuad, ctx)).toEqualBindingsStream([
          BF.fromRecord({
            v1: DF.namedNode('s1'),
            v2: DF.namedNode('p1'),
            v3: DF.namedNode('o1'),
            v4: DF.defaultGraph(),
          }),
          BF.fromRecord({
            v1: DF.namedNode('s2'),
            v2: DF.namedNode('p2'),
            v3: DF.namedNode('o2'),
            v4: DF.defaultGraph(),
          }),
        ]);
        await expect(source.queryBindings(pAllQuad, ctx)).toEqualBindingsStream([
          BF.fromRecord({
            v1: DF.namedNode('s1'),
            v2: DF.namedNode('p1'),
            v3: DF.namedNode('o1'),
            v4: DF.defaultGraph(),
          }),
          BF.fromRecord({
            v1: DF.namedNode('s2'),
            v2: DF.namedNode('p2'),
            v3: DF.namedNode('o2'),
            v4: DF.defaultGraph(),
          }),
        ]);
        await expect(source.queryBindings(pAllQuad, ctx)).toEqualBindingsStream([
          BF.fromRecord({
            v1: DF.namedNode('s1'),
            v2: DF.namedNode('p1'),
            v3: DF.namedNode('o1'),
            v4: DF.defaultGraph(),
          }),
          BF.fromRecord({
            v1: DF.namedNode('s2'),
            v2: DF.namedNode('p2'),
            v3: DF.namedNode('o2'),
            v4: DF.defaultGraph(),
          }),
        ]);
      });

      it('should handle a non-empty pattern and filter only matching quads', async() => {
        ctx = ctx.set(KeysQueryOperation.unionDefaultGraph, true);
        await expect(source.queryBindings(
          AF.createPattern(DF.namedNode('s1'), v1, DF.namedNode('o1'), v2),
          ctx,
        ))
          .toEqualBindingsStream([
            BF.fromRecord({
              v1: DF.namedNode('p1'),
              v2: DF.defaultGraph(),
            }),
          ]);
        await expect(source.queryBindings(
          AF.createPattern(DF.namedNode('s2'), v1, DF.namedNode('o2'), v2),
          ctx,
        ))
          .toEqualBindingsStream([
            BF.fromRecord({
              v1: DF.namedNode('p2'),
              v2: DF.defaultGraph(),
            }),
          ]);
        await expect(source.queryBindings(
          AF.createPattern(DF.namedNode('s3'), v1, DF.namedNode('o3'), v2),
          ctx,
        ))
          .toEqualBindingsStream([]);
      });

      it('should emit metadata for a non-empty pattern', async() => {
        ctx = ctx.set(KeysQueryOperation.unionDefaultGraph, true);
        const output = source.queryBindings(AF.createPattern(DF.namedNode('s1'), v1, DF.namedNode('o1'), v2), ctx);
        const metadataPromise = new Promise(resolve => output.getProperty('metadata', resolve));
        await expect(metadataPromise).resolves.toEqual({
          availableOrders: undefined,
          next: 'NEXT',
          subsetOf: 'url',
          cardinality: { type: 'exact', value: 2 },
          order: undefined,
          state: expect.any(MetadataValidationState),
          variables: [{ variable: v1, canBeUndef: false }, { variable: v2, canBeUndef: false }],
        });
      });

      it('should emit metadata for an non-empty pattern without union default graph', async() => {
        const output = source.queryBindings(AF.createPattern(DF.namedNode('s1'), v1, DF.namedNode('o1'), v2), ctx);
        const metadataPromise = new Promise(resolve => output.getProperty('metadata', resolve));
        await expect(metadataPromise).resolves.toEqual({
          availableOrders: undefined,
          next: 'NEXT',
          subsetOf: 'url',
          cardinality: { type: 'estimate', value: 2 },
          order: undefined,
          state: expect.any(MetadataValidationState),
          variables: [{ variable: v1, canBeUndef: false }, { variable: v2, canBeUndef: false }],
        });
      });

      it('should handle a pattern with variables that occur multiple times in the quad pattern', async() => {
        // Reset cache, as we're not calling the mediator below otherwise.
        (<any> source).cachedQuads = {};

        mediatorDereferenceRdf.mediate = (args: any) => Promise.resolve({
          url: args.url,
          data: streamifyArray([
            quad('s1', 'p1', 'o1'),
            quad('s2', 'p2', 'o2'),
            quad('t', 'p2', 't'),
          ]),
          metadata: { triples: false },
        });

        ctx = ctx.set(KeysQueryOperation.unionDefaultGraph, true);
        await expect(source.queryBindings(
          AF.createPattern(v1, v2, v1, v4),
          ctx,
        )).toEqualBindingsStream([
          BF.fromRecord({
            v1: DF.namedNode('t'),
            v2: DF.namedNode('p2'),
            v4: DF.defaultGraph(),
          }),
        ]);
      });

      it('should handle a pattern with variables that occur multiple times in the triple pattern', async() => {
        // Reset cache, as we're not calling the mediator below otherwise.
        (<any> source).cachedQuads = {};

        mediatorDereferenceRdf.mediate = (args: any) => Promise.resolve({
          url: args.url,
          data: streamifyArray([
            quad('s1', 'p1', 'o1'),
            quad('s2', 'p2', 'o2'),
            quad('t', 'p2', 't'),
          ]),
          metadata: { triples: false },
        });

        ctx = ctx.set(KeysQueryOperation.unionDefaultGraph, true);
        await expect(source.queryBindings(
          AF.createPattern(v1, v2, v1),
          ctx,
        )).toEqualBindingsStream([
          BF.fromRecord({
            v1: DF.namedNode('t'),
            v2: DF.namedNode('p2'),
          }),
        ]);
      });

      it('should delegate errors from the RDF dereference stream', async() => {
        const quads = new Readable();
        quads._read = () => {
          quads.emit('error', error);
        };
        mediatorDereferenceRdf.mediate = (args: any) => Promise.resolve({
          url: args.url,
          data: quads,
          metadata: { triples: false },
        });

        const error = new Error('a');
        await new Promise<void>((resolve, reject) => {
          const output = source.queryBindings(AF.createPattern(S, P, O, G), ctx);
          output.on('error', (e) => {
            expect(e).toEqual(error);
            resolve();
          });
          output.on('data', reject);
          output.on('end', reject);
        });
      });

      it('should delegate errors from the metadata split stream', async() => {
        const quads = new Readable();
        quads._read = () => {
          quads.emit('error', error);
        };
        mediatorMetadata.mediate = () => Promise.resolve({
          data: quads,
          metadata: quads,
        });

        const error = new Error('a');
        await new Promise<void>((resolve, reject) => {
          const output = source.queryBindings(AF.createPattern(S, P, O, G), ctx);
          output.on('error', (e) => {
            expect(e).toEqual(error);
            resolve();
          });
          output.on('data', reject);
          output.on('end', reject);
        });
      });

      it('should ignore errors from the metadata extract mediator', async() => {
        mediatorMetadataExtract.mediate = () => Promise.reject(new Error('abc'));
        ctx = ctx.set(KeysQueryOperation.unionDefaultGraph, true);
        await expect(source.queryBindings(pAllTriple, ctx)).toEqualBindingsStream([
          BF.fromRecord({
            v1: DF.namedNode('s1'),
            v2: DF.namedNode('p1'),
            v3: DF.namedNode('o1'),
          }),
          BF.fromRecord({
            v1: DF.namedNode('s2'),
            v2: DF.namedNode('p2'),
            v3: DF.namedNode('o2'),
          }),
        ]);
      });

      it('throws for non-pattern operations', () => {
        expect(() => source.queryBindings(AF.createNop(), ctx))
          .toThrow(`Attempted to pass non-pattern operation 'nop' to QuerySourceQpf`);
      });
    });

    describe('queryQuads', () => {
      it('throws', () => {
        expect(() => source.queryQuads(<any> undefined, ctx)).toThrow(`queryQuads is not implemented in QuerySourceQpf`);
      });
    });

    describe('queryBoolean', () => {
      it('throws', () => {
        expect(() => source.queryBoolean(<any> undefined, ctx)).toThrow(`queryBoolean is not implemented in QuerySourceQpf`);
      });
    });

    describe('queryVoid', () => {
      it('throws', () => {
        expect(() => source.queryVoid(<any> undefined, ctx)).toThrow(`queryVoid is not implemented in QuerySourceQpf`);
      });
    });
  });

  describe('with filterBindings', () => {
    let source: QuerySourceQpf;
    beforeEach(() => {
      source = new QuerySourceQpf(
        mediatorMetadata,
        mediatorMetadataExtract,
        mediatorDereferenceRdf,
        DF,
        AF,
        BF,
        's',
        'p',
        'o',
        'g',
        'url',
        metadata,
        true,
        streamifyArray([
          quad('s1', 'p1', 'o1'),
          quad('s2', 'p2', 'o2'),
        ]),
      );
    });

    describe('getSelectorShape', () => {
      it('should return a br filter', async() => {
        await expect(source.getSelectorShape()).resolves.toEqual({
          type: 'operation',
          operation: {
            operationType: 'pattern',
            pattern: AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.variable('g')),
          },
          variablesOptional: [
            DF.variable('s'),
            DF.variable('p'),
            DF.variable('o'),
            DF.variable('g'),
          ],
          filterBindings: true,
        });
      });
    });

    describe('getBindingsRestrictedLink', () => {
      it('handles an empty filter', async() => {
        await expect(source.getBindingsRestrictedLink(
          DF.namedNode('s'),
          DF.namedNode('p'),
          DF.namedNode('o'),
          DF.namedNode('g'),
          'url',
          {
            bindings: new ArrayIterator<RDF.Bindings>([], { autoStart: false }),
            metadata: <any> { variables: [
              { variable: DF.variable('f1'), canBeUndef: false },
              { variable: DF.variable('f2'), canBeUndef: false },
            ]},
          },
        )).resolves.toBe(`url&values=(%3Ff1%20%3Ff2)%20%7B%20(%3Cex%3Acomunica%3Aunknown%3E)%20%7D`);
      });

      it('handles a non-empty filter', async() => {
        await expect(source.getBindingsRestrictedLink(
          DF.namedNode('s'),
          DF.namedNode('p'),
          DF.namedNode('o'),
          DF.namedNode('g'),
          'url',
          {
            bindings: new ArrayIterator<RDF.Bindings>([
              BF.fromRecord({
                f1: DF.namedNode('a1'),
              }),
              BF.fromRecord({
                f2: DF.namedNode('a2'),
              }),
            ], { autoStart: false }),
            metadata: <any> { variables: [
              { variable: DF.variable('f1'), canBeUndef: false },
              { variable: DF.variable('f2'), canBeUndef: false },
            ]},
          },
        )).resolves.toBe(`url&values=(%3Ff1%20%3Ff2)%20%7B%20(%3Ca1%3E%20UNDEF%20)%20(UNDEF%20%3Ca2%3E%20)%20%7D`);
      });
    });

    describe('createFragmentUri', () => {
      it('should create a valid fragment URI with materialized terms', () => {
        expect(source.createFragmentUri(
          metadata.searchForms.values[0],
          DF.namedNode('S'),
          DF.namedNode('P'),
          DF.namedNode('O'),
          DF.namedNode('G'),
        ))
          .toBe('S,P,O,G');
      });

      it('should create a valid fragment URI with materialized quoted triple terms', () => {
        expect(source.createFragmentUri(metadata.searchForms.values[0], DF.quad(
          DF.namedNode('S'),
          DF.namedNode('P'),
          DF.namedNode('O'),
        ), DF.namedNode('P'), DF.namedNode('O'), DF.namedNode('G')))
          .toBe('<<S P O>>,P,O,G');
      });

      it('should create a valid fragment URI with only a few materialized terms', () => {
        expect(source.createFragmentUri(metadata.searchForms.values[0], v1, DF.namedNode('P'), v1, DF.namedNode('G')))
          .toBe('?v1,P,?v1,G');
      });

      it('should create a valid fragment URI with quoted triple terms with variables', () => {
        expect(source.createFragmentUri(metadata.searchForms.values[0], DF.quad(
          DF.namedNode('S'),
          v1,
          DF.namedNode('O'),
        ), DF.namedNode('P'), DF.namedNode('O'), DF.namedNode('G')))
          .toBe('<<S ?v1 O>>,P,O,G');
      });
    });

    describe('queryBindings', () => {
      it('should handle no filtering', async() => {
        ctx = ctx.set(KeysQueryOperation.unionDefaultGraph, true);
        await expect(source.queryBindings(pAllQuad, ctx)).toEqualBindingsStream([
          BF.fromRecord({
            v1: DF.namedNode('s1'),
            v2: DF.namedNode('p1'),
            v3: DF.namedNode('o1'),
            v4: DF.defaultGraph(),
          }),
          BF.fromRecord({
            v1: DF.namedNode('s2'),
            v2: DF.namedNode('p2'),
            v3: DF.namedNode('o2'),
            v4: DF.defaultGraph(),
          }),
        ]);
      });

      it('should delegate errors from the RDF dereference stream', async() => {
        const quads = new Readable();
        quads._read = () => {
          quads.emit('error', error);
        };
        mediatorDereferenceRdf.mediate = (args: any) => Promise.resolve({
          url: args.url,
          data: quads,
          metadata: { triples: false },
        });

        const error = new Error('a');
        await new Promise<void>((resolve, reject) => {
          const output = source.queryBindings(AF.createPattern(S, P, O, G), ctx);
          output.on('error', (e) => {
            expect(e).toEqual(error);
            resolve();
          });
          output.on('data', reject);
          output.on('end', reject);
        });
      });

      it('should delegate errors from the metadata split stream', async() => {
        const quads = new Readable();
        quads._read = () => {
          quads.emit('error', error);
        };
        mediatorMetadata.mediate = () => Promise.resolve({
          data: quads,
          metadata: quads,
        });

        const error = new Error('a');
        await new Promise<void>((resolve, reject) => {
          const output = source.queryBindings(AF.createPattern(S, P, O, G), ctx);
          output.on('error', (e) => {
            expect(e).toEqual(error);
            resolve();
          });
          output.on('data', reject);
          output.on('end', reject);
        });
      });

      it('should ignore errors from the metadata extract mediator', async() => {
        mediatorMetadataExtract.mediate = () => Promise.reject(new Error('abc'));
        ctx = ctx.set(KeysQueryOperation.unionDefaultGraph, true);
        await expect(source.queryBindings(pAllTriple, ctx)).toEqualBindingsStream([
          BF.fromRecord({
            v1: DF.namedNode('s1'),
            v2: DF.namedNode('p1'),
            v3: DF.namedNode('o1'),
          }),
          BF.fromRecord({
            v1: DF.namedNode('s2'),
            v2: DF.namedNode('p2'),
            v3: DF.namedNode('o2'),
          }),
        ]);
      });

      it('should handle an empty filter', async() => {
        ctx = ctx.set(KeysQueryOperation.unionDefaultGraph, true);
        const filterBindings: any = {
          bindings: new ArrayIterator([], { autoStart: false }),
          metadata: { variables: [
            { variable: DF.variable('f1'), canBeUndef: false },
            { variable: DF.variable('f2'), canBeUndef: false },
          ]},
        };
        await expect(source.queryBindings(pAllQuad, ctx, { filterBindings })).toEqualBindingsStream([
          BF.fromRecord({
            v1: DF.namedNode('s1'),
            v2: DF.namedNode('p1'),
            v3: DF.namedNode('o1'),
            v4: DF.defaultGraph(),
          }),
          BF.fromRecord({
            v1: DF.namedNode('s2'),
            v2: DF.namedNode('p2'),
            v3: DF.namedNode('o2'),
            v4: DF.defaultGraph(),
          }),
        ]);

        expect(mediatorDereferenceRdf.mediate).toHaveBeenCalledWith({
          context: ctx,
          url: '?v1,?v2,?v3,?v4&values=(%3Ff1%20%3Ff2)%20%7B%20(%3Cex%3Acomunica%3Aunknown%3E)%20%7D',
        });
      });
    });
  });

  describe('with a custom default graph', () => {
    let source: QuerySourceQpf;
    beforeEach(() => {
      mediatorDereferenceRdf = {
        mediate: (args: any): Promise<IActorDereferenceRdfOutput> => Promise.resolve({
          url: args.url,
          data: <any> streamifyArray([
            quad('s1', 'p1', 'o1', 'DEFAULT_GRAPH'),
            quad('s2', 'p2', 'o2', 'DEFAULT_GRAPH'),
            quad('s1', 'p3', 'o1', 'CUSTOM_GRAPH'),
            quad('s2', 'p4', 'o2', 'CUSTOM_GRAPH'),
            quad('DEFAULT_GRAPH', 'defaultInSubject', 'o2', 'DEFAULT_GRAPH'),
            quad('s1-', 'actualDefaultGraph', 'o1'),
          ]),
          metadata: { triples: false },
          exists: true,
          requestTime: 0,
          status: 200,
        }),
      };
      ctx = new ActionContext();

      metadata = {
        cardinality: { type: 'estimate', value: '10' },
        defaultGraph: 'DEFAULT_GRAPH',
        searchForms: {
          values: [
            {
              getUri: (entries: any) => `${entries.s || '_'},${entries.p || '_'},${entries.o || '_'
              },${entries.g || '_'}`,
              mappings: {
                g: 'G',
                o: 'O',
                p: 'P',
                s: 'S',
              },
            },
          ],
        },
      };

      source = new QuerySourceQpf(
        mediatorMetadata,
        mediatorMetadataExtract,
        mediatorDereferenceRdf,
        DF,
        AF,
        BF,
        's',
        'p',
        'o',
        'g',
        'url',
        metadata,
        false,
        streamifyArray([
          quad('s1', 'p1', 'o1', 'DEFAULT_GRAPH'),
          quad('s2', 'p2', 'o2', 'DEFAULT_GRAPH'),
          quad('s1', 'p3', 'o1', 'CUSTOM_GRAPH'),
          quad('s2', 'p4', 'o2', 'CUSTOM_GRAPH'),
          quad('DEFAULT_GRAPH', 'defaultInSubject', 'o2', 'DEFAULT_GRAPH'),
          quad('s1-', 'actualDefaultGraph', 'o1'),
        ]),
      );
    });

    describe('queryBindings', () => {
      it('should return quads in the overridden default graph', async() => {
        await expect(source.queryBindings(
          AF.createPattern(DF.namedNode('s1'), v1, DF.namedNode('o1'), DF.defaultGraph()),
          ctx,
        ))
          .toEqualBindingsStream([
            BF.fromRecord({
              v1: DF.namedNode('p1'),
            }),
          ]);
        await expect(source.queryBindings(
          AF.createPattern(DF.namedNode('s2'), v1, DF.namedNode('o2'), DF.defaultGraph()),
          ctx,
        ))
          .toEqualBindingsStream([
            BF.fromRecord({
              v1: DF.namedNode('p2'),
            }),
          ]);
        await expect(source.queryBindings(
          AF.createPattern(DF.namedNode('s3'), v1, DF.namedNode('o3'), DF.defaultGraph()),
          ctx,
        ))
          .toEqualBindingsStream([]);
      });

      it('should return quads in all graphs with union default graph', async() => {
        ctx = ctx.set(KeysQueryOperation.unionDefaultGraph, true);

        await expect(source.queryBindings(
          AF.createPattern(DF.namedNode('s1'), v1, DF.namedNode('o1'), v2),
          ctx,
        ))
          .toEqualBindingsStream([
            BF.fromRecord({
              v1: DF.namedNode('p1'),
              v2: DF.defaultGraph(),
            }),
            BF.fromRecord({
              v1: DF.namedNode('p3'),
              v2: DF.namedNode('CUSTOM_GRAPH'),
            }),
          ]);
        await expect(source.queryBindings(
          AF.createPattern(DF.namedNode('s2'), v1, DF.namedNode('o2'), v2),
          ctx,
        ))
          .toEqualBindingsStream([
            BF.fromRecord({
              v1: DF.namedNode('p2'),
              v2: DF.defaultGraph(),
            }),
            BF.fromRecord({
              v1: DF.namedNode('p4'),
              v2: DF.namedNode('CUSTOM_GRAPH'),
            }),
          ]);
        await expect(source.queryBindings(
          AF.createPattern(DF.namedNode('s3'), v1, DF.namedNode('o3'), v2),
          ctx,
        ))
          .toEqualBindingsStream([]);
      });

      it('should return quads in the non-default graphs without union default graph', async() => {
        await expect(source.queryBindings(
          AF.createPattern(DF.namedNode('s1'), v1, DF.namedNode('o1'), v2),
          ctx,
        ))
          .toEqualBindingsStream([
            BF.fromRecord({
              v1: DF.namedNode('p3'),
              v2: DF.namedNode('CUSTOM_GRAPH'),
            }),
          ]);
        await expect(source.queryBindings(
          AF.createPattern(DF.namedNode('s2'), v1, DF.namedNode('o2'), v2),
          ctx,
        ))
          .toEqualBindingsStream([
            BF.fromRecord({
              v1: DF.namedNode('p4'),
              v2: DF.namedNode('CUSTOM_GRAPH'),
            }),
          ]);
        await expect(source.queryBindings(
          AF.createPattern(DF.namedNode('s3'), v1, DF.namedNode('o3'), v2),
          ctx,
        ))
          .toEqualBindingsStream([]);
      });

      it('should return quads in the default graph without union default graph', async() => {
        await expect(source.queryBindings(
          AF.createPattern(DF.namedNode('s1'), v1, DF.namedNode('o1'), DF.defaultGraph()),
          ctx,
        ))
          .toEqualBindingsStream([
            BF.fromRecord({
              v1: DF.namedNode('p1'),
            }),
          ]);
        await expect(source.queryBindings(
          AF.createPattern(DF.namedNode('s2'), v1, DF.namedNode('o2'), DF.defaultGraph()),
          ctx,
        ))
          .toEqualBindingsStream([
            BF.fromRecord({
              v1: DF.namedNode('p2'),
            }),
          ]);
        await expect(source.queryBindings(
          AF.createPattern(DF.namedNode('s3'), v1, DF.namedNode('o3'), DF.defaultGraph()),
          ctx,
        ))
          .toEqualBindingsStream([]);
      });

      it('should return quads in a custom graph', async() => {
        await expect(source.queryBindings(
          AF.createPattern(DF.namedNode('s1'), v1, DF.namedNode('o1'), DF.namedNode('CUSTOM_GRAPH')),
          ctx,
        ))
          .toEqualBindingsStream([
            BF.fromRecord({
              v1: DF.namedNode('p3'),
            }),
          ]);
        await expect(source.queryBindings(
          AF.createPattern(DF.namedNode('s2'), v1, DF.namedNode('o2'), DF.namedNode('CUSTOM_GRAPH')),
          ctx,
        ))
          .toEqualBindingsStream([
            BF.fromRecord({
              v1: DF.namedNode('p4'),
            }),
          ]);
        await expect(source.queryBindings(
          AF.createPattern(DF.namedNode('s3'), v1, DF.namedNode('o3'), DF.namedNode('CUSTOM_GRAPH')),
          ctx,
        ))
          .toEqualBindingsStream([]);
      });

      it('should not modify an overridden default graph in the subject position', async() => {
        ctx = ctx.set(KeysQueryOperation.unionDefaultGraph, true);

        await expect(source.queryBindings(
          AF.createPattern(v1, DF.namedNode('defaultInSubject'), v2, v3),
          ctx,
        ))
          .toEqualBindingsStream([
            BF.fromRecord({
              v1: DF.namedNode('DEFAULT_GRAPH'),
              v2: DF.namedNode('o2'),
              v3: DF.defaultGraph(),
            }),
          ]);
      });

      it('should also return triples from the actual default graph', async() => {
        ctx = ctx.set(KeysQueryOperation.unionDefaultGraph, true);

        await expect(source.queryBindings(
          AF.createPattern(v1, DF.namedNode('actualDefaultGraph'), v2, v3),
          ctx,
        ))
          .toEqualBindingsStream([
            BF.fromRecord({
              v1: DF.namedNode('s1-'),
              v2: DF.namedNode('o1'),
              v3: DF.defaultGraph(),
            }),
          ]);
        await expect(source.queryBindings(
          AF.createPattern(v1, DF.namedNode('actualDefaultGraph'), v2, DF.defaultGraph()),
          ctx,
        ))
          .toEqualBindingsStream([
            BF.fromRecord({
              v1: DF.namedNode('s1-'),
              v2: DF.namedNode('o1'),
            }),
          ]);
      });

      it('should return a mapped copy of the initial quads for the empty pattern', async() => {
        ctx = ctx.set(KeysQueryOperation.unionDefaultGraph, true);

        await expect(source.queryBindings(pAllQuad, ctx)).toEqualBindingsStream([
          BF.fromRecord({
            v1: DF.namedNode('s1'),
            v2: DF.namedNode('p1'),
            v3: DF.namedNode('o1'),
            v4: DF.defaultGraph(),
          }),
          BF.fromRecord({
            v1: DF.namedNode('s2'),
            v2: DF.namedNode('p2'),
            v3: DF.namedNode('o2'),
            v4: DF.defaultGraph(),
          }),
          BF.fromRecord({
            v1: DF.namedNode('s1'),
            v2: DF.namedNode('p3'),
            v3: DF.namedNode('o1'),
            v4: DF.namedNode('CUSTOM_GRAPH'),
          }),
          BF.fromRecord({
            v1: DF.namedNode('s2'),
            v2: DF.namedNode('p4'),
            v3: DF.namedNode('o2'),
            v4: DF.namedNode('CUSTOM_GRAPH'),
          }),
          BF.fromRecord({
            v1: DF.namedNode('DEFAULT_GRAPH'),
            v2: DF.namedNode('defaultInSubject'),
            v3: DF.namedNode('o2'),
            v4: DF.defaultGraph(),
          }),
          BF.fromRecord({
            v1: DF.namedNode('s1-'),
            v2: DF.namedNode('actualDefaultGraph'),
            v3: DF.namedNode('o1'),
            v4: DF.defaultGraph(),
          }),
        ]);
      });

      it('should correctly correctly cache the default graph [defaultGraph=DEFAULT_GRAPH]', async() => {
        await expect(source.queryBindings(AF.createPattern(v1, DF.namedNode('p3'), v2), ctx))
          .toEqualBindingsStream([]);

        await expect(source.queryBindings(AF.createPattern(v1, DF.namedNode('p3'), v2, v3), ctx))
          .toEqualBindingsStream([
            BF.fromRecord({
              v1: DF.namedNode('s1'),
              v2: DF.namedNode('o1'),
              v3: DF.namedNode('CUSTOM_GRAPH'),
            }),
          ]);
      });

      it('should correctly correctly cache the default graph [defaultGraph=undefined]', async() => {
        // @ts-expect-error
        delete source.defaultGraph;

        await expect(source.queryBindings(AF.createPattern(v1, DF.namedNode('p3'), v2), ctx))
          .toEqualBindingsStream([]);

        await expect(source.queryBindings(AF.createPattern(v1, DF.namedNode('p3'), v2, v3), ctx))
          .toEqualBindingsStream([
            BF.fromRecord({
              v1: DF.namedNode('s1'),
              v2: DF.namedNode('o1'),
              v3: DF.namedNode('CUSTOM_GRAPH'),
            }),
          ]);
      });
    });
  });

  describe('initialQuads lifecycle', () => {
    // Deadlines are failure bounds, not delays used to sequence stream events.
    async function bounded<T>(promise: Promise<T>): Promise<T | 'timeout'> {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          promise,
          new Promise<'timeout'>((resolve) => {
            timer = setTimeout(() => resolve('timeout'), 1_000);
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
    }

    function createSource(input: Readable): QuerySourceQpf {
      return new QuerySourceQpf(
        mediatorMetadata,
        mediatorMetadataExtract,
        mediatorDereferenceRdf,
        DF,
        AF,
        BF,
        's',
        'p',
        'o',
        'g',
        'url',
        metadata,
        false,
        input,
      );
    }

    function createInput() {
      const quads = Array.from({ length: 100 }, (_, i) => quad(`s${i}`, 'p', 'o', 'DEFAULT_GRAPH'));
      let produced = 0;
      const input = new Readable({
        objectMode: true,
        highWaterMark: 1,
        read() {
          this.push(produced < quads.length ? quads[produced++] : null);
        },
      });
      return { input, quads, produced: () => produced };
    }

    // Deferred: unconditional draining defeats demand-driven
    // consumption and may retain unbounded quad history.
    // See issue #1198; not fixed by this error-lifecycle patch.
    // eslint-disable-next-line jest/no-disabled-tests -- Deferred for the resource-safety reason above.
    it.skip('should consume and close initialQuads without a cache reader', async() => {
      const { input, produced } = createInput();
      let ended = false;
      input.once('end', () => {
        ended = true;
      });
      const closed = new Promise(resolve => input.once('close', () => resolve('closed')));
      createSource(input);
      try {
        await bounded(closed);
        expect({ produced: produced(), ended, closed: input.closed }).toEqual({
          produced: 100,
          ended: true,
          closed: true,
        });
      } finally {
        input.destroy();
      }
    });

    it('should replay all cached quads to later readers after source completion', async() => {
      const { input, quads } = createInput();
      const closed = new Promise(resolve => input.once('close', resolve));
      const source = createSource(input);
      const readers: ReturnType<QuerySourceQpf['queryBindings']>[] = [];
      try {
        // Drain one reader so replay can be checked independently of the no-reader closure defect.
        for (let i = 0; i < 3; i++) {
          const reader = source.queryBindings(pAllQuad, ctx);
          readers.push(reader);
          const bindings = await bounded(reader.toArray());
          expect(bindings).toEqual(quads.map((q: RDF.Quad) => BF.fromRecord({
            v1: q.subject,
            v2: q.predicate,
            v3: q.object,
            v4: q.graph,
          })));
          await bounded(closed);
          expect(input.closed).toBe(true);
        }
        expect(mediatorDereferenceRdf.mediate).not.toHaveBeenCalled();
      } finally {
        for (const reader of readers) {
          reader.destroy();
        }
        input.destroy();
      }
    });

    it('should preserve metadata and default graph mapping after cancelling an early reader', async() => {
      ctx = ctx.set(KeysQueryOperation.unionDefaultGraph, true);
      metadata.defaultGraph = 'DEFAULT_GRAPH';
      metadata.cardinality.value = 100;
      const { input, quads } = createInput();
      const source = createSource(input);
      const early = source.queryBindings(pAllQuad, ctx);
      let replay: ReturnType<QuerySourceQpf['queryBindings']> | undefined;
      try {
        const cancelled = new Promise(resolve => early.on('data', () => {
          early.destroy();
          resolve('cancelled');
        }));
        await expect(bounded(cancelled)).resolves.toBe('cancelled');
        replay = source.queryBindings(pAllQuad, ctx);
        const replayMetadata = new Promise(resolve => replay!.getProperty('metadata', resolve));
        await expect(bounded(replay.toArray())).resolves.toEqual(quads.map((q: RDF.Quad) => BF.fromRecord({
          v1: q.subject,
          v2: q.predicate,
          v3: q.object,
          v4: DF.defaultGraph(),
        })));
        await expect(bounded(replayMetadata)).resolves.toMatchObject({
          cardinality: { type: 'exact', value: 100 },
          defaultGraph: 'DEFAULT_GRAPH',
          searchForms: metadata.searchForms,
          state: expect.any(MetadataValidationState),
        });
        expect(mediatorDereferenceRdf.mediate).not.toHaveBeenCalled();
      } finally {
        early.destroy();
        replay?.destroy();
        input.destroy();
      }
    });

    // Run source errors outside Jest's process. In the no-reader case, observing an
    // uncaught exception must neither crash Jest nor install a listener on the cache.
    async function observeTerminalError(mode: 'unread' | 'active' | 'later'): Promise<unknown> {
      const worker = new Worker(`
        const { parentPort, workerData } = require('node:worker_threads');
        require(workerData.register).register({
          transpileOnly: true, preferTsExts: true, compilerOptions: { rootDir: '/' },
        });
        const { QuerySourceQpf } = require(workerData.source);
        const { Readable } = require('node:stream');
        const { DataFactory } = require(workerData.factory);
        const { AlgebraFactory } = require(workerData.algebra);
        const { BindingsFactory } = require(workerData.bindings);
        const { ActionContext } = require(workerData.context);
        const df = new DataFactory();
        const af = new AlgebraFactory();
        const terminalError = new Error('initialQuads terminal failure');
        const unhandled = [];
        if (workerData.mode === 'unread') process.on('uncaughtException', error => unhandled.push({
          message: error.message, sameError: error === terminalError,
        }));
        const input = new Readable({ objectMode: true, read() {} });
        const source = new QuerySourceQpf(
          {}, {}, {}, df, af, new BindingsFactory(df), 's', 'p', 'o', 'g', 'url',
          {
            searchForms: { values: [{ mappings: { s: 'S', p: 'P', o: 'O', g: 'G' } }] },
            cardinality: { type: 'exact', value: 0 },
          },
          false, input,
        );
        const pattern = af.createPattern(df.variable('s'), df.variable('p'), df.variable('o'), df.variable('g'));
        const context = new ActionContext();
        function observe(reader) {
          return new Promise(resolve => {
            const timer = setTimeout(() => finish({ terminal: 'timeout' }), 1000);
            function finish(result) { clearTimeout(timer); resolve(result); }
            reader.on('error', error => finish({ terminal: 'error', sameError: error === terminalError }));
            reader.on('end', () => finish({ terminal: 'end' }));
            reader.on('data', () => {});
          });
        }
        (async() => {
          if (workerData.mode === 'unread') {
            input.destroy(terminalError);
            // A stream destroy emits its error on nextTick, before this event-loop barrier.
            await new Promise(resolve => setImmediate(resolve));
            parentPort.postMessage(unhandled);
          } else {
            const active = source.queryBindings(pattern, context);
            const activeResult = observe(active);
            input.destroy(terminalError);
            const result = await activeResult;
            await new Promise(resolve => setImmediate(resolve));
            if (workerData.mode === 'active') parentPort.postMessage(result);
            else parentPort.postMessage({
              active: result,
              later: await observe(source.queryBindings(pattern, context)),
            });
          }
        })().catch(error => { throw error; });
      `, {
        eval: true,
        workerData: {
          mode,
          register: require.resolve('ts-node'),
          source: require.resolve('../lib/QuerySourceQpf'),
          factory: require.resolve('rdf-data-factory'),
          algebra: require.resolve('@comunica/utils-algebra'),
          bindings: require.resolve('@comunica/utils-bindings-factory'),
          context: require.resolve('@comunica/core'),
        },
      });
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await new Promise((resolve, reject) => {
          timer = setTimeout(() => reject(new Error('INCONCLUSIVE: error worker exceeded its deadline')), 10_000);
          worker.once('message', resolve);
          worker.once('error', reject);
          worker.once('exit', code => reject(new Error(`INCONCLUSIVE: error worker exited before reporting (${code})`)));
        });
      } finally {
        clearTimeout(timer);
        await worker.terminate();
      }
    }

    it('should safely handle a terminal source error without a cache reader', async() => {
      await expect(observeTerminalError('unread')).resolves.toEqual([]);
    });

    it('should propagate the same terminal source error to an active reader', async() => {
      await expect(observeTerminalError('active')).resolves.toEqual({ terminal: 'error', sameError: true });
    });

    it('should propagate the same terminal source error to a later reader', async() => {
      await expect(observeTerminalError('later')).resolves.toEqual({
        active: { terminal: 'error', sameError: true },
        later: { terminal: 'error', sameError: true },
      });
    });

    it('should reject two late readers with the original unread failure', async() => {
      const input = new Readable({ objectMode: true, read() {} });
      const source = createSource(input);
      const error = new Error('unread failure');
      const closed = new Promise<void>(resolve => input.once('close', resolve));
      input.destroy(error);
      await closed;

      const readers = [ source.queryBindings(pAllQuad, ctx), source.queryBindings(pAllQuad, ctx) ];
      try {
        await Promise.all(readers.map(async(reader) => {
          await expect(bounded(reader.toArray())).rejects.toBe(error);
        }));
      } finally {
        for (const reader of readers) {
          reader.destroy();
        }
      }
    });

    it('should fail active readers after partial consumption without draining the input', async() => {
      const { input, produced } = createInput();
      const source = createSource(input);
      const readers = [ source.queryBindings(pAllQuad, ctx), source.queryBindings(pAllQuad, ctx) ];
      const error = new Error('partial failure');
      try {
        for (const reader of readers) {
          await expect(bounded(new Promise(resolve => reader.once('data', resolve))))
            .resolves.toEqual(BF.fromRecord({
              v1: DF.namedNode('s0'),
              v2: DF.namedNode('p'),
              v3: DF.namedNode('o'),
              v4: DF.namedNode('DEFAULT_GRAPH'),
            }));
        }
        await new Promise<void>(resolve => setImmediate(resolve));
        const pausedCount = produced();
        await new Promise<void>(resolve => setImmediate(resolve));
        expect(produced()).toBe(pausedCount);
        expect(pausedCount).toBeLessThan(100);

        const results = readers.map(async(reader) => {
          await expect(bounded(reader.toArray())).rejects.toBe(error);
        });
        input.destroy(error);
        await Promise.all(results);
      } finally {
        for (const reader of readers) {
          reader.destroy();
        }
        input.destroy();
      }
    });

    it('should retain a synchronous failure during cache construction instead of ending successfully', async() => {
      metadata.defaultGraph = 'DEFAULT_GRAPH';
      const input = new Readable({ objectMode: true, read() {} });
      const error = new Error('synchronous failure');
      jest.spyOn(input, 'read').mockImplementationOnce(() => {
        input.emit('error', error);
        input.emit('error', new Error('second failure'));
        input.emit('end');
        return null;
      });
      const source = createSource(input);
      const reader = source.queryBindings(pAllQuad, ctx);
      try {
        await expect(bounded(reader.toArray())).rejects.toBe(error);
      } finally {
        reader.destroy();
        input.destroy();
      }
    });

    it('should emit one original error per consumer despite repeated and reentrant failures', async() => {
      const input = new Readable({ objectMode: true, read() {} });
      const source = createSource(input);
      const error = new Error('first failure');
      const replacement = new Error('reentrant failure');
      const readers = [ source.queryBindings(pAllQuad, ctx), source.queryBindings(pAllQuad, ctx) ];
      const errors: Error[][] = [[], [], []];
      let reentrantResult: Promise<unknown> | undefined;
      readers[0].on('error', () => {
        input.emit('error', replacement);
        const reentrant = source.queryBindings(pAllQuad, ctx);
        readers.push(reentrant);
        reentrant.on('error', e => errors[2].push(e));
        reentrantResult = bounded(reentrant.toArray().catch(e => e));
        readers[0].destroy();
      });
      for (const [ index, reader ] of readers.entries()) {
        reader.on('error', e => errors[index].push(e));
      }
      const results = readers.map(reader => bounded(reader.toArray().catch(e => e)));
      try {
        input.emit('error', error);
        input.emit('error', replacement);
        expect(errors).toEqual([[], [], []]);
        await expect(Promise.all(results)).resolves.toEqual([ error, error ]);
        await expect(reentrantResult).resolves.toBe(error);
        await new Promise<void>(resolve => setImmediate(resolve));
        for (const observed of errors) {
          expect(observed).toHaveLength(1);
          expect(observed[0]).toBe(error);
        }
      } finally {
        for (const reader of readers) {
          reader.destroy();
        }
        input.destroy();
      }
    });
  });
});
