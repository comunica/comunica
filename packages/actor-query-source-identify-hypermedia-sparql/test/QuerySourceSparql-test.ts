import { PassThrough } from 'node:stream';
import { ActorQuerySerializeSparql } from '@comunica/actor-query-serialize-sparql';
import { KeysCore, KeysInitQuery } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { IActionContext, IDataset, QueryResultCardinality } from '@comunica/types';
import { AlgebraFactory, Algebra } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator, wrap } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';

// Needed to load Headers
import 'jest-rdf';
import { Readable } from 'readable-stream';
import { QuerySourceSparql } from '../lib/QuerySourceSparql';
import '@comunica/utils-jest';

const DF = new DataFactory();
const AF = new AlgebraFactory();
const BF = new BindingsFactory(DF);
const url = 'http://example.org/sparql';

function testUrl(label: string): string {
  return `https://ex/${label}`;
}
const iriS = DF.namedNode(testUrl('s'));
const iriP = DF.namedNode(testUrl('p'));
const iriO = DF.namedNode(testUrl('o'));

function isCountQuery(query: string): boolean {
  return query.indexOf('COUNT') > 0;
}

describe('QuerySourceSparql', () => {
  let logger: any;
  let ctx: IActionContext;
  let lastQuery: string;
  const mediatorHttp: any = {
    mediate: jest.fn((action: any) => {
      const query: string = action.init.method === 'GET' ? action.input : action.init.body.toString();
      lastQuery = query;
      return {
        headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
        body: isCountQuery(query) ?
          Readable.from([ `{
  "head": { "vars": [ "count" ]
  } ,
  "results": {
    "bindings": [
      {
        "count": { "type": "literal" , "value": "3" }
      }
    ]
  }
}` ]) :
          Readable.from([ `{
  "head": { "vars": [ "p" ]
  } ,
  "results": {
    "bindings": [
      {
        "p": { "type": "uri" , "value": "p1" }
      },
      {
        "p": { "type": "uri" , "value": "p2" }
      },
      {
        "p": { "type": "uri" , "value": "p3" }
      }
    ]
  }
}` ]),
        ok: true,
      };
    }),
  };
  const mediatorQuerySerialize: any = {
    mediate: jest.fn((action: any) => new ActorQuerySerializeSparql(<any> {
      bus: { subscribe: jest.fn() },
    }).run(action)),
  };
  let source: QuerySourceSparql;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = { warn: jest.fn() };
    ctx = new ActionContext({
      [KeysCore.log.name]: logger,
      [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
    });
    source = new QuerySourceSparql(
      url,
      url,
      ctx,
      mediatorHttp,
      mediatorQuerySerialize,
      'values',
      DF,
      AF,
      BF,
      false,
      64,
      10000,
      true,
      true,
      0,
      false,

      {},
    );
  });

  describe('getSelectorShape', () => {
    it('should return a selector shape', async() => {
      await expect(source.getSelectorShape()).resolves.toEqual({
        type: 'conjunction',
        children: [
          {
            type: 'disjunction',
            children: [
              {
                type: 'operation',
                operation: { operationType: 'wildcard' },
                joinBindings: true,
              },
            ],
          },
          {
            type: 'negation',
            child: {
              type: 'operation',
              operation: { operationType: 'type', type: Algebra.Types.DISTINCT },
              children: [
                {
                  type: 'operation',
                  operation: { operationType: 'type', type: Algebra.Types.CONSTRUCT },
                  children: [
                    {
                      type: 'operation',
                      operation: { operationType: 'wildcard' },
                      joinBindings: true,
                    },
                  ],
                },
              ],
            },
          },
        ],
      });
    });
  });

  describe('getFilterFactor', () => {
    it('should return 1', async() => {
      await expect(source.getFilterFactor()).resolves.toBe(1);
    });
  });

  describe('toString', () => {
    it('should return a string representation', async() => {
      expect(source.toString()).toBe(`QuerySourceSparql(${url})`);
    });
  });

  describe('queryBindings', () => {
    it('should return data', async() => {
      await expect(source.queryBindings(AF.createPattern(
        iriS,
        DF.variable('p'),
        iriO,
      ), ctx))
        .toEqualBindingsStream([
          BF.fromRecord({
            p: DF.namedNode('p1'),
          }),
          BF.fromRecord({
            p: DF.namedNode('p2'),
          }),
          BF.fromRecord({
            p: DF.namedNode('p3'),
          }),
        ]);

      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(2);
      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context: ctx,
        init: {
          body: new URLSearchParams({ query: `SELECT ( COUNT( * ) AS ?count ) WHERE { <${testUrl('s')}> ?p <${testUrl('o')}> . }` }),
          headers: expect.anything(),
          method: 'POST',
        },
        input: url,
      });
    });

    it('should return data with local cardinality estimation', async() => {
      jest.spyOn(source, 'estimateOperationCardinality').mockResolvedValue({
        type: 'estimate',
        value: 1,
        dataset: url,
      });
      await expect(source.queryBindings(AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o')), ctx))
        .toEqualBindingsStream([
          BF.fromRecord({
            p: DF.namedNode('p1'),
          }),
          BF.fromRecord({
            p: DF.namedNode('p2'),
          }),
          BF.fromRecord({
            p: DF.namedNode('p3'),
          }),
        ]);

      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(1);
    });

    it('should return data with quoted triples', async() => {
      const thisMediator: any = {
        mediate: jest.fn((action: any) => {
          const query = action.init.body.toString();
          return {
            headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
            body: isCountQuery(query) ?
              Readable.from([ `{
  "head": { "vars": [ "count" ]
  } ,
  "results": {
    "bindings": [
      {
        "count": { "type": "literal" , "value": "3" }
      }
    ]
  }
}` ]) :
              Readable.from([ `{
  "head": { "vars": [ "s" ]
  } ,
  "results": {
    "bindings": [
      {
        "s": { "type": "triple", "value": { "subject": { "type": "uri" , "value": "s1" }, "predicate": { "type": "uri" , "value": "p1" }, "object": { "type": "uri" , "value": "o1" } } }
      },
      {
        "s": { "type": "triple", "value": { "subject": { "type": "uri" , "value": "s2" }, "predicate": { "type": "uri" , "value": "p2" }, "object": { "type": "uri" , "value": "o2" } } }
      },
      {
        "s": { "type": "triple", "value": { "subject": { "type": "uri" , "value": "s3" }, "predicate": { "type": "uri" , "value": "p3" }, "object": { "type": "uri" , "value": "o3" } } }
      }
    ]
  }
}` ]),
            ok: true,
          };
        }),
      };
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        thisMediator,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10,
        true,
        true,
        0,
        false,

        {},
      );
      await expect(source.queryBindings(AF.createPattern(
        DF.variable('s'),
        iriP,
        iriO,
      ), ctx))
        .toEqualBindingsStream([
          BF.fromRecord({
            s: DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
          }),
          BF.fromRecord({
            s: DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
          }),
          BF.fromRecord({
            s: DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.namedNode('o3')),
          }),
        ]);
    });

    it('should return data with quoted triple patterns', async() => {
      const thisMediator: any = {
        mediate: jest.fn((action: any) => {
          const query = action.init.body.toString();
          return {
            headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
            body: isCountQuery(query) ?
              Readable.from([ `{
  "head": { "vars": [ "count" ]
  } ,
  "results": {
    "bindings": [
      {
        "count": { "type": "literal" , "value": "3" }
      }
    ]
  }
}` ]) :
              Readable.from([ `{
  "head": { "vars": [ "s" ]
  } ,
  "results": {
    "bindings": [
      {
        "s": { "type": "uri" , "value": "s1" }
      },
      {
        "s": { "type": "uri" , "value": "s2" }
      },
      {
        "s": { "type": "uri" , "value": "s3" }
      }
    ]
  }
}` ]),
            ok: true,
          };
        }),
      };
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        thisMediator,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10,
        true,
        true,
        0,
        false,

        {},
      );
      await expect(
        source.queryBindings(AF.createPattern(
          DF.quad(DF.variable('s'), iriP, iriO),
          iriP,
          iriO,
          DF.defaultGraph(),
        ), ctx),
      ).toEqualBindingsStream([
        BF.fromRecord({
          s: DF.namedNode('s1'),
        }),
        BF.fromRecord({
          s: DF.namedNode('s2'),
        }),
        BF.fromRecord({
          s: DF.namedNode('s3'),
        }),
      ]);
    });

    it('should return data for a web stream', async() => {
      const thisMediator: any = {
        mediate(action: any) {
          const query = action.init.body.toString();
          return {
            headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
            body: require('readable-stream-node-to-web')(isCountQuery(query) ?
              Readable.from([ `{
  "head": { "vars": [ "count" ]
  } ,
  "results": { 
    "bindings": [
      {
        "count": { "type": "literal" , "value": "3" }
      }
    ]
  }
}` ]) :
              Readable.from([ `{
  "head": { "vars": [ "p" ]
  } ,
  "results": { 
    "bindings": [
      {
        "p": { "type": "uri" , "value": "p1" }
      },
      {
        "p": { "type": "uri" , "value": "p2" }
      },
      {
        "p": { "type": "uri" , "value": "p3" }
      }
    ]
  }
}` ])),
            ok: true,
          };
        },
      };
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        thisMediator,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10,
        true,
        true,
        0,
        false,

        {},
      );
      await expect(source.queryBindings(AF.createPattern(
        iriS,
        DF.variable('p'),
        iriO,
      ), ctx))
        .toEqualBindingsStream([
          BF.fromRecord({
            p: DF.namedNode('p1'),
          }),
          BF.fromRecord({
            p: DF.namedNode('p2'),
          }),
          BF.fromRecord({
            p: DF.namedNode('p3'),
          }),
        ]);
    });

    it('should emit metadata', async() => {
      const stream = source.queryBindings(AF.createPattern(
        iriS,
        DF.variable('p'),
        iriO,
        DF.defaultGraph(),
      ), ctx);
      await expect(new Promise(resolve => stream.getProperty('metadata', resolve))).resolves
        .toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'exact', value: 3, dataset: url },
          variables: [
            { variable: DF.variable('p'), canBeUndef: false },
          ],
        });
      await expect(stream).toEqualBindingsStream([
        BF.fromRecord({
          p: DF.namedNode('p1'),
        }),
        BF.fromRecord({
          p: DF.namedNode('p2'),
        }),
        BF.fromRecord({
          p: DF.namedNode('p3'),
        }),
      ]);
    });

    it('should emit metadata when cardinalityCountQueries is false', async() => {
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        mediatorHttp,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10,
        false,
        true,
        0,
        false,

        {},
      );
      const stream = source.queryBindings(AF.createPattern(
        DF.namedNode('s'),
        DF.variable('p'),
        DF.namedNode('o'),
        DF.defaultGraph(),
      ), ctx);
      await expect(new Promise(resolve => stream.getProperty('metadata', resolve))).resolves
        .toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY, dataset: url },
          variables: [
            { variable: DF.variable('p'), canBeUndef: false },
          ],
        });
      await expect(stream).toEqualBindingsStream([
        BF.fromRecord({
          p: DF.namedNode('p1'),
        }),
        BF.fromRecord({
          p: DF.namedNode('p2'),
        }),
        BF.fromRecord({
          p: DF.namedNode('p3'),
        }),
      ]);
    });

    it('should emit metadata twice, and reuse from cache', async() => {
      const stream1 = source.queryBindings(AF.createPattern(
        iriS,
        DF.variable('p'),
        iriO,
        DF.defaultGraph(),
      ), ctx);
      await expect(new Promise(resolve => stream1.getProperty('metadata', resolve))).resolves
        .toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'exact', value: 3, dataset: url },
          variables: [
            { variable: DF.variable('p'), canBeUndef: false },
          ],
        });
      await stream1.toArray();

      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(2);

      const stream2 = source.queryBindings(AF.createPattern(
        iriS,
        DF.variable('p'),
        iriO,
        DF.defaultGraph(),
      ), ctx);
      await expect(new Promise(resolve => stream2.getProperty('metadata', resolve))).resolves
        .toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'exact', value: 3, dataset: url },
          variables: [
            { variable: DF.variable('p'), canBeUndef: false },
          ],
        });
      await stream2.toArray();

      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(3);
    });

    it('should not cache different queries', async() => {
      const stream1 = source.queryBindings(AF.createPattern(
        iriS,
        DF.variable('p'),
        iriO,
        DF.defaultGraph(),
      ), ctx);
      await expect(new Promise(resolve => stream1.getProperty('metadata', resolve))).resolves
        .toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'exact', value: 3, dataset: url },
          variables: [
            { variable: DF.variable('p'), canBeUndef: false },
          ],
        });
      await stream1.toArray();

      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(2);

      const stream2 = source.queryBindings(AF.createPattern(
        DF.namedNode(testUrl('s2')),
        DF.variable('p'),
        iriO,
        DF.defaultGraph(),
      ), ctx);
      await expect(new Promise(resolve => stream2.getProperty('metadata', resolve))).resolves
        .toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'exact', value: 3, dataset: url },

          variables: [
            { variable: DF.variable('p'), canBeUndef: false },
          ],
        });
      await stream2.toArray();

      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(4);
    });

    it('should not cache if cache is disabled', async() => {
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        mediatorHttp,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        0,
        10,
        true,
        true,
        0,
        false,

        {},
      );

      const stream1 = source.queryBindings(AF.createPattern(
        iriS,
        DF.variable('p'),
        iriO,
        DF.defaultGraph(),
      ), ctx);
      await expect(new Promise(resolve => stream1.getProperty('metadata', resolve))).resolves
        .toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'exact', value: 3, dataset: url },
          variables: [
            { variable: DF.variable('p'), canBeUndef: false },
          ],
        });
      await stream1.toArray();

      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(2);

      const stream2 = source.queryBindings(AF.createPattern(
        iriS,
        DF.variable('p'),
        iriO,
        DF.defaultGraph(),
      ), ctx);
      await expect(new Promise(resolve => stream2.getProperty('metadata', resolve))).resolves
        .toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'exact', value: 3, dataset: url },

          variables: [
            { variable: DF.variable('p'), canBeUndef: false },
          ],
        });
      await stream2.toArray();

      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(4);
    });

    it('should emit an error on server errors', async() => {
      const thisMediator: any = {
        mediate() {
          return {
            headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
            body: Readable.from([ `empty body` ]),
            ok: false,
            status: 500,
            statusText: 'Error!',
          };
        },
      };
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        thisMediator,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10,
        true,
        true,
        0,
        false,

        {},
      );
      await expect(source.queryBindings(
        AF.createPattern(iriS, DF.variable('p'), iriO),
        ctx,
      ).toArray())
        .rejects.toThrow(new Error(`Invalid SPARQL endpoint response from ${url} (HTTP status 500):\nempty body`));
    });

    it('should fallback to backup URL on server 404', async() => {
      const thisMediator: any = {
        mediate(action: any) {
          const query = action.init.body.toString();
          if (!(<string> action.input).includes('backup')) {
            return {
              headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
              body: Readable.from([ `empty body` ]),
              ok: false,
              status: 404,
              statusText: 'Error!',
            };
          }
          return {
            headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
            body: isCountQuery(query) ?
              Readable.from([ `{
  "head": { "vars": [ "count" ]
  } ,
  "results": { 
    "bindings": [
      {
        "count": { "type": "literal" , "value": "3" }
      }
    ]
  }
}` ]) :
              Readable.from([ `{
  "head": { "vars": [ "p" ]
  } ,
  "results": { 
    "bindings": [
      {
        "p": { "type": "uri" , "value": "p1" }
      },
      {
        "p": { "type": "uri" , "value": "p2" }
      },
      {
        "p": { "type": "uri" , "value": "p3" }
      }
    ]
  }
}` ]),
            ok: true,
          };
        },
      };
      source = new QuerySourceSparql(
        url,
        `${url}backup`,
        ctx,
        thisMediator,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10,
        true,
        true,
        0,
        false,

        {},
      );
      await expect(source.queryBindings(
        AF.createPattern(iriS, DF.variable(testUrl('p')), iriO, DF.defaultGraph()),
        ctx,
      )).toEqualBindingsStream([
        BF.fromRecord({}),
        BF.fromRecord({}),
        BF.fromRecord({}),
      ]);
      expect(logger.warn).toHaveBeenCalledTimes(4);
      expect(logger.warn).toHaveBeenCalledWith(`Encountered a 404 when requesting ${url} according to the service description of ${url}backup. This is a server configuration issue. Retrying the current and modifying future requests to ${url}backup instead.`);
      expect((<any> source).url).toBe(`${url}backup`);
    });

    it('should not fallback to identical backup URL on server 404', async() => {
      const thisMediator: any = {
        mediate() {
          return {
            headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
            body: Readable.from([ `empty body` ]),
            ok: false,
            status: 404,
            statusText: 'Error!',
          };
        },
      };
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        thisMediator,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10,
        true,
        true,
        0,
        false,

        {},
      );
      await expect(source.queryBindings(
        AF.createPattern(iriS, DF.variable('p'), iriO),
        ctx,
      ).toArray())
        .rejects.toThrow(new Error(`Invalid SPARQL endpoint response from ${url} (HTTP status 404):\nempty body`));
      expect(logger.warn).toHaveBeenCalledTimes(0);
      expect((<any> source).url).toBe(url);
    });

    it('should emit a warning error for unexpected undefs', async() => {
      const thisMediator: any = {
        mediate(action: any) {
          const query = action.init.body.toString();
          return {
            headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
            body: isCountQuery(query) ?
              Readable.from([ `{
  "head": { "vars": [ "count" ]
  } ,
  "results": { 
    "bindings": [
      {
        "count": { "type": "literal" , "value": "3" }
      }
    ]
  }
}` ]) :
              Readable.from([ `{
  "head": { "vars": [ "p" ]
  } ,
  "results": { 
    "bindings": [
      {
        "notp": { "type": "uri" , "value": "p1" }
      },
      {
        "notp": { "type": "uri" , "value": "p2" }
      },
      {
        "notp": { "type": "uri" , "value": "p3" }
      }
    ]
  }
}` ]),
            ok: true,
          };
        },
      };
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        thisMediator,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10,
        true,
        true,
        0,
        false,

        {},
      );
      await expect(source.queryBindings(
        AF.createPattern(iriS, DF.variable(testUrl('p')), iriO, DF.defaultGraph()),
        ctx,
      )).toEqualBindingsStream([
        BF.fromRecord({}),
        BF.fromRecord({}),
        BF.fromRecord({}),
      ]);
      expect(logger.warn).toHaveBeenCalledTimes(3);
      expect(logger.warn).toHaveBeenCalledWith(`The endpoint ${url} failed to provide a binding for ${testUrl('p')}.`);
    });

    it('should not emit an error for undef binding results for optionals', async() => {
      const thisMediator: any = {
        mediate(action: any) {
          const query = action.init.body.toString();
          return {
            headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
            body: isCountQuery(query) ?
              Readable.from([ `{
  "head": { "vars": [ "count" ]
  } ,
  "results": { 
    "bindings": [
      {
        "count": { "type": "literal" , "value": "3" }
      }
    ]
  }
}` ]) :
              Readable.from([ `{
  "head": { "vars": [ "p1" ]
  } ,
  "results": { 
    "bindings": [
      {
        "notp": { "type": "uri" , "value": "p1" }
      },
      {
        "notp": { "type": "uri" , "value": "p2" }
      },
      {
        "notp": { "type": "uri" , "value": "p3" },
        "p1": { "type": "uri" , "value": "p3" }
      }
    ]
  }
}` ]),
            ok: true,
          };
        },
      };
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        thisMediator,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10,
        true,
        true,
        0,
        false,

        {},
      );
      const stream = source.queryBindings(
        AF.createLeftJoin(
          AF.createPattern(iriS, DF.variable('p1'), iriO, DF.defaultGraph()),
          AF.createPattern(iriS, DF.variable('p2'), iriO, DF.defaultGraph()),
        ),
        ctx,
      );

      await expect(new Promise(resolve => stream.getProperty('metadata', resolve))).resolves
        .toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'exact', value: 3, dataset: url },
          variables: [
            { variable: DF.variable('p1'), canBeUndef: false },
            { variable: DF.variable('p2'), canBeUndef: true },
          ],
        });
      await expect(stream).toEqualBindingsStream([
        BF.fromRecord({}),
        BF.fromRecord({}),
        BF.fromRecord({
          p1: DF.namedNode('p3'),
        }),
      ]);
    });

    it('should emit an error for an erroring stream', async() => {
      const thisMediator: any = {
        mediate() {
          const stream = new PassThrough();
          stream._read = () => setImmediate(() => stream.emit('error', new Error('Some stream error')));
          return {
            headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
            body: stream,
            ok: true,
          };
        },
      };
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        thisMediator,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10,
        true,
        true,
        0,
        false,

        {},
      );
      await expect(source
        .queryBindings(
          AF.createPattern(iriS, DF.variable('p'), iriO, DF.defaultGraph()),
          ctx,
        ).toArray())
        .rejects.toThrow(new Error('Some stream error'));
    });

    it('should emit metadata with infinity count for invalid count results', async() => {
      const thisMediator: any = {
        mediate(action: any) {
          const query = action.init.body.toString();
          return {
            headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
            body: isCountQuery(query) ?
              Readable.from([ `{
  "head": { "vars": [ "count" ]
  } ,
  "results": { 
    "bindings": [
      {
        "count": { "type": "literal" , "value": "notanint" }
      }
    ]
  }
}` ]) :
              Readable.from([ `{
  "head": { "vars": [ "p" ]
  } ,
  "results": { 
    "bindings": [
      {
        "p": { "type": "uri" , "value": "p1" }
      },
      {
        "p": { "type": "uri" , "value": "p2" }
      },
      {
        "p": { "type": "uri" , "value": "p3" }
      }
    ]
  }
}` ]),
            ok: true,
          };
        },
      };
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        thisMediator,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10,
        true,
        true,
        0,
        false,

        {},
      );
      const stream = source.queryBindings(
        AF.createPattern(iriS, DF.variable('p'), iriO),
        ctx,
      );
      await expect(new Promise(resolve => stream.getProperty('metadata', resolve))).resolves
        .toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY, dataset: url },

          variables: [
            { variable: DF.variable('p'), canBeUndef: false },
          ],
        });
    });

    it('should emit metadata with infinity count for missing count results', async() => {
      const thisMediator: any = {
        mediate(action: any) {
          const query = action.init.body.toString();
          return {
            headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
            body: isCountQuery(query) ?
              Readable.from([ `{
  "head": { "vars": [ "count" ]
  } ,
  "results": { 
    "bindings": [
      {
        "nocount": { "type": "literal" , "value": "3" }
      }
    ]
  }
}` ]) :
              Readable.from([ `{
  "head": { "vars": [ "p" ]
  } ,
  "results": { 
    "bindings": [
      {
        "p": { "type": "uri" , "value": "p1" }
      },
      {
        "p": { "type": "uri" , "value": "p2" }
      },
      {
        "p": { "type": "uri" , "value": "p3" }
      }
    ]
  }
}` ]),
            ok: true,
          };
        },
      };
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        thisMediator,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10,
        true,
        true,
        0,
        false,

        {},
      );
      const stream = source.queryBindings(
        AF.createPattern(iriS, DF.variable('p'), iriO),
        ctx,
      );
      await expect(new Promise(resolve => stream.getProperty('metadata', resolve))).resolves
        .toEqual({
          state: expect.any(MetadataValidationState),

          cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY, dataset: url },

          variables: [
            { variable: DF.variable('p'), canBeUndef: false },
          ],
        });
    });

    it('should allow multiple read calls on query bindings', () => {
      const data = source.queryBindings(
        AF.createPattern(DF.namedNode('http://ex'), DF.namedNode(''), DF.variable('o')),
        ctx,
      );
      const r1 = data.read();
      const r2 = data.read();
      expect(r1).toBeNull();
      expect(r2).toBeNull();
    });

    it('should return data for HTTP GET requests', async() => {
      const thisMediator: any = {
        mediate(action: any) {
          const query = action.input;
          return {
            headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
            body: isCountQuery(query) ?
              Readable.from([ `{
  "head": { "vars": [ "count" ]
  } ,
  "results": { 
    "bindings": [
      {
        "count": { "type": "literal" , "value": "3" }
      }
    ]
  }
}` ]) :
              Readable.from([ `{
  "head": { "vars": [ "p" ]
  } ,
  "results": { 
    "bindings": [
      {
        "p": { "type": "uri" , "value": "p1" }
      },
      {
        "p": { "type": "uri" , "value": "p2" }
      },
      {
        "p": { "type": "uri" , "value": "p3" }
      }
    ]
  }
}` ]),
            ok: true,
          };
        },
      };
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        thisMediator,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        true,
        64,
        10,
        true,
        true,
        0,
        false,

        {},
      );
      await expect(source.queryBindings(AF.createPattern(iriS, DF.variable('p'), iriO), ctx))
        .toEqualBindingsStream([
          BF.fromRecord({
            p: DF.namedNode('p1'),
          }),
          BF.fromRecord({
            p: DF.namedNode('p2'),
          }),
          BF.fromRecord({
            p: DF.namedNode('p3'),
          }),
        ]);
    });

    it('should perform HTTP GET request when url length is below forceGetIfUrlLengthBelow', async() => {
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        mediatorHttp,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10,
        true,
        true,
        300,
        false,

        {},
      );

      await expect(source.queryBindings(AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o')), ctx))
        .toEqualBindingsStream([
          BF.fromRecord({
            p: DF.namedNode('p1'),
          }),
          BF.fromRecord({
            p: DF.namedNode('p2'),
          }),
          BF.fromRecord({
            p: DF.namedNode('p3'),
          }),
        ]);

      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(2);
      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context: ctx,
        init: {
          headers: expect.anything(),
          method: 'GET',
        },
        input: `${url}?query=SELECT%20(%20COUNT(%20*%20)%20AS%20%3Fcount%20)%20WHERE%20%7B%20%3Cs%3E%20%3Fp%20%3Co%3E%20.%20%7D`,
      });
    });

    describe('when acceptPost is defined', () => {
      let getSource: (arg0: string[]) => QuerySourceSparql;
      let operationIn: Algebra.Operation;
      let expectedResult: RDF.Bindings[];

      beforeEach(() => {
        getSource = (acceptPost: string[]) => new QuerySourceSparql(
          url,
          url,
          ctx,
          mediatorHttp,
          mediatorQuerySerialize,
          'values',
          DF,
          AF,
          BF,
          false,
          64,
          10,
          true,
          true,
          0,
          false,

          { postAccepted: acceptPost },
        );
        operationIn = AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o'));
        expectedResult = [
          BF.fromRecord({
            p: DF.namedNode('p1'),
          }),
          BF.fromRecord({
            p: DF.namedNode('p2'),
          }),
          BF.fromRecord({
            p: DF.namedNode('p3'),
          }),
        ];
      });

      it('should perform an url encoded HTTP POST request when acceptPost includes the url-encoded type', async() => {
        source = getSource([ 'application/x-www-form-urlencoded', 'application/sparql-query' ]);

        await expect(source.queryBindings(operationIn, ctx)).toEqualBindingsStream(expectedResult);

        expect(mediatorHttp.mediate).toHaveBeenCalledTimes(2);
        expect(mediatorHttp.mediate).toHaveBeenCalledWith({
          context: ctx,
          init: {
            body: new URLSearchParams({ query: 'SELECT ( COUNT( * ) AS ?count ) WHERE { <s> ?p <o> . }' }),
            headers: expect.anything(),
            method: 'POST',
          },
          input: url,
        });
      });

      it('should perform a direct HTTP POST request when acceptPost doesn\'t include the url-encoded type', async() => {
        source = getSource([ 'application/sparql-query' ]);

        await expect(source.queryBindings(operationIn, ctx)).toEqualBindingsStream(expectedResult);

        expect(mediatorHttp.mediate).toHaveBeenCalledTimes(2);
        expect(mediatorHttp.mediate).toHaveBeenCalledWith({
          context: ctx,
          init: {
            body: 'SELECT ( COUNT( * ) AS ?count ) WHERE { <s> ?p <o> . }',
            headers: expect.anything(),
            method: 'POST',
          },
          input: url,
        });
      });
    });

    it('should return data when joining bindings', async() => {
      await expect(source.queryBindings(
        AF.createPattern(iriS, DF.variable('p'), iriO),
        ctx,
        {
          joinBindings: {
            bindings: new ArrayIterator<RDF.Bindings>([], { autoStart: false }),
            metadata: <any> { variables: []},
          },
        },
      ))
        .toEqualBindingsStream([
          BF.fromRecord({
            p: DF.namedNode('p1'),
          }),
          BF.fromRecord({
            p: DF.namedNode('p2'),
          }),
          BF.fromRecord({
            p: DF.namedNode('p3'),
          }),
        ]);
      expect(lastQuery).toBe(`query=SELECT+%28+COUNT%28+*+%29+AS+%3Fcount+%29+WHERE+%7B+VALUES%28+%29%7B+%7D%3Chttps%3A%2F%2Fex%2Fs%3E+%3Fp+%3Chttps%3A%2F%2Fex%2Fo%3E+.+%7D`);

      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context: ctx,
        init: {
          body: new URLSearchParams({ query: `SELECT ( COUNT( * ) AS ?count ) WHERE { VALUES( ){ }<${testUrl('s')}> ?p <${testUrl('o')}> . }` }),
          headers: expect.anything(),
          method: 'POST',
        },
        input: url,
      });
    });

    it('ignores queryString for joinBindings', async() => {
      await expect(source.queryBindings(
        AF.createPattern(iriS, DF.variable('p'), iriO),
        ctx.set(KeysInitQuery.queryString, 'abc'), // This must be ignored
        {
          joinBindings: {
            bindings: new ArrayIterator<RDF.Bindings>([], { autoStart: false }),
            metadata: <any> { variables: []},
          },
        },
      ))
        .toEqualBindingsStream([
          BF.fromRecord({
            p: DF.namedNode('p1'),
          }),
          BF.fromRecord({
            p: DF.namedNode('p2'),
          }),
          BF.fromRecord({
            p: DF.namedNode('p3'),
          }),
        ]);
      expect(lastQuery).toBe(`query=SELECT+%28+COUNT%28+*+%29+AS+%3Fcount+%29+WHERE+%7B+VALUES%28+%29%7B+%7D%3Chttps%3A%2F%2Fex%2Fs%3E+%3Fp+%3Chttps%3A%2F%2Fex%2Fo%3E+.+%7D`);

      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context: ctx.set(KeysInitQuery.queryString, 'abc'),
        init: {
          body: new URLSearchParams({ query: `SELECT ( COUNT( * ) AS ?count ) WHERE { VALUES( ){ }<${testUrl('s')}> ?p <${testUrl('o')}> . }` }),
          headers: expect.anything(),
          method: 'POST',
        },
        input: url,
      });
    });

    it('should emit an error if an error occurs when joining bindings', async() => {
      const stream = new PassThrough();
      stream._read = () => setImmediate(() => stream.emit('error', new Error('Some stream error')));
      await expect(source.queryBindings(
        AF.createPattern(iriS, DF.variable('p'), iriO),
        ctx,
        {
          joinBindings: {
            bindings: wrap(stream),
            metadata: <any> { variables: []},
          },
        },
      ).toArray()).rejects.toThrow(`Some stream error`);
    });

    it('should emit metadata if an error occurs when joining bindings', async() => {
      const stream = new PassThrough();
      stream._read = () => setImmediate(() => stream.emit('error', new Error('Some stream error')));
      const ret = source.queryBindings(
        AF.createPattern(iriS, DF.variable('p'), iriO),
        ctx,
        {
          joinBindings: {
            bindings: wrap(stream),
            metadata: <any> { variables: []},
          },
        },
      );
      await expect(new Promise(resolve => ret.getProperty('metadata', resolve))).resolves
        .toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY, dataset: url },

          variables: [],
        });
    });

    it('should emit metadata with infinity count with timeout', async() => {
      jest.useFakeTimers();

      const thisMediator: any = {
        mediate(action: any) {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(mediatorHttp.mediate(action));
            }, 1_000);
            jest.runAllTimers();
          });
        },
      };
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        thisMediator,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10,
        true,
        true,
        0,
        false,

        {},
      );
      const stream = source.queryBindings(
        AF.createPattern(iriS, DF.variable('p'), iriO),
        ctx,
      );
      await expect(new Promise((resolve) => {
        stream.getProperty('metadata', resolve);
      })).resolves
        .toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY, dataset: url },

          variables: [
            { variable: DF.variable('p'), canBeUndef: false },
          ],
        });

      jest.useRealTimers();
    });

    it('should pass the original queryString if defined', async() => {
      await expect(source.queryBindings(
        AF.createPattern(iriS, DF.variable('p'), iriO),
        ctx.set(KeysInitQuery.queryString, 'abc'),
      ))
        .toEqualBindingsStream([
          BF.fromRecord({
            p: DF.namedNode('p1'),
          }),
          BF.fromRecord({
            p: DF.namedNode('p2'),
          }),
          BF.fromRecord({
            p: DF.namedNode('p3'),
          }),
        ]);

      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context: ctx.set(KeysInitQuery.queryString, 'abc'),
        init: {
          body: new URLSearchParams({ query: 'abc' }),
          headers: expect.anything(),
          method: 'POST',
        },
        input: url,
      });
    });

    it('should not pass the original queryString if queryFormat is not sparql', async() => {
      await expect(source.queryBindings(
        AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o')),
        ctx
          .set(KeysInitQuery.queryString, 'abc')
          .set(KeysInitQuery.queryFormat, { language: 'graphql', version: '1.0' }),
      ))
        .toEqualBindingsStream([
          BF.fromRecord({
            p: DF.namedNode('p1'),
          }),
          BF.fromRecord({
            p: DF.namedNode('p2'),
          }),
          BF.fromRecord({
            p: DF.namedNode('p3'),
          }),
        ]);

      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context: ctx
          .set(KeysInitQuery.queryString, 'abc')
          .set(KeysInitQuery.queryFormat, { language: 'graphql', version: '1.0' }),
        init: {
          body: new URLSearchParams({ query: 'SELECT ( COUNT( * ) AS ?count ) WHERE { <s> ?p <o> . }' }),
          headers: expect.anything(),
          method: 'POST',
        },
        input: url,
      });
    });

    it('should emit an for an unknown in-band version', async() => {
      const thisMediator: any = {
        mediate() {
          return {
            headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
            body: Readable.from([ `{
  "head": { "vars": [ "p" ], "version": "1.2-unknown"
  } ,
  "results": {
    "bindings": [
      {
        "p": { "type": "uri" , "value": "p1" }
      },
      {
        "p": { "type": "uri" , "value": "p2" }
      },
      {
        "p": { "type": "uri" , "value": "p3" }
      }
    ]
  }
}` ]),
            ok: true,
            status: 200,
            statusText: 'Ok!',
          };
        },
      };
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        thisMediator,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10,
        true,
        true,
        0,
        false,

        {},
      );
      await expect(source.queryBindings(
        AF.createPattern(iriS, DF.variable('p'), iriO),
        ctx,
      ).toArray())
        .rejects.toThrow(new Error(`Detected unsupported version: 1.2-unknown`));
    });

    it('should not emit an for an unknown in-band version when parseUnsupportedVersions is true', async() => {
      const thisMediator: any = {
        mediate() {
          return {
            headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
            body: Readable.from([ `{
  "head": { "vars": [ "p" ], "version": "1.2-unknown"
  } ,
  "results": {
    "bindings": [
      {
        "p": { "type": "uri" , "value": "p1" }
      },
      {
        "p": { "type": "uri" , "value": "p2" }
      },
      {
        "p": { "type": "uri" , "value": "p3" }
      }
    ]
  }
}` ]),
            ok: true,
            status: 200,
            statusText: 'Ok!',
          };
        },
      };
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        thisMediator,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10,
        true,
        true,
        0,
        true,

        {},
      );
      await expect(source.queryBindings(
        AF.createPattern(iriS, DF.variable('p'), iriO),
        ctx,
      ).toArray()).resolves.toHaveLength(3);
    });

    it('should emit an for an unknown out-of-band version', async() => {
      const thisMediator: any = {
        mediate() {
          return {
            headers: new Headers({ 'Content-Type': 'application/sparql-results+json; version=1.2-unknown' }),
            body: Readable.from([ `{
  "head": { "vars": [ "p" ]
  } ,
  "results": {
    "bindings": [
      {
        "p": { "type": "uri" , "value": "p1" }
      },
      {
        "p": { "type": "uri" , "value": "p2" }
      },
      {
        "p": { "type": "uri" , "value": "p3" }
      }
    ]
  }
}` ]),
            ok: true,
            status: 200,
            statusText: 'Ok!',
          };
        },
      };
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        thisMediator,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10,
        true,
        true,
        0,
        false,

        {},
      );
      await expect(source.queryBindings(
        AF.createPattern(iriS, DF.variable('p'), iriO),
        ctx,
      ).toArray())
        .rejects.toThrow(new Error(`Detected unsupported version as media type parameter: 1.2-unknown`));
    });

    it('should not emit an for an unknown out-of-band version when parseUnsupportedVersions is true', async() => {
      const thisMediator: any = {
        mediate() {
          return {
            headers: new Headers({ 'Content-Type': 'application/sparql-results+json; version=1.2-unknown' }),
            body: Readable.from([ `{
  "head": { "vars": [ "p" ]
  } ,
  "results": {
    "bindings": [
      {
        "p": { "type": "uri" , "value": "p1" }
      },
      {
        "p": { "type": "uri" , "value": "p2" }
      },
      {
        "p": { "type": "uri" , "value": "p3" }
      }
    ]
  }
}` ]),
            ok: true,
            status: 200,
            statusText: 'Ok!',
          };
        },
      };
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        thisMediator,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10,
        true,
        true,
        0,
        true,

        {},
      );
      await expect(source.queryBindings(
        AF.createPattern(iriS, DF.variable('p'), iriO),
        ctx,
      ).toArray()).resolves.toHaveLength(3);
    });
  });

  describe('queryQuads', () => {
    it('should return data', async() => {
      const thisMediator: any = {
        mediate: jest.fn(() => ({
          headers: new Headers({ 'Content-Type': 'text/turtle' }),
          body: Readable.from([ `<s1> <p1> <o1>. <s2> <p2> <o2>.` ]),
          ok: true,
        })),
      };
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        thisMediator,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10,
        true,
        true,
        0,
        false,

        {},
      );

      await expect(source.queryQuads(
        AF.createConstruct(AF.createPattern(iriS, DF.variable('p'), iriO), []),
        ctx,
      ).toArray()).resolves
        .toBeRdfIsomorphic([
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
          DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
        ]);

      expect(thisMediator.mediate).toHaveBeenCalledWith({
        context: ctx,
        init: {
          body: new URLSearchParams({ query: `CONSTRUCT { } WHERE { <${testUrl('s')}> ?p <${testUrl('o')}> . }` }),
          headers: expect.anything(),
          method: 'POST',
        },
        input: url,
      });
    });

    it('should emit metadata', async() => {
      const thisMediator: any = {
        mediate: jest.fn((action: any) => {
          const query = action.init.body.toString();
          lastQuery = query;
          return {
            headers: new Headers({ 'Content-Type': isCountQuery(query) ?
              'application/sparql-results+json' :
              'text/turtle' }),
            body: isCountQuery(query) ?
              Readable.from([ `{
  "head": { "vars": [ "count" ]
  } ,
  "results": {
    "bindings": [
      {
        "count": { "type": "literal" , "value": "3" }
      }
    ]
  }
}` ]) :
              Readable.from([ `<s1> <p1> <o1>. <s2> <p2> <o2>.` ]),
            ok: true,
          };
        }),
      };
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        thisMediator,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10,
        true,
        true,
        0,
        false,

        {},
      );

      const stream = source.queryQuads(
        AF.createConstruct(AF.createPattern(iriS, DF.variable('p'), iriO), []),
        ctx,
      );
      await expect(new Promise(resolve => stream.getProperty('metadata', resolve))).resolves
        .toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'exact', value: 3, dataset: url },

          variables: [
            { variable: DF.variable('p'), canBeUndef: false },
          ],
        });
      await expect(stream.toArray()).resolves.toBeRdfIsomorphic([
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
        DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
      ]);
    });

    it('should pass the original queryString if defined', async() => {
      const thisMediator: any = {
        mediate: jest.fn(() => ({
          headers: new Headers({ 'Content-Type': 'text/turtle' }),
          body: Readable.from([ `<s1> <p1> <o1>. <s2> <p2> <o2>.` ]),
          ok: true,
        })),
      };
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        thisMediator,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10,
        true,
        true,
        0,
        false,

        {},
      );

      await expect(source.queryQuads(
        AF.createConstruct(AF.createPattern(iriS, DF.variable('p'), iriO), []),
        ctx.set(KeysInitQuery.queryString, 'abc'),
      ).toArray()).resolves
        .toBeRdfIsomorphic([
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
          DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
        ]);

      expect(thisMediator.mediate).toHaveBeenCalledWith({
        context: ctx.set(KeysInitQuery.queryString, 'abc'),
        init: {
          body: new URLSearchParams({ query: 'abc' }),
          headers: expect.anything(),
          method: 'POST',
        },
        input: url,
      });
    });
  });

  describe('queryBoolean', () => {
    it('should return data', async() => {
      const thisMediator: any = {
        mediate: jest.fn(() => ({
          headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
          body: Readable.from([ `{
  "head": { "vars": [ "p" ]
  } ,
  "boolean": true
}` ]),
          ok: true,
        })),
      };
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        thisMediator,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10,
        true,
        true,
        0,
        false,

        {},
      );

      await expect(source.queryBoolean(
        AF.createAsk(AF.createPattern(iriS, DF.variable('p'), iriO)),
        ctx,
      )).resolves.toBe(true);

      expect(thisMediator.mediate).toHaveBeenCalledWith({
        context: ctx,
        init: {
          body: new URLSearchParams({ query: `ASK WHERE { <${testUrl('s')}> ?p <${testUrl('o')}> . }` }),
          headers: expect.anything(),
          method: 'POST',
        },
        input: url,
      });
    });

    it('should pass the original queryString if defined', async() => {
      const thisMediator: any = {
        mediate: jest.fn(() => ({
          headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
          body: Readable.from([ `{
  "head": { "vars": [ "p" ]
  } ,
  "boolean": true
}` ]),
          ok: true,
        })),
      };
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        thisMediator,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10,
        true,
        true,
        0,
        false,

        {},
      );

      await expect(source.queryBoolean(
        AF.createAsk(AF.createPattern(iriS, DF.variable('p'), iriO)),
        ctx.set(KeysInitQuery.queryString, 'abc'),
      )).resolves.toBe(true);

      expect(thisMediator.mediate).toHaveBeenCalledWith({
        context: ctx.set(KeysInitQuery.queryString, 'abc'),
        init: {
          body: new URLSearchParams({ query: 'abc' }),
          headers: expect.anything(),
          method: 'POST',
        },
        input: url,
      });
    });

    it('should shortcut to true if operation uses property features', async() => {
      jest.spyOn(source, 'operationUsesPropertyFeatures').mockReturnValue(true);
      jest.spyOn((<any>source).endpointFetcher, 'fetchAsk');
      await expect(source.queryBoolean(AF.createAsk(AF.createNop()), ctx)).resolves.toBeTruthy();
      expect((<any>source).endpointFetcher.fetchAsk).not.toHaveBeenCalled();
    });
  });

  describe('queryVoid', () => {
    it('should return data', async() => {
      const thisMediator: any = {
        mediate: jest.fn(() => ({
          headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
          body: Readable.from([ `OK` ]),
          ok: true,
        })),
      };
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        thisMediator,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10,
        true,
        true,
        0,
        false,

        {},
      );

      await source.queryVoid(
        AF.createDrop(iriS),
        ctx,
      );

      expect(thisMediator.mediate).toHaveBeenCalledWith({
        context: ctx,
        init: {
          body: `DROP GRAPH <${testUrl('s')}>`,
          headers: {
            'content-type': 'application/sparql-update',
          },
          method: 'POST',
          signal: expect.anything(),
        },
        input: url,
      });
    });

    it('should pass the original queryString if defined', async() => {
      const thisMediator: any = {
        mediate: jest.fn(() => ({
          headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
          body: Readable.from([ `OK` ]),
          ok: true,
        })),
      };
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        thisMediator,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10,
        true,
        true,
        0,
        false,

        {},
      );

      await source.queryVoid(
        AF.createDrop(iriS),
        ctx.set(KeysInitQuery.queryString, 'abc'),
      );

      expect(thisMediator.mediate).toHaveBeenCalledWith({
        context: ctx.set(KeysInitQuery.queryString, 'abc'),
        init: {
          body: 'abc',
          headers: {
            'content-type': 'application/sparql-update',
          },
          method: 'POST',
          signal: expect.anything(),
        },
        input: url,
      });
    });
  });

  describe('addBindingsToOperation', () => {
    it('should handle an empty stream for values', async() => {
      await expect(QuerySourceSparql.addBindingsToOperation(AF, 'values', AF.createNop(), {
        bindings: new ArrayIterator<RDF.Bindings>([], { autoStart: false }),
        metadata: <any> { variables: []},
      })).resolves.toEqual(AF.createJoin([
        AF.createValues([], []),
        AF.createNop(),
      ]));
    });

    it('should handle a non-empty stream for values', async() => {
      await expect(QuerySourceSparql.addBindingsToOperation(AF, 'values', AF.createNop(), {
        bindings: new ArrayIterator<RDF.Bindings>([
          BF.fromRecord({ a: DF.namedNode('a1') }),
          BF.fromRecord({ a: DF.namedNode('a2') }),
        ], { autoStart: false }),
        metadata: <any> { variables: [
          { variable: DF.variable('a'), canBeUndef: false },
        ]},
      })).resolves.toEqual(AF.createJoin([
        AF.createValues([ DF.variable('a') ], [
          { a: DF.namedNode('a1') },
          { a: DF.namedNode('a2') },
        ]),
        AF.createNop(),
      ]));
    });

    it('should throw on union', async() => {
      await expect(QuerySourceSparql.addBindingsToOperation(AF, 'union', AF.createNop(), {
        bindings: new ArrayIterator<RDF.Bindings>([], { autoStart: false }),
        metadata: <any> { variables: []},
      })).rejects.toThrow(`Not implemented yet: "union" case`);
    });

    it('should throw on filter', async() => {
      await expect(QuerySourceSparql.addBindingsToOperation(AF, 'filter', AF.createNop(), {
        bindings: new ArrayIterator<RDF.Bindings>([], { autoStart: false }),
        metadata: <any> { variables: []},
      })).rejects.toThrow(`Not implemented yet: "filter" case`);
    });
  });

  describe('getOperationUndefs', () => {
    it('should be empty for a triple pattern', () => {
      expect(QuerySourceSparql.getOperationUndefs(
        AF.createPattern(iriS, DF.variable('p'), iriO),
      )).toEqual([]);
    });

    it('should handle a left join', () => {
      expect(QuerySourceSparql.getOperationUndefs(
        AF.createLeftJoin(
          AF.createPattern(iriS, DF.variable('p'), iriO),
          AF.createPattern(iriS, DF.variable('p'), iriO),
        ),
      )).toEqual([]);
      expect(QuerySourceSparql.getOperationUndefs(
        AF.createLeftJoin(
          AF.createPattern(iriS, DF.variable('p1'), iriO),
          AF.createPattern(iriS, DF.variable('p2'), iriO),
        ),
      )).toEqual([ DF.variable('p2') ]);
    });

    it('should handle a nested left join', () => {
      expect(QuerySourceSparql.getOperationUndefs(
        AF.createProject(
          AF.createLeftJoin(
            AF.createPattern(iriS, DF.variable('p1'), iriO),
            AF.createPattern(iriS, DF.variable('p2'), iriO),
          ),
          [],
        ),
      )).toEqual([ DF.variable('p2') ]);
    });

    it('should handle values with undefs', () => {
      expect(QuerySourceSparql.getOperationUndefs(
        AF.createValues(
          [ DF.variable('v'), DF.variable('w') ],
          [
            { v: DF.namedNode('v1') },
            { v: DF.namedNode('v2'), w: DF.namedNode('w2') },
          ],
        ),
      )).toEqual([ DF.variable('w') ]);
    });

    it('should handle values without undefs', () => {
      expect(QuerySourceSparql.getOperationUndefs(
        AF.createValues(
          [ DF.variable('v'), DF.variable('w') ],
          [
            { v: DF.namedNode('v1'), w: DF.namedNode('w1') },
            { v: DF.namedNode('v2'), w: DF.namedNode('w2') },
          ],
        ),
      )).toEqual([]);
    });

    it('should handle union without equal variables', () => {
      expect(QuerySourceSparql.getOperationUndefs(
        AF.createUnion(
          [
            AF.createPattern(DF.variable('s'), DF.variable('p1'), iriO),
            AF.createPattern(DF.variable('s'), DF.variable('p2'), iriO),
          ],
        ),
      )).toEqual([ DF.variable('p1'), DF.variable('p2') ]);
    });

    it('should handle union with equal variables', () => {
      expect(QuerySourceSparql.getOperationUndefs(
        AF.createUnion(
          [
            AF.createPattern(DF.variable('s'), DF.variable('p'), iriO),
            AF.createPattern(DF.variable('s'), DF.variable('p'), iriO),
          ],
        ),
      )).toEqual([]);
    });

    it('should handle union with equal variables but an inner with undefs', () => {
      expect(QuerySourceSparql.getOperationUndefs(
        AF.createUnion(
          [
            AF.createPattern(DF.variable('p'), DF.variable('p1'), iriO),
            AF.createLeftJoin(
              AF.createPattern(iriS, DF.variable('p'), iriO),
              AF.createPattern(iriS, DF.variable('p1'), iriO),
            ),
          ],
        ),
      )).toEqual([ DF.variable('p1') ]);
    });
  });

  describe('estimateOperationCardinality', () => {
    const operation = AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'));

    it('should return existing estimate from cache when available', async() => {
      const key = await source.operationToNormalizedCountQuery(operation);
      const cardinality: QueryResultCardinality = {
        type: 'estimate',
        value: 987654,
        dataset: url,
      };
      (<Map<string, QueryResultCardinality>>(<any>source).cache).set(key, cardinality);
      await expect(source.estimateOperationCardinality(operation)).resolves.toEqual(cardinality);
    });

    it('should return infinity without dataset metadata available', async() => {
      await expect(source.estimateOperationCardinality(operation)).resolves.toEqual({
        type: 'estimate',
        value: Number.POSITIVE_INFINITY,
        dataset: url,
      });
    });

    it('should return cardinality from default graph dataset if available', async() => {
      const defaultGraphUri = 'ex:defaultDataset';
      const defaultGraphCardinality: QueryResultCardinality = {
        type: 'estimate',
        value: 123,
        dataset: defaultGraphUri,
      };
      const defaultGraph: IDataset = {
        uri: defaultGraphUri,
        source: url,
        getCardinality: jest.fn().mockReturnValue(defaultGraphCardinality),
      };
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        mediatorHttp,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10,
        true,
        true,
        0,
        false,

        { defaultGraph: defaultGraphUri, datasets: [ defaultGraph ]},
      );
      expect(defaultGraph.getCardinality).not.toHaveBeenCalled();
      await expect(source.estimateOperationCardinality(operation)).resolves.toEqual({
        type: 'estimate',
        value: 123,
        dataset: url,
      });
      expect(defaultGraph.getCardinality).toHaveBeenCalledTimes(1);
    });

    it('should return exact 0 with default graph defined but not available', async() => {
      const defaultGraphUri = 'ex:defaultDataset';
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        mediatorHttp,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10,
        true,
        true,
        0,
        false,

        { defaultGraph: defaultGraphUri, datasets: []},
      );
      await expect(source.estimateOperationCardinality(operation)).resolves.toEqual({
        type: 'exact',
        value: 0,
        dataset: url,
      });
    });

    it('should return exact sum for union default graph over exact cardinalities', async() => {
      const graphs: IDataset[] = [
        {
          uri: 'ex:g1',
          source: url,
          getCardinality: jest.fn().mockReturnValue({ type: 'exact', value: 1, dataset: 'ex:g1' }),
        },
        {
          uri: 'ex:g2',
          source: url,
          getCardinality: jest.fn().mockReturnValue({ type: 'exact', value: 2, dataset: 'ex:g2' }),
        },
      ];
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        mediatorHttp,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10,
        true,
        true,
        0,
        false,

        { unionDefaultGraph: true, datasets: graphs },
      );
      expect(graphs[0].getCardinality).not.toHaveBeenCalled();
      expect(graphs[1].getCardinality).not.toHaveBeenCalled();
      await expect(source.estimateOperationCardinality(operation)).resolves.toEqual({
        type: 'exact',
        value: 3,
        dataset: url,
      });
      expect(graphs[0].getCardinality).toHaveBeenCalledTimes(1);
      expect(graphs[1].getCardinality).toHaveBeenCalledTimes(1);
    });

    it('should return estimate sum for union default graph over mixed cardinality estimates', async() => {
      const graphs: IDataset[] = [
        {
          uri: 'ex:g1',
          source: url,
          getCardinality: jest.fn().mockReturnValue({ type: 'exact', value: 2, dataset: 'ex:g1' }),
        },
        {
          uri: 'ex:g2',
          source: url,
          getCardinality: jest.fn().mockReturnValue({ type: 'estimate', value: 3, dataset: 'ex:g2' }),
        },
      ];
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        mediatorHttp,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10,
        true,
        true,
        0,
        false,

        { unionDefaultGraph: true, datasets: graphs },
      );
      expect(graphs[0].getCardinality).not.toHaveBeenCalled();
      expect(graphs[1].getCardinality).not.toHaveBeenCalled();
      await expect(source.estimateOperationCardinality(operation)).resolves.toEqual({
        type: 'estimate',
        value: 5,
        dataset: url,
      });
      expect(graphs[0].getCardinality).toHaveBeenCalledTimes(1);
      expect(graphs[1].getCardinality).toHaveBeenCalledTimes(1);
    });

    it('should shortcut to estimate 1 when operation uses property features', async() => {
      jest.spyOn(source, 'operationUsesPropertyFeatures').mockReturnValue(true);
      jest.spyOn(source, 'operationToNormalizedCountQuery');
      await expect(source.estimateOperationCardinality(AF.createNop())).resolves.toEqual({
        type: 'estimate',
        value: 1,
        dataset: url,
      });
      expect(source.operationToNormalizedCountQuery).not.toHaveBeenCalled();
      expect(source.operationUsesPropertyFeatures).toHaveBeenCalledTimes(1);
    });
  });

  describe('operationUsesPropertyFeatures', () => {
    const propertyFeature = DF.namedNode('ex:propertyFeature');

    it('should shortcut to false if source has no property features defined', () => {
      expect(source.operationUsesPropertyFeatures(AF.createNop())).toBeFalsy();
    });

    it('should return false if source and query do not share property features', () => {
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        mediatorHttp,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10000,
        true,
        true,
        0,
        false,

        { propertyFeatures: [ propertyFeature.value ]},
      );
      const operation = AF.createPattern(DF.variable('s'), DF.namedNode('ex:p'), DF.variable('o'));
      expect(source.operationUsesPropertyFeatures(operation)).toBeFalsy();
    });

    it('should return true if source and query share property features', () => {
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        mediatorHttp,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10000,
        true,
        true,
        0,
        false,

        { propertyFeatures: [ propertyFeature.value ]},
      );
      const operation = AF.createPattern(DF.variable('s'), propertyFeature, DF.variable('o'));
      expect(source.operationUsesPropertyFeatures(operation)).toBeTruthy();
    });

    it('should return true if source and query share property features in property path links', () => {
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        mediatorHttp,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10000,
        true,
        true,
        0,
        false,

        { propertyFeatures: [ propertyFeature.value ]},
      );
      const operation = AF.createPath(DF.variable('s'), AF.createLink(propertyFeature), DF.variable('params'));
      expect(source.operationUsesPropertyFeatures(operation)).toBeTruthy();
    });

    it('should return false if source and query do not share property features in property path links', () => {
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        mediatorHttp,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10000,
        true,
        true,
        0,
        false,

        { propertyFeatures: [ propertyFeature.value ]},
      );
      const operation = AF.createPath(DF.variable('s'), AF.createLink(DF.namedNode('.ex:p')), DF.variable('params'));
      expect(source.operationUsesPropertyFeatures(operation)).toBeFalsy();
    });

    it('should return true if source and query share property features in property path nps', () => {
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        mediatorHttp,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10000,
        true,
        true,
        0,
        false,

        { propertyFeatures: [ propertyFeature.value ]},
      );
      const operation = AF.createPath(DF.variable('s'), AF.createNps([ propertyFeature ]), DF.variable('params'));
      expect(source.operationUsesPropertyFeatures(operation)).toBeTruthy();
    });

    it('should return false if source and query do not share property features in property path nps', () => {
      source = new QuerySourceSparql(
        url,
        url,
        ctx,
        mediatorHttp,
        mediatorQuerySerialize,
        'values',
        DF,
        AF,
        BF,
        false,
        64,
        10000,
        true,
        true,
        0,
        false,

        { propertyFeatures: [ propertyFeature.value ]},
      );
      const operation = AF.createPath(DF.variable('s'), AF.createNps([ DF.namedNode('ex:p') ]), DF.variable('params'));
      expect(source.operationUsesPropertyFeatures(operation)).toBeFalsy();
    });
  });
});
