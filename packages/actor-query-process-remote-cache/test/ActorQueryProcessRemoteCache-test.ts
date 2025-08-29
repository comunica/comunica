import "jest-rdf";
import { ActionContext, Bus } from "@comunica/core";
import "@comunica/utils-jest";
import { KeysInitQuery } from "@comunica/context-entries";
import type { ComunicaDataFactory } from "@comunica/types";
import type * as RDF from "@rdfjs/types";
import { arrayifyStream } from "arrayify-stream";
import { ArrayIterator, AsyncIterator, fromArray } from "asynciterator";
import { DataFactory } from "rdf-data-factory";
import { RdfStore } from "rdf-stores";
import { error, isResult, result } from "result-interface";
import { getCachedQuads, OutputOption } from "sparql-cache-client";
import { translate, Algebra, Util, Factory } from "sparqlalgebrajs";
import { SparqlJsonParser } from "sparqljson-parse";
import type { IBindings } from "sparqljson-parse";
import {
  ActorQueryProcessRemoteCache,
  Algorithm,
  QUERY_PROCESSING_LABEL,
  KeyRemoteCache
} from "../lib/ActorQueryProcessRemoteCache";
import { BindingsFactory } from "@comunica/utils-bindings-factory";

const RDF_FACTORY: ComunicaDataFactory = new DataFactory();
const AF = new Factory(<any>RDF_FACTORY);
const BF = new BindingsFactory(RDF_FACTORY);

const SPARQL_JSON_PARSER = new SparqlJsonParser({
  dataFactory: RDF_FACTORY,
  prefixVariableQuestionMark: false,
});

jest.mock("sparql-cache-client");

const mockGetCachedQuads = getCachedQuads as jest.MockedFunction<
  typeof getCachedQuads
>;

describe(ActorQueryProcessRemoteCache.name, () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: "bus" });
  });

  describe("test", () => {
    it("should always pass the test", () => {
      const actor = new ActorQueryProcessRemoteCache({
        name: "actor",
        bus,
        fallBackQueryProcess: <any>{},
        cacheHitAlgorithm: Algorithm.EQ,
      });
      return expect(actor.test(<any>{})).resolves.toPassTestVoid();
    });
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
      run: jest.fn(),
    };

    beforeEach(() => {
      actor = new ActorQueryProcessRemoteCache({
        name: "actor",
        bus,
        fallBackQueryProcess: <any>fallBackQueryProcess,
        cacheHitAlgorithm: Algorithm.EQ,
      });
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
      actor = new ActorQueryProcessRemoteCache({
        name: "actor",
        bus,
        fallBackQueryProcess: <any>{},
        cacheHitAlgorithm: Algorithm.EQ,
      });
      jest.clearAllMocks();
    });

    it("should thrown an error when the cache URL does not exist", async () => {
      const action = {
        query: "SELECT * WHERE {?s ?p ?o}",
        context: new ActionContext(),
      };

      const resp = await actor.queryCachedResults(action);

      expect(resp).toStrictEqual(error(new Error("cache URL does not exist")));
    });

    it("should return an error given a chache hit algoritm not supported", async () => {
      actor = new ActorQueryProcessRemoteCache({
        name: "actor",
        bus,
        fallBackQueryProcess: <any>{},
        cacheHitAlgorithm: <any>"foo",
      });

      const action = {
        query: "SELECT * WHERE {?s ?p ?o}",
        context: new ActionContext({
          [KeyRemoteCache.location.name]: { url: "URL" },
        }),
      };

      const resp = await actor.queryCachedResults(action);

      expect(resp).toStrictEqual(
        error(new Error("algorithm foo not supported"))
      );
    });

    it("should return an error given a getCachedQuads return an error", async () => {
      mockGetCachedQuads.mockResolvedValue(error(new Error("an error")));

      const action = {
        query: "SELECT * WHERE {?s ?p ?o}",
        context: new ActionContext({
          [KeyRemoteCache.location.name]: { path: "path" },
        }),
      };

      const resp = await actor.queryCachedResults(action);

      expect(resp).toStrictEqual(error(new Error("an error")));
    });

    it("should return an error given no cache values are returned", async () => {
      mockGetCachedQuads.mockResolvedValue(result(undefined));

      const action = {
        query: "SELECT * WHERE {?s ?p ?o}",
        context: new ActionContext({
          [KeyRemoteCache.location.name]: { path: "path" },
        }),
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
      const bindings = SPARQL_JSON_PARSER.parseJsonResults(
        JSON.parse(sparqlJsonString)
      );
      const id = RDF_FACTORY.blankNode();
      mockGetCachedQuads.mockResolvedValue(
        result({
          cache: bindings,
          algorithmIndex: 0,
          id,
          query: translate("SELECT * WHERE {?s ?p ?o}"),
        })
      );

      const expectedBinding = new ArrayIterator(
        ActorQueryProcessRemoteCache.bindingConvertion(bindings),
        { autoStart: false }
      );

      const action = {
        query: "SELECT * WHERE {?s ?p ?o}",
        context: new ActionContext({
          [KeyRemoteCache.location.name]: { path: "path" },
        }),
      };

      const resp = await actor.queryCachedResults(action);

      expect(resp).toStrictEqual(result({ bindings: expectedBinding, id }));
    });

    it("should return a store with the bindings converted to triples given the containment algorithm is used and complementary quads are needed", async () => {
      const complementatyResults = {
        result: {
          type: "quad",
          quadStream: new ArrayIterator(
            [
              RDF_FACTORY.quad(
                RDF_FACTORY.namedNode("http://example.org/book/book7"),
                <any>RDF_FACTORY.blankNode(),
                RDF_FACTORY.blankNode()
              ),
              RDF_FACTORY.quad(
                RDF_FACTORY.namedNode("http://example.org/book/book7"),
                RDF_FACTORY.namedNode("http://example.org/title"),
                RDF_FACTORY.literal("Harry Potter and the Deathly Hallows")
              ),
            ],
            {
              autoStart: false,
            }
          ),
        },
      };
      const fallBackQueryProcess: any = {
        run: jest.fn().mockResolvedValueOnce(complementatyResults),
      };
      actor = new ActorQueryProcessRemoteCache({
        name: "actor",
        bus,
        fallBackQueryProcess,
        cacheHitAlgorithm: Algorithm.CONTAINMENT,
      });

      const sparqlJsonString = `
                {
                "head": { "vars": [ "book" , "title" ]
                } ,
                "results": { 
                    "bindings": [
                    {
                        "book": { "type": "uri" , "value": "http://example.org/book/book6" } ,
                        "title": { "type": "literal" , "value": "Harry Potter and the Half-Blood Prince" }
                    } 
                    ]
                }
                }`;
      const bindings = SPARQL_JSON_PARSER.parseJsonResults(
        JSON.parse(sparqlJsonString)
      );

      mockGetCachedQuads.mockResolvedValue(
        result({
          cache: bindings,
          algorithmIndex: 0,
          id: RDF_FACTORY.blankNode(),
          query: translate(`
        PREFIX ex: <http://example.org/>

          SELECT ?book ?title WHERE {
            ?book ex:title ?title .
          }`),
        })
      );

      const expectedQuads = [
        RDF_FACTORY.quad(
          RDF_FACTORY.namedNode("http://example.org/book/book6"),
          RDF_FACTORY.namedNode("http://example.org/title"),
          RDF_FACTORY.literal("Harry Potter and the Half-Blood Prince")
        ),
        RDF_FACTORY.quad(
          RDF_FACTORY.namedNode("http://example.org/book/book6"),
          <any>RDF_FACTORY.blankNode(),
          RDF_FACTORY.blankNode()
        ),
        RDF_FACTORY.quad(
          RDF_FACTORY.namedNode("http://example.org/book/book7"),
          <any>RDF_FACTORY.blankNode(),
          RDF_FACTORY.blankNode()
        ),
        RDF_FACTORY.quad(
          RDF_FACTORY.namedNode("http://example.org/book/book7"),
          RDF_FACTORY.namedNode("http://example.org/title"),
          RDF_FACTORY.literal("Harry Potter and the Deathly Hallows")
        ),
      ];
      const sources = ["a", "b", "c"];
      const action = {
        query: `
          PREFIX ex: <http://example.org/>

          SELECT ?book ?title WHERE {
            ?book  ?p ?o.
            ?book ex:title ?title .
          }`,
        context: new ActionContext({
          [KeyRemoteCache.location.name]: { path: "path" },
          sources,
        }),
      };

      const resp = await actor.queryCachedResults(action);

      expect(isResult(resp)).toBe(true);
      const stores: RDF.Store[] = (<any>resp).value.stores;
      expect(stores).toHaveLength(1);

      await expect(
        arrayifyStream(stores[0].match())
      ).resolves.toBeRdfIsomorphic(expectedQuads);
    });

    it("should return a stores with the bindings converted to triples given the containment algorithm is used and stores are provided as sources", async () => {
      actor = new ActorQueryProcessRemoteCache({
        name: "actor",
        bus,
        fallBackQueryProcess: <any>{},
        cacheHitAlgorithm: Algorithm.CONTAINMENT,
      });

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
      const bindings = SPARQL_JSON_PARSER.parseJsonResults(
        JSON.parse(sparqlJsonString)
      );

      mockGetCachedQuads.mockResolvedValue(
        result({
          cache: bindings,
          algorithmIndex: 0,
          id: RDF_FACTORY.blankNode(),
          query: translate(`
        PREFIX ex: <http://example.org/>

          SELECT ?book ?title WHERE {
            ?book  ?p ?o.
            ?book ex:title ?title .
          }
        `),
        })
      );

      const expectedQuads = [
        RDF_FACTORY.quad(
          RDF_FACTORY.namedNode("http://example.org/book/book6"),
          RDF_FACTORY.namedNode("http://example.org/title"),
          RDF_FACTORY.literal("Harry Potter and the Half-Blood Prince")
        ),
        RDF_FACTORY.quad(
          RDF_FACTORY.namedNode("http://example.org/book/book6"),
          <any>RDF_FACTORY.blankNode(),
          RDF_FACTORY.blankNode()
        ),
        RDF_FACTORY.quad(
          RDF_FACTORY.namedNode("http://example.org/book/book7"),
          RDF_FACTORY.namedNode("http://example.org/title"),
          RDF_FACTORY.literal("Harry Potter and the Deathly Hallows")
        ),
        RDF_FACTORY.quad(
          RDF_FACTORY.namedNode("http://example.org/book/book7"),
          <any>RDF_FACTORY.blankNode(),
          RDF_FACTORY.blankNode()
        ),
      ];

      const quadsFromStore1 = [
        RDF_FACTORY.quad(
          RDF_FACTORY.namedNode("http://example.org/book/book22"),
          RDF_FACTORY.namedNode("http://example.org/extra"),
          RDF_FACTORY.literal("?")
        ),
        RDF_FACTORY.quad(
          RDF_FACTORY.namedNode("http://example.org/book/foot6"),
          RDF_FACTORY.namedNode("http://example.org/alpha"),
          RDF_FACTORY.blankNode()
        ),
      ];

      const quadsFromStore2 = [
        RDF_FACTORY.quad(
          RDF_FACTORY.namedNode("http://example.org/book/foo"),
          RDF_FACTORY.namedNode("http://example.org/bar"),
          RDF_FACTORY.literal("...")
        ),
        RDF_FACTORY.quad(
          RDF_FACTORY.namedNode("http://example.org/book/foot6"),
          RDF_FACTORY.namedNode("http://example.org/alpha"),
          RDF_FACTORY.blankNode()
        ),
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
          sources: [store1, store2, "boo"],
        }),
      };

      const resp = await actor.queryCachedResults(action);

      expect(isResult(resp)).toBe(true);
      const stores: RDF.Store[] = (<any>resp).value.stores;
      expect(stores).toHaveLength(3);

      await expect(
        arrayifyStream(stores[0].match())
      ).resolves.toBeRdfIsomorphic(expectedQuads);
      await expect(
        arrayifyStream(stores[1].match())
      ).resolves.toBeRdfIsomorphic(quadsFromStore1);
      await expect(
        arrayifyStream(stores[2].match())
      ).resolves.toBeRdfIsomorphic(quadsFromStore2);
    });

    it("should use all the algoritms when the actor is defined with all algorithms", async () => {
      actor = new ActorQueryProcessRemoteCache({
        name: "actor",
        bus,
        fallBackQueryProcess: <any>{},
        cacheHitAlgorithm: Algorithm.ALL,
      });

      mockGetCachedQuads.mockResolvedValue(
        result({
          cache: [],
          algorithmIndex: 0,
          id: RDF_FACTORY.blankNode(),
          query: translate(`PREFIX ex: <http://example.org/>

          SELECT ?book ?title WHERE {
            ?book  ?p ?o.
            ?book ex:title ?title .
          }`),
        })
      );

      const action = {
        query: `
          PREFIX ex: <http://example.org/>

          SELECT ?book ?title WHERE {
            ?book  ?p ?o.
            ?book ex:title ?title .
          }`,
        context: new ActionContext({
          [KeyRemoteCache.location.name]: { path: "path" },
        }),
      };

      const expectedInput: any = {
        cache: { path: "path" },
        query: translate(action.query),
        // Only includes non-SERVICE endpoint(s)
        endpoints: [],
        cacheHitAlgorithms: [
          actor.generateQueryContainmentCacheHitFunction(),
          ActorQueryProcessRemoteCache.equalityCacheHit,
        ],
        outputOption: OutputOption.BINDING_BAG,
      };

      await actor.queryCachedResults(action);

      expect(mockGetCachedQuads).toHaveBeenCalledTimes(1);
      expect(mockGetCachedQuads).toHaveBeenCalledWith({
        ...expectedInput,
        cacheHitAlgorithms: [
          ActorQueryProcessRemoteCache.equalityCacheHit,
          expect.any(Function),
        ],
      });
    });
  });

  describe("run", () => {
    let actor: ActorQueryProcessRemoteCache;
    const fallBackQueryProcess = {
      run: jest.fn(),
    };

    const action = {
      query: "SELECT * WHERE {?s ?p ?o}",
      context: new ActionContext({
        [KeyRemoteCache.location.name]: { path: "path" },
      }),
    };

    beforeEach(() => {
      actor = new ActorQueryProcessRemoteCache({
        name: "actor",
        bus,
        fallBackQueryProcess: <any>fallBackQueryProcess,
        cacheHitAlgorithm: Algorithm.EQ,
      });
      jest.resetAllMocks();
    });

    it("should execute the fallback process given a cache process returning an error", async () => {
      const mockSetProperty = jest.fn();
      const fallbackReturnedValue = {
        result: {
          type: "bindings",
          bindingsStream: { setProperty: mockSetProperty },
        },
      };
      fallBackQueryProcess.run.mockResolvedValueOnce(fallbackReturnedValue);
      mockGetCachedQuads.mockResolvedValue(error(new Error("an error")));

      const resp = await actor.run(action);

      expect(fallBackQueryProcess.run).toHaveBeenCalledTimes(1);
      expect(fallBackQueryProcess.run).toHaveBeenCalledWith(action, undefined);
      expect(resp).toEqual(fallbackReturnedValue);
      expect(mockSetProperty).toHaveBeenCalledWith("provenance", {
        algorithm: QUERY_PROCESSING_LABEL,
        complementaryQueries: undefined,
        id: undefined,
      });
    });

    it("should throw an error if the query is not found in the cache and failOnCacheMiss key is provided in the context", async () => {
      const mockSetProperty = jest.fn();
      const fallbackReturnedValue = {
        result: {
          type: "bindings",
          bindingsStream: { setProperty: mockSetProperty },
        },
      };
      fallBackQueryProcess.run.mockResolvedValueOnce(fallbackReturnedValue);
      mockGetCachedQuads.mockResolvedValue(error(new Error("an error")));
      const action = {
        query: "SELECT * WHERE {?s ?p ?o}",
        context: new ActionContext({
          [KeyRemoteCache.location.name]: { path: "path" },
          [ActorQueryProcessRemoteCache.KEY_FAIL_ON_CACHE_MISS.name]: true,
        }),
      };

      await expect(actor.run(action)).rejects.toEqual(
        new Error(ActorQueryProcessRemoteCache.ERROR_FAIL_ON_CACHE_MISS)
      );
    });

    it("should throw if a non SELECT query is send", async () => {
      const mockSetProperty = jest.fn();
      const fallbackReturnedValue = {
        result: {
          type: "quads",
          bindingsStream: { setProperty: mockSetProperty },
        },
      };
      fallBackQueryProcess.run.mockResolvedValueOnce(fallbackReturnedValue);
      mockGetCachedQuads.mockResolvedValue(error(new Error("an error")));
      const action = {
        query: "CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }",
        context: new ActionContext({
          [KeyRemoteCache.location.name]: { path: "path" },
        }),
      };

      await expect(actor.run(action)).rejects.toEqual(
        new Error(
          ActorQueryProcessRemoteCache.ERROR_ONLY_SELECT_QUERIES_SUPPORTED
        )
      );
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
      const bindings = SPARQL_JSON_PARSER.parseJsonResults(
        JSON.parse(sparqlJsonString)
      );
      const expectedBinding = new ArrayIterator(
        ActorQueryProcessRemoteCache.bindingConvertion(bindings),
        { autoStart: false }
      );
      const id = RDF_FACTORY.blankNode();
      spyQueryCachedResults.mockResolvedValue(
        result({ bindings: expectedBinding, id })
      );

      const resp = await actor.run(action);

      expect(fallBackQueryProcess.run).toHaveBeenCalledTimes(0);
      expect(resp.result.type).toBe("bindings");
      expect((<any>resp.result).bindingsStream).toStrictEqual(expectedBinding);
      expect(
        (<any>resp.result).bindingsStream.getProperty("provenance")
      ).toEqual({ algorithm: Algorithm.EQ, id });
    });

    it("should execute the fallback given the cache return an RDF store", async () => {
      const mockSetProperty = jest.fn();
      (<any>actor.cacheHitAlgorithm) = Algorithm.CONTAINMENT;
      const fallbackReturnedValue = {
        result: {
          type: "bindings",
          bindingsStream: { setProperty: mockSetProperty },
        },
      };

      const spyQueryCachedResults = jest.spyOn(actor, "queryCachedResults");
      const stores: any = ["a", "b", "c", "d"];
      const complementaryQuery: any = ["a1", "b2", "c3", "d4"];
      const id = RDF_FACTORY.blankNode();
      spyQueryCachedResults.mockResolvedValueOnce(
        result({ stores, id, complementaryQueries: complementaryQuery })
      );
      fallBackQueryProcess.run.mockResolvedValueOnce(fallbackReturnedValue);

      const resp = await actor.run(action);

      const expectedAction = {
        ...action,
        context: action.context.set(
          KeysInitQuery.querySourcesUnidentified,
          stores
        ),
      };
      expect(fallBackQueryProcess.run).toHaveBeenCalledTimes(1);
      expect(fallBackQueryProcess.run).toHaveBeenCalledWith(
        expectedAction,
        undefined
      );
      expect(resp).toEqual(fallbackReturnedValue);
      expect(mockSetProperty).toHaveBeenCalledWith("provenance", {
        algorithm: Algorithm.CONTAINMENT,
        complementaryQueries: complementaryQuery,
        id,
      });
    });
  });

  describe(ActorQueryProcessRemoteCache.compatibleTerms.name, () => {
    it("should return true given it is the same term", () => {
      const firstTerm = RDF_FACTORY.namedNode("a");
      const secondTerm = RDF_FACTORY.namedNode("a");

      const resp = ActorQueryProcessRemoteCache.compatibleTerms(
        firstTerm,
        secondTerm
      );

      expect(resp).toBe(true);
    });

    it("should return false given it is the different terms", () => {
      const firstTerm = RDF_FACTORY.namedNode("a");
      const secondTerm = RDF_FACTORY.namedNode("b");

      const resp = ActorQueryProcessRemoteCache.compatibleTerms(
        firstTerm,
        secondTerm
      );

      expect(resp).toBe(false);
    });

    it("should return true given the first term is a variable and the second term is an IRI", () => {
      const firstTerm = RDF_FACTORY.variable("a");
      const secondTerm = RDF_FACTORY.namedNode("a");

      const resp = ActorQueryProcessRemoteCache.compatibleTerms(
        firstTerm,
        secondTerm
      );

      expect(resp).toBe(true);
    });

    it("should return false given two different variables", () => {
      const firstTerm = RDF_FACTORY.variable("a");
      const secondTerm = RDF_FACTORY.variable("b");

      const resp = ActorQueryProcessRemoteCache.compatibleTerms(
        firstTerm,
        secondTerm
      );

      expect(resp).toBe(false);
    });

    it("should return false given a variable and a blank node", () => {
      const firstTerm = RDF_FACTORY.variable("a");
      const secondTerm = RDF_FACTORY.blankNode("a");

      const resp = ActorQueryProcessRemoteCache.compatibleTerms(
        firstTerm,
        secondTerm
      );

      expect(resp).toBe(false);
    });
  });

  describe(ActorQueryProcessRemoteCache.compatibleTriplePatterns.name, () => {
    it("should return true given 2 compatible triple patterns", () => {
      const superTp = RDF_FACTORY.quad(
        RDF_FACTORY.variable("s"),
        RDF_FACTORY.variable("p"),
        RDF_FACTORY.variable("o")
      );

      const subTp = RDF_FACTORY.quad(
        RDF_FACTORY.variable("s"),
        RDF_FACTORY.variable("p"),
        RDF_FACTORY.variable("o")
      );

      const resp = ActorQueryProcessRemoteCache.compatibleTriplePatterns(
        superTp,
        subTp
      );

      expect(resp).toBe(true);
    });

    it("should return false given 2 triple patterns with an incompatible term", () => {
      const superTp = RDF_FACTORY.quad(
        RDF_FACTORY.variable("s"),
        RDF_FACTORY.variable("p"),
        RDF_FACTORY.variable("o")
      );

      const subTp = RDF_FACTORY.quad(
        RDF_FACTORY.variable("s"),
        RDF_FACTORY.variable("p"),
        RDF_FACTORY.variable("o2")
      );

      const resp = ActorQueryProcessRemoteCache.compatibleTriplePatterns(
        superTp,
        subTp
      );

      expect(resp).toBe(false);
    });

    it("should return false given 2 triple patterns with 2 incompatible terms", () => {
      const superTp = RDF_FACTORY.quad(
        RDF_FACTORY.variable("s"),
        RDF_FACTORY.namedNode("p"),
        RDF_FACTORY.variable("o")
      );

      const subTp = RDF_FACTORY.quad(
        RDF_FACTORY.variable("s"),
        RDF_FACTORY.variable("p"),
        RDF_FACTORY.variable("o2")
      );

      const resp = ActorQueryProcessRemoteCache.compatibleTriplePatterns(
        superTp,
        subTp
      );

      expect(resp).toBe(false);
    });

    it("should return false given 2 triple patterns with 3 incompatible terms", () => {
      const superTp = RDF_FACTORY.quad(
        RDF_FACTORY.namedNode("s"),
        RDF_FACTORY.namedNode("p"),
        RDF_FACTORY.variable("o")
      );

      const subTp = RDF_FACTORY.quad(
        RDF_FACTORY.namedNode("s2"),
        RDF_FACTORY.variable("p"),
        RDF_FACTORY.variable("o2")
      );

      const resp = ActorQueryProcessRemoteCache.compatibleTriplePatterns(
        superTp,
        subTp
      );

      expect(resp).toBe(false);
    });
  });

  describe(ActorQueryProcessRemoteCache.colorQuery.name, () => {
    const A_SUB_QUERY = translate(`
PREFIX ex: <http://example.org/>

SELECT ?person ?city
WHERE {
  ?person ex:livesIn ?city .
  ?city ex:locatedIn ex:CountryX .
  ?person ex:hasOccupation ex:Engineer .
  ?person ex:gender ex:female .
}`);

    it("should return every triple patterns given the super query has no triple patterns", () => {
      const superQueryTps: RDF.Quad[] = [];

      const expectedTriples = [
        RDF_FACTORY.quad(
          RDF_FACTORY.variable("person"),
          RDF_FACTORY.namedNode("http://example.org/livesIn"),
          RDF_FACTORY.variable("city")
        ),
        RDF_FACTORY.quad(
          RDF_FACTORY.variable("city"),
          RDF_FACTORY.namedNode("http://example.org/locatedIn"),
          RDF_FACTORY.namedNode("http://example.org/CountryX")
        ),
        RDF_FACTORY.quad(
          RDF_FACTORY.variable("person"),
          RDF_FACTORY.namedNode("http://example.org/hasOccupation"),
          RDF_FACTORY.namedNode("http://example.org/Engineer")
        ),
        RDF_FACTORY.quad(
          RDF_FACTORY.variable("person"),
          RDF_FACTORY.namedNode("http://example.org/gender"),
          RDF_FACTORY.namedNode("http://example.org/female")
        ),
      ];
      const resp = ActorQueryProcessRemoteCache.colorQuery(
        A_SUB_QUERY,
        superQueryTps
      );

      expect(resp).toBeRdfIsomorphic(expectedTriples);
    });

    it("should no triple patterns given the super query request every patterns", () => {
      const superQueryTps: RDF.Quad[] = [
        RDF_FACTORY.quad(
          RDF_FACTORY.variable("person"),
          RDF_FACTORY.namedNode("http://example.org/livesIn"),
          RDF_FACTORY.variable("city")
        ),
        RDF_FACTORY.quad(
          RDF_FACTORY.variable("city"),
          RDF_FACTORY.namedNode("http://example.org/locatedIn"),
          RDF_FACTORY.namedNode("http://example.org/CountryX")
        ),
        RDF_FACTORY.quad(
          RDF_FACTORY.variable("person"),
          RDF_FACTORY.namedNode("http://example.org/hasOccupation"),
          RDF_FACTORY.namedNode("http://example.org/Engineer")
        ),
        RDF_FACTORY.quad(
          RDF_FACTORY.variable("person"),
          RDF_FACTORY.namedNode("http://example.org/gender"),
          RDF_FACTORY.namedNode("http://example.org/female")
        ),
      ];
      const resp = ActorQueryProcessRemoteCache.colorQuery(
        A_SUB_QUERY,
        superQueryTps
      );

      expect(resp).toStrictEqual([]);
    });

    it("should some triple patterns given the super query request some patterns", () => {
      const superQueryTps: RDF.Quad[] = [
        RDF_FACTORY.quad(
          RDF_FACTORY.variable("person"),
          RDF_FACTORY.namedNode("http://example.org/livesIn"),
          RDF_FACTORY.variable("city")
        ),
        RDF_FACTORY.quad(
          RDF_FACTORY.variable("city"),
          RDF_FACTORY.namedNode("http://example.org/locatedIn"),
          RDF_FACTORY.namedNode("http://example.org/CountryX")
        ),
        RDF_FACTORY.quad(
          RDF_FACTORY.variable("person"),
          RDF_FACTORY.namedNode("http://example.org/hasOccupation"),
          RDF_FACTORY.namedNode("http://example.org/Engineer")
        ),
      ];

      const expectedTps = [
        RDF_FACTORY.quad(
          RDF_FACTORY.variable("person"),
          RDF_FACTORY.namedNode("http://example.org/gender"),
          RDF_FACTORY.namedNode("http://example.org/female")
        ),
      ];
      const resp = ActorQueryProcessRemoteCache.colorQuery(
        A_SUB_QUERY,
        superQueryTps
      );

      expect(resp).toBeRdfIsomorphic(expectedTps);
    });

    it("should return some triples given a very general super query", () => {
      const superQueryTps: RDF.Quad[] = [
        RDF_FACTORY.quad(
          RDF_FACTORY.variable("s"),
          RDF_FACTORY.variable("p"),
          RDF_FACTORY.variable("o")
        ),
      ];

      const a_query = translate(`
        PREFIX ex: <http://example.org/>

        SELECT * WHERE{
          ex:s ex:p ex:o.
          ?s ?p ex:o.
        }
        `);

      const resp = ActorQueryProcessRemoteCache.colorQuery(
        a_query,
        superQueryTps
      );

      expect(resp).toBeRdfIsomorphic([]);
    });
  });

  describe("createComplementaryQuery", () => {
    let actor: ActorQueryProcessRemoteCache;
    const blockSize = Number.MAX_SAFE_INTEGER;

    const fallBackQueryProcess = {
      run: jest.fn(),
    };
    const store: any = jest.fn();
    const action = {
      query: "SELECT * WHERE {?s ?p ?o}",
      context: new ActionContext({
        [KeyRemoteCache.location.name]: { path: "path" },
        [KeyRemoteCache.valueClauseBlockSize.name]: blockSize
      }),
    };

    beforeEach(() => {
      actor = new ActorQueryProcessRemoteCache({
        name: "actor",
        bus,
        fallBackQueryProcess: <any>fallBackQueryProcess,
        cacheHitAlgorithm: Algorithm.EQ,
      });
      jest.resetAllMocks();
    });

    it("should return an empty query given 2 identical", async () => {
      const superQuery = translate(`SELECT * {?s ?p ?o}`);
      const subQuery = superQuery;

      const resp = await actor.createComplementaryQuery(
        superQuery,
        subQuery,
        undefined,
        blockSize
      );
      expect(resp).toBeUndefined();
    });

    it("should return a query for a difference of one triple pattern", async () => {
      const superQuery = translate(`
PREFIX ex: <http://example.org/>

SELECT ?person ?city
WHERE {
  ?person ex:livesIn ?city .
  ?city ex:locatedIn ex:CountryX .
  ?person ex:hasOccupation ex:Engineer .
}
      `);
      const subQuery = translate(`
PREFIX ex: <http://example.org/>

SELECT ?person ?city
WHERE {
  ?person ex:livesIn ?city .
  ?city ex:locatedIn ex:CountryX .
  ?person ex:hasOccupation ex:Engineer .
  ?person ex:gender ex:female .
}
        `);
      const expectedQuery = translate(`
          PREFIX ex: <http://example.org/>

          CONSTRUCT {
          ?person ex:gender ex:female .
          } WHERE{
           ?person ex:gender ex:female .
          }
          `);
      const resp = await actor.createComplementaryQuery(
        superQuery,
        subQuery,
        undefined,
        blockSize
      );
      expect(resp).toEqual([
        { query: [<Algebra.Construct>expectedQuery], superQuery: superQuery },
      ]);
    });

    it("should return a query for a difference of one triple pattern with value clauses", async () => {
      const superQuery = translate(`
PREFIX ex: <http://example.org/>

SELECT ?person ?city
WHERE {
  ?person ex:livesIn ?city .
  ?city ex:locatedIn ex:CountryX .
  ?person ex:hasOccupation ex:Engineer .
}

      `);
      const subQuery = translate(`
PREFIX ex: <http://example.org/>

SELECT ?person ?city
WHERE {
  ?person ex:livesIn ?city .
  ?city ex:locatedIn ex:CountryX .
  ?person ex:hasOccupation ex:Engineer .
  ?person ex:gender ex:female .

  VALUES ?city { ex:CityA ex:CityB }
  VALUES ?person { ex:Alice ex:Bob }
}
        `);
      const expectedQuery = translate(`
          PREFIX ex: <http://example.org/>

          CONSTRUCT {
          ?person ex:gender ex:female .
          } WHERE{
           ?person ex:gender ex:female .
           VALUES ?city { ex:CityA ex:CityB }
           VALUES ?person { ex:Alice ex:Bob }
          }
          `);
      const resp = await actor.createComplementaryQuery(
        superQuery,
        subQuery,
        undefined,
        blockSize
      );
      expect(resp).toEqual([
        { query: [<Algebra.Construct>expectedQuery], superQuery },
      ]);
    });

    it("should return a query for a difference of one triple pattern with bindings", async () => {
      const superQuery = translate(`
PREFIX ex: <http://example.org/>

SELECT ?person ?city
WHERE {
  ?person ex:livesIn ?city .
  ?city ex:locatedIn ex:CountryX .
  ?person ex:hasOccupation ex:Engineer .
}
      `);
      const subQuery = translate(`
PREFIX ex: <http://example.org/>

SELECT ?person ?city
WHERE {
  ?person ex:livesIn ?city .
  ?city ex:locatedIn ex:CountryX .
  ?person ex:hasOccupation ex:Engineer .
  ?person ex:gender ex:female .
}
        `);
      const expectedQuery = translate(`
          PREFIX ex: <http://example.org/>

          CONSTRUCT {
            ?person ex:gender ex:female .
          } WHERE {
           VALUES ?person {
              ex:person1
              ex:person2
            }
            ?person ex:gender ex:female .
          }
          `);
      const bindings: IBindings[] = [
        {
          person: RDF_FACTORY.namedNode("http://example.org/person1"),
          city: RDF_FACTORY.namedNode("http://example.org/city1"),
        },
        {
          person: RDF_FACTORY.namedNode("http://example.org/person2"),
          city: RDF_FACTORY.namedNode("http://example.org/city2"),
        },
      ];
      const resp = await actor.createComplementaryQuery(
        superQuery,
        subQuery,
        bindings,
        blockSize
      );
      expect(resp).toEqual([
        {
          query: [<Algebra.Construct>expectedQuery],
          endpoint: undefined,
          superQuery,
        },
      ]);
    });

    it("should return a query for a difference of some triples with a service clause with no complement", async () => {
      const superQuery = translate(`
PREFIX ex: <http://example.org/>

SELECT ?person ?city
WHERE {
  SERVICE ex:service1 {
    ?person ex:livesIn ?city .
  }

  ?city ex:locatedIn ex:CountryX .
  ?person ex:hasOccupation ex:Engineer .
}
      `);
      const subQuery = translate(`
PREFIX ex: <http://example.org/>

SELECT ?person ?city
WHERE {
  SERVICE ex:service1 {
    ?person ex:livesIn ?city .
  }
  ?city ex:locatedIn ex:CountryX .
  ?person ex:hasOccupation ex:Engineer .
  ?person ex:gender ex:female .
}
        `);
      const expectedQuery = translate(`
          PREFIX ex: <http://example.org/>

          CONSTRUCT {
          ?person ex:gender ex:female .
          } WHERE{
           ?person ex:gender ex:female .
          }
          `);
      const resp = await actor.createComplementaryQuery(
        superQuery,
        subQuery,
        undefined,
        blockSize
      );
      expect(resp).toEqual([
        { query: [<Algebra.Construct>expectedQuery], superQuery },
      ]);
    });

    it("should return a query for a difference of some triples with a service clause with a complement", async () => {
      const superQuery = translate(`
PREFIX ex: <http://example.org/>

SELECT ?person ?city
WHERE {
  SERVICE ex:service1 {
    ?person ex:livesIn ?city .
  }

  ?city ex:locatedIn ex:CountryX .
  ?person ex:hasOccupation ex:Engineer .
}
      `);
      const subQuery = translate(`
PREFIX ex: <http://example.org/>

SELECT ?person ?city
WHERE {
  SERVICE ex:service1 {
    ?person ex:livesIn ?city .
    ?person ex:foo ?bar
  }
  ?city ex:locatedIn ex:CountryX .
  ?person ex:hasOccupation ex:Engineer .
  ?person ex:gender ex:female .
}
        `);
      const expectedQuery = translate(`
          PREFIX ex: <http://example.org/>

          CONSTRUCT {
          ?person ex:gender ex:female .
          } WHERE{
           ?person ex:gender ex:female .
          }
          `);

      const expectedQueryService = translate(`
          PREFIX ex: <http://example.org/>

          CONSTRUCT {
          ?person ex:foo ?bar
          } WHERE{
           ?person ex:foo ?bar
          }
          `);
      const resp = await actor.createComplementaryQuery(
        superQuery,
        subQuery,
        undefined,
        blockSize
      );
      let superQueryService;
      Util.recurseOperation(superQuery, {
        [Algebra.types.SERVICE]: (op: Algebra.Service) => {
          superQueryService = op.input;
          return false;
        },
      });
      expect(resp).toEqual([
        {
          query: [<Algebra.Construct>expectedQueryService],
          endpoint: "http://example.org/service1",
          superQuery: <any>superQueryService,
        },
        { query: [<Algebra.Construct>expectedQuery], superQuery },
      ]);
    });

    it("should return a query for a difference of some triples with a service clause with a complement and some bindings", async () => {
      const superQuery = translate(`
PREFIX ex: <http://example.org/>

SELECT ?person ?city
WHERE {
  SERVICE ex:service1 {
    ?person ex:livesIn ?city .
  }
  ?person ex:hasOccupation ex:Engineer .
}
      `);
      const subQuery = translate(`
PREFIX ex: <http://example.org/>

SELECT ?person ?city
WHERE {
  SERVICE ex:service1 {
    ?person ex:livesIn ?city .
    ?person ex:foo ?bar.
    ?city ex:locatedIn ex:CountryX .
  }
  ?person ex:hasOccupation ex:Engineer .
  ?person ex:gender ex:female .
}
        `);
      const expectedQuery = translate(`
          PREFIX ex: <http://example.org/>

          CONSTRUCT {
          ?person ex:gender ex:female .
          } WHERE{
           VALUES ?person {
              ex:person1
              ex:person2
            }
           ?person ex:gender ex:female .
          }
          `);

      const expectedQueryService = translate(`
          PREFIX ex: <http://example.org/>

          CONSTRUCT {
          ?person ex:foo ?bar .
          ?city ex:locatedIn ex:CountryX .
          } WHERE{
           VALUES (?person ?city) {
              (ex:person1 ex:city1)
              (ex:person2 ex:city2)
            }
              
           ?person ex:foo ?bar .
           ?city ex:locatedIn ex:CountryX .
          }
          `);
      const bindings: IBindings[] = [
        {
          person: RDF_FACTORY.namedNode("http://example.org/person1"),
          city: RDF_FACTORY.namedNode("http://example.org/city1"),
        },
        {
          person: RDF_FACTORY.namedNode("http://example.org/person2"),
          city: RDF_FACTORY.namedNode("http://example.org/city2"),
        },
      ];
      const resp = await actor.createComplementaryQuery(
        superQuery,
        subQuery,
        bindings,
        blockSize
      );
      let superQueryService;
      Util.recurseOperation(superQuery, {
        [Algebra.types.SERVICE]: (op: Algebra.Service) => {
          superQueryService = op.input;
          return false;
        },
      });
      expect(resp).toEqual([
        {
          query: [<Algebra.Construct>expectedQueryService],
          endpoint: "http://example.org/service1",
          superQuery: superQueryService,
        },
        { query: [<Algebra.Construct>expectedQuery], superQuery },
      ]);
    });

    it("should return a query for a difference of some triples with a service clause with a complement and some bindings and added value clauses", async () => {
      const superQuery = translate(`
PREFIX ex: <http://example.org/>

SELECT ?person ?city
WHERE {
  SERVICE ex:service1 {
    ?person ex:livesIn ?city .
  }
  ?person ex:hasOccupation ex:Engineer .
}
      `);
      const subQuery = translate(`
PREFIX ex: <http://example.org/>

SELECT ?person ?city
WHERE {
  SERVICE ex:service1 {
    ?person ex:livesIn ?city .
    ?person ex:foo ?bar.
    ?city ex:locatedIn ex:CountryX .
    VALUES ?city { ex:CityAA ex:CityBB ex:CityCC }
  }
  ?person ex:hasOccupation ex:Engineer .
  ?person ex:gender ex:female .

      VALUES ?city { ex:CityA ex:CityB ex:CityC }
    VALUES ?person { ex:Alice ex:Bob ex:Charlie }
}
        `);
      const expectedQuery = translate(`
          PREFIX ex: <http://example.org/>

          CONSTRUCT {
          ?person ex:gender ex:female .
          } WHERE{
           VALUES ?person {
              ex:person1
              ex:person2
            }
           ?person ex:gender ex:female .

            VALUES ?city { ex:CityA ex:CityB ex:CityC }
            VALUES ?person { ex:Alice ex:Bob ex:Charlie }
          }
          `);

      const expectedQueryService = translate(`
          PREFIX ex: <http://example.org/>

          CONSTRUCT {
          ?person ex:foo ?bar .
          ?city ex:locatedIn ex:CountryX .
          } WHERE{
           VALUES (?person ?city) {
              (ex:person1 ex:city1)
              (ex:person2 ex:city2)
            }
              
           ?person ex:foo ?bar .
           ?city ex:locatedIn ex:CountryX .
           
           VALUES ?city { ex:CityAA ex:CityBB ex:CityCC }
          }
          `);
      const bindings: IBindings[] = [
        {
          person: RDF_FACTORY.namedNode("http://example.org/person1"),
          city: RDF_FACTORY.namedNode("http://example.org/city1"),
        },
        {
          person: RDF_FACTORY.namedNode("http://example.org/person2"),
          city: RDF_FACTORY.namedNode("http://example.org/city2"),
        },
      ];
      const resp = await actor.createComplementaryQuery(
        superQuery,
        subQuery,
        bindings,
        blockSize
      );
      let superQueryService;
      Util.recurseOperation(superQuery, {
        [Algebra.types.SERVICE]: (op: Algebra.Service) => {
          superQueryService = op.input;
          return false;
        },
      });
      expect(resp).toEqual([
        {
          query: [<Algebra.Construct>expectedQueryService],
          endpoint: "http://example.org/service1",
          superQuery: superQueryService,
        },
        { query: [<Algebra.Construct>expectedQuery], superQuery },
      ]);
    });

    it("should batch the value clauses from the bindings", async () => {
      const superQuery = translate(`
PREFIX ex: <http://example.org/>

SELECT ?person ?city
WHERE {
  SERVICE ex:service1 {
    ?person ex:livesIn ?city .
  }
  ?person ex:hasOccupation ex:Engineer .
}
      `);
      const subQuery = translate(`
PREFIX ex: <http://example.org/>

SELECT ?person ?city
WHERE {
  SERVICE ex:service1 {
    ?person ex:livesIn ?city .
    ?person ex:foo ?bar.
    ?city ex:locatedIn ex:CountryX .
  }
  ?person ex:hasOccupation ex:Engineer .
  ?person ex:gender ex:female .
}
        `);
      const expectedQuery = translate(`
          PREFIX ex: <http://example.org/>

          CONSTRUCT {
          ?person ex:gender ex:female .
          } WHERE{
           VALUES ?person {
              ex:person1
              ex:person2
            }
           ?person ex:gender ex:female .
          }
          `);
      const expectedQuery1 = translate(`
          PREFIX ex: <http://example.org/>

          CONSTRUCT {
          ?person ex:gender ex:female .
          } WHERE{
           VALUES ?person {
              ex:person3
              ex:person4
            }
           ?person ex:gender ex:female .
          }
          `);

      const expectedQueryService = translate(`
          PREFIX ex: <http://example.org/>

          CONSTRUCT {
          ?person ex:foo ?bar .
          ?city ex:locatedIn ex:CountryX .
          } WHERE{
           VALUES (?person ?city) {
              (ex:person1 ex:city1)
              (ex:person2 ex:city2)
            }
              
           ?person ex:foo ?bar .
           ?city ex:locatedIn ex:CountryX .
          }
          `);
      const expectedQueryService2 = translate(`
          PREFIX ex: <http://example.org/>

          CONSTRUCT {
          ?person ex:foo ?bar .
          ?city ex:locatedIn ex:CountryX .
          } WHERE{
           VALUES (?person ?city) {
              (ex:person3 ex:city3)
              (ex:person4 ex:city4)
            }
              
           ?person ex:foo ?bar .
           ?city ex:locatedIn ex:CountryX .
          }
          `);
      const bindings: IBindings[] = [
        {
          person: RDF_FACTORY.namedNode("http://example.org/person1"),
          city: RDF_FACTORY.namedNode("http://example.org/city1"),
        },
        {
          person: RDF_FACTORY.namedNode("http://example.org/person2"),
          city: RDF_FACTORY.namedNode("http://example.org/city2"),
        },

        {
          person: RDF_FACTORY.namedNode("http://example.org/person3"),
          city: RDF_FACTORY.namedNode("http://example.org/city3"),
        },
        {
          person: RDF_FACTORY.namedNode("http://example.org/person4"),
          city: RDF_FACTORY.namedNode("http://example.org/city4"),
        },
      ];
      const resp = await actor.createComplementaryQuery(
        superQuery,
        subQuery,
        bindings,
        2
      );
      let superQueryService;
      Util.recurseOperation(superQuery, {
        [Algebra.types.SERVICE]: (op: Algebra.Service) => {
          superQueryService = op.input;
          return false;
        },
      });
      expect(resp).toEqual([
        {
          query: [
            <Algebra.Construct>expectedQueryService,
            <Algebra.Construct>expectedQueryService2,
          ],
          endpoint: "http://example.org/service1",
          superQuery: superQueryService,
        },
        {
          query: [
            <Algebra.Construct>expectedQuery,
            <Algebra.Construct>expectedQuery1,
          ],
          superQuery,
        },
      ]);
    });
  });

  describe("valuesClauseReduction", () => {
    let actor: ActorQueryProcessRemoteCache;
    const fallBackQueryProcess = {
      run: jest.fn(),
    };
    const store: any = jest.fn();
    const action = {
      query: "SELECT * WHERE {?s ?p ?o}",
      context: new ActionContext({
        [KeyRemoteCache.location.name]: { path: "path" },
      }),
    };

    beforeEach(() => {
      actor = new ActorQueryProcessRemoteCache({
        name: "actor",
        bus,
        fallBackQueryProcess: <any>fallBackQueryProcess,
        cacheHitAlgorithm: Algorithm.EQ,
      });
      jest.resetAllMocks();
    });

    it("should return undefined given no sub query values", async () => {
      const superQuery = translate(`
PREFIX ex: <http://example.org/>

SELECT ?person ?city
WHERE {
  ?person ex:livesIn ?city .
  ?city ex:locatedIn ex:CountryX .
  ?person ex:hasOccupation ex:Engineer .
}
      `);
      const resp = await actor.valuesClauseReduction(
        superQuery,
        [],
        [RDF_FACTORY.variable("person")],
        action,
        store
      );

      expect(resp).toBeUndefined();
    });

    it("should return the value clauses given a sub query values clause", async () => {
      const superQuery = translate(`
PREFIX ex: <http://example.org/>

SELECT ?person ?city
WHERE {
  ?person ex:livesIn ?city .
  ?city ex:locatedIn ex:CountryX .
  ?person ex:hasOccupation ex:Engineer .
}
      `);
      fallBackQueryProcess.run.mockResolvedValue({
        result: {
          bindingsStream: fromArray([
            BF.fromRecord({
              city: RDF_FACTORY.namedNode("http://example.org/city1"),
            }),
          ]),
        },
      });

      const subQueryValues: Algebra.Values[] = [
        AF.createValues(
          [RDF_FACTORY.variable("person")],
          [
            {
              "?person": RDF_FACTORY.namedNode("http://example.org/person1"),
            },
          ]
        ),
      ];

      const resp = await actor.valuesClauseReduction(
        superQuery,
        subQueryValues,
        [RDF_FACTORY.variable("city")],
        action,
        store
      );

      const expectedValues = AF.createValues(
        [RDF_FACTORY.variable("city")],
        [{ city: RDF_FACTORY.namedNode("http://example.org/city1") }]
      );

      expect(resp).toEqual(expectedValues);
    });

    it("should return undefined given the query does not return result", async () => {
      const superQuery = translate(`
PREFIX ex: <http://example.org/>

SELECT ?person ?city
WHERE {
  ?person ex:livesIn ?city .
  ?city ex:locatedIn ex:CountryX .
  ?person ex:hasOccupation ex:Engineer .
}
      `);
      fallBackQueryProcess.run.mockResolvedValue({
        result: {
          bindingsStream: new ArrayIterator([], { autoStart: false }),
        },
      });

      const subQueryValues: Algebra.Values[] = [
        AF.createValues(
          [RDF_FACTORY.variable("person")],
          [
            {
              "?person": RDF_FACTORY.namedNode("http://example.org/person1"),
            },
          ]
        ),
      ];

      const resp = await actor.valuesClauseReduction(
        superQuery,
        subQueryValues,
        [RDF_FACTORY.variable("city")],
        action,
        store
      );
      expect(resp).toBeUndefined();
    });
  });
});
