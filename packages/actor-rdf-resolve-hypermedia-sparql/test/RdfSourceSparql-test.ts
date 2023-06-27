import { PassThrough } from 'stream';
import { ActionContext } from '@comunica/core';
import arrayifyStream from 'arrayify-stream';
import { DataFactory } from 'rdf-data-factory';
import 'cross-fetch/polyfill'; // Needed to load Headers
import 'jest-rdf';
import { Factory } from 'sparqlalgebrajs';
import { RdfSourceSparql } from '../lib/RdfSourceSparql';

const quad = require('rdf-quad');
const streamifyString = require('streamify-string');

const DF = new DataFactory();

// TODO: Remove when targeting NodeJS 18+
if (!globalThis.ReadableStream) {
  globalThis.ReadableStream = require('web-streams-ponyfill').ReadableStream;
}

describe('RdfSourceSparql', () => {
  const context = new ActionContext({});
  const mediatorHttp: any = {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('#replaceBlankNodes', () => {
    it('should replace blank nodes with variables', () => {
      return expect(RdfSourceSparql.replaceBlankNodes(quad('s', 'p', '_:o')))
        .toEqual(quad('s', 'p', '?o'));
    });

    it('should make sure blank and variable names don\'t overlap', () => {
      return expect(RdfSourceSparql.replaceBlankNodes(quad('?x', '?x0', '_:x')))
        .toEqual(quad('?x', '?x0', '?x1'));
    });

    it('should make sure blank and variable names don\'t overlap (2)', () => {
      return expect(RdfSourceSparql.replaceBlankNodes(quad('?x', '_:x0', '_:x')))
        .toEqual(quad('?x', '?x0', '?x1'));
    });

    it('should blank names change consistently', () => {
      return expect(RdfSourceSparql.replaceBlankNodes(quad('?x', '_:x', '_:x')))
        .toEqual(quad('?x', '?x0', '?x0'));
    });
  });

  describe('#patternToBgp', () => {
    it('should convert a quad to a BGP pattern', () => {
      return expect(RdfSourceSparql.patternToBgp(quad('s', 'p', 'o')))
        .toEqual({
          patterns: [ new Factory().createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')) ],
          type: 'bgp',
        });
    });
  });

  describe('#patternToSelectQuery', () => {
    it('should convert a quad with named nodes to a select query', () => {
      return expect(RdfSourceSparql.patternToSelectQuery(quad('http://s', 'http://p', 'http://o')))
        .toEqual('SELECT * WHERE { <http://s> <http://p> <http://o>. }');
    });

    it('should convert a quad with variables to a select query', () => {
      return expect(RdfSourceSparql.patternToSelectQuery(quad('?s', '?p', '?o', '?g')))
        .toEqual('SELECT ?s ?p ?o ?g WHERE { GRAPH ?g { ?s ?p ?o. } }');
    });
  });

  describe('#patternToCountQuery', () => {
    it('should convert a quad with named nodes to a count query', () => {
      return expect(RdfSourceSparql.patternToCountQuery(quad('http://s', 'http://p', 'http://o')))
        .toEqual('SELECT (COUNT(*) AS ?count) WHERE { <http://s> <http://p> <http://o>. }');
    });

    it('should convert a quad with a variable to a count query', () => {
      return expect(RdfSourceSparql.patternToCountQuery(quad('?s', 'http://p', 'http://o')))
        .toEqual('SELECT (COUNT(*) AS ?count) WHERE { ?s <http://p> <http://o>. }');
    });

    it('should convert a quad with variables to a count query', () => {
      return expect(RdfSourceSparql.patternToCountQuery(quad('?s', '?p', '?o')))
        .toEqual('SELECT (COUNT(*) AS ?count) WHERE { ?s ?p ?o. }');
    });
  });

  describe('an instance', () => {
    let source: RdfSourceSparql;

    beforeEach(() => {
      source = new RdfSourceSparql('http://example.org/sparql', context, mediatorHttp, false, 64);
    });

    it('should return data', async() => {
      expect(await arrayifyStream(
        source.match(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o'), DF.defaultGraph()),
      ))
        .toEqualRdfQuadArray([
          quad('s', 'p1', 'o'),
          quad('s', 'p2', 'o'),
          quad('s', 'p3', 'o'),
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
      source = new RdfSourceSparql('http://example.org/sparql', context, thisMediator, false, 64);
      expect(await arrayifyStream(
        source.match(DF.variable('s'), DF.namedNode('p'), DF.namedNode('o'), DF.defaultGraph()),
      ))
        .toEqualRdfQuadArray([
          quad('<<s1 p1 o1>>', 'p', 'o'),
          quad('<<s2 p2 o2>>', 'p', 'o'),
          quad('<<s3 p3 o3>>', 'p', 'o'),
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
      source = new RdfSourceSparql('http://example.org/sparql', context, thisMediator, false, 64);
      expect(await arrayifyStream(
        source.match(
          DF.quad(DF.variable('s'), DF.namedNode('p'), DF.namedNode('o')),
          DF.namedNode('p'),
          DF.namedNode('o'),
          DF.defaultGraph(),
        ),
      ))
        .toEqualRdfQuadArray([
          quad('<<s1 p o>>', 'p', 'o'),
          quad('<<s2 p o>>', 'p', 'o'),
          quad('<<s3 p o>>', 'p', 'o'),
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
      source = new RdfSourceSparql('http://example.org/sparql', context, thisMediator, false, 64);
      expect(await arrayifyStream(
        source.match(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o'), DF.defaultGraph()),
      ))
        .toEqualRdfQuadArray([
          quad('s', 'p1', 'o'),
          quad('s', 'p2', 'o'),
          quad('s', 'p3', 'o'),
        ]);
    });

    it('should emit metadata', async() => {
      const stream = source.match(
        DF.namedNode('s'), DF.variable('p'), DF.namedNode('o'), DF.defaultGraph(),
      );
      expect(await new Promise(resolve => stream.getProperty('metadata', resolve)))
        .toEqual({ cardinality: { type: 'exact', value: 3 }, canContainUndefs: false });
      await expect(stream.toArray()).resolves.toEqual([
        quad('s', 'p1', 'o'),
        quad('s', 'p2', 'o'),
        quad('s', 'p3', 'o'),
      ]);
    });

    it('should emit metadata twice, and reuse from cache', async() => {
      const stream1 = source.match(
        DF.namedNode('s'), DF.variable('p'), DF.namedNode('o'), DF.defaultGraph(),
      );
      expect(await new Promise(resolve => stream1.getProperty('metadata', resolve)))
        .toEqual({ cardinality: { type: 'exact', value: 3 }, canContainUndefs: false });
      await stream1.toArray();

      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(2);

      const stream2 = source.match(
        DF.namedNode('s'), DF.variable('p'), DF.namedNode('o'), DF.defaultGraph(),
      );
      expect(await new Promise(resolve => stream2.getProperty('metadata', resolve)))
        .toEqual({ cardinality: { type: 'exact', value: 3 }, canContainUndefs: false });
      await stream2.toArray();

      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(3);
    });

    it('should not cache different queries', async() => {
      const stream1 = source.match(
        DF.namedNode('s'), DF.variable('p'), DF.namedNode('o'), DF.defaultGraph(),
      );
      expect(await new Promise(resolve => stream1.getProperty('metadata', resolve)))
        .toEqual({ cardinality: { type: 'exact', value: 3 }, canContainUndefs: false });
      await stream1.toArray();

      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(2);

      const stream2 = source.match(
        DF.namedNode('s2'), DF.variable('p'), DF.namedNode('o'), DF.defaultGraph(),
      );
      expect(await new Promise(resolve => stream2.getProperty('metadata', resolve)))
        .toEqual({ cardinality: { type: 'exact', value: 3 }, canContainUndefs: false });
      await stream2.toArray();

      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(4);
    });

    it('should not cache if cache is disabled', async() => {
      source = new RdfSourceSparql('http://example.org/sparql', context, mediatorHttp, false, 0);

      const stream1 = source.match(
        DF.namedNode('s'), DF.variable('p'), DF.namedNode('o'), DF.defaultGraph(),
      );
      expect(await new Promise(resolve => stream1.getProperty('metadata', resolve)))
        .toEqual({ cardinality: { type: 'exact', value: 3 }, canContainUndefs: false });
      await stream1.toArray();

      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(2);

      const stream2 = source.match(
        DF.namedNode('s'), DF.variable('p'), DF.namedNode('o'), DF.defaultGraph(),
      );
      expect(await new Promise(resolve => stream2.getProperty('metadata', resolve)))
        .toEqual({ cardinality: { type: 'exact', value: 3 }, canContainUndefs: false });
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
      source = new RdfSourceSparql('http://example.org/sparql', context, thisMediator, false, 64);
      await expect(arrayifyStream(
        source.match(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o'), DF.defaultGraph()),
      ))
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
      source = new RdfSourceSparql('http://example.org/sparql', context, thisMediator, false, 64);
      await expect(arrayifyStream(source
        .match(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o'), DF.defaultGraph())))
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
      source = new RdfSourceSparql('http://example.org/sparql', context, thisMediator, false, 64);
      await expect(arrayifyStream(source
        .match(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o'), DF.defaultGraph())))
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
      source = new RdfSourceSparql('http://example.org/sparql', context, thisMediator, false, 64);
      const stream = source.match(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o'), DF.defaultGraph());
      expect(await new Promise(resolve => stream.getProperty('metadata', resolve)))
        .toEqual({ cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }, canContainUndefs: false });
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
      source = new RdfSourceSparql('http://example.org/sparql', context, thisMediator, false, 64);
      const stream = source.match(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o'), DF.defaultGraph());
      expect(await new Promise(resolve => stream.getProperty('metadata', resolve)))
        .toEqual({ cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }, canContainUndefs: false });
    });

    it('should allow multiple read calls on query bindings', () => {
      const data = source.queryBindings('http://ex', '');
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
      source = new RdfSourceSparql('http://example.org/sparql', context, thisMediator, true, 64);
      expect(await arrayifyStream(
        source.match(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o'), DF.defaultGraph()),
      ))
        .toEqualRdfQuadArray([
          quad('s', 'p1', 'o'),
          quad('s', 'p2', 'o'),
          quad('s', 'p3', 'o'),
        ]);
    });
  });
});
