import { PassThrough } from 'stream';
import { ActorRdfResolveQuadPattern } from '@comunica/bus-rdf-resolve-quad-pattern';
import { ActionContext, Bus } from '@comunica/core';
import { DataFactory } from 'rdf-data-factory';
import 'cross-fetch/polyfill';
import { Factory } from 'sparqlalgebrajs';
import { ActorRdfResolveQuadPatternSparqlJson } from '../lib/ActorRdfResolveQuadPatternSparqlJson';
const DF = new DataFactory();
const arrayifyStream = require('arrayify-stream');
const quad = require('rdf-quad');
const streamifyString = require('streamify-string');

describe('ActorRdfResolveQuadPatternSparqlJson', () => {
  let bus: any;

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

  describe('#replaceBlankNodes', () => {
    it('should replace blank nodes with variables', () => {
      return expect(ActorRdfResolveQuadPatternSparqlJson.replaceBlankNodes(quad('s', 'p', '_:o')))
        .toEqual(quad('s', 'p', '?o'));
    });

    it('should make sure blank and variable names don\'t overlap', () => {
      return expect(ActorRdfResolveQuadPatternSparqlJson.replaceBlankNodes(quad('?x', '?x0', '_:x')))
        .toEqual(quad('?x', '?x0', '?x1'));
    });

    it('should make sure blank and variable names don\'t overlap (2)', () => {
      return expect(ActorRdfResolveQuadPatternSparqlJson.replaceBlankNodes(quad('?x', '_:x0', '_:x')))
        .toEqual(quad('?x', '?x0', '?x1'));
    });

    it('should blank names change consistently', () => {
      return expect(ActorRdfResolveQuadPatternSparqlJson.replaceBlankNodes(quad('?x', '_:x', '_:x')))
        .toEqual(quad('?x', '?x0', '?x0'));
    });
  });

  describe('#patternToBgp', () => {
    it('should convert a quad to a BGP pattern', () => {
      return expect(ActorRdfResolveQuadPatternSparqlJson.patternToBgp(quad('s', 'p', 'o')))
        .toEqual({
          patterns: [ new Factory().createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')) ],
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

  describe('An ActorRdfResolveQuadPatternSparqlJson instance', () => {
    let actor: ActorRdfResolveQuadPatternSparqlJson;
    const pattern: any = quad('s', '?p', 'o');
    const context = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:source':
        { type: 'sparql', value: 'http://ex' }});
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

    beforeEach(() => {
      actor = new ActorRdfResolveQuadPatternSparqlJson({ name: 'actor', bus, mediatorHttp });
    });

    it('should test', () => {
      return expect(actor.test({ pattern, context })).resolves.toBeTruthy();
    });

    it('should not test without a context', () => {
      return expect(actor.test({ pattern: <any> null, context: undefined })).rejects.toBeTruthy();
    });

    it('should not test without a sparql entry', () => {
      return expect(actor.test({ pattern: <any> null, context: ActionContext({}) })).rejects.toBeTruthy();
    });

    it('should not test on an invalid sparql entry', () => {
      return expect(actor.test({ pattern: <any> null,
        context: ActionContext(
          { sources: [{ type: 'sparql', value: undefined }]},
        ) }))
        .rejects.toBeTruthy();
    });

    it('should not test on no sparql entry', () => {
      return expect(actor.test({ pattern: <any> null,
        context: ActionContext(
          { sources: [{ type: 'entrypoint', value: undefined }]},
        ) }))
        .rejects.toBeTruthy();
    });

    it('should not test on no sources', () => {
      return expect(actor.test({ pattern: <any> null, context: ActionContext({ sources: []}) }))
        .rejects.toBeTruthy();
    });

    it('should not test on multiple sources', () => {
      return expect(actor.test(
        {
          context: ActionContext({ sources: [{ type: 'sparql', value: 'a' }, { type: 'sparql', value: 'b' }]}),
          pattern: <any> null,
        },
      )).rejects.toBeTruthy();
    });

    it('should run', () => {
      return actor.run({ pattern, context }).then(async output => {
        expect(await new Promise(resolve => output.data.getProperty('metadata', resolve)))
          .toEqual({ totalItems: 3 });
        expect(await arrayifyStream(output.data)).toEqual([
          quad('s', 'p1', 'o'),
          quad('s', 'p2', 'o'),
          quad('s', 'p3', 'o'),
        ]);
      });
    });

    it('should run and error for a server error', () => {
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
      const thisActor = new ActorRdfResolveQuadPatternSparqlJson({ name: 'actor', bus, mediatorHttp: thisMediator });
      return thisActor.run({ pattern, context }).then(async output => {
        output.data.on('error',
          e => expect(e).toEqual(new Error('Invalid SPARQL endpoint (http://ex) response: Error!')));
        expect(await new Promise(resolve => output.data.getProperty('metadata', resolve)))
          .toEqual({ totalItems: Number.POSITIVE_INFINITY });
      });
    });

    it('should run and error for a server error on queryBindings', () => {
      const thisActor = new ActorRdfResolveQuadPatternSparqlJson({ name: 'actor', bus, mediatorHttp });
      thisActor.queryBindings = async() => {
        throw new Error('Error queryBindings');
      };
      return thisActor.run({ pattern, context }).then(async output => {
        output.data.on('error',
          e => expect(e).toEqual(new Error('Error queryBindings')));
        expect(await new Promise(resolve => output.data.getProperty('metadata', resolve)))
          .toEqual({ totalItems: Number.POSITIVE_INFINITY });
      });
    });

    it('should run and return infinity count for invalid count results', () => {
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
      const thisActor = new ActorRdfResolveQuadPatternSparqlJson({ name: 'actor', bus, mediatorHttp: thisMediator });
      return thisActor.run({ pattern, context }).then(async output => {
        expect(await new Promise(resolve => output.data.getProperty('metadata', resolve)))
          .toEqual({ totalItems: Number.POSITIVE_INFINITY });
      });
    });

    it('should run and return infinity count for missing count results', () => {
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
      const thisActor = new ActorRdfResolveQuadPatternSparqlJson({ name: 'actor', bus, mediatorHttp: thisMediator });
      return thisActor.run({ pattern, context }).then(async output => {
        expect(await new Promise(resolve => output.data.getProperty('metadata', resolve)))
          .toEqual({ totalItems: Number.POSITIVE_INFINITY });
      });
    });

    it('should run and error for a invalid binding result', () => {
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
      const thisActor = new ActorRdfResolveQuadPatternSparqlJson({ name: 'actor', bus, mediatorHttp: thisMediator });
      return thisActor.run({ pattern, context }).then(async output => {
        output.data.on('data', () => {
          // Do nothing
        });
        output.data.on('error',
          e => expect(e).toEqual(new Error('The endpoint http://ex failed to provide a binding for p')));
        expect(await new Promise(resolve => output.data.getProperty('metadata', resolve)))
          .toEqual({ totalItems: 3 });
      });
    });

    it('should run for a web stream', () => {
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
      const thisActor = new ActorRdfResolveQuadPatternSparqlJson({ name: 'actor', bus, mediatorHttp: thisMediator });
      return thisActor.run({ pattern, context }).then(async output => {
        expect(await new Promise(resolve => output.data.getProperty('metadata', resolve)))
          .toEqual({ totalItems: 3 });
        expect(await arrayifyStream(output.data)).toEqual([
          quad('s', 'p1', 'o'),
          quad('s', 'p2', 'o'),
          quad('s', 'p3', 'o'),
        ]);
      });
    });

    it('should run and error when the stream emits an error', () => {
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
      const thisActor = new ActorRdfResolveQuadPatternSparqlJson({ name: 'actor', bus, mediatorHttp: thisMediator });
      return thisActor.run({ pattern, context }).then(async output => {
        output.data.on('error',
          e => expect(e).toEqual(new Error('Some stream error')));
        expect(await new Promise(resolve => output.data.getProperty('metadata', resolve)))
          .toEqual({ totalItems: Number.POSITIVE_INFINITY });
      });
    });

    it('should run lazily', () => {
      const thisMediator: any = {
        mediate() { throw new Error('This should not be called'); },
      };
      const thisActor = new ActorRdfResolveQuadPatternSparqlJson({ name: 'actor', bus, mediatorHttp: thisMediator });
      return expect(thisActor.run({ pattern, context })).resolves.toBeTruthy();
    });

    it('should allow multiple _read calls on query bindings', () => {
      const thisActor = new ActorRdfResolveQuadPatternSparqlJson({ name: 'actor', bus, mediatorHttp });
      return thisActor.queryBindings('http://ex', '').then(data => {
        (<any> data)._read(1, () => {
          // Do nothing
        });
        (<any> data)._read(1, () => {
          // Do nothing
        });
      });
    });
  });
});
