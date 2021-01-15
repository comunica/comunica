import { PassThrough } from 'stream';
import { ActionContext } from '@comunica/core';
import { DataFactory } from 'rdf-data-factory';
import 'cross-fetch/polyfill'; // Needed to load Headers
import 'jest-rdf';
import { RdfSourceSparql } from '../lib/RdfSourceSparql';

const arrayifyStream = require('arrayify-stream');
const quad = require('rdf-quad');
const streamifyString = require('streamify-string');
const DF = new DataFactory();

describe('RdfSourceSparql', () => {
  const context = ActionContext({});
  const mediatorHttp: any = {
    mediate(action: any) {
      return {
        body: action.input.indexOf('COUNT') > 0 ?
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

  describe('an instance', () => {
    let source: RdfSourceSparql;

    beforeEach(() => {
      source = new RdfSourceSparql('http://example.org/sparql', context, mediatorHttp);
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

    it('should return data for a web stream', async() => {
      const thisMediator: any = {
        mediate(action: any) {
          return {
            body: require('web-streams-node').toWebReadableStream(action.input.indexOf('COUNT') > 0 ?
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
      source = new RdfSourceSparql('http://example.org/sparql', context, thisMediator);
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
        .toEqual({ totalItems: 3 });
    });

    it('should emit an error on server errors', async() => {
      const thisMediator: any = {
        mediate() {
          return {
            body: streamifyString(``),
            ok: false,
            status: 500,
            statusText: 'Error!',
          };
        },
      };
      source = new RdfSourceSparql('http://example.org/sparql', context, thisMediator);
      await expect(arrayifyStream(
        source.match(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o'), DF.defaultGraph()),
      ))
        .rejects.toThrow(new Error('Invalid SPARQL endpoint (http://example.org/sparql) response: Error! (500)'));
    });

    it('should emit an error for invalid binding results', async() => {
      const thisMediator: any = {
        mediate(action: any) {
          return {
            body: action.input.indexOf('COUNT') > 0 ?
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
      source = new RdfSourceSparql('http://example.org/sparql', context, thisMediator);
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
            body: stream,
            ok: true,
          };
        },
      };
      source = new RdfSourceSparql('http://example.org/sparql', context, thisMediator);
      await expect(arrayifyStream(source
        .match(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o'), DF.defaultGraph())))
        .rejects.toThrow(new Error('Some stream error'));
    });

    it('should emit metadata with infinity count for invalid count results', async() => {
      const thisMediator: any = {
        mediate(action: any) {
          return {
            body: action.input.indexOf('COUNT') > 0 ?
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
      source = new RdfSourceSparql('http://example.org/sparql', context, thisMediator);
      const stream = source.match(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o'), DF.defaultGraph());
      expect(await new Promise(resolve => stream.getProperty('metadata', resolve)))
        .toEqual({ totalItems: Number.POSITIVE_INFINITY });
    });

    it('should emit metadata with infinity count for missing count results', async() => {
      const thisMediator: any = {
        mediate(action: any) {
          return {
            body: action.input.indexOf('COUNT') > 0 ?
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
      source = new RdfSourceSparql('http://example.org/sparql', context, thisMediator);
      const stream = source.match(DF.namedNode('s'), DF.variable('p'), DF.namedNode('o'), DF.defaultGraph());
      expect(await new Promise(resolve => stream.getProperty('metadata', resolve)))
        .toEqual({ totalItems: Number.POSITIVE_INFINITY });
    });

    it('should allow multiple _read calls on query bindings', () => {
      const data = source.queryBindings('http://ex', '');
      (<any> data)._read(1, () => {
        // Do nothing
      });
      (<any> data)._read(1, () => {
        // Do nothing
      });
    });
  });
});
