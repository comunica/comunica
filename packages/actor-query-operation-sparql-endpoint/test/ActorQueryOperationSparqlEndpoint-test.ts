import {
  ActorQueryOperation,
  Bindings,
  IActorQueryOperationOutputBindings,
  IActorQueryOperationOutputBoolean, IActorQueryOperationOutputQuads
} from "@comunica/bus-query-operation";
import {ActionContext, Bus} from "@comunica/core";
import {namedNode, variable} from "@rdfjs/data-model";
import {SparqlEndpointFetcher} from "fetch-sparql-endpoint";
import {Headers} from "node-fetch";
import {Factory} from "sparqlalgebrajs";
import {ActorQueryOperationSparqlEndpoint} from "../lib/ActorQueryOperationSparqlEndpoint";
const arrayifyStream = require('arrayify-stream');
const streamifyString = require('streamify-string');
const quad = require('rdf-quad');
import "jest-rdf";

const factory = new Factory();

describe('ActorQueryOperationSparqlEndpoint', () => {
  let bus;
  let mediatorHttp;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorHttp = {
      mediate: (action) => {
        let body;
        if (action.input.startsWith('http://example.org/sparql-construct')) {
          body = streamifyString(`<http://ex.org/s> <http://ex.org/p> <http://ex.org/o1>, <http://ex.org/o2>.`);
        } else if (action.input.startsWith('http://example.org/sparql-ask')) {
          body = streamifyString(`{
  "head": { },
  "boolean": true
}`);
        } else {
          body = streamifyString(`{
  "head": { "vars": [ "p" ] },
  "results": {
    "bindings": [
      {
        "p": { "type": "uri" , "value": "${action.input}/1" }
      },
      {
        "p": { "type": "uri" , "value": "${action.input}/2" }
      },
      {
        "p": { "type": "uri" , "value": "${action.input}/3" }
      }
    ]
  }
}`);
        }
        return {
          body,
          headers: new Headers({ 'Content-Type': SparqlEndpointFetcher.CONTENTTYPE_SPARQL_JSON }),
          ok: true,
        };
        // tslint:enable: no-trailing-whitespace
      },
    };
  });

  describe('The ActorQueryOperationSparqlEndpoint module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationSparqlEndpoint).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationSparqlEndpoint constructor', () => {
      expect(new (<any> ActorQueryOperationSparqlEndpoint)({ name: 'actor', bus, mediatorHttp }))
        .toBeInstanceOf(ActorQueryOperationSparqlEndpoint);
      expect(new (<any> ActorQueryOperationSparqlEndpoint)({ name: 'actor', bus, mediatorHttp }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationSparqlEndpoint objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationSparqlEndpoint)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationSparqlEndpoint instance', () => {
    let actor: ActorQueryOperationSparqlEndpoint;

    beforeEach(() => {
      actor = new ActorQueryOperationSparqlEndpoint({ name: 'actor', bus, mediatorHttp });
    });

    it('should test on a single sparql source', () => {
      const context = ActionContext({
        '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'sparql' },
      });
      const op: any = { operation: 'bla', context };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on a single non-sparql source', () => {
      const context = ActionContext({
        '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'nosparql' },
      });
      const op: any = { operation: 'bla', context };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should not test on a missing operation', () => {
      const context = ActionContext({
        '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'sparql' },
      });
      const op = { operation: null, context };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run for a sub-query', async () => {
      const context = ActionContext({
        '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'sparql', value: 'http://example.org/sparql-select' },
      });
      const op = { context, operation: factory.createPattern(namedNode('http://s'), variable('p'),
          namedNode('http://o')) };
      const output: IActorQueryOperationOutputBindings = <any> await actor.run(op);
      expect(output.variables).toEqual(['?p']);
      expect(await output.metadata()).toEqual({ totalItems: 3 });
      // tslint:disable:max-line-length
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ '?p': namedNode('http://example.org/sparql-select?query=SELECT%20%3Fp%20WHERE%20%7B%20%3Chttp%3A%2F%2Fs%3E%20%3Fp%20%3Chttp%3A%2F%2Fo%3E.%20%7D/1') }),
        Bindings({ '?p': namedNode('http://example.org/sparql-select?query=SELECT%20%3Fp%20WHERE%20%7B%20%3Chttp%3A%2F%2Fs%3E%20%3Fp%20%3Chttp%3A%2F%2Fo%3E.%20%7D/2') }),
        Bindings({ '?p': namedNode('http://example.org/sparql-select?query=SELECT%20%3Fp%20WHERE%20%7B%20%3Chttp%3A%2F%2Fs%3E%20%3Fp%20%3Chttp%3A%2F%2Fo%3E.%20%7D/3') }),
      ]);
    });

    it('should run for a SELECT query', async () => {
      const context = ActionContext({
        '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'sparql', value: 'http://example.org/sparql-select' },
      });
      const op = { context, operation: factory.createProject(
          factory.createPattern(namedNode('http://s'), variable('p'), namedNode('http://o')),
          [ variable('myP') ]
        ) };
      const output: IActorQueryOperationOutputBindings = <any> await actor.run(op);
      expect(output.variables).toEqual(['?myP']);
      expect(await output.metadata()).toEqual({ totalItems: 3 });
      // tslint:disable:max-line-length
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ '?p': namedNode('http://example.org/sparql-select?query=SELECT%20%3FmyP%20WHERE%20%7B%20%3Chttp%3A%2F%2Fs%3E%20%3Fp%20%3Chttp%3A%2F%2Fo%3E.%20%7D/1') }),
        Bindings({ '?p': namedNode('http://example.org/sparql-select?query=SELECT%20%3FmyP%20WHERE%20%7B%20%3Chttp%3A%2F%2Fs%3E%20%3Fp%20%3Chttp%3A%2F%2Fo%3E.%20%7D/2') }),
        Bindings({ '?p': namedNode('http://example.org/sparql-select?query=SELECT%20%3FmyP%20WHERE%20%7B%20%3Chttp%3A%2F%2Fs%3E%20%3Fp%20%3Chttp%3A%2F%2Fo%3E.%20%7D/3') }),
      ]);
    });

    it('should run for an ASK query', async () => {
      const context = ActionContext({
        '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'sparql', value: 'http://example.org/sparql-ask' },
      });
      const op = { context, operation: factory.createAsk(
          factory.createPattern(namedNode('http://s'), variable('p'), namedNode('http://o'))
        ) };
      const output: IActorQueryOperationOutputBoolean = <any> await actor.run(op);
      // tslint:disable:max-line-length
      expect(await output.booleanResult).toEqual(true);
    });

    it('should run for a CONSTRUCT query', async () => {
      const context = ActionContext({
        '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'sparql', value: 'http://example.org/sparql-construct' },
      });
      const op = { context, operation: factory.createConstruct(
        factory.createPattern(namedNode('http://s'), variable('p'), namedNode('http://o')),
          [ factory.createPattern(namedNode('http://s'), variable('p'), namedNode('http://o')) ]) };
      const output: IActorQueryOperationOutputQuads = <any> await actor.run(op);
      // tslint:disable:max-line-length
      expect(await output.metadata()).toEqual({ totalItems: 2 });
      // tslint:disable:max-line-length
      expect(await arrayifyStream(output.quadStream)).toBeRdfIsomorphic([
        quad('http://ex.org/s', 'http://ex.org/p', 'http://ex.org/o1'),
        quad('http://ex.org/s', 'http://ex.org/p', 'http://ex.org/o2'),
      ]);
    });

    it('should run and error for a server error', () => {
      const thisMediator: any = {
        mediate: () => {
          return {
            body: streamifyString(``),
            headers: new Headers({ 'Content-Type': SparqlEndpointFetcher.CONTENTTYPE_SPARQL_JSON }),
            ok: false,
            status: 500,
            statusText: 'Error!',
          };
        },
      };
      const context = ActionContext({
        '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'sparql', value: 'http://ex' },
      });
      const op = { context, operation: factory.createPattern(namedNode('http://s'), variable('p'),
          namedNode('http://o')) };
      const thisActor = new ActorQueryOperationSparqlEndpoint({ name: 'actor', bus, mediatorHttp: thisMediator });
      return expect(new Promise((resolve, reject) => {
        thisActor.run(op).then(async (output) => (<any> output).bindingsStream.on('error', resolve));
      })).resolves.toEqual(new Error('Invalid SPARQL endpoint (http://ex) response: Error!'));
    });

    it('should run and error for a fetching error', () => {
      const context = ActionContext({
        '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'sparql', value: 'http://ex' },
      });
      const op = { context, operation: factory.createPattern(namedNode('http://s'), variable('p'),
          namedNode('http://o')) };
      actor.endpointFetcher.fetchBindings = () => Promise.reject(new Error('MY ERROR'));
      return expect(new Promise((resolve, reject) => {
        actor.run(op).then(async (output) => (<any> output).bindingsStream.on('error', resolve));
      })).resolves.toEqual(new Error('MY ERROR'));
    });
  });
});
