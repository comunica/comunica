import {ActorRdfResolveQuadPattern} from "@comunica/bus-rdf-resolve-quad-pattern";
import {Bus} from "@comunica/core";
import "isomorphic-fetch";
import {blankNode, literal, namedNode} from "rdf-data-model";
import Factory from "sparqlalgebrajs/lib/Factory";
import {PassThrough} from "stream";
import {ActorRdfResolveQuadPatternSparqlJson} from "../lib/ActorRdfResolveQuadPatternSparqlJson";
const arrayifyStream = require('arrayify-stream');
const streamifyString = require('streamify-string');

const quad = require('rdf-quad');

describe('ActorRdfResolveQuadPatternSparqlJson', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfResolveQuadPatternSparqlJson module', () => {
    it('should be a function', () => {
      expect(ActorRdfResolveQuadPatternSparqlJson).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfResolveQuadPatternSparqlJson constructor', () => {
      expect(new (<any> ActorRdfResolveQuadPatternSparqlJson)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfResolveQuadPatternSparqlJson);
      expect(new (<any> ActorRdfResolveQuadPatternSparqlJson)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfResolveQuadPattern);
    });

    it('should not be able to create new ActorRdfResolveQuadPatternSparqlJson objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfResolveQuadPatternSparqlJson)(); }).toThrow();
    });
  });

  describe('#patternToBgp', () => {
    it('should convert a quad to a BGP pattern', () => {
      return expect(ActorRdfResolveQuadPatternSparqlJson.patternToBgp(quad('s', 'p', 'o')))
        .toEqual({
          patterns: [ new Factory().createPattern(namedNode('s'), namedNode('p'), namedNode('o')) ],
          type: 'bgp',
        });
    });
  });

  describe('#patternToSelectQuery', () => {
    it('should convert a quad with named nodes to a select query', () => {
      return expect(ActorRdfResolveQuadPatternSparqlJson.patternToSelectQuery(quad('http://s', 'http://p', 'http://o')))
        .toEqual('SELECT * WHERE { <http://s> <http://p> <http://o>. }');
    });

    it('should convert a quad with variables to a select query', () => {
      return expect(ActorRdfResolveQuadPatternSparqlJson.patternToSelectQuery(quad('?s', '?p', '?o', '?g')))
        .toEqual('SELECT ?s ?p ?o ?g WHERE { GRAPH ?g { ?s ?p ?o. } }');
    });
  });

  describe('#patternToCountQuery', () => {
    it('should convert a quad with named nodes to a count query', () => {
      return expect(ActorRdfResolveQuadPatternSparqlJson.patternToCountQuery(quad('http://s', 'http://p', 'http://o')))
        .toEqual('SELECT (COUNT(*) AS ?count) WHERE { <http://s> <http://p> <http://o>. }');
    });

    it('should convert a quad with a variable to a count query', () => {
      return expect(ActorRdfResolveQuadPatternSparqlJson.patternToCountQuery(quad('?s', 'http://p', 'http://o')))
        .toEqual('SELECT (COUNT(*) AS ?count) WHERE { ?s <http://p> <http://o>. }');
    });

    it('should convert a quad with variables to a count query', () => {
      return expect(ActorRdfResolveQuadPatternSparqlJson.patternToCountQuery(quad('?s', '?p', '?o')))
        .toEqual('SELECT (COUNT(*) AS ?count) WHERE { ?s ?p ?o. }');
    });
  });

  describe('#parseJsonBindings', () => {
    it('should convert bindings with named nodes', () => {
      return expect(ActorRdfResolveQuadPatternSparqlJson.parseJsonBindings({
        book: { type: 'uri', value: 'http://example.org/book/book6' },
      }).toJS()).toEqual({ '?book': namedNode('http://example.org/book/book6') });
    });

    it('should convert bindings with blank nodes', () => {
      return expect(ActorRdfResolveQuadPatternSparqlJson.parseJsonBindings({
        book: { type: 'bnode', value: 'abc' },
      }).toJS()).toEqual({ '?book': blankNode('abc') });
    });

    it('should convert bindings with literals', () => {
      return expect(ActorRdfResolveQuadPatternSparqlJson.parseJsonBindings({
        book: { type: 'literal', value: 'abc' },
      }).toJS()).toEqual({ '?book': literal('abc') });
    });

    it('should convert bindings with languaged literals', () => {
      return expect(ActorRdfResolveQuadPatternSparqlJson.parseJsonBindings({
        book: { 'type': 'literal', 'value': 'abc', 'xml:lang': 'en-us' },
      }).toJS()).toEqual({ '?book': literal('abc', 'en-us') });
    });

    it('should convert bindings with datatyped literals', () => {
      return expect(ActorRdfResolveQuadPatternSparqlJson.parseJsonBindings({
        book: { type: 'literal', value: 'abc', datatype: 'http://ex' },
      }).toJS()).toEqual({ '?book': literal('abc', namedNode('http://ex')) });
    });

    it('should convert mixed bindings', () => {
      return expect(ActorRdfResolveQuadPatternSparqlJson.parseJsonBindings({
        book1: { type: 'uri', value: 'http://example.org/book/book6' },
        book2: { type: 'bnode', value: 'abc' },
        book3: { type: 'literal', value: 'abc' },
        book4: { 'type': 'literal', 'value': 'abc', 'xml:lang': 'en-us' },
        book5: { type: 'literal', value: 'abc', datatype: 'http://ex' },
      }).toJS()).toEqual({
        '?book1': namedNode('http://example.org/book/book6'),
        '?book2': blankNode('abc'),
        '?book3': literal('abc'),
        '?book4': literal('abc', 'en-us'),
        '?book5': literal('abc', namedNode('http://ex')),
      });
    });
  });

  describe('An ActorRdfResolveQuadPatternSparqlJson instance', () => {
    let actor: ActorRdfResolveQuadPatternSparqlJson;
    const pattern: any = quad('s', '?p', 'o');
    const context = { sources: [ { type: 'sparql', value: 'http://ex' } ] };
    const mediatorHttp: any = {
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

    beforeEach(() => {
      actor = new ActorRdfResolveQuadPatternSparqlJson({ name: 'actor', bus, mediatorHttp });
    });

    it('should test', () => {
      return expect(actor.test({ pattern, context })).resolves.toBeTruthy();
    });

    it('should not test without a context', () => {
      return expect(actor.test({ pattern: null, context: null })).rejects.toBeTruthy();
    });

    it('should not test without a sparql entry', () => {
      return expect(actor.test({ pattern: null, context: {} })).rejects.toBeTruthy();
    });

    it('should not test on an invalid sparql entry', () => {
      return expect(actor.test({ pattern: null, context: { sources: [{ type: 'sparql', value: null  }] } }))
        .rejects.toBeTruthy();
    });

    it('should not test on no sparql entry', () => {
      return expect(actor.test({ pattern: null, context: { sources: [{ type: 'entrypoint', value: null  }] } }))
        .rejects.toBeTruthy();
    });

    it('should not test on no sources', () => {
      return expect(actor.test({ pattern: null, context: { sources: [] } }))
        .rejects.toBeTruthy();
    });

    it('should not test on multiple sources', () => {
      return expect(actor.test(
        {
          context: { sources: [{ type: 'sparql', value: 'a' }, { type: 'sparql', value: 'b' }] },
          pattern: null,
        })).rejects.toBeTruthy();
    });

    it('should run', () => {
      return actor.run({ pattern, context }).then(async (output) => {
        expect(await output.metadata).toEqual({ totalItems: 3 });
        expect(await arrayifyStream(output.data)).toEqual([
          quad('s', 'p1', 'o'),
          quad('s', 'p2', 'o'),
          quad('s', 'p3', 'o'),
        ]);
      });
    });

    it('should run and error for a server error', () => {
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
      const thisActor = new ActorRdfResolveQuadPatternSparqlJson({ name: 'actor', bus, mediatorHttp: thisMediator });
      return thisActor.run({ pattern, context }).then(async (output) => {
        output.data.on('error',
          (e) => expect(e).toEqual(new Error('Invalid SPARQL endpoint (http://ex) response: Error!')));
        expect(await output.metadata).toEqual({ totalItems: Infinity });
      });
    });

    it('should run and return infinity count for invalid count results', () => {
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
      const thisActor = new ActorRdfResolveQuadPatternSparqlJson({ name: 'actor', bus, mediatorHttp: thisMediator });
      return thisActor.run({ pattern, context }).then(async (output) => {
        expect(await output.metadata).toEqual({ totalItems: Infinity });
      });
    });

    it('should run and return infinity count for missing count results', () => {
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
      const thisActor = new ActorRdfResolveQuadPatternSparqlJson({ name: 'actor', bus, mediatorHttp: thisMediator });
      return thisActor.run({ pattern, context }).then(async (output) => {
        expect(await output.metadata).toEqual({ totalItems: Infinity });
      });
    });

    it('should run and error for a invalid binding result', () => {
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
      const thisActor = new ActorRdfResolveQuadPatternSparqlJson({ name: 'actor', bus, mediatorHttp: thisMediator });
      return thisActor.run({ pattern, context }).then(async (output) => {
        output.data.on('error',
          (e) => expect(e).toEqual(new Error('The endpoint http://ex failed to provide a binding for p')));
        expect(await output.metadata).toEqual({ totalItems: 3 });
      });
    });

    it('should run for a web stream', () => {
      const thisMediator: any = {
        mediate: (action) => {
          // tslint:disable: no-trailing-whitespace
          return {
            body: require('node-web-streams').toWebReadableStream(action.input.indexOf('COUNT') > 0 ?
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
      const thisActor = new ActorRdfResolveQuadPatternSparqlJson({ name: 'actor', bus, mediatorHttp: thisMediator });
      return thisActor.run({ pattern, context }).then(async (output) => {
        expect(await output.metadata).toEqual({ totalItems: 3 });
        expect(await arrayifyStream(output.data)).toEqual([
          quad('s', 'p1', 'o'),
          quad('s', 'p2', 'o'),
          quad('s', 'p3', 'o'),
        ]);
      });
    });

    it('should run and error when the stream emits an error', () => {
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
      const thisActor = new ActorRdfResolveQuadPatternSparqlJson({ name: 'actor', bus, mediatorHttp: thisMediator });
      return thisActor.run({ pattern, context }).then(async (output) => {
        output.data.on('error',
          (e) => expect(e).toEqual(new Error('Some stream error')));
        expect(await output.metadata).toEqual({ totalItems: Infinity });
      });
    });
  });
});
