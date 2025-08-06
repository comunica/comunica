import 'jest-rdf';
import { ActionContext, Bus } from '@comunica/core';
import { ActorQueryProcessRemoteCache } from '../lib/ActorQueryProcessRemoteCache';
import { translate } from 'sparqlalgebrajs';
import '@comunica/utils-jest';
import { error, isResult, result } from 'result-interface';
import {
  getCachedQuads,
  OutputOption,
} from 'sparql-cache-client';
import { KeyRemoteCache, KeysInitQuery } from '@comunica/context-entries';
import { SparqlJsonParser } from "sparqljson-parse";
import { ComunicaDataFactory } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import { ArrayIterator } from 'asynciterator';
import { RdfStore } from 'rdf-stores';
import type * as RDF from '@rdfjs/types';
import { arrayifyStream } from 'arrayify-stream';

const RDF_FACTORY: ComunicaDataFactory = new DataFactory();

const SPARQL_JSON_PARSER = new SparqlJsonParser({
  dataFactory: RDF_FACTORY,
  prefixVariableQuestionMark: false,
});

jest.mock('sparql-cache-client');

const mockGetCachedQuads = getCachedQuads as jest.MockedFunction<typeof getCachedQuads>;

describe('ActorQueryProcessRemoteCache', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe(ActorQueryProcessRemoteCache.name, () => {
    describe("test", () => {
      it("should always pass the test", () => {
        const actor = new ActorQueryProcessRemoteCache({ name: 'actor', bus, fallBackQueryProcess: <any>{}, cacheHitAlgorithm: 'equality' });
        return expect(actor.test(<any>{})).resolves.toPassTestVoid();
      })
    });

    describe(ActorQueryProcessRemoteCache.equalityCacheHit.name, () => {
      it("should return true given equal queries", async () => {
        const q1 = translate("SELECT * WHERE {?s ?p ?o}");
        const q2 = translate("SELECT * WHERE {?s ?p   ?o. }   ");

        const resp = await ActorQueryProcessRemoteCache.equalityCacheHit(q1, q2);

        expect(resp).toStrictEqual(result(true));
      });

      it("should return false given different queries", async () => {
        const q1 = translate("SELECT * WHERE {?s ?p ?o}");
        const q2 = translate("SELECT * WHERE {?s ?z   ?o. }   ");

        const resp = await ActorQueryProcessRemoteCache.equalityCacheHit(q1, q2);

        expect(resp).toStrictEqual(result(false));
      });

    });

    describe("generateQueryContainmentCacheHitFunction", () => {
      let actor: ActorQueryProcessRemoteCache;

      const fallBackQueryProcess = {
        run: jest.fn()
      };

      beforeEach(() => {
        actor = new ActorQueryProcessRemoteCache({ name: 'actor', bus, fallBackQueryProcess: <any>fallBackQueryProcess, cacheHitAlgorithm: 'equality' });
        jest.resetAllMocks();
      });

      it("should return true given 2 identical queries", async () => {
        const func = await actor.generateQueryContainmentCacheHitFunction();
        const q1 = translate("SELECT * WHERE {?s ?p ?o}");
        const q2 = translate("SELECT * WHERE {?s ?p   ?o. }   ");

        const resp = await func(q1, q2);

        expect(resp).toStrictEqual(result(true));
      });

      it("should return false given different queries", async () => {
        const func = await actor.generateQueryContainmentCacheHitFunction();

        const q1 = translate("SELECT * WHERE {?s ?p ?o}");
        const q2 = translate("SELECT * WHERE {?s ?z   ?o. }   ");

        const resp = await func(q1, q2);

        expect(resp).toStrictEqual(result(false));
      });

      it("should return true given contained queries", async () => {
        const func = await actor.generateQueryContainmentCacheHitFunction();
        const q1 = translate(`
          PREFIX ex: <http://example.org/>

          SELECT ?x ?y
          WHERE {
            ?x ex:friend ?y .
            ?x ex:friend ex:bob .
          }`);

        const q2 = translate(`
          PREFIX ex: <http://example.org/>

          SELECT ?x ?y
          WHERE {
            ?x ex:friend ?y .
          }`);

        const resp = await func(q1, q2);

        expect(resp).toStrictEqual(result(true));
      });

      it("should return false given not contained queries", async () => {
        const func = await actor.generateQueryContainmentCacheHitFunction();
        const q1 = translate(`
          PREFIX ex: <http://example.org/>

          SELECT ?x
          WHERE {
            ?x ex:friend ?y .
            ?x ex:friend ex:bob .
          }`);

        const q2 = translate(`
          PREFIX ex: <http://example.org/>

          SELECT ?x
          WHERE {
            ?x ex:friend ?y .
          }`);

        const resp = await func(q1, q2);

        expect(resp).toStrictEqual(result(true));
      });

    });

    describe("queryCachedResults", () => {
      let actor: ActorQueryProcessRemoteCache;

      beforeEach(() => {
        actor = new ActorQueryProcessRemoteCache({ name: 'actor', bus, fallBackQueryProcess: <any>{}, cacheHitAlgorithm: 'equality' });
        jest.clearAllMocks();
      });

      it("should thrown an error when the cache URL does not exist", async () => {
        const action = {
          query: "SELECT * WHERE {?s ?p ?o}",
          context: new ActionContext()
        };

        const resp = await actor.queryCachedResults(action);

        expect(resp).toStrictEqual(error(new Error("cache URL does not exist")));
      });

      it("should return an error given a chache hit algoritm not supported", async () => {
        actor = new ActorQueryProcessRemoteCache({ name: 'actor', bus, fallBackQueryProcess: <any>{}, cacheHitAlgorithm: <any>'foo' });

        const action = {
          query: "SELECT * WHERE {?s ?p ?o}",
          context: new ActionContext({
            [KeyRemoteCache.location.name]: { url: "URL" }
          })
        };

        const resp = await actor.queryCachedResults(action);

        expect(resp).toStrictEqual(error(new Error("algorithm foo not supported")));
      });

      it("should return an error given a getCachedQuads return an error", async () => {
        mockGetCachedQuads.mockResolvedValue(error(new Error("an error")));

        const action = {
          query: "SELECT * WHERE {?s ?p ?o}",
          context: new ActionContext({
            [KeyRemoteCache.location.name]: { path: "path" }
          })
        };

        const resp = await actor.queryCachedResults(action);

        expect(resp).toStrictEqual(error(new Error("an error")));
      });

      it("should return an error given no cache values are returned", async () => {
        mockGetCachedQuads.mockResolvedValue(result(undefined));

        const action = {
          query: "SELECT * WHERE {?s ?p ?o}",
          context: new ActionContext({
            [KeyRemoteCache.location.name]: { path: "path" }
          })
        };

        const resp = await actor.queryCachedResults(action);

        expect(resp).toStrictEqual(error(new Error("no cached value")));
      });

      it("should return the bindings given an equality cache hit algorithm", async () => {
        const sparqlJsonString = `
                {
                "head": { "vars": [ "book" , "title" ]
                } ,
                "results": { 
                    "bindings": [
                    {
                        "book": { "type": "uri" , "value": "http://example.org/book/book6" } ,
                        "title": { "type": "literal" , "value": "Harry Potter and the Half-Blood Prince" }
                    } ,
                    {
                        "book": { "type": "uri" , "value": "http://example.org/book/book7" } ,
                        "title": { "type": "literal" , "value": "Harry Potter and the Deathly Hallows" }
                    } ,
                    {
                        "book": { "type": "uri" , "value": "http://example.org/book/book5" } ,
                        "title": { "type": "literal" , "value": "Harry Potter and the Order of the Phoenix" }
                    } ,
                    {
                        "book": { "type": "uri" , "value": "http://example.org/book/book4" } ,
                        "title": { "type": "literal" , "value": "Harry Potter and the Goblet of Fire" }
                    } ,
                    {
                        "book": { "type": "uri" , "value": "http://example.org/book/book2" } ,
                        "title": { "type": "literal" , "value": "Harry Potter and the Chamber of Secrets" }
                    } ,
                    {
                        "book": { "type": "uri" , "value": "http://example.org/book/book3" } ,
                        "title": { "type": "literal" , "value": "Harry Potter and the Prisoner Of Azkaban" }
                    } ,
                    {
                        "book": { "type": "uri" , "value": "http://example.org/book/book1" } ,
                        "title": { "type": "literal" , "value": "Harry Potter and the Philosopher's Stone" }
                    }
                    ]
                }
                }`;
        const bindings = SPARQL_JSON_PARSER.parseJsonResults(JSON.parse(sparqlJsonString));

        mockGetCachedQuads.mockResolvedValue(result({ cache: bindings, algorithmIndex: 0 }));

        const expectedBinding = new ArrayIterator(ActorQueryProcessRemoteCache.bindingConvertion(bindings), { autoStart: false });

        const action = {
          query: "SELECT * WHERE {?s ?p ?o}",
          context: new ActionContext({
            [KeyRemoteCache.location.name]: { path: "path" }
          })
        };

        const resp = await actor.queryCachedResults(action);

        expect(resp).toStrictEqual(result({ bindings: expectedBinding }));
      });

      it("should return a store with the bindings converted to triples given the containment algorithm is used ", async () => {
        actor = new ActorQueryProcessRemoteCache({ name: 'actor', bus, fallBackQueryProcess: <any>{}, cacheHitAlgorithm: 'containment' });

        const sparqlJsonString = `
                {
                "head": { "vars": [ "book" , "title" ]
                } ,
                "results": { 
                    "bindings": [
                    {
                        "book": { "type": "uri" , "value": "http://example.org/book/book6" } ,
                        "title": { "type": "literal" , "value": "Harry Potter and the Half-Blood Prince" }
                    } ,
                    {
                        "book": { "type": "uri" , "value": "http://example.org/book/book7" } ,
                        "title": { "type": "literal" , "value": "Harry Potter and the Deathly Hallows" }
                    } 
                    ]
                }
                }`;
        const bindings = SPARQL_JSON_PARSER.parseJsonResults(JSON.parse(sparqlJsonString));

        mockGetCachedQuads.mockResolvedValue(result({ cache: bindings, algorithmIndex: 0 }));

        const expectedQuads = [
          RDF_FACTORY.quad(
            RDF_FACTORY.namedNode("http://example.org/book/book6"),
            RDF_FACTORY.namedNode("http://example.org/title"),
            RDF_FACTORY.literal("Harry Potter and the Half-Blood Prince"),
          ),
          RDF_FACTORY.quad(
            RDF_FACTORY.namedNode("http://example.org/book/book6"),
            <any>RDF_FACTORY.blankNode(),
            RDF_FACTORY.blankNode(),
          ),
          RDF_FACTORY.quad(
            RDF_FACTORY.namedNode("http://example.org/book/book7"),
            RDF_FACTORY.namedNode("http://example.org/title"),
            RDF_FACTORY.literal("Harry Potter and the Deathly Hallows"),
          ),
          RDF_FACTORY.quad(
            RDF_FACTORY.namedNode("http://example.org/book/book7"),
            <any>RDF_FACTORY.blankNode(),
            RDF_FACTORY.blankNode(),
          )
        ];

        const action = {
          query: `
          PREFIX ex: <http://example.org/>

          SELECT ?book ?title WHERE {
            ?book  ?p ?o.
            ?book ex:title ?title .
          }`,
          context: new ActionContext({
            [KeyRemoteCache.location.name]: { path: "path" }
          })
        };

        const resp = await actor.queryCachedResults(action);

        expect(isResult(resp)).toBe(true);
        const stores: RDF.Store[] = (<any>resp).value.stores;
        expect(stores.length).toBe(1);

        expect(await arrayifyStream(stores[0].match())).toBeRdfIsomorphic(expectedQuads);

      });

      it("should return a stores with the bindings converted to triples given the containment algorithm is used and stores are provided as sources", async () => {
        actor = new ActorQueryProcessRemoteCache({ name: 'actor', bus, fallBackQueryProcess: <any>{}, cacheHitAlgorithm: 'containment' });

        const sparqlJsonString = `
                {
                "head": { "vars": [ "book" , "title" ]
                } ,
                "results": { 
                    "bindings": [
                    {
                        "book": { "type": "uri" , "value": "http://example.org/book/book6" } ,
                        "title": { "type": "literal" , "value": "Harry Potter and the Half-Blood Prince" }
                    } ,
                    {
                        "book": { "type": "uri" , "value": "http://example.org/book/book7" } ,
                        "title": { "type": "literal" , "value": "Harry Potter and the Deathly Hallows" }
                    } 
                    ]
                }
                }`;
        const bindings = SPARQL_JSON_PARSER.parseJsonResults(JSON.parse(sparqlJsonString));

        mockGetCachedQuads.mockResolvedValue(result({ cache: bindings, algorithmIndex: 0 }));

        const expectedQuads = [
          RDF_FACTORY.quad(
            RDF_FACTORY.namedNode("http://example.org/book/book6"),
            RDF_FACTORY.namedNode("http://example.org/title"),
            RDF_FACTORY.literal("Harry Potter and the Half-Blood Prince"),
          ),
          RDF_FACTORY.quad(
            RDF_FACTORY.namedNode("http://example.org/book/book6"),
            <any>RDF_FACTORY.blankNode(),
            RDF_FACTORY.blankNode(),
          ),
          RDF_FACTORY.quad(
            RDF_FACTORY.namedNode("http://example.org/book/book7"),
            RDF_FACTORY.namedNode("http://example.org/title"),
            RDF_FACTORY.literal("Harry Potter and the Deathly Hallows"),
          ),
          RDF_FACTORY.quad(
            RDF_FACTORY.namedNode("http://example.org/book/book7"),
            <any>RDF_FACTORY.blankNode(),
            RDF_FACTORY.blankNode(),
          )
        ];

        const quadsFromStore1 = [
          RDF_FACTORY.quad(
            RDF_FACTORY.namedNode("http://example.org/book/book22"),
            RDF_FACTORY.namedNode("http://example.org/extra"),
            RDF_FACTORY.literal("?"),
          ),
          RDF_FACTORY.quad(
            RDF_FACTORY.namedNode("http://example.org/book/foot6"),
            RDF_FACTORY.namedNode("http://example.org/alpha"),
            RDF_FACTORY.blankNode(),
          )
        ];

        const quadsFromStore2 = [
          RDF_FACTORY.quad(
            RDF_FACTORY.namedNode("http://example.org/book/foo"),
            RDF_FACTORY.namedNode("http://example.org/bar"),
            RDF_FACTORY.literal("..."),
          ),
          RDF_FACTORY.quad(
            RDF_FACTORY.namedNode("http://example.org/book/foot6"),
            RDF_FACTORY.namedNode("http://example.org/alpha"),
            RDF_FACTORY.blankNode(),
          )
        ];

        const store1 = RdfStore.createDefault();
        for (const triple of quadsFromStore1) {
          store1.addQuad(triple);
        }
        const store2 = RdfStore.createDefault();
        for (const triple of quadsFromStore2) {
          store2.addQuad(triple);
        }

        const action = {
          query: `
          PREFIX ex: <http://example.org/>

          SELECT ?book ?title WHERE {
            ?book  ?p ?o.
            ?book ex:title ?title .
          }`,
          context: new ActionContext({
            [KeyRemoteCache.location.name]: { path: "path" },
            "sources": [store1, store2, "boo"]
          })
        };

        const resp = await actor.queryCachedResults(action);

        expect(isResult(resp)).toBe(true);
        const stores: RDF.Store[] = (<any>resp).value.stores;
        expect(stores.length).toBe(3);

        expect(await arrayifyStream(stores[0].match())).toBeRdfIsomorphic(expectedQuads);
        expect(await arrayifyStream(stores[1].match())).toBeRdfIsomorphic(quadsFromStore1);
        expect(await arrayifyStream(stores[2].match())).toBeRdfIsomorphic(quadsFromStore2);
      });

      it('should use all the algoritms when the actor is defined with all algorithms', async () => {
        actor = new ActorQueryProcessRemoteCache({ name: 'actor', bus, fallBackQueryProcess: <any>{}, cacheHitAlgorithm: 'all' });

        mockGetCachedQuads.mockResolvedValue(result({ cache: [], algorithmIndex: 0 }));

        const action = {
          query: `
          PREFIX ex: <http://example.org/>

          SELECT ?book ?title WHERE {
            ?book  ?p ?o.
            ?book ex:title ?title .
          }`,
          context: new ActionContext({
            [KeyRemoteCache.location.name]: { path: "path" }
          })
        };

        const expectedInput: any = {
          cache: { path: "path" },
          query: translate(action.query),
          // Only includes non-SERVICE endpoint(s)
          endpoints: [],
          cacheHitAlgorithms: [
            { algorithm: await actor.generateQueryContainmentCacheHitFunction(), time_limit: 1_000 },
            { algorithm: ActorQueryProcessRemoteCache.equalityCacheHit, time_limit: 1_000 }
          ],
          maxConcurentExecCacheHitAlgorithm: undefined,

          outputOption: OutputOption.BINDING_BAG
        };

        await actor.queryCachedResults(action);

        expect(mockGetCachedQuads).toHaveBeenCalledTimes(1);
        expect(mockGetCachedQuads).toHaveBeenCalledWith({
          ...expectedInput,
          cacheHitAlgorithms:[
            {algorithm: expect.any(Function), time_limit:1_000},
            {algorithm: ActorQueryProcessRemoteCache.equalityCacheHit, time_limit:1_000}
          ]
        });
      });
    });

    describe("run", () => {
      let actor: ActorQueryProcessRemoteCache;
      const fallBackQueryProcess = {
        run: jest.fn()
      };

      const action = {
        query: "SELECT * WHERE {?s ?p ?o}",
        context: new ActionContext({
          [KeyRemoteCache.location.name]: { path: "path" }
        })
      };

      beforeEach(() => {
        actor = new ActorQueryProcessRemoteCache({ name: 'actor', bus, fallBackQueryProcess: <any>fallBackQueryProcess, cacheHitAlgorithm: 'equality' });
        jest.resetAllMocks();
      });

      it("should execute the fallback process given a cache process returning an error", async () => {
        fallBackQueryProcess.run.mockResolvedValueOnce("done");
        mockGetCachedQuads.mockResolvedValue(error(new Error("an error")));

        const resp = await actor.run(action);

        expect(fallBackQueryProcess.run).toHaveBeenCalledTimes(1);
        expect(fallBackQueryProcess.run).toHaveBeenCalledWith(action, undefined);
        expect(resp).toBe(<any>"done");
      });

      it("should execute return the cache binding given cached bindings are available", async () => {
        const spyQueryCachedResults = jest.spyOn(actor, "queryCachedResults");
        const sparqlJsonString = `
                {
                "head": { "vars": [ "book" , "title" ]
                } ,
                "results": { 
                    "bindings": [
                    {
                        "book": { "type": "uri" , "value": "http://example.org/book/book6" } ,
                        "title": { "type": "literal" , "value": "Harry Potter and the Half-Blood Prince" }
                    } ,
                    {
                        "book": { "type": "uri" , "value": "http://example.org/book/book7" } ,
                        "title": { "type": "literal" , "value": "Harry Potter and the Deathly Hallows" }
                    } ,
                    {
                        "book": { "type": "uri" , "value": "http://example.org/book/book5" } ,
                        "title": { "type": "literal" , "value": "Harry Potter and the Order of the Phoenix" }
                    } ,
                    {
                        "book": { "type": "uri" , "value": "http://example.org/book/book4" } ,
                        "title": { "type": "literal" , "value": "Harry Potter and the Goblet of Fire" }
                    } ,
                    {
                        "book": { "type": "uri" , "value": "http://example.org/book/book2" } ,
                        "title": { "type": "literal" , "value": "Harry Potter and the Chamber of Secrets" }
                    } ,
                    {
                        "book": { "type": "uri" , "value": "http://example.org/book/book3" } ,
                        "title": { "type": "literal" , "value": "Harry Potter and the Prisoner Of Azkaban" }
                    } ,
                    {
                        "book": { "type": "uri" , "value": "http://example.org/book/book1" } ,
                        "title": { "type": "literal" , "value": "Harry Potter and the Philosopher's Stone" }
                    }
                    ]
                }
                }`;
        const bindings = SPARQL_JSON_PARSER.parseJsonResults(JSON.parse(sparqlJsonString));
        const expectedBinding = new ArrayIterator(ActorQueryProcessRemoteCache.bindingConvertion(bindings), { autoStart: false });

        spyQueryCachedResults.mockResolvedValue(result({ bindings: expectedBinding }));

        const resp = await actor.run(action);

        expect(fallBackQueryProcess.run).toHaveBeenCalledTimes(0);
        expect(resp.result.type).toBe('bindings');
        expect((<any>resp.result).bindingsStream).toStrictEqual(expectedBinding);
      });

      it("should execute the fallback given the cache return an RDF store", async () => {
        const spyQueryCachedResults = jest.spyOn(actor, "queryCachedResults");
        const stores: any = ["a", "b", "c", "d"]
        spyQueryCachedResults.mockResolvedValueOnce(result({ stores: stores }));
        fallBackQueryProcess.run.mockResolvedValueOnce("done");

        const resp = await actor.run(action);

        const expectedAction = {
          ...action,
          context: action.context.set(KeysInitQuery.querySourcesUnidentified, stores)
        }
        expect(fallBackQueryProcess.run).toHaveBeenCalledTimes(1);
        expect(fallBackQueryProcess.run).toHaveBeenCalledWith(expectedAction, undefined);
        expect(resp).toBe("done");

      });

    });
  });
});
