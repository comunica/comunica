import { PassThrough } from 'stream';
import { BindingsFactory } from '@comunica/bindings-factory';
import { ActionContext } from '@comunica/core';
import { ArrayIterator, wrap } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import 'cross-fetch/polyfill'; // Needed to load Headers
import 'jest-rdf';
import { Algebra, Factory } from 'sparqlalgebrajs';
import { QuerySourceSparql } from '../lib/QuerySourceSparql';
import '@comunica/jest';

const quad = require('rdf-quad');
const streamifyString = require('streamify-string');

const DF = new DataFactory();
const AF = new Factory();
const BF = new BindingsFactory();
const v1 = DF.variable('v1');
const v2 = DF.variable('v2');
const v3 = DF.variable('v3');
const v4 = DF.variable('v4');
const pAllQuad = AF.createPattern(v1, v2, v3, v4);
const pAllTriple = AF.createPattern(v1, v2, v3);

// TODO: Remove when targeting NodeJS 18+
if (!globalThis.ReadableStream) {
  globalThis.ReadableStream = require('web-streams-ponyfill').ReadableStream;
}

describe('QuerySourceSparql', () => {
  const ctx = new ActionContext({});
  let lastQuery: string;
  const mediatorHttp: any = {
    mediate: jest.fn((action: any) => {
      const query = action.init.body.toString();
      lastQuery = query;
      return {
        headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
        body: query.indexOf('COUNT') > 0 ?
          streamifyString(`{
  "head": { "vars": [ "count" ]
  } ,
  "results": {
    "bindings": [
      {
        "count": { "type": "literal" , "value": "3" }
      }
    ]
  }
}`) :
          streamifyString(`{
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
}`),
        ok: true,
      };
    }),
  };
  let source: QuerySourceSparql;

  beforeEach(() => {
    jest.clearAllMocks();
    source = new QuerySourceSparql('http://example.org/sparql', ctx, mediatorHttp, 'values', BF, false, 64, 10);
  });

  describe('getSelectorShape', () => {
    it('should return a selector shape', async() => {
      expect(await source.getSelectorShape()).toEqual({
        type: 'disjunction',
        children: [
          {
            type: 'operation',
            operation: { operationType: 'type', type: Algebra.types.PROJECT },
            joinBindings: true,
          },
          {
            type: 'operation',
            operation: { operationType: 'type', type: Algebra.types.CONSTRUCT },
          },
          {
            type: 'operation',
            operation: { operationType: 'type', type: Algebra.types.DESCRIBE },
          },
          {
            type: 'operation',
            operation: { operationType: 'type', type: Algebra.types.ASK },
          },
          {
            type: 'operation',
            operation: { operationType: 'type', type: Algebra.types.COMPOSITE_UPDATE },
          },
        ],
      });
    });
  });

  describe('toString', () => {
    it('should return a string representation', async() => {
      expect(source.toString()).toEqual('QuerySourceSparql(http://example.org/sparql)');
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
    });

    it('should return data with quoted triples', async() => {
      const thisMediator: any = {
        mediate: jest.fn((action: any) => {
          const query = action.init.body.toString();
          return {
            headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
            body: query.indexOf('COUNT') > 0 ?
              streamifyString(`{
  "head": { "vars": [ "count" ]
  } ,
  "results": {
    "bindings": [
      {
        "count": { "type": "literal" , "value": "3" }
      }
    ]
  }
}`) :
              streamifyString(`{
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
}`),
            ok: true,
          };
        }),
      };
      source = new QuerySourceSparql('http://example.org/sparql', ctx, thisMediator, 'values', BF, false, 64, 10);
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
              streamifyString(`{
  "head": { "vars": [ "count" ]
  } ,
  "results": {
    "bindings": [
      {
        "count": { "type": "literal" , "value": "3" }
      }
    ]
  }
}`) :
              streamifyString(`{
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
}`),
            ok: true,
          };
        }),
      };
      source = new QuerySourceSparql('http://example.org/sparql', ctx, thisMediator, 'values', BF, false, 64, 10);
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
              streamifyString(`{
  "head": { "vars": [ "count" ]
  } ,
  "results": { 
    "bindings": [
      {
        "count": { "type": "literal" , "value": "3" }
      }
    ]
  }
}`) :
              streamifyString(`{
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
}`)),
            ok: true,
          };
        },
      };
      source = new QuerySourceSparql('http://example.org/sparql', ctx, thisMediator, 'values', BF, false, 64, 10);
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
        DF.namedNode('s'), DF.variable('p'), DF.namedNode('o'), DF.defaultGraph(),
      ), ctx);
      expect(await new Promise(resolve => stream.getProperty('metadata', resolve)))
        .toEqual({
          cardinality: { type: 'exact', value: 3 },
          canContainUndefs: false,
          variables: [ DF.variable('p') ],
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
        DF.namedNode('s'), DF.variable('p'), DF.namedNode('o'), DF.defaultGraph(),
      ), ctx);
      expect(await new Promise(resolve => stream1.getProperty('metadata', resolve)))
        .toEqual({
          cardinality: { type: 'exact', value: 3 },
          canContainUndefs: false,
          variables: [ DF.variable('p') ],
        });
      await stream1.toArray();

      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(2);

      const stream2 = source.queryBindings(AF.createPattern(
        DF.namedNode('s'), DF.variable('p'), DF.namedNode('o'), DF.defaultGraph(),
      ), ctx);
      expect(await new Promise(resolve => stream2.getProperty('metadata', resolve)))
        .toEqual({
          cardinality: { type: 'exact', value: 3 },
          canContainUndefs: false,
          variables: [ DF.variable('p') ],
        });
      await stream2.toArray();

      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(3);
    });

    it('should not cache different queries', async() => {
      const stream1 = source.queryBindings(AF.createPattern(
        DF.namedNode('s'), DF.variable('p'), DF.namedNode('o'), DF.defaultGraph(),
      ), ctx);
      expect(await new Promise(resolve => stream1.getProperty('metadata', resolve)))
        .toEqual({
          cardinality: { type: 'exact', value: 3 },
          canContainUndefs: false,
          variables: [ DF.variable('p') ],
        });
      await stream1.toArray();

      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(2);

      const stream2 = source.queryBindings(AF.createPattern(
        DF.namedNode('s2'), DF.variable('p'), DF.namedNode('o'), DF.defaultGraph(),
      ), ctx);
      expect(await new Promise(resolve => stream2.getProperty('metadata', resolve)))
        .toEqual({
          cardinality: { type: 'exact', value: 3 },
          canContainUndefs: false,
          variables: [ DF.variable('p') ],
        });
      await stream2.toArray();

      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(4);
    });

    it('should not cache if cache is disabled', async() => {
      source = new QuerySourceSparql('http://example.org/sparql', ctx, mediatorHttp, 'values', BF, false, 0, 10);

      const stream1 = source.queryBindings(AF.createPattern(
        DF.namedNode('s'), DF.variable('p'), DF.namedNode('o'), DF.defaultGraph(),
      ), ctx);
      expect(await new Promise(resolve => stream1.getProperty('metadata', resolve)))
        .toEqual({
          cardinality: { type: 'exact', value: 3 },
          canContainUndefs: false,
          variables: [ DF.variable('p') ],
        });
      await stream1.toArray();

      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(2);

      const stream2 = source.queryBindings(AF.createPattern(
        DF.namedNode('s'), DF.variable('p'), DF.namedNode('o'), DF.defaultGraph(),
      ), ctx);
      expect(await new Promise(resolve => stream2.getProperty('metadata', resolve)))
        .toEqual({
          cardinality: { type: 'exact', value: 3 },
          canContainUndefs: false,
          variables: [ DF.variable('p') ],
        });
      await stream2.toArray();

      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(4);
    });

    it('should emit an error on server errors', async() => {
      const thisMediator: any = {
        mediate() {
          return {
            headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
            body: streamifyString(`empty body`),
            ok: false,
            status: 500,
            statusText: 'Error!',
          };
        },
      };
      source = new QuerySourceSparql('http://example.org/sparql', ctx, thisMediator, 'values', BF, false, 64, 10);
      await expect(source.queryBindings(
        AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o')),
        ctx,
      ).toArray())
        .rejects.toThrow(new Error(`Invalid SPARQL endpoint response from http://example.org/sparql (HTTP status 500):\nempty body`));
    });

    it('should emit an error for invalid binding results', async() => {
      const thisMediator: any = {
        mediate(action: any) {
          const query = action.init.body.toString();
          return {
            headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
            body: query.indexOf('COUNT') > 0 ?
              streamifyString(`{
  "head": { "vars": [ "count" ]
  } ,
  "results": { 
    "bindings": [
      {
        "count": { "type": "literal" , "value": "3" }
      }
    ]
  }
}`) :
              streamifyString(`{
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
}`),
            ok: true,
          };
        },
      };
      source = new QuerySourceSparql('http://example.org/sparql', ctx, thisMediator, 'values', BF, false, 64, 10);
      await expect(source.queryBindings(
        AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o'), DF.defaultGraph()),
        ctx,
      ).toArray())
        .rejects.toThrow(new Error('The endpoint http://example.org/sparql failed to provide a binding for p.'));
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
      source = new QuerySourceSparql('http://example.org/sparql', ctx, thisMediator, 'values', BF, false, 64, 10);
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
              streamifyString(`{
  "head": { "vars": [ "count" ]
  } ,
  "results": { 
    "bindings": [
      {
        "count": { "type": "literal" , "value": "notanint" }
      }
    ]
  }
}`) :
              streamifyString(`{
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
}`),
            ok: true,
          };
        },
      };
      source = new QuerySourceSparql('http://example.org/sparql', ctx, thisMediator, 'values', BF, false, 64, 10);
      const stream = source.queryBindings(
        AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o')),
        ctx,
      );
      expect(await new Promise(resolve => stream.getProperty('metadata', resolve)))
        .toEqual({
          cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
          canContainUndefs: false,
          variables: [ DF.variable('p') ],
        });
    });

    it('should emit metadata with infinity count for missing count results', async() => {
      const thisMediator: any = {
        mediate(action: any) {
          const query = action.init.body.toString();
          return {
            headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
            body: query.indexOf('COUNT') > 0 ?
              streamifyString(`{
  "head": { "vars": [ "count" ]
  } ,
  "results": { 
    "bindings": [
      {
        "nocount": { "type": "literal" , "value": "3" }
      }
    ]
  }
}`) :
              streamifyString(`{
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
}`),
            ok: true,
          };
        },
      };
      source = new QuerySourceSparql('http://example.org/sparql', ctx, thisMediator, 'values', BF, false, 64, 10);
      const stream = source.queryBindings(
        AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o')),
        ctx,
      );
      expect(await new Promise(resolve => stream.getProperty('metadata', resolve)))
        .toEqual({
          cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
          canContainUndefs: false,
          variables: [ DF.variable('p') ],
        });
    });

    it('should allow multiple read calls on query bindings', () => {
      const data = source.queryBindings(
        AF.createPattern(DF.namedNode('http://ex'), DF.namedNode(''), DF.variable('o')),
        ctx,
      );
      const r1 = data.read();
      const r2 = data.read();
      expect(r1).toEqual(null);
      expect(r2).toEqual(null);
    });

    it('should return data for HTTP GET requests', async() => {
      const thisMediator: any = {
        mediate(action: any) {
          const query = action.input;
          return {
            headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
            body: query.indexOf('COUNT') > 0 ?
              streamifyString(`{
  "head": { "vars": [ "count" ]
  } ,
  "results": { 
    "bindings": [
      {
        "count": { "type": "literal" , "value": "3" }
      }
    ]
  }
}`) :
              streamifyString(`{
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
}`),
            ok: true,
          };
        },
      };
      source = new QuerySourceSparql('http://example.org/sparql', ctx, thisMediator, 'values', BF, true, 64, 10);
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

    it('should return data when joining bindings', async() => {
      await expect(source.queryBindings(
        AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o')),
        ctx,
        {
          joinBindings: {
            bindings: new ArrayIterator([], { autoStart: false }),
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
      expect(lastQuery).toEqual(`query=SELECT+%3Fp+WHERE+%7B%0A++VALUES+%28%29+%7B%0A++%0A++%7D%0A++undefined%3As+%3Fp+undefined%3Ao.%0A%7D`);
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
      expect(await new Promise(resolve => ret.getProperty('metadata', resolve)))
        .toEqual({
          cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
          canContainUndefs: false,
          variables: [],
        });
    });

    it('should emit metadata with infinity count with timeout', async() => {
      jest.useFakeTimers();

      const thisMediator: any = {
        mediate(action: any) {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve(mediatorHttp.mediate(action));
            }, 1_000);
            jest.runAllTimers();
          });
        },
      };
      source = new QuerySourceSparql('http://example.org/sparql', ctx, thisMediator, 'values', BF, false, 64, 10);
      const stream = source.queryBindings(
        AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o')),
        ctx,
      );
      expect(await new Promise(resolve => {
        stream.getProperty('metadata', resolve);
      }))
        .toEqual({
          cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
          canContainUndefs: false,
          variables: [ DF.variable('p') ],
        });

      jest.useRealTimers();
    });
  });

  describe('queryQuads', () => {
    it('should return data', async() => {
      const thisMediator: any = {
        mediate: jest.fn((action: any) => {
          return {
            headers: new Headers({ 'Content-Type': 'text/turtle' }),
            body: streamifyString(`<s1> <p1> <o1>. <s2> <p2> <o2>.`),
            ok: true,
          };
        }),
      };
      source = new QuerySourceSparql('http://example.org/sparql', ctx, thisMediator, 'values', BF, false, 64, 10);

      expect(await source.queryQuads(
        AF.createConstruct(AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o')), []),
        ctx,
      ).toArray())
        .toBeRdfIsomorphic([
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
          DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
        ]);
    });
  });

  describe('queryBoolean', () => {
    it('should return data', async() => {
      const thisMediator: any = {
        mediate: jest.fn((action: any) => {
          return {
            headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
            body: streamifyString(`{
  "head": { "vars": [ "p" ]
  } ,
  "boolean": true
}`),
            ok: true,
          };
        }),
      };
      source = new QuerySourceSparql('http://example.org/sparql', ctx, thisMediator, 'values', BF, false, 64, 10);

      expect(await source.queryBoolean(
        AF.createAsk(AF.createPattern(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o'))),
        ctx,
      )).toEqual(true);
    });
  });

  describe('queryVoid', () => {
    it('should return data', async() => {
      const thisMediator: any = {
        mediate: jest.fn((action: any) => {
          return {
            headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
            body: streamifyString(`OK`),
            ok: true,
          };
        }),
      };
      source = new QuerySourceSparql('http://example.org/sparql', ctx, thisMediator, 'values', BF, false, 64, 10);

      await source.queryVoid(
        AF.createDrop(DF.namedNode('s')),
        ctx,
      );
    });
  });

  describe('addBindingsToOperation', () => {
    it('should handle an empty stream for values', async() => {
      expect(await QuerySourceSparql.addBindingsToOperation(
        'values',
        AF.createNop(),
        {
          bindings: new ArrayIterator([], { autoStart: false }),
          metadata: <any> { variables: []},
        },
      )).toEqual(AF.createJoin([
        AF.createValues([], []),
        AF.createNop(),
      ]));
    });

    it('should handle a non-empty stream for values', async() => {
      expect(await QuerySourceSparql.addBindingsToOperation(
        'values',
        AF.createNop(),
        {
          bindings: new ArrayIterator([
            BF.fromRecord({ a: DF.namedNode('a1') }),
            BF.fromRecord({ a: DF.namedNode('a2') }),
          ], { autoStart: false }),
          metadata: <any> { variables: [ DF.variable('a') ]},
        },
      )).toEqual(AF.createJoin([
        AF.createValues([ DF.variable('a') ], [
          { '?a': DF.namedNode('a1') },
          { '?a': DF.namedNode('a2') },
        ]),
        AF.createNop(),
      ]));
    });

    it('should throw on union', async() => {
      await expect(QuerySourceSparql.addBindingsToOperation(
        'union',
        AF.createNop(),
        {
          bindings: new ArrayIterator([], { autoStart: false }),
          metadata: <any> { variables: []},
        },
      )).rejects.toThrow(`Not implemented yet: "union" case`);
    });

    it('should throw on filter', async() => {
      await expect(QuerySourceSparql.addBindingsToOperation(
        'filter',
        AF.createNop(),
        {
          bindings: new ArrayIterator([], { autoStart: false }),
          metadata: <any> { variables: []},
        },
      )).rejects.toThrow(`Not implemented yet: "filter" case`);
    });
  });
});
