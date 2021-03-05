/* eslint-disable max-len */
import {
  ActorQueryOperation,
  Bindings,
} from '@comunica/bus-query-operation';
import { ActionContext, Bus } from '@comunica/core';
import type { IActorQueryOperationOutputBindings,
  IActorQueryOperationOutputBoolean, IActorQueryOperationOutputQuads } from '@comunica/types';
import { SparqlEndpointFetcher } from 'fetch-sparql-endpoint';
import { Headers } from 'node-fetch';
import { DataFactory } from 'rdf-data-factory';
import { Factory } from 'sparqlalgebrajs';
import { ActorQueryOperationSparqlEndpoint } from '../lib/ActorQueryOperationSparqlEndpoint';
const arrayifyStream = require('arrayify-stream');
const quad = require('rdf-quad');
const streamifyString = require('streamify-string');
import 'jest-rdf';
const DF = new DataFactory();

const factory = new Factory();

describe('ActorQueryOperationSparqlEndpoint', () => {
  let bus: any;
  let mediatorHttp: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorHttp = {
      mediate(action: any) {
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
      const op: any = { operation: null, context };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should fail to run for a missing source', async() => {
      const context = ActionContext({});
      const op = { context,
        operation: factory.createPattern(DF.namedNode('http://s'), DF.variable('p'), DF.namedNode('http://o')) };
      await expect(actor.run(op)).rejects.toThrow(new Error('Illegal state: undefined sparql endpoint source.'));
    });

    it('should run for a sub-query', async() => {
      const context = ActionContext({
        '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'sparql', value: 'http://example.org/sparql-select' },
      });
      const op = { context,
        operation: factory.createPattern(DF.namedNode('http://s'), DF.variable('p'), DF.namedNode('http://o')) };
      const output: IActorQueryOperationOutputBindings = <any> await actor.run(op);
      expect(output.variables).toEqual([ '?p' ]);
      expect(await (<any> output).metadata()).toEqual({ totalItems: 3 });
      expect(output.canContainUndefs).toEqual(true);

      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ '?p': DF.namedNode('http://example.org/sparql-select?query=SELECT%20%3Fp%20WHERE%20%7B%20%3Chttp%3A%2F%2Fs%3E%20%3Fp%20%3Chttp%3A%2F%2Fo%3E.%20%7D/1') }),
        Bindings({ '?p': DF.namedNode('http://example.org/sparql-select?query=SELECT%20%3Fp%20WHERE%20%7B%20%3Chttp%3A%2F%2Fs%3E%20%3Fp%20%3Chttp%3A%2F%2Fo%3E.%20%7D/2') }),
        Bindings({ '?p': DF.namedNode('http://example.org/sparql-select?query=SELECT%20%3Fp%20WHERE%20%7B%20%3Chttp%3A%2F%2Fs%3E%20%3Fp%20%3Chttp%3A%2F%2Fo%3E.%20%7D/3') }),
      ]);
    });

    it('should run for a SELECT query', async() => {
      const context = ActionContext({
        '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'sparql', value: 'http://example.org/sparql-select' },
      });
      const op = { context,
        operation: factory.createProject(
          factory.createPattern(DF.namedNode('http://s'), DF.variable('p'), DF.namedNode('http://o')),
          [ DF.variable('myP') ],
        ) };
      const output: IActorQueryOperationOutputBindings = <any> await actor.run(op);
      expect(output.variables).toEqual([ '?myP' ]);
      expect(await (<any> output).metadata()).toEqual({ totalItems: 3 });
      expect(output.canContainUndefs).toEqual(true);

      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ '?p': DF.namedNode('http://example.org/sparql-select?query=SELECT%20%3FmyP%20WHERE%20%7B%20%3Chttp%3A%2F%2Fs%3E%20%3Fp%20%3Chttp%3A%2F%2Fo%3E.%20%7D/1') }),
        Bindings({ '?p': DF.namedNode('http://example.org/sparql-select?query=SELECT%20%3FmyP%20WHERE%20%7B%20%3Chttp%3A%2F%2Fs%3E%20%3Fp%20%3Chttp%3A%2F%2Fo%3E.%20%7D/2') }),
        Bindings({ '?p': DF.namedNode('http://example.org/sparql-select?query=SELECT%20%3FmyP%20WHERE%20%7B%20%3Chttp%3A%2F%2Fs%3E%20%3Fp%20%3Chttp%3A%2F%2Fo%3E.%20%7D/3') }),
      ]);
    });

    it('should run for an ASK query', async() => {
      const context = ActionContext({
        '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'sparql', value: 'http://example.org/sparql-ask' },
      });
      const op = { context,
        operation: factory.createAsk(
          factory.createPattern(DF.namedNode('http://s'), DF.variable('p'), DF.namedNode('http://o')),
        ) };
      const output: IActorQueryOperationOutputBoolean = <any> await actor.run(op);

      expect(await output.booleanResult).toEqual(true);
    });

    it('should run for a CONSTRUCT query', async() => {
      const context = ActionContext({
        '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'sparql', value: 'http://example.org/sparql-construct' },
      });
      const op = { context,
        operation: factory.createConstruct(
          factory.createPattern(DF.namedNode('http://s'), DF.variable('p'), DF.namedNode('http://o')),
          [ factory.createPattern(DF.namedNode('http://s'), DF.variable('p'), DF.namedNode('http://o')) ],
        ) };
      const output: IActorQueryOperationOutputQuads = <any> await actor.run(op);

      expect(await (<any> output).metadata()).toEqual({ totalItems: 2 });

      expect(await arrayifyStream(output.quadStream)).toBeRdfIsomorphic([
        quad('http://ex.org/s', 'http://ex.org/p', 'http://ex.org/o1'),
        quad('http://ex.org/s', 'http://ex.org/p', 'http://ex.org/o2'),
      ]);
    });

    it('should run and error for a server error', async() => {
      const thisMediator: any = {
        mediate() {
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
      const op = { context,
        operation: factory.createPattern(DF.namedNode('http://s'), DF.variable('p'), DF.namedNode('http://o')) };
      const thisActor = new ActorQueryOperationSparqlEndpoint({ name: 'actor', bus, mediatorHttp: thisMediator });
      const x = ActorQueryOperation.getSafeBindings(await thisActor.run(op)).bindingsStream;
      await expect(arrayifyStream(x))
        .rejects.toThrow(new Error('Invalid SPARQL endpoint (http://ex) response: Error!'));
    });

    it('should run and error for a fetching error', () => {
      const context = ActionContext({
        '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'sparql', value: 'http://ex' },
      });
      const op = { context,
        operation: factory.createPattern(DF.namedNode('http://s'), DF.variable('p'), DF.namedNode('http://o')) };
      actor.endpointFetcher.fetchBindings = () => Promise.reject(new Error('MY ERROR'));
      return expect(new Promise((resolve, reject) => {
        return actor.run(op).then(async output => (<any> output).bindingsStream.on('error', resolve));
      })).resolves.toEqual(new Error('MY ERROR'));
    });
  });
});
