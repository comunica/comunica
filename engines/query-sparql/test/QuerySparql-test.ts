/** @jest-environment setup-polly-jest/jest-environment-node */

import { KeysHttpWayback, KeysInitQuery, KeysQuerySourceIdentify } from '@comunica/context-entries';
import type { QueryBindings, QueryStringContext } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import type { Bindings } from '@comunica/utils-bindings-factory';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { BlankNodeScoped } from '@comunica/utils-data-factory';
import { stringify as stringifyStream } from '@jeswr/stream-to-string';
import type * as RDF from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import 'jest-rdf';
import '@comunica/utils-jest';
import { Store } from 'n3';
import { DataFactory } from 'rdf-data-factory';
import rdfParse from 'rdf-parse';
import { RdfStore } from 'rdf-stores';
import { QueryEngine } from '../lib/QueryEngine';
import { fetch as cachedFetch } from './util';

const stringToStream = require('streamify-string');

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const factory = new AlgebraFactory();

globalThis.fetch = cachedFetch;

describe('System test: QuerySparql', () => {
  let engine: QueryEngine;
  beforeAll(() => {
    engine = new QueryEngine();
  });

  describe('instantiated multiple times', () => {
    it('should contain different actors', () => {
      const engine2 = new QueryEngine();

      expect((<any> engine).actorInitQuery).toBe((<any> engine).actorInitQuery);
      expect((<any> engine2).actorInitQuery).toBe((<any> engine2).actorInitQuery);
      expect((<any> engine).actorInitQuery).not.toBe((<any> engine2).actorInitQuery);
    });
  });

  describe('query', () => {
    describe('simple SPO on a raw RDF document', () => {
      it('with results', async() => {
        const result = <QueryBindings> await engine.query(`SELECT * WHERE {
      ?s ?p ?o.
    }`, { sources: <string[]> [ 'https://www.rubensworks.net/' ]});
        expect((await arrayifyStream(await result.execute())).length).toBeGreaterThan(100);
      });

      it('without results', async() => {
        const result = <QueryBindings> await engine.query(`SELECT * WHERE {
      ?s <ex:dummy> ?o.
    }`, { sources: [ 'https://www.rubensworks.net/' ]});
        await expect((arrayifyStream(await result.execute()))).resolves.toEqual([]);
      });

      it('for the single source context entry', async() => {
        const result = <QueryBindings> await engine.query(`SELECT * WHERE {
      ?s ?p ?o.
    }`, { sources: [ 'https://www.rubensworks.net/' ]});
        expect((await arrayifyStream(await result.execute())).length).toBeGreaterThan(100);
      });

      it('repeated with the same engine', async() => {
        const query = `SELECT * WHERE {
      ?s ?p ?o.
    }`;
        const context: QueryStringContext = { sources: [ 'https://www.rubensworks.net/' ]};
        expect((await arrayifyStream(await (<QueryBindings> await engine.query(query, context)).execute()))
          .length).toBeGreaterThan(100);
        expect((await arrayifyStream(await (<QueryBindings> await engine.query(query, context)).execute()))
          .length).toBeGreaterThan(100);
        expect((await arrayifyStream(await (<QueryBindings> await engine.query(query, context)).execute()))
          .length).toBeGreaterThan(100);
        expect((await arrayifyStream(await (<QueryBindings> await engine.query(query, context)).execute()))
          .length).toBeGreaterThan(100);
        expect((await arrayifyStream(await (<QueryBindings> await engine.query(query, context)).execute()))
          .length).toBeGreaterThan(100);
      });

      it('repeated with the same engine without results', async() => {
        const query = `SELECT * WHERE {
      ?s <ex:dummy> ?o.
    }`;
        const context: QueryStringContext = { sources: [ 'https://www.rubensworks.net/' ]};
        await expect((arrayifyStream(await (<QueryBindings> await engine.query(query, context)).execute()))).resolves
          .toEqual([]);
        await expect((arrayifyStream(await (<QueryBindings> await engine.query(query, context)).execute()))).resolves
          .toEqual([]);
        await expect((arrayifyStream(await (<QueryBindings> await engine.query(query, context)).execute()))).resolves
          .toEqual([]);
        await expect((arrayifyStream(await (<QueryBindings> await engine.query(query, context)).execute()))).resolves
          .toEqual([]);
        await expect((arrayifyStream(await (<QueryBindings> await engine.query(query, context)).execute()))).resolves
          .toEqual([]);
      });

      describe('string source query', () => {
        const query = 'CONSTRUCT WHERE { ?s ?p ?o }';
        const value = `{
          "@id":"ex:s",
          "ex:p":{"@id":"ex:o"},
          "ex:p2":{"@id":"ex:o2"}
        }
        `;
        const value2 = '<ex:s> <ex:p3> <ex:o3>. <ex:s> <ex:p4> <ex:o4>.';
        const expectedResult: RDF.Quad[] = [
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p'), DF.namedNode('ex:o')),
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2')),
        ];

        it('should return the valid result with a turtle data source', async() => {
          const turtleValue = '<ex:s> <ex:p> <ex:o>. <ex:s> <ex:p2> <ex:o2>.';
          const context: QueryStringContext = { sources: [
            { type: 'serialized', value: turtleValue, mediaType: 'text/turtle', baseIRI: 'http://example.org/' },
          ]};

          const result = await arrayifyStream(await engine.queryQuads(query, context));
          expect(result).toHaveLength(expectedResult.length);
          expect(result).toMatchObject(expectedResult);
        });

        it('should return the valid result with a json-ld data source', async() => {
          const context: QueryStringContext = { sources: [
            { type: 'serialized', value, mediaType: 'application/ld+json', baseIRI: 'http://example.org/' },
          ]};

          const result = await arrayifyStream(await engine.queryQuads(query, context));
          expect(result).toHaveLength(expectedResult.length);
          expect(result).toMatchObject(expectedResult);
        });

        it('should return the valid result with no base IRI', async() => {
          const context: QueryStringContext = { sources: [
            { type: 'serialized', value, mediaType: 'application/ld+json' },
          ]};

          const result = await arrayifyStream(await engine.queryQuads(query, context));
          expect(result).toHaveLength(expectedResult.length);
          expect(result).toMatchObject(expectedResult);
        });

        it('should return the valid result with multiple serialized', async() => {
          const context: QueryStringContext = { sources: [
            { type: 'serialized', value, mediaType: 'application/ld+json' },
            { type: 'serialized', value: value2, mediaType: 'text/turtle' },
          ]};

          const expectedResult: RDF.Quad[] = [
            DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p'), DF.namedNode('ex:o')),
            DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p3'), DF.namedNode('ex:o3')),
            DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2')),
            DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p4'), DF.namedNode('ex:o4')),
          ];

          const result = await arrayifyStream(await engine.queryQuads(query, context));
          expect(result).toHaveLength(expectedResult.length);
          expect(result).toMatchObject(expectedResult);
        });

        it('should return the valid result with multiple sources', async() => {
          const quads = [
            DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p5'), DF.namedNode('ex:o5')),
          ];
          const store = new Store();
          store.addQuads(quads);

          const context: QueryStringContext = { sources: [
            { type: 'serialized', value, mediaType: 'application/ld+json' },
            { type: 'serialized', value: value2, mediaType: 'text/turtle' },
            store,
          ]};
          await expect(arrayifyStream(await engine.queryQuads(query, context))).resolves.toBeRdfIsomorphic([
            DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p'), DF.namedNode('ex:o')),
            DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p3'), DF.namedNode('ex:o3')),
            DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p5'), DF.namedNode('ex:o5')),
            DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2')),
            DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p4'), DF.namedNode('ex:o4')),
          ]);
        });

        it('should serialise results correctly', async() => {
          const context: QueryStringContext = { sources: [
            { type: 'serialized', value, mediaType: 'application/ld+json', baseIRI: 'http://example.org/' },
          ]};

          const resultString = await engine.resultToString(await engine.query(query, context), 'application/n-quads');
          await expect(stringifyStream(resultString.data)).resolves.toBe(
            '<ex:s> <ex:p> <ex:o> .\n<ex:s> <ex:p2> <ex:o2> .\n',
          );
        });

        it('should have stats that are strictly increasing', async() => {
          const context: QueryStringContext = {
            sources: [
              { type: 'serialized', value, mediaType: 'application/ld+json', baseIRI: 'http://example.org/' },
            ],
            [KeysInitQuery.queryTimestampHighResolution.name]: performance.now(),
          };

          const resultString: string = await stringifyStream(
            (await engine.resultToString(await engine.query(query, context), 'stats', context)).data,
          );
          const times = resultString.split('\n').slice(1, -1).map(line => Number.parseFloat(line.split(',')[1]));
          expect(times).toHaveLength(4);
          for (let i = 0; i < 2; i++) {
            expect(times[i]).toBeLessThanOrEqual(times[i + 1]);
          }
        });
      });

      describe('handle blank nodes with DESCRIBE queries', () => {
        let store: Store;
        let quads: RDF.Quad[];
        const query = `DESCRIBE ?o  {
          ?s ?p ?o .
      }`;

        beforeEach(() => {
          store = new Store();
        });

        it('return consistent blank nodes with a data source that should return one blank node', async() => {
          quads = [
            DF.quad(DF.namedNode('a'), DF.namedNode('b'), DF.namedNode('c')),

            DF.quad(DF.namedNode('a'), DF.namedNode('d'), DF.blankNode('e')),

            DF.quad(DF.blankNode('e'), DF.namedNode('f'), DF.namedNode('g')),
            DF.quad(DF.blankNode('e'), DF.namedNode('h'), DF.namedNode('i')),
          ];
          store.addQuads(quads);
          const context = <any> { sources: [ store ]};

          const blankNode = new BlankNodeScoped('bc_0_e', DF.namedNode('urn:comunica_skolem:source_0:e'));
          const expectedResult = [
            DF.quad(blankNode, DF.namedNode('f'), DF.namedNode('g')),
            DF.quad(blankNode, DF.namedNode('h'), DF.namedNode('i')),
          ];

          const result = await arrayifyStream(await (<QueryBindings> await engine.query(query, context)).execute());

          expect(result).toHaveLength(expectedResult.length);
          expect(result).toMatchObject(expectedResult);
        });

        it('return consistent blank nodes with a data source that should return multiple blank nodes', async() => {
          quads = [
            DF.quad(DF.namedNode('a'), DF.namedNode('b'), DF.namedNode('c')),

            DF.quad(DF.namedNode('a'), DF.namedNode('d'), DF.blankNode('e')),
            DF.quad(DF.namedNode('a'), DF.namedNode('d'), DF.blankNode('j')),
            DF.quad(DF.namedNode('a'), DF.namedNode('d'), DF.blankNode('k')),

            DF.quad(DF.blankNode('e'), DF.namedNode('f'), DF.namedNode('g')),
            DF.quad(DF.blankNode('e'), DF.namedNode('h'), DF.namedNode('i')),
            DF.quad(DF.blankNode('j'), DF.namedNode('f'), DF.namedNode('g')),
            DF.quad(DF.blankNode('j'), DF.namedNode('h'), DF.namedNode('i')),
            DF.quad(DF.blankNode('k'), DF.namedNode('f'), DF.namedNode('g')),
            DF.quad(DF.blankNode('k'), DF.namedNode('h'), DF.namedNode('i')),
          ];
          store.addQuads(quads);
          const context = <any> { sources: [ store ]};

          const blankNodeE = new BlankNodeScoped('bc_0_e', DF.namedNode('urn:comunica_skolem:source_0:e'));
          const blankNodeJ = new BlankNodeScoped('bc_0_j', DF.namedNode('urn:comunica_skolem:source_0:j'));
          const blankNodeK = new BlankNodeScoped('bc_0_k', DF.namedNode('urn:comunica_skolem:source_0:k'));
          const expectedResult = [
            DF.quad(blankNodeE, DF.namedNode('f'), DF.namedNode('g')),
            DF.quad(blankNodeE, DF.namedNode('h'), DF.namedNode('i')),
            DF.quad(blankNodeJ, DF.namedNode('f'), DF.namedNode('g')),
            DF.quad(blankNodeJ, DF.namedNode('h'), DF.namedNode('i')),
            DF.quad(blankNodeK, DF.namedNode('f'), DF.namedNode('g')),
            DF.quad(blankNodeK, DF.namedNode('h'), DF.namedNode('i')),
          ];

          const result = await arrayifyStream(await (<QueryBindings> await engine.query(query, context)).execute());

          expect(result).toHaveLength(expectedResult.length);
          expect(result).toMatchObject(expectedResult);
        });

        it('return consistent blank nodes with a data source containing a nested blank node', async() => {
          quads = [
            DF.quad(DF.namedNode('a'), DF.namedNode('b'), DF.namedNode('c')),

            DF.quad(DF.namedNode('a'), DF.namedNode('d'), DF.blankNode('e')),

            DF.quad(DF.blankNode('e'), DF.namedNode('f'), DF.blankNode('g')),
            DF.quad(DF.blankNode('e'), DF.namedNode('h'), DF.namedNode('i')),

            DF.quad(DF.blankNode('g'), DF.namedNode('i'), DF.namedNode('j')),
          ];
          store.addQuads(quads);
          const context = <any> { sources: [ store ]};

          const blankNodeE = new BlankNodeScoped('bc_0_e', DF.namedNode('urn:comunica_skolem:source_0:e'));
          const blankNodeG = new BlankNodeScoped('bc_0_g', DF.namedNode('urn:comunica_skolem:source_0:g'));
          const expectedResult = [
            DF.quad(blankNodeE, DF.namedNode('f'), blankNodeG),
            DF.quad(blankNodeE, DF.namedNode('h'), DF.namedNode('i')),

            DF.quad(blankNodeG, DF.namedNode('i'), DF.namedNode('j')),
          ];

          const result = await arrayifyStream(await (<QueryBindings> await engine.query(query, context)).execute());

          expect(result).toHaveLength(expectedResult.length);
          expect(result).toMatchObject(expectedResult);
        });

        it(`return consistent blank nodes with a data source that should return one blank node and one named node`, async() => {
          quads = [
            DF.quad(DF.namedNode('a'), DF.namedNode('b'), DF.namedNode('c')),

            DF.quad(DF.namedNode('a'), DF.namedNode('d'), DF.blankNode('e')),

            DF.quad(DF.blankNode('e'), DF.namedNode('f'), DF.namedNode('g')),
            DF.quad(DF.blankNode('e'), DF.namedNode('h'), DF.namedNode('i')),

            DF.quad(DF.namedNode('c'), DF.namedNode('i'), DF.namedNode('j')),
          ];
          store.addQuads(quads);
          const context = <any> { sources: [ store ]};

          const blankNode = new BlankNodeScoped('bc_0_e', DF.namedNode('urn:comunica_skolem:source_0:e'));
          const expectedResult = [
            DF.quad(DF.namedNode('c'), DF.namedNode('i'), DF.namedNode('j')),
            DF.quad(blankNode, DF.namedNode('f'), DF.namedNode('g')),
            DF.quad(blankNode, DF.namedNode('h'), DF.namedNode('i')),
          ];

          const result = await arrayifyStream(await (<QueryBindings> await engine.query(query, context)).execute());

          expect(result).toHaveLength(expectedResult.length);
          expect(result).toMatchObject(expectedResult);
        });
      });

      describe('extension function', () => {
        let funcAllow: string;
        let store: Store;
        let baseFunctions: Record<string, (args: RDF.Term[]) => Promise<RDF.Term>>;
        let baseFunctionCreator: (functionName: RDF.NamedNode) => ((args: RDF.Term[]) => Promise<RDF.Term>) | undefined;
        let quads: RDF.Quad[];
        let stringType: RDF.NamedNode;
        let booleanType: RDF.NamedNode;
        let integerType: RDF.NamedNode;
        beforeEach(() => {
          stringType = DF.namedNode('http://www.w3.org/2001/XMLSchema#string');
          booleanType = DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean');
          integerType = DF.namedNode('http://www.w3.org/2001/XMLSchema#integer');
          funcAllow = 'allowAll';
          baseFunctions = {
            'http://example.org/functions#allowAll': async() => DF.literal('true', booleanType),
          };
          baseFunctionCreator = () => async() => DF.literal('true', booleanType);
          store = new Store();
          quads = [
            DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:p1'), DF.literal('apple', stringType)),
            DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:p2'), DF.literal('APPLE', stringType)),
            DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:p3'), DF.literal('Apple', stringType)),
            DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:p4'), DF.literal('aPPLE', stringType)),
          ];
          store.addQuads(quads);
        });
        const baseQuery = (funcName: string) => `PREFIX func: <http://example.org/functions#>
        SELECT * WHERE {
              ?s ?p ?o.
            FILTER (func:${funcName}(?o))
        }`;

        it('rejects when record does not match', async() => {
          const context = <any> { sources: [ store ]};
          context.extensionFunctions = baseFunctions;
          await expect(engine.query(baseQuery('nonExist'), context)).rejects.toThrow(
            `Creation of function evaluator failed: no configured actor was able to evaluate function http://example.org/functions#nonExist`,
          );
        });

        it('rejects when creator returns null', async() => {
          const context = <any> { sources: [ store ]};
          context.extensionFunctionCreator = () => null;
          await expect(engine.query(baseQuery(funcAllow), context)).rejects.toThrow(
            `Creation of function evaluator failed: no configured actor was able to evaluate function http://example.org/functions#${funcAllow}`,
          );
        });

        it('with results and pointless custom filter given by creator', async() => {
          const context = <any> { sources: [ store ]};
          context.extensionFunctionCreator = baseFunctionCreator;
          const result = <QueryBindings> await engine.query(baseQuery(funcAllow), context);
          await expect((arrayifyStream(await result.execute()))).resolves.toHaveLength(store.size);
        });

        it('with results and pointless custom filter given by record', async() => {
          const context = <any> { sources: [ store ]};
          context.extensionFunctions = baseFunctions;
          const result = <QueryBindings> await engine.query(baseQuery(funcAllow), context);
          await expect((arrayifyStream(await result.execute()))).resolves.toHaveLength(4);
        });

        it('with results but all filtered away', async() => {
          const context = <any> { sources: [ store ]};
          context.extensionFunctionCreator = () => () =>
            DF.literal('false', booleanType);
          const result = <QueryBindings> await engine.query(baseQuery('rejectAll'), context);
          await expect(arrayifyStream(await result.execute())).resolves.toEqual([]);
        });

        it('throws error when supplying both record and creator', async() => {
          const context = <any> { sources: [ store ]};
          context.extensionFunctions = baseFunctions;
          context.extensionFunctionCreator = baseFunctionCreator;
          await expect(engine.query(baseQuery(funcAllow), context)).rejects
            .toThrow('Illegal simultaneous usage of extensionFunctionCreator and extensionFunctions in context');
        });

        /**
         * These tests are integration tests to check the correct behaviour of filter pushdown with extension functions.
         * Comunica should not pushdown when it supports the extension function, but no endpoint does.
         * If comunica doesn't support it, then the filter pushdown behaviour is as normal.
         */
        describe('filter pushdown behaviour with extension functions', () => {
          let containsFilter: boolean;
          let endpoint1: string;
          let endpoint2: string;
          let createMockedFetch: (arg0: boolean, arg1: boolean) => (input: string) => Promise<Response>;
          let createContext: (arg0: boolean, arg1: boolean) => any;

          beforeEach(async() => {
            await engine.invalidateHttpCache();
            containsFilter = false;
            endpoint1 = 'http://example.com/1/sparql';
            endpoint2 = 'http://example.com/2/sparql';
            createMockedFetch = (endpoint1SupportsFunction: boolean, endpoint2SupportsFunction: boolean) =>
              (input: string) => {
                if (input.includes('FILTER')) {
                  containsFilter = true;
                }
                const createServiceDescription = (supportsFunction: boolean, endpoint: string): string =>
                  supportsFunction ?
                  `
                    @prefix sd: <http://www.w3.org/ns/sparql-service-description#> .
                    <${endpoint}> sd:extensionFunction "http://example.org/functions#allowAll" .
                  ` :
                  ``;
                if (input.includes(endpoint1)) {
                  if (input === endpoint1) {
                    // Service description fetch on endpoint1
                    return Promise.resolve(new Response(
                      createServiceDescription(endpoint1SupportsFunction, endpoint1),
                      { status: 200, headers: { 'Content-Type': 'text/turtle' }},
                    ));
                  }
                  if (input.includes('ASK')) {
                    // ASK on endpoint1
                    return Promise.resolve(new Response(
                      JSON.stringify({ head: {}, boolean: true }),
                      { status: 200, headers: { 'Content-Type': 'application/sparql-results+json' }},
                    ));
                  }
                  // Query fetch on endpoint1
                  return Promise.resolve(new Response(
                    ``,
                    { status: 200, headers: { 'Content-Type': 'application/sparql-results+json' }},
                  ));
                }
                if (input === endpoint2) {
                  // Service description fetch on endpoint2
                  return Promise.resolve(new Response(
                    createServiceDescription(endpoint2SupportsFunction, endpoint2),
                    { status: 200, headers: { 'Content-Type': 'text/turtle' }},
                  ));
                }
                if (input.includes('ASK')) {
                  // ASK on endpoint2
                  return Promise.resolve(new Response(
                    JSON.stringify({ head: {}, boolean: true }),
                    { status: 200, headers: { 'Content-Type': 'application/sparql-results+json' }},
                  ));
                }
                // Query fetch on endpoint2
                return Promise.resolve(new Response(
                  JSON.stringify({
                    head: { vars: [ 's', 'p', 'o' ]},
                    results: {
                      bindings: [
                        { s: { type: 'uri', value: 'http://example.org/2/s1' }, p: { type: 'uri', value: 'http://example.org/2/p' }, o: { type: 'literal', value: '1', datatype: 'http://www.w3.org/2001/XMLSchema#integer' }},
                        { s: { type: 'uri', value: 'http://example.org/2/s2' }, p: { type: 'uri', value: 'http://example.org/2/p' }, o: { type: 'literal', value: '2', datatype: 'http://www.w3.org/2001/XMLSchema#integer' }},
                      ],
                    },
                  }),
                  { status: 200, headers: { 'Content-Type': 'application/sparql-results+json' }},
                ));
              };
            createContext = (arg0: boolean, arg1: boolean) => <any> {
              sources: [ endpoint1, endpoint2 ],
              extensionFunctions: baseFunctions,
              fetch: createMockedFetch(arg0, arg1),
            };
          });

          it('do filter pushdown if both endpoints supports the extension function', async() => {
            await engine.query(baseQuery(funcAllow), createContext(true, true));

            expect(containsFilter).toBeTruthy();
          });

          it('do filter pushdown if one endpoint doesn\'t support the extension function', async() => {
            await engine.query(baseQuery(funcAllow), createContext(true, false));

            expect(containsFilter).toBeTruthy();
          });

          it('should evaluate extension functions client side for the endpoint that doesn\'t support it', async() => {
            const context: QueryStringContext = <QueryStringContext> {
              sources: [ endpoint1, endpoint2 ],
              extensionFunctions: {
                'http://example.org/functions#allowAll': async(args: RDF.Literal[]): Promise<RDF.Literal> => {
                  // Doesn't allow all, but reusing this function means I don't need to touch the service description
                  if (args.length < 2) {
                    return DF.literal('true', booleanType);
                  }
                  return DF.literal(args[0].value < args[1].value ? 'true' : 'false', booleanType);
                },
              },
              fetch: createMockedFetch(true, false),
            };
            const bindingsStream = await engine.queryBindings(`
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX func: <http://example.org/functions#>
SELECT * WHERE {
  ?s ?p ?o .
  FILTER (func:allowAll(?o, "2"^^xsd:integer))
}
            `, context);

            // Make sure that the filter was actually pushed down
            expect(containsFilter).toBeTruthy();

            // Client-side, the ex:s2 result should be filtered out
            await expect(bindingsStream).toEqualBindingsStream([ BF.bindings([
              [ DF.variable('s'), DF.namedNode('http://example.org/2/s1') ],
              [ DF.variable('p'), DF.namedNode('http://example.org/2/p') ],
              [ DF.variable('o'), DF.literal('1', integerType) ],
            ]) ]);
          });

          it('don\'t filter pushdown if both endpoints don\'t support the extension function', async() => {
            await engine.query(baseQuery(funcAllow), createContext(false, false));

            expect(containsFilter).toBeFalsy();
          });

          it('don\'t filter pushdown if comunica doesn\'t support the extension function', async() => {
            const context: QueryStringContext = <QueryStringContext> {
              sources: [ endpoint1, endpoint2 ],
              fetch: createMockedFetch(false, false),
              extensionFunctions: {},
            };
            await expect(engine.query(baseQuery(funcAllow), context)).rejects.toThrow(`no configured actor was able to evaluate function http://example.org/functions#allowAll`);
          });

          it(`do filter pushdown if comunica doesn't define extension functions`, async() => {
            const context: QueryStringContext = <QueryStringContext> {
              sources: [ endpoint1, endpoint2 ],
              fetch: createMockedFetch(false, false),
            };
            await engine.query(baseQuery(funcAllow), context);

            expect(containsFilter).toBeTruthy();
          });
        });

        it('handles complex queries with BIND to', async() => {
          const context = <any> { sources: [ store ]};
          const complexQuery = `PREFIX func: <http://example.org/functions#>
        SELECT ?caps WHERE {
              ?s ?p ?o.
              BIND (func:to-upper-case(?o) AS ?caps)
        }
          `;
          context.extensionFunctions = {
            'http://example.org/functions#to-upper-case': async function(args: RDF.Term[]) {
              const arg = args[0];
              if (arg.termType === 'Literal' && arg.datatype.equals(DF.literal('', stringType).datatype)) {
                return DF.literal(arg.value.toUpperCase(), stringType);
              }
              return arg;
            },
          };
          const bindingsStream = await engine.queryBindings(complexQuery, context);
          expect((await bindingsStream.toArray()).map(res => res.get(DF.variable('caps'))!.value)).toEqual(
            quads.map(q => q.object.value.toUpperCase()),
          );
        });

        describe('handles complex queries with groupBy', () => {
          let context: any;
          let complexQuery: string;
          let extensionBuilder: (timout: boolean) => (args: RDF.Term[]) => Promise<RDF.Term>;

          beforeEach(() => {
            context = <any> { sources: [ store ]};
            complexQuery = `PREFIX func: <http://example.org/functions#>
        SELECT (SUM(func:count-chars(?o)) AS ?sum) WHERE {
              ?s ?p ?o.
        }
          `;
            extensionBuilder = (timout: boolean) => async(args: RDF.Term[]) => {
              const arg = args[0];
              if (arg.termType === 'Literal' && arg.datatype.equals(DF.literal('', stringType).datatype)) {
                if (timout) {
                  await new Promise(resolve => setTimeout(resolve, 1));
                }
                return DF.literal(String(arg.value.length), integerType);
              }
              return arg;
            };
          });

          it('can be evaluated', async() => {
            context.extensionFunctions = {
              'http://example.org/functions#count-chars': extensionBuilder(false),
            };
            const bindingsStream = await engine.queryBindings(complexQuery, context);
            expect((await bindingsStream.toArray()).map(res => res.get(DF.variable('sum'))!.value)).toEqual([ '20' ]);
          });

          it('can be truly async', async() => {
            context.extensionFunctions = {
              'http://example.org/functions#count-chars': extensionBuilder(true),
            };
            const bindingsStream = await engine.queryBindings(complexQuery, context);
            expect((await bindingsStream.toArray()).map(res => res.get(DF.variable('sum'))!.value)).toEqual([ '20' ]);
          });
        });
      });

      describe('functionArgumentsCache', () => {
        let query: string;
        let stringType: RDF.NamedNode;
        let quads: RDF.Quad[];
        let store: Store;
        beforeAll(() => {
          // The query provided is completely arbitrary and should not change the results of this test
          // besides the value in the cache.
          query = `SELECT (strlen(?x) AS ?len) WHERE {
            ?s ?p ?x
          }
          `;
          stringType = DF.namedNode('http://www.w3.org/2001/XMLSchema#string');
          store = new Store();
          quads = [
            DF.quad(DF.namedNode(':a'), DF.namedNode(':p'), DF.literal('apple', stringType)),
          ];
          store.addQuads(quads);
        });

        it('is used when provided', async() => {
          const context = <any> { sources: [ store ]};
          const functionArgumentsCache = {};
          context.functionArgumentsCache = functionArgumentsCache;

          const bindingsStream = await engine.queryBindings(query, context);
          expect((await bindingsStream.toArray()).map(res => res.get(DF.variable('len'))!.value)).toEqual(
            quads.map(q => String(q.object.value.length)),
          );
          expect(Object.keys(functionArgumentsCache)).toContain('strlen');
        });
      });
    });

    describe('simple SPS', () => {
      it('Raw Source', async() => {
        const result = <QueryBindings> await engine.query(`SELECT * WHERE {
      ?s ?p ?s.
    }`, { sources: [ 'https://www.rubensworks.net/' ]});
        await expect(((arrayifyStream(await result.execute())))).resolves.toHaveLength(1);
      });

      it('RDFJS Source', async() => {
        const store = new Store([
          DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('s')),
          DF.quad(DF.namedNode('l'), DF.namedNode('m'), DF.namedNode('n')),
        ]);
        const result = <QueryBindings> await engine.query(`SELECT * WHERE {
      ?s ?p ?s.
    }`, { sources: [ store ]});
        await expect((arrayifyStream(await result.execute()))).resolves.toHaveLength(1);
      });

      it('RDFJS Dataset', async() => {
        const store = RdfStore.createDefault();
        store.addQuad(DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('s')));
        store.addQuad(DF.quad(DF.namedNode('l'), DF.namedNode('m'), DF.namedNode('n')));
        const dataset = store.asDataset();
        let result = <QueryBindings> await engine.query(`SELECT * WHERE {
      ?s ?p ?s.
    }`, { sources: [ dataset ]});
        const datasetBindings = await arrayifyStream(await result.execute());
        expect(datasetBindings).toHaveLength(1);

        // Compare with result of store
        result = <QueryBindings> await engine.query(`SELECT * WHERE {
      ?s ?p ?s.
    }`, { sources: [ store ]});
        const storeBindings = await arrayifyStream(await result.execute());
        expect(storeBindings).toEqualBindingsArray(datasetBindings);
      });
    });

    describe('two-pattern query on a raw RDF document', () => {
      it('with results', async() => {
        const result = <QueryBindings> await engine.query(`SELECT ?name WHERE {
  <https://www.rubensworks.net/#me> <http://xmlns.com/foaf/0.1/knows> ?v0.
  ?v0 <http://xmlns.com/foaf/0.1/name> ?name.
    }`, { sources: [ 'https://www.rubensworks.net/' ]});
        expect((await arrayifyStream(await result.execute())).length).toBeGreaterThan(20);
      });

      it('without results', async() => {
        const result = <QueryBindings> await engine.query(`SELECT ?name WHERE {
  <https://www.rubensworks.net/#me> <http://xmlns.com/foaf/0.1/knows> ?v0.
  ?v0 <ex:dummy> ?name.
    }`, { sources: [ 'https://www.rubensworks.net/' ]});
        await expect((arrayifyStream(await result.execute()))).resolves.toEqual([]);
      });

      it('for the single source entry', async() => {
        const result = <QueryBindings> await engine.query(`SELECT ?name WHERE {
  <https://www.rubensworks.net/#me> <http://xmlns.com/foaf/0.1/knows> ?v0.
  ?v0 <http://xmlns.com/foaf/0.1/name> ?name.
    }`, { sources: [ 'https://www.rubensworks.net/' ]});
        expect((await arrayifyStream(await result.execute())).length).toBeGreaterThan(20);
      });

      describe('SHACL Compact Syntax Serialisation', () => {
        it('handles the query with SHACL compact syntax as a source', async() => {
          const result = <QueryBindings> await engine.query(`SELECT * WHERE {
    ?s a <http://www.w3.org/2002/07/owl#Ontology>.
  }`, { sources: [
            'https://raw.githubusercontent.com/w3c/data-shapes/gh-pages/shacl-compact-syntax/' +
          'tests/valid/basic-shape-iri.shaclc',
          ]});
          await expect((arrayifyStream(await result.execute()))).resolves.toHaveLength(1);
        });

        it('correctly serializes construct query on a shape in .shaclc as shaclc', async() => {
          const result = <QueryBindings> await engine.query(`CONSTRUCT WHERE {
    ?s ?p ?o
  }`, { sources: [
            'https://raw.githubusercontent.com/w3c/data-shapes/gh-pages/shacl-compact-syntax/' +
          'tests/valid/basic-shape-iri.shaclc',
          ]});

          const { data } = await engine.resultToString(result, 'text/shaclc');

          await expect((stringifyStream(data))).resolves.toEqual('BASE <http://example.org/basic-shape-iri>\n\n' +
    'shape <http://example.org/test#TestShape> {\n' +
    '}\n');
        });

        it('correctly serializes construct query on a shape in .ttl as shaclc', async() => {
          const result = <QueryBindings> await engine.query(`CONSTRUCT WHERE {
    ?s ?p ?o
  }`, { sources: [
            'https://raw.githubusercontent.com/w3c/data-shapes/gh-pages/shacl-compact-syntax/' +
          'tests/valid/basic-shape-iri.ttl',
          ]});

          const { data } = await engine.resultToString(result, 'text/shaclc');

          await expect((stringifyStream(data))).resolves.toEqual('BASE <http://example.org/basic-shape-iri>\n\n' +
    'shape <http://example.org/test#TestShape> {\n' +
    '}\n');
        });
      });
    });

    describe('simple SPO on a TPF entrypoint', () => {
      it('with results', async() => {
        const result = <QueryBindings> await engine.query(`SELECT * WHERE {
      ?s ?p ?o.
    } LIMIT 300`, { sources: [ 'https://fragments.dbpedia.org/2016-04/en' ]});
        await expect((arrayifyStream(await result.execute()))).resolves.toHaveLength(300);
        await new Promise(resolve => setTimeout(resolve, 10)); // To avoid unhandled errors
      });

      it('with filtered results', async() => {
        const result = <QueryBindings> await engine.query(`SELECT * WHERE {
      ?s a ?o.
    } LIMIT 300`, { sources: [ 'https://fragments.dbpedia.org/2016-04/en' ]});
        await expect((arrayifyStream(await result.execute()))).resolves.toHaveLength(300);
        await new Promise(resolve => setTimeout(resolve, 10)); // To avoid unhandled errors
      });
    });

    describe('two-pattern query on a TPF entrypoint', () => {
      it('with results', async() => {
        const result = <QueryBindings> await engine.query(`SELECT * WHERE {
      ?city a <http://dbpedia.org/ontology/Airport>;
            <http://dbpedia.org/property/cityServed> <http://dbpedia.org/resource/Italy>.
    }`, { sources: [ 'https://fragments.dbpedia.org/2016-04/en' ]});
        await expect((arrayifyStream(await result.execute()))).resolves.toHaveLength(19);
      });

      it('without results', async() => {
        const result = <QueryBindings> await engine.query(`SELECT * WHERE {
      ?city a <http://dbpedia.org/ontology/Airport>;
            <http://dbpedia.org/property/cityServed> <http://dbpedia.org/resource/UNKNOWN>.
    }`, { sources: [ 'https://fragments.dbpedia.org/2016-04/en' ]});
        await expect((arrayifyStream(await result.execute()))).resolves.toEqual([]);
      });
    });

    describe('left join with an optional', () => {
      it('should handle filters inside the optional block', async() => {
        const store = new Store();

        store.addQuad(
          DF.namedNode('http://ex.org/Pluto'),
          DF.namedNode('http://ex.org/type'),
          DF.namedNode('http://ex.org/Dog'),
        );
        store.addQuad(
          DF.namedNode('http://ex.org/Mickey'),
          DF.namedNode('http://ex.org/name'),
          DF.literal('Lorem ipsum', 'nl'),
        );

        const result = <QueryBindings> await engine.query(`
        SELECT * WHERE { 
          ?s ?p ?o .
      
          OPTIONAL {
            ?s <http://ex.org/name> ?name .
            FILTER(lang(?name) = 'nl')
          }
        }`, { sources: [ store ]});

        const expectedResult: Bindings[] = [
          BF.bindings([
            [ DF.variable('s'), DF.namedNode('http://ex.org/Pluto') ],
            [ DF.variable('p'), DF.namedNode('http://ex.org/type') ],
            [ DF.variable('o'), DF.namedNode('http://ex.org/Dog') ],
          ]),
          BF.bindings([
            [ DF.variable('name'), DF.literal('Lorem ipsum', 'nl') ],
            [ DF.variable('s'), DF.namedNode('http://ex.org/Mickey') ],
            [ DF.variable('p'), DF.namedNode('http://ex.org/name') ],
            [ DF.variable('o'), DF.literal('Lorem ipsum', 'nl') ],
          ]),
        ];

        await expect(result.execute()).resolves.toEqualBindingsStream(expectedResult);
      });

      it('should handle join with empty estimate cardinality', async() => {
        const context: QueryStringContext = {
          sources: [
            {
              type: 'serialized',
              value: `
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix ex: <http://example.org/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
ex:personA a ex:Person.
#ex:personA ex:hasName "Homer".
`,
              mediaType: 'text/turtle',
              baseIRI: 'http://example.org/',
            },
          ],
        };

        await expect((arrayifyStream(await engine.queryBindings(`
PREFIX ex: <http://example.org/>
SELECT ?person ?personName WHERE {
    OPTIONAL {
        ?person ex:hasName ?personName
    }
    ?person a ex:Person
}
`, context)))).resolves.toHaveLength(1);
      });
    });

    describe('with a throwing fetch function', () => {
      function throwingFetch() {
        throw new Error('Fetch failed!');
      }

      it('should throw when querying once', async() => {
        await expect(engine.query(`
        SELECT ?s ?p ?o WHERE { ?s ?p ?o }`, {
          sources: [ 'https://my.failing.url' ],
          fetch: <any> throwingFetch,
        })).rejects.toThrow('Fetch failed!');
      });

      it('should throw when querying twice', async() => {
        await expect(engine.query(`
        SELECT ?s ?p ?o WHERE { ?s ?p ?o }`, {
          sources: [ 'https://my.failing.url' ],
          fetch: <any> throwingFetch,
        })).rejects.toThrow('Fetch failed!');

        await expect(engine.query(`
        SELECT ?s ?p ?o WHERE { ?s ?p ?o }`, {
          sources: [ 'https://my.failing.url' ],
          fetch: <any> throwingFetch,
        })).rejects.toThrow('Fetch failed!');
      });
    });

    describe('on a remote source', () => {
      it('with non-matching query with limit and filter', async() => {
        const bindingsStream = await engine.queryBindings(`
SELECT * WHERE {
  ?s ?p <http://purl.org/dc/terms/dontExist>
  FILTER(?s>1)
} LIMIT 1`, {
          sources: [ 'https://www.rubensworks.net/' ],
        });
        let called = 0;
        const dataListener = () => {
          called++;
        };
        bindingsStream.on('data', dataListener);
        await new Promise((resolve, reject) => {
          bindingsStream.on('error', reject);
          bindingsStream.on('end', resolve);
        });
        expect(called).toBe(0);
      });

      it('with two triple patterns over a paged collection (no browser)', async() => {
        const bindingsStream = await engine.queryBindings(`
SELECT *
WHERE {
  <https://opendata.picturae.com/dataset/dre_a2a_webservice> <http://purl.org/dc/terms/identifier> ?i.
  <https://opendata.picturae.com/dataset/dre_a2a_webservice> <http://purl.org/dc/terms/issued> ?issued.
}`, {
          sources: [ 'https://opendata.picturae.com/catalog.ttl?page=1' ],
        });
        expect((await bindingsStream.toArray()).length > 0).toBeTruthy();
      });

      // TODO: re-enable this test once https://api.community.hubl.world/skills/ is back up (also performance/benchmark-web/input/queries/hubl...)
      // eslint-disable-next-line multiline-comment-style, style/spaced-comment, jest/no-commented-out-tests
      /*it('with join over union', async() => {
        const bindingsStream = await engine.queryBindings(`
SELECT * WHERE {
  <https://api.community.hubl.world/skills/> <http://www.w3.org/ns/ldp#contains> ?contains.
  {
    { ?contains <http://www.w3.org/2000/01/rdf-schema#label> ?preload_0. }
    UNION
    { ?contains <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> ?preload_1. }
  }
}`, {
          sources: [ 'https://api.community.hubl.world/skills/' ],
        });
        expect((await bindingsStream.toArray()).length > 0).toBeTruthy();
      });*/

      it('on the LOV SPARQL service description (no browser)', async() => {
        await expect(engine.queryBindings(`
PREFIX sh: <http://www.w3.org/ns/shacl#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT DISTINCT ?sq ?comment ?query
WHERE {
  ?sq a sh:SPARQLExecutable ;
    rdfs:comment ?comment ;
    sh:select ?query .
} ORDER BY ?sq`, {
          sources: [{ type: 'file', value: 'https://lov.linkeddata.es/dataset/lov/sparql' }],
        })).rejects.toThrow('RDF parsing failed');
      });

      it('on the LOV SPARQL service description with property paths (2) (no browser)', async() => {
        await expect(engine.queryBindings(`
PREFIX sh: <http://www.w3.org/ns/shacl#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT DISTINCT ?sq ?comment ?query
WHERE {
  ?sq a sh:SPARQLExecutable ;
    rdfs:comment ?comment ;
    sh:select|sh:ask|sh:construct|sh:describe ?query .
} ORDER BY ?sq`, {
          sources: [{ type: 'file', value: 'https://lov.linkeddata.es/dataset/lov/sparql' }],
        })).rejects.toThrow('RDF parsing failed');
      });

      it('should not push distinct construct into a SPARQL endpoint (no browser)', async() => {
        const quadsStream = await engine.queryQuads(`
PREFIX dcat: <http://www.w3.org/ns/dcat#>
construct { ?s a dcat:Dataset }
where {
  ?s a dcat:Dataset ;
    dcat:distribution ?distro . FILTER(?s = <http://data.bibliotheken.nl/id/dataset/rise-alba>)
}`, {
          distinctConstruct: true,
          sources: [{ type: 'sparql', value: 'https://datasetregister.netwerkdigitaalerfgoed.nl/sparql' }],
        });
        await expect((quadsStream.toArray())).resolves.toHaveLength(1);
      });

      it('should not push unsupported extension functions into a SPARQL endpoint (no browser)', async() => {
        const bindingsStream = await engine.queryBindings(`
PREFIX dbr: <http://dbpedia.org/resource/>
PREFIX dbo: <http://dbpedia.org/ontology/>
PREFIX tfn: <https://w3id.org/time-fn#>

SELECT ?birthDate
WHERE {
  dbr:Haren_Das dbo:birthDate ?date;
                 dbo:birthPlace ?birthPlace.
  ?birthPlace dbo:utcOffset ?timezone.
  BIND (tfn:bindDefaultTimezone(?date, ?timezone) AS ?birthDate)
}`, {
          sources: [ 'https://dbpedia.org/sparql' ],
          extensionFunctions: {
            'https://w3id.org/time-fn#bindDefaultTimezone': async function(args: RDF.Term[]) {
              return args[0];
            },
          },
        });
        await expect((bindingsStream.toArray())).resolves.toHaveLength(1);
      });
    });

    describe('on multiple sources', () => {
      it('with an explicit SERVICE clause without sources in context', async() => {
        const bindingsStream = await engine.queryBindings(`
SELECT ?movie ?title ?name
WHERE {
  SERVICE <https://fragments.dbpedia.org/2016-04/en> {
    ?movie dbpedia-owl:starring [ rdfs:label "Brad Pitt"@en ];
         rdfs:label ?title;
         dbpedia-owl:director [ rdfs:label ?name ].
    FILTER LANGMATCHES(LANG(?title), "EN")
    FILTER LANGMATCHES(LANG(?name),  "EN")
  }
}`, {
          sources: [],
        });
        await expect(bindingsStream.toArray()).resolves.toHaveLength(43);
      });

      it('with explicit SERVICE clauses without sources in context', async() => {
        const bindingsStream = await engine.queryBindings(`
SELECT ?person ?name ?book ?title {
  SERVICE <https://fragments.dbpedia.org/2016-04/en> {
    ?person dbpedia-owl:birthPlace [ rdfs:label "San Francisco"@en ].
  }
  SERVICE <https://data.linkeddatafragments.org/viaf> {
    ?viafID schema:sameAs ?person;
               schema:name ?name.
  }
  SERVICE <https://data.linkeddatafragments.org/harvard> {
    ?book dc:contributor [ foaf:name ?name ];
              dc:title ?title.
  }
} LIMIT 10
`, {
          sources: [],
        });
        await expect(bindingsStream.toArray()).resolves.toHaveLength(10);
      });
    });

    describe('property paths', () => {
      it('should handle zero-or-more paths with lists', async() => {
        const context: QueryStringContext = {
          sources: [
            {
              type: 'serialized',
              value: `
PREFIX fhir: <http://hl7.org/fhir/>

<http://hl7.org/fhir/Observation/58671>
  fhir:id [ fhir:v "58671" ];
  fhir:value [
    fhir:coding ( [
      a <http://snomed.info/id/8517006>;
    ] )
  ];
  fhir:component ( [
    fhir:value [
      fhir:coding [] # comment this line
    ];
  ] ).
`,
              mediaType: 'text/turtle',
              baseIRI: 'http://example.org/',
            },
          ],
        };

        await expect((arrayifyStream(await engine.queryBindings(`
PREFIX fhir: <http://hl7.org/fhir/>
SELECT ?obsId {
  ?obs
    fhir:id [ fhir:v ?obsId ].
  ?obs fhir:value [
      fhir:coding [ rdf:rest*/rdf:first [
        a <http://snomed.info/id/8517006> ;
      ] ]
    ].
}
`, context)))).resolves.toHaveLength(1);
      });

      it('should handle zero-or-more paths with 2 variables for no data', async() => {
        const context: QueryStringContext = {
          sources: [
            {
              type: 'serialized',
              value: ``,
              mediaType: 'text/turtle',
              baseIRI: 'http://example.org/',
            },
          ],
        };

        await expect((arrayifyStream(await engine.queryBindings(`
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
SELECT * {
  ?s rdf:rest* ?p.
}
`, context)))).resolves.toHaveLength(0);
      });

      it('should handle one-or-more paths with 2 variables for no data', async() => {
        const context: QueryStringContext = {
          sources: [
            {
              type: 'serialized',
              value: ``,
              mediaType: 'text/turtle',
              baseIRI: 'http://example.org/',
            },
          ],
        };

        await expect((arrayifyStream(await engine.queryBindings(`
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
SELECT * {
  ?s rdf:rest+ ?p.
}
`, context)))).resolves.toHaveLength(0);
      });

      it('should handle zero-or-more paths with 1 variable for no data', async() => {
        const context: QueryStringContext = {
          sources: [
            {
              type: 'serialized',
              value: ``,
              mediaType: 'text/turtle',
              baseIRI: 'http://example.org/',
            },
          ],
        };

        await expect((arrayifyStream(await engine.queryBindings(`
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
SELECT * {
  ?s rdf:rest* rdf:nil.
}
`, context)))).resolves.toHaveLength(1);
      });

      it('should handle one-or-more paths with 1 variable for no data', async() => {
        const context: QueryStringContext = {
          sources: [
            {
              type: 'serialized',
              value: ``,
              mediaType: 'text/turtle',
              baseIRI: 'http://example.org/',
            },
          ],
        };

        await expect((arrayifyStream(await engine.queryBindings(`
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
SELECT * {
  ?s rdf:rest+ rdf:nil.
}
`, context)))).resolves.toHaveLength(0);
      });

      it('should handle one-or-more paths with 0 variables for no data', async() => {
        const context: QueryStringContext = {
          sources: [
            {
              type: 'serialized',
              value: ``,
              mediaType: 'text/turtle',
              baseIRI: 'http://example.org/',
            },
          ],
        };

        await expect((arrayifyStream(await engine.queryBindings(`
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
SELECT * {
  rdf:nil rdf:rest+ rdf:nil.
}
`, context)))).resolves.toHaveLength(0);
      });

      it('should handle zero-or-more paths with 0 variables for no data', async() => {
        const context: QueryStringContext = {
          sources: [
            {
              type: 'serialized',
              value: ``,
              mediaType: 'text/turtle',
              baseIRI: 'http://example.org/',
            },
          ],
        };

        await expect((arrayifyStream(await engine.queryBindings(`
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
SELECT * {
  rdf:nil rdf:rest* rdf:nil.
}
`, context)))).resolves.toHaveLength(1);
      });

      it('should handle one-or-more paths in EXISTS', async() => {
        const context: QueryStringContext = {
          sources: [
            {
              type: 'serialized',
              value: `
@prefix ex: <http://example.org/>.
@prefix owl: <http://www.w3.org/2002/07/owl#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.

ex:class1 a owl:Class; rdfs:label "asdf".
ex:qwer1 a owl:Class;
    rdfs:label "qwer1".
ex:qwer2 a owl:Class;
    rdfs:label "qwer2".
ex:class2 a owl:Class;
    rdfs:label "class2".
ex:qwer3 a owl:Class;
    rdfs:label "qwer3";
    a ex:qwer5.
ex:qwer12 a owl:ObjectProperty;
    rdfs:label "qwer12".
ex:qwer13 a owl:Class.
`,
              mediaType: 'text/turtle',
              baseIRI: 'http://example.org/',
            },
          ],
        };

        await expect((arrayifyStream(await engine.queryBindings(`
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX ex: <http://example.org/>

SELECT
    ?class
    ?label
    ( EXISTS { ?class rdfs:subClassOf+ ex:class1 } AS ?class1 )
    ( EXISTS { ?class rdfs:subClassOf+ ex:class2 } AS ?class2 )
WHERE {
    ?class rdf:type owl:Class ;
           rdfs:label ?label .
    FILTER ( STRSTARTS( STR(?class), STR(ex:) ) )
    FILTER ( ?class NOT IN ( ex:class1, ex:class2 ) )
}
`, context)))).resolves.toHaveLength(3);
      });

      describe('should handle zero-or-more over links', () => {
        it('should correctly terminate for an n3.js store', async() => {
          const store = new Store();
          const A = DF.namedNode('http://example.org/a');
          const B = DF.namedNode('http://example.org/b');
          const C = DF.namedNode('http://example.org/c');
          const P = DF.namedNode('http://example.org/p');

          store.addQuad(A, P, B);
          store.addQuad(A, P, C);
          store.addQuad(B, P, A);
          store.addQuad(B, P, C);
          store.addQuad(C, P, A);
          store.addQuad(C, P, B);

          const result = <QueryBindings> await engine.query(`
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?a (:p/:p)* :b .
        }`, { sources: [ store ]});

          await expect(result.execute()).resolves.toEqualBindingsStream([
            BF.bindings([
              [ DF.variable('a'), DF.namedNode('http://example.org/b') ],
            ]),
            BF.bindings([
              [ DF.variable('a'), DF.namedNode('http://example.org/c') ],
            ]),
            BF.bindings([
              [ DF.variable('a'), DF.namedNode('http://example.org/a') ],
            ]),
          ]);
        });

        it('should correctly terminate for an rdf-stores store', async() => {
          const store = RdfStore.createDefault();
          const A = DF.namedNode('http://example.org/a');
          const B = DF.namedNode('http://example.org/b');
          const C = DF.namedNode('http://example.org/c');
          const P = DF.namedNode('http://example.org/p');

          store.addQuad(DF.quad(A, P, B));
          store.addQuad(DF.quad(A, P, C));
          store.addQuad(DF.quad(B, P, A));
          store.addQuad(DF.quad(B, P, C));
          store.addQuad(DF.quad(C, P, A));
          store.addQuad(DF.quad(C, P, B));

          const result = <QueryBindings> await engine.query(`
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?a (:p/:p)* :b .
        }`, { sources: [ store ]});

          await expect(result.execute()).resolves.toEqualBindingsStream([
            BF.bindings([
              [ DF.variable('a'), DF.namedNode('http://example.org/b') ],
            ]),
            BF.bindings([
              [ DF.variable('a'), DF.namedNode('http://example.org/a') ],
            ]),
            BF.bindings([
              [ DF.variable('a'), DF.namedNode('http://example.org/c') ],
            ]),
          ]);
        });
      });

      describe('should handle zero-or-more paths with lists after a link', () => {
        it('for the built-in store and parser', async() => {
          const context: QueryStringContext = {
            sources: [
              {
                type: 'serialized',
                value: `
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix ex: <https://example.org/> .
ex:devShape a sh:NodeShape ;
    sh:targetClass ex:Main ;
    sh:property [
        sh:path ex:foo ;
        sh:in ( ex:bar1 ex:bar2 ex:bar3 ex:bar4 ex:bar5 ex:bar6 ex:bar7 ex:bar8 ex:bar9 ex:bar10 ) ;
    ] .
`,
                mediaType: 'text/turtle',
                baseIRI: 'http://example.org/',
              },
            ],
          };

          await expect((arrayifyStream(await engine.queryBindings(`
PREFIX sh: <http://www.w3.org/ns/shacl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
SELECT ?option WHERE {
    ?nodeShape sh:property ?propertyShape .
    ?propertyShape sh:in/rdf:rest*/rdf:first ?option .
}
`, context)))).resolves.toHaveLength(10);
        });

        it('for an rdf-stores store', async() => {
          const store = RdfStore.createDefault();
          await new Promise(resolve => store.import(rdfParse.parse(stringToStream(`@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix ex: <https://example.org/> .
ex:devShape a sh:NodeShape ;
    sh:targetClass ex:Main ;
    sh:property [
        sh:path ex:foo ;
        sh:in ( ex:bar1 ex:bar2 ex:bar3 ex:bar4 ex:bar5 ex:bar6 ex:bar7 ex:bar8 ex:bar9 ex:bar10 ) ;
    ] .`), { contentType: 'text/turtle' })).on('end', resolve));

          await expect((arrayifyStream(await engine.queryBindings(`
PREFIX sh: <http://www.w3.org/ns/shacl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
SELECT ?option WHERE {
    ?nodeShape sh:property ?propertyShape .
    ?propertyShape sh:in/rdf:rest*/rdf:first ?option .
}
`, { sources: [ store ]})))).resolves.toHaveLength(10);
        });

        it('for an n3.js store', async() => {
          const store = new Store();
          await new Promise(resolve => store.import(rdfParse.parse(stringToStream(`@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix ex: <https://example.org/> .
ex:devShape a sh:NodeShape ;
    sh:targetClass ex:Main ;
    sh:property [
        sh:path ex:foo ;
        sh:in ( ex:bar1 ex:bar2 ex:bar3 ex:bar4 ex:bar5 ex:bar6 ex:bar7 ex:bar8 ex:bar9 ex:bar10 ) ;
    ] .`), { contentType: 'text/turtle' })).on('end', resolve));

          await expect((arrayifyStream(await engine.queryBindings(`
PREFIX sh: <http://www.w3.org/ns/shacl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
SELECT ?option WHERE {
    ?nodeShape sh:property ?propertyShape .
    ?propertyShape sh:in/rdf:rest*/rdf:first ?option .
}
`, { sources: [ store ]})))).resolves.toHaveLength(10);
        });
      });
    });

    describe('commutative count', () => {
      it('should count commutatively', async() => {
        const context: QueryStringContext = {
          sources: [
            {
              type: 'serialized',
              value: `
              @prefix ex: <http://example.org/> .
            
              <http://foo.org/id/graph/foo> {
                <http://foo.org/id/object/foo>
                  ex:foo ex:Foo ;
                  ex:bar [] ;
                  ex:baz "baz1", "baz2", "baz3" .
              }
              `,
              mediaType: 'text/turtle',
              baseIRI: 'http://example.org/',
            },
          ],
        };

        const expectedResult = [
          [
            [ DF.variable('objects'), DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) ],
            [ DF.variable('p'), DF.namedNode('http://example.org/foo') ],
            [ DF.variable('subjects'), DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) ],
          ],
          [
            [ DF.variable('objects'), DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) ],
            [ DF.variable('p'), DF.namedNode('http://example.org/bar') ],
            [ DF.variable('subjects'), DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) ],
          ],
          [
            [ DF.variable('objects'), DF.literal('3', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) ],
            [ DF.variable('p'), DF.namedNode('http://example.org/baz') ],
            [ DF.variable('subjects'), DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) ],
          ],
        ];

        const bindings1 = (await arrayifyStream(await engine.queryBindings(`
        SELECT (COUNT(DISTINCT ?o) as ?objects) (COUNT(DISTINCT ?s) AS ?subjects) ?p
        FROM <http://foo.org/id/graph/foo>
        {
          ?s ?p ?o .
        }
        GROUP BY ?p
        `, context))).map(binding => [ ...binding ].sort(([ var1, _c1 ], [ var2, _c2 ]) => var1.value.localeCompare(var2.value)));

        const bindings2 = (await arrayifyStream(await engine.queryBindings(`
        SELECT (COUNT(DISTINCT ?s) AS ?subjects) (COUNT(DISTINCT ?o) as ?objects) ?p
        FROM <http://foo.org/id/graph/foo>
        {
          ?s ?p ?o .
        }
        GROUP BY ?p
        `, context))).map(binding => [ ...binding ].sort(([ var1, _c1 ], [ var2, _c2 ]) => var1.value.localeCompare(var2.value)));

        expect(bindings1).toMatchObject(expectedResult);
        expect(bindings2).toMatchObject(expectedResult);
      });
    });

    describe('initialBindings', () => {
      let initialBindings: Bindings;
      let sourcesValue1: string;

      beforeEach(() => {
        initialBindings = BF.bindings([
          [ DF.variable('a'), DF.namedNode('http://example.org/test#testBinding') ],
        ]);
        sourcesValue1 = `
          @prefix ex: <http://example.org/test#> .
          
          ex:testBinding
            ex:property "testProperty" .
          `;
      });

      it('should consider the initialBindings in the bound function', async() => {
        const context: QueryStringContext = {
          sources: [
            {
              type: 'serialized',
              value: sourcesValue1,
              mediaType: 'text/turtle',
            },
          ],
          initialBindings,
        };

        const expectedResult: Bindings[] = [
          BF.bindings([
            [ DF.variable('a'), DF.namedNode('http://example.org/test#testBinding') ],
          ]),
        ];

        const bindings = (await engine.queryBindings(`
        PREFIX ex: <http://example.org/test#>
        
        SELECT $a WHERE {
          {
            FILTER (bound($a))
          }
          $a ex:property "testProperty" .
          FILTER (bound($a)) .
        }
          `, context));

        await expect(bindings).toEqualBindingsStream(expectedResult);
      });

      it('should consider the initialBindings in the filter function', async() => {
        const context: QueryStringContext = {
          sources: [
            {
              type: 'serialized',
              value: sourcesValue1,
              mediaType: 'text/turtle',
            },
          ],
          initialBindings,
        };

        const expectedResult: Bindings[] = [
          BF.bindings([
            [ DF.variable('a'), DF.namedNode('http://example.org/test#testBinding') ],
          ]),
        ];

        const bindings = (await engine.queryBindings(`
        PREFIX ex: <http://example.org/test#>
      
        SELECT $a WHERE {
          {
            SELECT * WHERE {
              FILTER ($a = ex:testBinding) .
            }
          }
        }
        `, context));

        await expect(bindings).toEqualBindingsStream(expectedResult);
      });

      it('should consider the initialBindings in the filter function 2', async() => {
        const context: QueryStringContext = {
          sources: [
            {
              type: 'serialized',
              value: sourcesValue1,
              mediaType: 'text/turtle',
            },
          ],
          initialBindings,
        };

        const expectedResult: Bindings[] = [
          BF.bindings([
            [ DF.variable('a'), DF.namedNode('http://example.org/test#testBinding') ],
          ]),
        ];

        const bindings = (await engine.queryBindings(`
        PREFIX ex: <http://example.org/test#>
      
        SELECT $a WHERE {
          {
            SELECT $a WHERE {
              FILTER ($a = ex:testBinding) .
            }
          }
        }
        `, context));

        await expect(bindings).toEqualBindingsStream(expectedResult);
      });

      it('should consider initialBindings which are not projected', async() => {
        const initialBindings = BF.bindings([
          [ DF.variable('predicate'), DF.namedNode('http://example.org/test#predicateEx') ],
          [ DF.variable('subject'), DF.namedNode('http://example.org/test#subjectEx') ],
        ]);

        const context: QueryStringContext = {
          sources: [
            {
              type: 'serialized',
              value: `
                @prefix ex: <http://example.org/test#> .
                @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
                        
                ex:subjectEx
                    rdf:type ex:Type ;
                    ex:predicateEx "Predicate"@de ;
                .`,
              mediaType: 'text/turtle',
            },
          ],
          initialBindings,
        };

        const bindings = (await engine.queryBindings(`
        SELECT $subject ?value WHERE {
          $subject $predicate ?value .
          FILTER (!isLiteral(?value) || !langMatches(lang(?value), "de"))
        }`, context));

        await expect(bindings).toEqualBindingsStream([]);
      });

      it('should consider initialBindings in the extend operation', async() => {
        const initialBindings = BF.bindings([
          [ DF.variable('initialBindingsVariable'), DF.namedNode('http://example.org/test#InitialBindingsValue') ],
        ]);

        const context: QueryStringContext = {
          sources: [
            {
              type: 'serialized',
              value: ``,
              mediaType: 'text/turtle',
            },
          ],
          initialBindings,
        };

        const bindings = (await engine.queryBindings(`
        PREFIX ex: <http://example.org/test#>
        
        SELECT $initialBindingsVariable
        WHERE {
          BIND ($initialBindingsVariable AS ?b) .
          FILTER (?b = ex:InitialBindingsValue) .
        }`, context));

        const expectedResult: Bindings[] = [
          BF.bindings([
            [ DF.variable('initialBindingsVariable'), DF.namedNode('http://example.org/test#InitialBindingsValue') ],
          ]),
        ];

        await expect(bindings).toEqualBindingsStream(expectedResult);
      });

      it('should not overwrite initialBindings', async() => {
        const context: QueryStringContext = {
          sources: [
            {
              type: 'serialized',
              value: ``,
              mediaType: 'text/turtle',
            },
          ],
          initialBindings,
        };

        // Reject for existing graph
        await expect(engine.queryBindings(`
          SELECT $a
          WHERE {
            BIND (true AS $a) .
          }`, context)).rejects.toThrow('Tried to bind variable ?a in a BIND operator.');
      });
    });

    describe('unionDefaultGraph', () => {
      it('over an N3 Source', async() => {
        const store = new Store([
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1'), DF.namedNode('g1')),
          DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2'), DF.namedNode('g2')),
        ]);
        const result = <QueryBindings> await engine.query(`SELECT * WHERE {
      ?s ?p ?o.
    }`, { sources: [ store ], unionDefaultGraph: true });
        await expect((arrayifyStream(await result.execute()))).resolves.toHaveLength(2);
      });

      it('over an rdf-stores Source', async() => {
        const store = RdfStore.createDefault();
        store.addQuad(DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1'), DF.namedNode('g1')));
        store.addQuad(DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2'), DF.namedNode('g2')));
        const result = <QueryBindings> await engine.query(`SELECT * WHERE {
      ?s ?p ?o.
    }`, { sources: [ store ], unionDefaultGraph: true });
        await expect((arrayifyStream(await result.execute()))).resolves.toHaveLength(2);
      });
    });

    describe('for a complex query', () => {
      it('with VALUES and OPTIONAL', async() => {
        const context: QueryStringContext = {
          sources: [
            {
              type: 'serialized',
              value: `
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix wd: <http://www.wikidata.org/entity/> .

wd:Q726 rdfs:label "horse"@en .
wd:Q726 rdfs:label "Horse"@en-ca .
wd:Q726 rdfs:label "cheval"@fr .
`,
              mediaType: 'text/turtle',
              baseIRI: 'http://example.org/',
            },
          ],
        };

        await expect(engine.queryBindings(`
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?term WHERE {
  VALUES ?term { wd:Q726 }
  OPTIONAL {
    ?term rdfs:label ?text
    # Purposely choosing a language that is not in the data
    FILTER(lang(?text) = "ab")
  }
}
`, context)).resolves.toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('term'), DF.namedNode('http://www.wikidata.org/entity/Q726') ],
          ]),
        ]);
      });

      it('with VALUES and OPTIONAL with expression applying to both', async() => {
        const context: QueryStringContext = {
          sources: [
            {
              type: 'serialized',
              value: `
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix wd: <http://www.wikidata.org/entity/> .

wd:Q726 rdfs:label "horse"@en .
wd:Q726 rdfs:label "Horse"@en-ca .
wd:Q726 rdfs:label "cheval"@fr .
`,
              mediaType: 'text/turtle',
              baseIRI: 'http://example.org/',
            },
          ],
        };

        await expect(engine.queryBindings(`
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?term WHERE {
  VALUES ?term { wd:Q726 }
  OPTIONAL {
    ?term rdfs:label ?text
    # Purposely choosing a language that is not in the data
    FILTER(lang(?text) = "ab" && STR(?term) = "http://www.wikidata.org/entity/Q726" )
  }
}
`, context)).resolves.toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('term'), DF.namedNode('http://www.wikidata.org/entity/Q726') ],
          ]),
        ]);
      });

      it('with OPTIONALs and BIND COALESCE', async() => {
        const context: QueryStringContext = {
          sources: [
            {
              type: 'serialized',
              value: `
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix wd: <http://www.wikidata.org/entity/> .

wd:Q726 rdfs:label "horse"@en .
wd:Q726 rdfs:label "Horse"@en-ca .
wd:Q726 rdfs:label "cheval"@fr .
`,
              mediaType: 'text/turtle',
              baseIRI: 'http://example.org/',
            },
          ],
        };

        await expect(engine.queryBindings(`
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT DISTINCT ?term ?textEN ?textENX ?label
WHERE {
  {
    SELECT ?term (MIN(?text) AS ?textEN)
    WHERE {
      VALUES ?term { wd:Q726 }
      OPTIONAL {
        ?term rdfs:label ?text
        # Purposely choosing a language that is not in the data
        FILTER(lang(?text) = "ab")
      }
    }
    GROUP BY ?term
  }
  {
    SELECT ?term (MIN(?text) AS ?textENX)
    WHERE {
      VALUES ?term { wd:Q726 }
      OPTIONAL {
        ?term rdfs:label ?text
        FILTER(langMatches(lang(?text), "en"))
      }
    }
    GROUP BY ?term
  }
  BIND(
   COALESCE(
      ?textEN, ?textENX, STR(?term)
    )
  AS ?label)
}
`, context)).resolves.toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('term'), DF.namedNode('http://www.wikidata.org/entity/Q726') ],
            [ DF.variable('textENX'), DF.literal('Horse', 'en-ca') ],
            [ DF.variable('label'), DF.literal('Horse', 'en-ca') ],
          ]),
        ]);
      });
    });
  });

  it('recursive triple term creation', async() => {
    const turtleValue = `
PREFIX : <http://example/>
:s :p :o1 .
GRAPH :g {
     <<:s :p :o1 >> :q1 :z1 .
}
GRAPH :g1 { << _:b :r :o3 >> :pb :z3 . }
`;
    const expectedResult: RDF.Quad[] = [
      DF.quad(
        DF.namedNode('http://example/g'),
        DF.namedNode('http://example/graphContains'),
        DF.quad(
          DF.blankNode(),
          DF.namedNode('http://example/q1'),
          DF.quad(
            DF.namedNode('http://example/z1'),
            DF.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#reifies'),
            DF.quad(DF.namedNode('http://example/s'), DF.namedNode('http://example/p'), DF.namedNode('http://example/o1')),
          ),
        ),
      ),
      DF.quad(
        DF.namedNode('http://example/g1'),
        DF.namedNode('http://example/graphContains'),
        DF.quad(
          DF.blankNode(),
          DF.namedNode('http://example/pb'),
          DF.quad(
            DF.namedNode('http://example/z3'),
            DF.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#reifies'),
            DF.quad(DF.blankNode(), DF.namedNode('http://example/r'), DF.namedNode('http://example/o3')),
          ),
        ),
      ),
    ];

    const context: QueryStringContext = { sources: [
      { type: 'serialized', value: turtleValue, mediaType: 'application/trig', baseIRI: 'http://example.org/' },
    ]};
    const query = `
PREFIX : <http://example/>
CONSTRUCT {
  ?g :graphContains ?t .
} WHERE {
  GRAPH ?g {
    ?s ?p1 ?o1 ;
       ?p2 ?o2 .
    FILTER (!isTriple(?o1) && !(?p1 = ?p2 && ?o1 = ?o2)) .
    BIND(<<( ?s ?p1  <<( ?o1 ?p2 ?o2 )>> )>> AS ?t) .
  }
}`;

    await expect(arrayifyStream(await engine.queryQuads(query, context))).resolves
      .toBeRdfIsomorphic(expectedResult);
  });

  // We skip these tests in browsers due to CORS issues
  describe('foaf ontology broken link (no browser)', () => {
    it('returns results with link recovery on [using full key]', async() => {
      const result = <QueryBindings> await engine.query(`SELECT * WHERE {
    <http://xmlns.com/foaf/0.1/> a <http://www.w3.org/2002/07/owl#Ontology>.
  }`, {
        sources: [ 'http://xmlns.com/foaf/spec/20140114.rdf' ],
        [KeysHttpWayback.recoverBrokenLinks.name]: true,
      });
      await expect((arrayifyStream(await result.execute()))).resolves.toHaveLength(1);
    });

    it('returns results with link recovery on [using shortcut key]', async() => {
      const result = <QueryBindings> await engine.query(`SELECT * WHERE {
    <http://xmlns.com/foaf/0.1/> a <http://www.w3.org/2002/07/owl#Ontology>.
  }`, { sources: [ 'http://xmlns.com/foaf/spec/20140114.rdf' ], recoverBrokenLinks: true });
      await expect((arrayifyStream(await result.execute()))).resolves.toHaveLength(1);
    });
  });

  describe('update', () => {
    describe('without sources on destination RDFJS Store', () => {
      it('with direct insert', async() => {
        // Prepare store
        const store = new Store();

        // Execute query
        const result = <RDF.QueryVoid> await engine.query(`INSERT DATA {
          <ex:s> <ex:p> <ex:o>.
        }`, {
          sources: [ 'dummy' ],
          destination: store,
        });
        await result.execute();

        // Check store contents
        expect(store.size).toBe(1);
        expect(store.countQuads(DF.namedNode('ex:s'), DF.namedNode('ex:p'), DF.namedNode('ex:o'), DF.defaultGraph()))
          .toBe(1);
      });

      it('with direct insert on a single source', async() => {
        // Prepare store
        const store = new Store();

        // Execute query
        const result = <RDF.QueryVoid> await engine.query(`INSERT DATA {
          <ex:s> <ex:p> <ex:o>.
        }`, {
          sources: [ store ],
        });
        await result.execute();

        // Check store contents
        expect(store.size).toBe(1);
        expect(store.countQuads(DF.namedNode('ex:s'), DF.namedNode('ex:p'), DF.namedNode('ex:o'), DF.defaultGraph()))
          .toBe(1);
      });

      it('with insert where on a single source', async() => {
        // Prepare store
        const store = new Store([
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p'), DF.namedNode('ex:o'), DF.defaultGraph()),
          DF.quad(DF.blankNode('s'), DF.namedNode('ex:p'), DF.namedNode('ex:o'), DF.defaultGraph()),
          DF.quad(DF.blankNode('ex:s'), DF.namedNode('ex:p'), DF.namedNode('ex:o'), DF.defaultGraph()),
        ]);

        // Execute query
        const result = <RDF.QueryVoid> await engine.query(`INSERT {
          ?s <ex:a> <ex:thing> .
          ?p <ex:a> <ex:thing> .
          ?o <ex:a> <ex:thing> .
        } WHERE { ?s ?p ?o }`, {
          sources: [ store ],
        });
        await result.execute();

        // Check store contents
        expect(store.size).toBe(8);
        expect(store.countQuads(DF.namedNode('ex:s'), DF.namedNode('ex:p'), DF.namedNode('ex:o'), DF.defaultGraph()))
          .toBe(1);
        expect(store.countQuads(DF.blankNode('s'), DF.namedNode('ex:p'), DF.namedNode('ex:o'), DF.defaultGraph()))
          .toBe(1);
        expect(store.countQuads(DF.blankNode('s'), DF.namedNode('ex:a'), DF.namedNode('ex:thing'), DF.defaultGraph()))
          .toBe(1);
        expect(
          store.countQuads(DF.blankNode('ex:s'), DF.namedNode('ex:p'), DF.namedNode('ex:o'), DF.defaultGraph()),
        )
          .toBe(1);
        expect(
          store.countQuads(DF.blankNode('ex:s'), DF.namedNode('ex:a'), DF.namedNode('ex:thing'), DF.defaultGraph()),
        )
          .toBe(1);
        expect(
          store.countQuads(DF.namedNode('ex:s'), DF.namedNode('ex:a'), DF.namedNode('ex:thing'), DF.defaultGraph()),
        )
          .toBe(1);
        expect(
          store.countQuads(DF.namedNode('ex:p'), DF.namedNode('ex:a'), DF.namedNode('ex:thing'), DF.defaultGraph()),
        )
          .toBe(1);
        expect(
          store.countQuads(DF.namedNode('ex:o'), DF.namedNode('ex:a'), DF.namedNode('ex:thing'), DF.defaultGraph()),
        )
          .toBe(1);
      });

      it('with insert where on two sources', async() => {
        // Prepare store
        const store = new Store([
          DF.quad(DF.blankNode('ex:s'), DF.namedNode('ex:p'), DF.namedNode('ex:o'), DF.defaultGraph()),
        ]);
        const store2 = new Store([
          DF.quad(DF.blankNode('ex:s'), DF.namedNode('ex:p'), DF.namedNode('ex:o'), DF.defaultGraph()),
        ]);

        // Execute query
        const result = <RDF.QueryVoid> await engine.query(`INSERT {
          ?s <ex:a> <ex:thing> .
        } WHERE { ?s ?p ?o }`, {
          sources: [ store, store2 ],
          destination: store,
          [KeysQuerySourceIdentify.sourceIds.name]: new Map(),
        });
        await result.execute();

        // Check store contents
        // There should be 3 quads in this destination store
        // (1) The quad that was originally there
        // (2) The quad _:ex:s <ex:a> <ex:thing>, i.e. the insert applied to the bnode from the destination store
        // (3) The quad _:bc_1_ex:s <ex:a> <ex:thing>, i.e. insert applied the the *different* bnode from store2
        expect(store.size).toBe(3);
        expect(store.countQuads(DF.blankNode('ex:s'), DF.namedNode('ex:p'), DF.namedNode('ex:o'), DF.defaultGraph()))
          .toBe(1);
        expect(
          store.countQuads(
            DF.blankNode('bc_1_ex:s'),
            DF.namedNode('ex:a'),
            DF.namedNode('ex:thing'),
            DF.defaultGraph(),
          ),
        ).toBe(1);
        expect(
          store.countQuads(DF.blankNode('ex:s'), DF.namedNode('ex:a'), DF.namedNode('ex:thing'), DF.defaultGraph()),
        ).toBe(1);
      });

      it('with direct insert and delete', async() => {
        // Prepare store
        const store = new Store();
        store.addQuad(DF.quad(DF.namedNode('ex:s-pre'), DF.namedNode('ex:p-pre'), DF.namedNode('ex:o-pre')));

        // Execute query
        const result = <RDF.QueryVoid> await engine.query(`INSERT DATA {
      <ex:s> <ex:p> <ex:o>.
    };
    DELETE DATA {
      <ex:s-pre> <ex:p-pre> <ex:o-pre>.
    }`, {
          sources: [ 'dummy' ],
          destination: store,
        });
        await result.execute();

        // Check store contents
        expect(store.size).toBe(1);
        expect(store.countQuads(DF.namedNode('ex:s'), DF.namedNode('ex:p'), DF.namedNode('ex:o'), DF.defaultGraph()))
          .toBe(1);
        expect(store
          .countQuads(DF.namedNode('ex:s-pre'), DF.namedNode('ex:p-pre'), DF.namedNode('ex:o-pre'), DF.defaultGraph()))
          .toBe(0);
      });

      it('with variable delete', async() => {
        // Prepare store
        const store = new Store();
        store.addQuads([
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')),
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2')),
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p3'), DF.namedNode('ex:o3')),
          DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p4'), DF.namedNode('ex:o4')),
        ]);
        expect(store.size).toBe(4);

        // Execute query
        const result = <RDF.QueryVoid> await engine.query(`DELETE WHERE {
      <ex:s> ?p ?o.
    }`, {
          sources: [ store ],
          destination: store,
        });
        await result.execute();

        // Check store contents
        expect(store.size).toBe(1);
        expect(store.countQuads(DF.namedNode('ex:s2'), DF.namedNode('ex:p4'), DF.namedNode('ex:o4'), DF.defaultGraph()))
          .toBe(1);
      });

      it('with load', async() => {
        // Prepare store
        const store = new Store();

        // Execute query
        const result = <RDF.QueryVoid> await engine.query(
          `LOAD <https://www.rubensworks.net/> INTO GRAPH <ex:graph>`,
          {
            sources: [ 'dummy' ],
            destination: store,
          },
        );
        await result.execute();

        // Check store contents
        expect(store.size > 0).toBeTruthy();
      });

      it('with clear', async() => {
        // Prepare store
        const store = new Store();
        store.addQuads([
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1'), DF.namedNode('ex:g1')),
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2'), DF.namedNode('ex:g2')),
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p3'), DF.namedNode('ex:o3'), DF.namedNode('ex:g3')),
          DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p4'), DF.namedNode('ex:o4'), DF.defaultGraph()),
        ]);
        expect(store.size).toBe(4);

        // Execute query
        const result = <RDF.QueryVoid> await engine.query(`CLEAR NAMED`, {
          sources: [ store ],
          destination: store,
        });
        await result.execute();

        // Check store contents
        expect(store.size).toBe(1);
        expect(store.countQuads(DF.namedNode('ex:s2'), DF.namedNode('ex:p4'), DF.namedNode('ex:o4'), DF.defaultGraph()))
          .toBe(1);
      });

      it('with drop', async() => {
        // Prepare store
        const store = new Store();
        store.addQuads([
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1'), DF.namedNode('ex:g1')),
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2'), DF.namedNode('ex:g2')),
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p3'), DF.namedNode('ex:o3'), DF.namedNode('ex:g3')),
          DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p4'), DF.namedNode('ex:o4'), DF.defaultGraph()),
        ]);
        expect(store.size).toBe(4);

        // Execute query
        const result = <RDF.QueryVoid> await engine.query(`DROP DEFAULT`, {
          sources: [ store ],
          destination: store,
        });
        await result.execute();

        // Check store contents
        expect(store.size).toBe(3);
        expect(store.countQuads(DF.namedNode('ex:s4'), DF.namedNode('ex:p4'), DF.namedNode('ex:o4'), DF.defaultGraph()))
          .toBe(0);
      });

      it('with create', async() => {
        // Prepare store
        const store = new Store();
        store.addQuads([
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1'), DF.namedNode('ex:g1')),
          DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p4'), DF.namedNode('ex:o4'), DF.defaultGraph()),
        ]);
        expect(store.size).toBe(2);

        // Resolve for non-existing graph
        await expect((<RDF.QueryVoid> await engine.query(`CREATE GRAPH <ex:g2>`, {
          sources: [ store ],
          destination: store,
        })).execute()).resolves.toBeUndefined();

        // Reject for existing graph
        await expect((<RDF.QueryVoid> await engine.query(`CREATE GRAPH <ex:g1>`, {
          sources: [ store ],
          destination: store,
        })).execute()).rejects.toThrow('Unable to create graph ex:g1 as it already exists');

        // Resolve for existing graph in silent mode
        await expect((<RDF.QueryVoid> await engine.query(`CREATE SILENT GRAPH <ex:g1>`, {
          sources: [ store ],
          destination: store,
        })).execute()).resolves.toBeUndefined();
      });

      it('with add', async() => {
        // Prepare store
        const store = new Store();
        store.addQuads([
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1'), DF.namedNode('ex:g1')),
          DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2'), DF.defaultGraph()),
        ]);
        expect(store.size).toBe(2);

        // Execute query
        const result = <RDF.QueryVoid> await engine.query(`ADD DEFAULT TO <ex:g1>`, {
          sources: [ store ],
          destination: store,
        });
        await result.execute();

        // Check store contents
        expect(store.size).toBe(3);
        expect(store
          .countQuads(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2'), DF.namedNode('ex:g1')))
          .toBe(1);
      });

      it('with move', async() => {
        // Prepare store
        const store = new Store();
        store.addQuads([
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1'), DF.namedNode('ex:g1')),
          DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2'), DF.defaultGraph()),
        ]);
        expect(store.size).toBe(2);

        // Execute query
        const result = <RDF.QueryVoid> await engine.query(`MOVE DEFAULT TO <ex:g1>`, {
          sources: [ store ],
          destination: store,
        });
        await result.execute();

        // Check store contents
        expect(store.size).toBe(1);
        expect(store
          .countQuads(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2'), DF.namedNode('ex:g1')))
          .toBe(1);
      });

      it('with copy', async() => {
        // Prepare store
        const store = new Store();
        store.addQuads([
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1'), DF.namedNode('ex:g1')),
          DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2'), DF.defaultGraph()),
        ]);
        expect(store.size).toBe(2);

        // Execute query
        const result = <RDF.QueryVoid> await engine.query(`COPY DEFAULT TO <ex:g1>`, {
          sources: [ store ],
          destination: store,
        });
        await result.execute();

        // Check store contents
        expect(store.size).toBe(2);
        expect(store
          .countQuads(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2'), DF.namedNode('ex:g1')))
          .toBe(1);
      });
    });
  });

  describe('explain', () => {
    describe('a simple SPO on a raw RDF document', () => {
      it('explaining parsing', async() => {
        const result = await engine.explain(`SELECT * WHERE {
      ?s ?p ?o.
    }`, {
          sources: [ 'https://www.rubensworks.net/' ],
        }, 'parsed');
        expect(result).toEqual({
          explain: true,
          type: 'parsed',
          data: {
            input: {
              patterns: [
                factory.createPattern(
                  DF.variable('s'),
                  DF.variable('p'),
                  DF.variable('o'),
                ),
              ],
              type: 'bgp',
            },
            type: 'project',
            variables: [
              DF.variable('o'),
              DF.variable('p'),
              DF.variable('s'),
            ],
          },
        });
      });

      it('explaining logical plan', async() => {
        const result = await engine.explain(`SELECT * WHERE {
      ?s ?p ?o.
    }`, {
          sources: [ 'https://www.rubensworks.net/' ],
        }, 'logical');
        expect(result).toMatchObject({
          explain: true,
          type: 'logical',
          data: {
            input: Object.assign(
              factory.createPattern(
                DF.variable('s'),
                DF.variable('p'),
                DF.variable('o'),
              ),
              {
                metadata: {
                  scopedSource: {
                    source: expect.anything(),
                  },
                },
              },
            ),
            type: 'project',
            variables: [
              DF.variable('o'),
              DF.variable('p'),
              DF.variable('s'),
            ],
          },
        });
      });

      it('explaining physical plan', async() => {
        const result = await engine.explain(`SELECT * WHERE {
      ?s ?p ?o.
    }`, {
          sources: [ 'https://www.rubensworks.net/' ],
        }, 'physical');
        expect(result).toEqual({
          explain: true,
          type: 'physical',
          data: `project (o,p,s)
  pattern (?s ?p ?o) src:0

sources:
  0: QuerySourceHypermedia(https://www.rubensworks.net/)(SkolemID:0)`,
        });
      });

      it('explaining physical-json plan', async() => {
        const result = await engine.explain(`SELECT * WHERE {
      ?s ?p ?o.
    }`, {
          sources: [ 'https://www.rubensworks.net/' ],
        }, 'physical-json');
        expect(result).toEqual({
          explain: true,
          type: 'physical-json',
          data: {
            logical: 'project',
            variables: [ 'o', 'p', 's' ],
            children: [
              {
                logical: 'pattern',
                pattern: '?s ?p ?o',
                source: 'QuerySourceHypermedia(https://www.rubensworks.net/)(SkolemID:0)',
              },
            ],
          },
        });
      });
    });
  });
});
