import { ActionContext, Bus } from '@comunica/core';
import { ActorQueryProcessRemoteCache } from '../lib/ActorQueryProcessRemoteCache';
import { translate } from 'sparqlalgebrajs';
import '@comunica/utils-jest';
import { error, result } from 'result-interface';
import {
  getCachedQuads,
} from 'sparql-cache-client';
import { KeyRemoteCache, KeysInitQuery } from '@comunica/context-entries';
import { SparqlJsonParser } from "sparqljson-parse";
import { ComunicaDataFactory } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import { ArrayIterator } from 'asynciterator';

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

    describe("queryCachedResults", () => {
      let actor: ActorQueryProcessRemoteCache;

      beforeEach(() => {
        actor = new ActorQueryProcessRemoteCache({ name: 'actor', bus, fallBackQueryProcess: <any>{}, cacheHitAlgorithm: 'equality' });
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

        expect(resp).toStrictEqual(result(expectedBinding));
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
        expect(resp).toBe("done");
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

        spyQueryCachedResults.mockResolvedValue(result(expectedBinding));

        const resp = await actor.run(action);

        expect(fallBackQueryProcess.run).toHaveBeenCalledTimes(0);
        expect(resp.result.type).toBe('bindings');
        expect((<any>resp.result).bindingsStream).toStrictEqual(expectedBinding);
      });

      it("should execute the fallback given the cache return an RDF store", async ()=>{
        const spyQueryCachedResults = jest.spyOn(actor, "queryCachedResults");
        const stores:any = ["a", "b", "c", "d"]
        spyQueryCachedResults.mockResolvedValueOnce(result(stores));
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
