import 'jest-rdf';
import { Readable } from 'node:stream';
import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActorDereferenceRdfOutput } from '@comunica/bus-dereference-rdf';
import { KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { PassThrough } from 'readable-stream';
import { Factory } from 'sparqlalgebrajs';
import { QuerySourceQpf } from '../lib/QuerySourceQpf';
import '@comunica/jest';

const quad = require('rdf-quad');
const streamifyArray = require('streamify-array');

const DF = new DataFactory();
const AF = new Factory();
const BF = new BindingsFactory();
const v1 = DF.variable('v1');
const v2 = DF.variable('v2');
const v3 = DF.variable('v3');
const v4 = DF.variable('v4');
const pAllQuad = AF.createPattern(v1, v2, v3, v4);
const pAllTriple = AF.createPattern(v1, v2, v3);

describe('QuerySourceQpf', () => {
  let source: QuerySourceQpf;
  let bus: any;
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
    bus = new Bus({ name: 'bus' });

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
    beforeEach(() => {
      source = new QuerySourceQpf(
        mediatorMetadata,
        mediatorMetadataExtract,
        mediatorDereferenceRdf,
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

      it('should be constructable with initialQuads', async() => {
        const s = new QuerySourceQpf(
          mediatorMetadata,
          mediatorMetadataExtract,
          mediatorDereferenceRdf,
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
          canContainUndefs: false,
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
          cardinality: { type: 'exact', value: 2 },
          variables: [
            DF.variable('v1'),
            DF.variable('v2'),
            DF.variable('v3'),
            DF.variable('v4'),
          ],
        });
      });

      it('should emit metadata for the empty quad pattern without union default graph', async() => {
        const output = source.queryBindings(pAllQuad, ctx);
        const metadataPromise = new Promise(resolve => output.getProperty('metadata', resolve));
        await expect(metadataPromise).resolves.toEqual({
          availableOrders: undefined,
          order: undefined,
          canContainUndefs: false,
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
          cardinality: { type: 'estimate', value: 2 },
          variables: [
            DF.variable('v1'),
            DF.variable('v2'),
            DF.variable('v3'),
            DF.variable('v4'),
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
          canContainUndefs: false,
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
          cardinality: { type: 'exact', value: 2 },
          variables: [
            DF.variable('v1'),
            DF.variable('v2'),
            DF.variable('v3'),
          ],
        });
      });

      it('should emit metadata for the empty triple pattern without union default graph', async() => {
        const output = source.queryBindings(pAllTriple, ctx);
        const metadataPromise = new Promise(resolve => output.getProperty('metadata', resolve));
        await expect(metadataPromise).resolves.toEqual({
          availableOrders: undefined,
          order: undefined,
          canContainUndefs: false,
          first: null,
          next: null,
          last: null,
          requestTime: 0,
          cardinality: { type: 'exact', value: 0 },
          variables: [
            DF.variable('v1'),
            DF.variable('v2'),
            DF.variable('v3'),
          ],
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
          canContainUndefs: false,
          subsetOf: 'url',
          cardinality: { type: 'exact', value: 2 },
          order: undefined,
          variables: [ v1, v2 ],
        });
      });

      it('should emit metadata for an non-empty pattern without union default graph', async() => {
        const output = source.queryBindings(AF.createPattern(DF.namedNode('s1'), v1, DF.namedNode('o1'), v2), ctx);
        const metadataPromise = new Promise(resolve => output.getProperty('metadata', resolve));
        await expect(metadataPromise).resolves.toEqual({
          availableOrders: undefined,
          next: 'NEXT',
          canContainUndefs: false,
          subsetOf: 'url',
          cardinality: { type: 'estimate', value: 2 },
          order: undefined,
          variables: [ v1, v2 ],
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

  describe('with a custom default graph', () => {
    beforeEach(() => {
      mediatorDereferenceRdf = {
        mediate: (args: any): Promise<IActorDereferenceRdfOutput> => Promise.resolve({
          url: args.url,
          data: streamifyArray([
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

  describe('with filterBindings', () => {
    beforeEach(() => {
      source = new QuerySourceQpf(
        mediatorMetadata,
        mediatorMetadataExtract,
        mediatorDereferenceRdf,
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
            metadata: <any> { variables: [ DF.variable('f1'), DF.variable('f2') ]},
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
            metadata: <any> { variables: [ DF.variable('f1'), DF.variable('f2') ]},
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
          metadata: { variables: [ DF.variable('f1'), DF.variable('f2') ]},
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
});
