import { PassThrough } from 'node:stream';
import { KeysCore, KeysInitQuery } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { IActionContext, IDataset, QueryResultCardinality } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator, wrap } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';

// Needed to load Headers
import 'jest-rdf';
import { Readable } from 'readable-stream';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';
import { QuerySourceSparql } from '../lib/QuerySourceSparql';
import '@comunica/utils-jest';

const DF = new DataFactory();
const AF = new Factory();
const BF = new BindingsFactory(DF);
const url = 'http://example.org/sparql';

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
        body: query.indexOf('COUNT') > 0 ?
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
  let source: QuerySourceSparql;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = { warn: jest.fn() };
    ctx = new ActionContext({
      [KeysCore.log.name]: logger,
      [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
    });
    source = new QuerySourceSparql(url, ctx, mediatorHttp, 'values', DF, AF, BF, false, 64, 10000, true, true, 0);
  });

  describe('getSelectorShape', () => {
    it('should return a selector shape', async() => {
      await expect(source.getSelectorShape()).resolves.toEqual({
        type: 'disjunction',
        children: [
          {
            type: 'operation',
            operation: { operationType: 'wildcard' },
            joinBindings: true,
          },
        ],
      });
    });
  });

  describe('toString', () => {
    it('should return a string representation', async() => {
      expect(source.toString()).toBe(`QuerySourceSparql(${url})`);
    });
  });

  describe('queryBindings', () => {
    it('should return data', async() => {
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
          body: new URLSearchParams({ query: 'SELECT (COUNT(*) AS ?count) WHERE { undefined:s ?p undefined:o. }' }),
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
            body: query.indexOf('COUNT') > 0 ?
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
      source = new QuerySourceSparql(url, ctx, thisMediator, 'values', DF, AF, BF, false, 64, 10, true, true, 0);
      await expect(source.queryBindings(AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.namedNode('o')), ctx))
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
            body: query.indexOf('COUNT') > 0 ?
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
      source = new QuerySourceSparql(url, ctx, thisMediator, 'values', DF, AF, BF, false, 64, 10, true, true, 0);
      await expect(
        source.queryBindings(AF.createPattern(
          DF.quad(DF.variable('s'), DF.namedNode('p'), DF.namedNode('o')),
          DF.namedNode('p'),
          DF.namedNode('o'),
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
            body: require('readable-stream-node-to-web')(query.indexOf('COUNT') > 0 ?
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
      source = new QuerySourceSparql(url, ctx, thisMediator, 'values', DF, AF, BF, false, 64, 10, true, true, 0);
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
    });

    it('should emit metadata', async() => {
      const stream = source.queryBindings(AF.createPattern(
        DF.namedNode('s'),
        DF.variable('p'),
        DF.namedNode('o'),
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
      source = new QuerySourceSparql(url, ctx, mediatorHttp, 'values', DF, AF, BF, false, 64, 10, false, true, 0);
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
        DF.namedNode('s'),
        DF.variable('p'),
        DF.namedNode('o'),
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
        DF.namedNode('s'),
        DF.variable('p'),
        DF.namedNode('o'),
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
        DF.namedNode('s'),
        DF.variable('p'),
        DF.namedNode('o'),
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
        DF.namedNode('s2'),
        DF.variable('p'),
        DF.namedNode('o'),
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
      source = new QuerySourceSparql(url, ctx, mediatorHttp, 'values', DF, AF, BF, false, 0, 10, true, true, 0);

      const stream1 = source.queryBindings(AF.createPattern(
        DF.namedNode('s'),
        DF.variable('p'),
        DF.namedNode('o'),
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
        DF.namedNode('s'),
        DF.variable('p'),
        DF.namedNode('o'),
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
      source = new QuerySourceSparql(url, ctx, thisMediator, 'values', DF, AF, BF, false, 64, 10, true, true, 0);
      await expect(source.queryBindings(
        AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o')),
        ctx,
      ).toArray())
        .rejects.toThrow(new Error(`Invalid SPARQL endpoint response from ${url} (HTTP status 500):\nempty body`));
    });

    it('should emit a warning error for unexpected undefs', async() => {
      const thisMediator: any = {
        mediate(action: any) {
          const query = action.init.body.toString();
          return {
            headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
            body: query.indexOf('COUNT') > 0 ?
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
      source = new QuerySourceSparql(url, ctx, thisMediator, 'values', DF, AF, BF, false, 64, 10, true, true, 0);
      await expect(source.queryBindings(
        AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o'), DF.defaultGraph()),
        ctx,
      )).toEqualBindingsStream([
        BF.fromRecord({}),
        BF.fromRecord({}),
        BF.fromRecord({}),
      ]);
      expect(logger.warn).toHaveBeenCalledTimes(3);
      expect(logger.warn).toHaveBeenCalledWith(`The endpoint ${url} failed to provide a binding for p.`);
    });

    it('should not emit an error for undef binding results for optionals', async() => {
      const thisMediator: any = {
        mediate(action: any) {
          const query = action.init.body.toString();
          return {
            headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
            body: query.indexOf('COUNT') > 0 ?
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
      source = new QuerySourceSparql(url, ctx, thisMediator, 'values', DF, AF, BF, false, 64, 10, true, true, 0);
      const stream = source.queryBindings(
        AF.createLeftJoin(
          AF.createPattern(DF.namedNode('s'), DF.variable('p1'), DF.namedNode('o'), DF.defaultGraph()),
          AF.createPattern(DF.namedNode('s'), DF.variable('p2'), DF.namedNode('o'), DF.defaultGraph()),
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
      source = new QuerySourceSparql(url, ctx, thisMediator, 'values', DF, AF, BF, false, 64, 10, true, true, 0);
      await expect(source
        .queryBindings(
          AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o'), DF.defaultGraph()),
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
            body: query.indexOf('COUNT') > 0 ?
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
      source = new QuerySourceSparql(url, ctx, thisMediator, 'values', DF, AF, BF, false, 64, 10, true, true, 0);
      const stream = source.queryBindings(
        AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o')),
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
            body: query.indexOf('COUNT') > 0 ?
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
      source = new QuerySourceSparql(url, ctx, thisMediator, 'values', DF, AF, BF, false, 64, 10, true, true, 0);
      const stream = source.queryBindings(
        AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o')),
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
            body: query.indexOf('COUNT') > 0 ?
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
      source = new QuerySourceSparql(url, ctx, thisMediator, 'values', DF, AF, BF, true, 64, 10, true, true, 0);
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
    });

    it('should perform HTTP GET request when url length is below forceGetIfUrlLengthBelow', async() => {
      source = new QuerySourceSparql(url, ctx, mediatorHttp, 'values', DF, AF, BF, false, 64, 10, true, true, 300);

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
        input: `${url}?query=SELECT%20(COUNT(*)%20AS%20%3Fcount)%20WHERE%20%7B%20undefined%3As%20%3Fp%20undefined%3Ao.%20%7D`,
      });
    });

    it('should return data when joining bindings', async() => {
      await expect(source.queryBindings(
        AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o')),
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
      expect(lastQuery).toBe(`query=SELECT+%3Fp+WHERE+%7B%0A++VALUES+%28%29+%7B%0A++%0A++%7D%0A++undefined%3As+%3Fp+undefined%3Ao.%0A%7D`);

      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context: ctx,
        init: {
          body: new URLSearchParams({ query: `SELECT (COUNT(*) AS ?count) WHERE {
  VALUES () {
  
  }
  undefined:s ?p undefined:o.
}` }),
          headers: expect.anything(),
          method: 'POST',
        },
        input: url,
      });
    });

    it('ignores queryString for joinBindings', async() => {
      await expect(source.queryBindings(
        AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o')),
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
      expect(lastQuery).toBe(`query=SELECT+%3Fp+WHERE+%7B%0A++VALUES+%28%29+%7B%0A++%0A++%7D%0A++undefined%3As+%3Fp+undefined%3Ao.%0A%7D`);

      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context: ctx.set(KeysInitQuery.queryString, 'abc'),
        init: {
          body: new URLSearchParams({ query: `SELECT (COUNT(*) AS ?count) WHERE {
  VALUES () {
  
  }
  undefined:s ?p undefined:o.
}` }),
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
        AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o')),
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
        AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o')),
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
      source = new QuerySourceSparql(url, ctx, thisMediator, 'values', DF, AF, BF, false, 64, 10, true, true, 0);
      const stream = source.queryBindings(
        AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o')),
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
        AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o')),
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
          body: new URLSearchParams({ query: 'SELECT (COUNT(*) AS ?count) WHERE { undefined:s ?p undefined:o. }' }),
          headers: expect.anything(),
          method: 'POST',
        },
        input: url,
      });
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
      source = new QuerySourceSparql(url, ctx, thisMediator, 'values', DF, AF, BF, false, 64, 10, true, true, 0);

      await expect(source.queryQuads(
        AF.createConstruct(AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o')), []),
        ctx,
      ).toArray()).resolves
        .toBeRdfIsomorphic([
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
          DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
        ]);

      expect(thisMediator.mediate).toHaveBeenCalledWith({
        context: ctx,
        init: {
          body: new URLSearchParams({ query: `CONSTRUCT {  }
WHERE { undefined:s ?p undefined:o. }` }),
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
            headers: new Headers({ 'Content-Type': query.indexOf('COUNT') > 0 ?
              'application/sparql-results+json' :
              'text/turtle' }),
            body: query.indexOf('COUNT') > 0 ?
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
      source = new QuerySourceSparql(url, ctx, thisMediator, 'values', DF, AF, BF, false, 64, 10, true, true, 0);

      const stream = source.queryQuads(
        AF.createConstruct(AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o')), []),
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
      source = new QuerySourceSparql(url, ctx, thisMediator, 'values', DF, AF, BF, false, 64, 10, true, true, 0);

      await expect(source.queryQuads(
        AF.createConstruct(AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o')), []),
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
      source = new QuerySourceSparql(url, ctx, thisMediator, 'values', DF, AF, BF, false, 64, 10, true, true, 0);

      await expect(source.queryBoolean(
        AF.createAsk(AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o'))),
        ctx,
      )).resolves.toBe(true);

      expect(thisMediator.mediate).toHaveBeenCalledWith({
        context: ctx,
        init: {
          body: new URLSearchParams({ query: 'ASK WHERE { undefined:s ?p undefined:o. }' }),
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
      source = new QuerySourceSparql(url, ctx, thisMediator, 'values', DF, AF, BF, false, 64, 10, true, true, 0);

      await expect(source.queryBoolean(
        AF.createAsk(AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o'))),
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
      source = new QuerySourceSparql(url, ctx, thisMediator, 'values', DF, AF, BF, false, 64, 10, true, true, 0);

      await source.queryVoid(
        AF.createDrop(DF.namedNode('s')),
        ctx,
      );

      expect(thisMediator.mediate).toHaveBeenCalledWith({
        context: ctx,
        init: {
          body: 'DROP GRAPH undefined:s',
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
      source = new QuerySourceSparql(url, ctx, thisMediator, 'values', DF, AF, BF, false, 64, 10, true, true, 0);

      await source.queryVoid(
        AF.createDrop(DF.namedNode('s')),
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
          { '?a': DF.namedNode('a1') },
          { '?a': DF.namedNode('a2') },
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
        AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o')),
      )).toEqual([]);
    });

    it('should handle a left join', () => {
      expect(QuerySourceSparql.getOperationUndefs(
        AF.createLeftJoin(
          AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o')),
          AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o')),
        ),
      )).toEqual([]);
      expect(QuerySourceSparql.getOperationUndefs(
        AF.createLeftJoin(
          AF.createPattern(DF.namedNode('s'), DF.variable('p1'), DF.namedNode('o')),
          AF.createPattern(DF.namedNode('s'), DF.variable('p2'), DF.namedNode('o')),
        ),
      )).toEqual([ DF.variable('p2') ]);
    });

    it('should handle a nested left join', () => {
      expect(QuerySourceSparql.getOperationUndefs(
        AF.createProject(
          AF.createLeftJoin(
            AF.createPattern(DF.namedNode('s'), DF.variable('p1'), DF.namedNode('o')),
            AF.createPattern(DF.namedNode('s'), DF.variable('p2'), DF.namedNode('o')),
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
            { '?v': DF.namedNode('v1') },
            { '?v': DF.namedNode('v2'), '?w': DF.namedNode('w2') },
          ],
        ),
      )).toEqual([ DF.variable('w') ]);
    });

    it('should handle values without undefs', () => {
      expect(QuerySourceSparql.getOperationUndefs(
        AF.createValues(
          [ DF.variable('v'), DF.variable('w') ],
          [
            { '?v': DF.namedNode('v1'), '?w': DF.namedNode('w1') },
            { '?v': DF.namedNode('v2'), '?w': DF.namedNode('w2') },
          ],
        ),
      )).toEqual([]);
    });

    it('should handle union without equal variables', () => {
      expect(QuerySourceSparql.getOperationUndefs(
        AF.createUnion(
          [
            AF.createPattern(DF.variable('s'), DF.variable('p1'), DF.namedNode('o')),
            AF.createPattern(DF.variable('s'), DF.variable('p2'), DF.namedNode('o')),
          ],
        ),
      )).toEqual([ DF.variable('p1'), DF.variable('p2') ]);
    });

    it('should handle union with equal variables', () => {
      expect(QuerySourceSparql.getOperationUndefs(
        AF.createUnion(
          [
            AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o')),
            AF.createPattern(DF.variable('s'), DF.variable('p'), DF.namedNode('o')),
          ],
        ),
      )).toEqual([]);
    });

    it('should handle union with equal variables but an inner with undefs', () => {
      expect(QuerySourceSparql.getOperationUndefs(
        AF.createUnion(
          [
            AF.createPattern(DF.variable('p'), DF.variable('p1'), DF.namedNode('o')),
            AF.createLeftJoin(
              AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o')),
              AF.createPattern(DF.namedNode('s'), DF.variable('p1'), DF.namedNode('o')),
            ),
          ],
        ),
      )).toEqual([ DF.variable('p1') ]);
    });
  });

  describe('estimateOperationCardinality', () => {
    const operation: Algebra.Operation = AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'));

    it('should return existing estimate from cache when available', async() => {
      const key = source.operationToNormalizedCountQuery(operation);
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
        ctx,
        mediatorHttp,
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
        defaultGraphUri,
        undefined,
        [ defaultGraph ],
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
        ctx,
        mediatorHttp,
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
        defaultGraphUri,
        undefined,
        [],
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
        ctx,
        mediatorHttp,
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
        undefined,
        true,
        <any>graphs,
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
        ctx,
        mediatorHttp,
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
        undefined,
        true,
        <any>graphs,
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
  });
});
