import {ActionContext} from "@comunica/core";
import {defaultGraph, namedNode} from "@rdfjs/data-model";
import "isomorphic-fetch"; // Needed to load Headers
import "jest-rdf";
import {Factory} from "sparqlalgebrajs";
import {PassThrough} from "stream";
import {RdfSourceSparql} from "../lib/RdfSourceSparql";

const arrayifyStream = require('arrayify-stream');
const quad = require('rdf-quad');
const streamifyString = require('streamify-string');

// tslint:disable:object-literal-sort-keys

describe('RdfSourceSparql', () => {
  const context = ActionContext({});
  const mediatorHttp: any = {
    mediate: (action) => {
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
          patterns: [ new Factory().createPattern(namedNode('s'), namedNode('p'), namedNode('o')) ],
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
      source = new RdfSourceSparql('http://example.org/sparql', context, mediatorHttp);
    });

    it('should throw on RegExp args', async () => {
      return expect(() => source.match(new RegExp('.*')))
        .toThrow(new Error('RdfSourceSparql does not support matching by regular expressions.'));
    });

    it('should return data', async () => {
      return expect(await arrayifyStream(source.match(namedNode('s'), null, namedNode('o'), defaultGraph())))
        .toEqualRdfQuadArray([
          quad('s', 'p1', 'o'),
          quad('s', 'p2', 'o'),
          quad('s', 'p3', 'o'),
        ]);
    });

    it('should return data for a web stream', async () => {
      const thisMediator: any = {
        mediate: (action) => {
          // tslint:disable: no-trailing-whitespace
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
          // tslint:enable: no-trailing-whitespace
        },
      };
      source = new RdfSourceSparql('http://example.org/sparql', context, thisMediator);
      return expect(await arrayifyStream(source.match(namedNode('s'), null, namedNode('o'), defaultGraph())))
        .toEqualRdfQuadArray([
          quad('s', 'p1', 'o'),
          quad('s', 'p2', 'o'),
          quad('s', 'p3', 'o'),
        ]);
    });

    it('should emit metadata', async () => {
      const stream = source.match(namedNode('s'), null, namedNode('o'), defaultGraph());
      return expect(await new Promise((resolve, reject) => {
        stream.on('metadata', resolve);
        stream.on('end', () => reject(new Error('No metadata was found.')));
      })).toEqual({ totalItems: 3 });
    });

    it('should emit an error on server errors', async () => {
      const thisMediator: any = {
        mediate: () => {
          return {
            body: streamifyString(``),
            ok: false,
            status: 500,
            statusText: 'Error!',
          };
        },
      };
      source = new RdfSourceSparql('http://example.org/sparql', context, thisMediator);
      return expect(arrayifyStream(source.match(namedNode('s'), null, namedNode('o'), defaultGraph())))
        .rejects.toThrow(new Error('Invalid SPARQL endpoint (http://example.org/sparql) response: Error! (500)'));
    });

    it('should emit an error for invalid binding results', async () => {
      const thisMediator: any = {
        mediate: (action) => {
          // tslint:disable: no-trailing-whitespace
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
          // tslint:enable: no-trailing-whitespace
        },
      };
      source = new RdfSourceSparql('http://example.org/sparql', context, thisMediator);
      return expect(arrayifyStream(source.match(namedNode('s'), null, namedNode('o'), defaultGraph())))
        .rejects.toThrow(new Error('The endpoint http://example.org/sparql failed to provide a binding for p.'));
    });

    it('should emit an error for an erroring stream', async () => {
      const thisMediator: any = {
        mediate: () => {
          const stream = new PassThrough();
          stream._read = () => setImmediate(() => stream.emit('error', new Error('Some stream error')));
          return {
            body: stream,
            ok: true,
          };
        },
      };
      source = new RdfSourceSparql('http://example.org/sparql', context, thisMediator);
      return expect(arrayifyStream(source.match(namedNode('s'), null, namedNode('o'), defaultGraph())))
        .rejects.toThrow(new Error('Some stream error'));
    });

    it('should emit metadata with infinity count for invalid count results', async () => {
      const thisMediator: any = {
        mediate: (action) => {
          // tslint:disable: no-trailing-whitespace
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
          // tslint:enable: no-trailing-whitespace
        },
      };
      source = new RdfSourceSparql('http://example.org/sparql', context, thisMediator);
      const stream = source.match(namedNode('s'), null, namedNode('o'), defaultGraph());
      return expect(await new Promise((resolve, reject) => {
        stream.on('metadata', resolve);
        stream.on('end', () => reject(new Error('No metadata was found.')));
      })).toEqual({ totalItems: Infinity });
    });

    it('should emit metadata with infinity count for missing count results', async () => {
      const thisMediator: any = {
        mediate: (action) => {
          // tslint:disable: no-trailing-whitespace
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
          // tslint:enable: no-trailing-whitespace
        },
      };
      source = new RdfSourceSparql('http://example.org/sparql', context, thisMediator);
      const stream = source.match(namedNode('s'), null, namedNode('o'), defaultGraph());
      return expect(await new Promise((resolve, reject) => {
        stream.on('metadata', resolve);
        stream.on('end', () => reject(new Error('No metadata was found.')));
      })).toEqual({ totalItems: Infinity });
    });

    it('should allow multiple _read calls on query bindings', () => {
      return source.queryBindings('http://ex', '', null).then((data) => {
        (<any> data)._read(1, () => { return; });
        (<any> data)._read(1, () => { return; });
      });
    });

  });

});
