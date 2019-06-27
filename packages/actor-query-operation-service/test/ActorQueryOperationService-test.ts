import {ActorQueryOperation, Bindings, IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {ActionContext, Bus} from "@comunica/core";
import {literal, namedNode} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import {ActorQueryOperationService} from "../lib/ActorQueryOperationService";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationService', () => {
  let bus;
  let mediatorQueryOperation;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg) => arg.operation === 'error'
        ? Promise.reject(new Error('Endpoint error'))
        : Promise.resolve({
          bindingsStream: new ArrayIterator([
            Bindings({ a: literal('1') }),
            Bindings({ a: literal('2') }),
            Bindings({ a: literal('3') }),
          ]),
          metadata: () => Promise.resolve({ totalItems: 3 }),
          operated: arg,
          type: 'bindings',
          variables: ['?a'],
        }),
    };
  });

  describe('The ActorQueryOperationService module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationService).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationService constructor', () => {
      expect(new (<any> ActorQueryOperationService)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationService);
      expect(new (<any> ActorQueryOperationService)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationService objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationService)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationService instance', () => {
    let actor: ActorQueryOperationService;
    const forceSparqlEndpoint = true;

    beforeEach(() => {
      actor = new ActorQueryOperationService(
        { name: 'actor', bus, mediatorQueryOperation, forceSparqlEndpoint });
    });

    it('should test on service', () => {
      const op = { operation: { type: 'service', silent: false, name: namedNode('dummy') } };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-service', () => {
      const op = { operation: { type: 'some-other-type' } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should not test on service with a non-named node name', () => {
      const op = { operation: { type: 'service', silent: false, name: literal('dummy') } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run with context', () => {
      const context = ActionContext({
        '@comunica/bus-rdf-resolve-quad-pattern:sources': { type: 'bla', value: 'blabla' },
      });
      const op = { operation: { type: 'service', silent: false, name: literal('dummy') }, context };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual(['?a']);
        expect(await output.metadata()).toEqual({ totalItems: 3 });
        // tslint:disable:max-line-length
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: literal('1') }),
          Bindings({ a: literal('2') }),
          Bindings({ a: literal('3') }),
        ]);
      });
    });

    it('should run without context', () => {
      const op = { operation: { type: 'service', silent: false, name: literal('dummy') } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual(['?a']);
        expect(await output.metadata()).toEqual({ totalItems: 3 });
        // tslint:disable:max-line-length
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: literal('1') }),
          Bindings({ a: literal('2') }),
          Bindings({ a: literal('3') }),
        ]);
      });
    });

    it('should run on a silent operation when the endpoint errors', () => {
      const op = { operation: { type: 'service', silent: true, name: literal('dummy'), input: 'error' } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual([]);
        expect(output.metadata).toBeFalsy();
        // tslint:disable:max-line-length
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({}),
        ]);
      });
    });

    it('should not run on a non-silent operation when the endpoint errors', () => {
      const op = { operation: { type: 'service', silent: false, name: literal('dummy'), input: 'error' } };
      return expect(actor.run(op)).rejects.toBeTruthy();
    });

    it('should run and use auto source type when forceSparqlEndpoint is disabled', () => {
      const op = { operation: { type: 'service', silent: false, name: literal('dummy') } };
      const actorThis = new ActorQueryOperationService(
        { bus, forceSparqlEndpoint: false, mediatorQueryOperation, name: 'actor' });

      return actorThis.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect((<any> output).operated.context.get('@comunica/bus-rdf-resolve-quad-pattern:sources').array[0].type)
          .toEqual('auto');
        expect(output.variables).toEqual(['?a']);
        expect(await output.metadata()).toEqual({ totalItems: 3 });
        // tslint:disable:max-line-length
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: literal('1') }),
          Bindings({ a: literal('2') }),
          Bindings({ a: literal('3') }),
        ]);
      });
    });

    it('should run and use sparql source type when forceSparqlEndpoint is enabled', () => {
      const op = { operation: { type: 'service', silent: false, name: literal('dummy') } };
      const actorThis = new ActorQueryOperationService(
        { bus, forceSparqlEndpoint: true, mediatorQueryOperation, name: 'actor' });

      return actorThis.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect((<any> output).operated.context.get('@comunica/bus-rdf-resolve-quad-pattern:sources').array[0].type)
          .toEqual('sparql');
        expect(await output.metadata()).toEqual({ totalItems: 3 });
        // tslint:disable:max-line-length
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: literal('1') }),
          Bindings({ a: literal('2') }),
          Bindings({ a: literal('3') }),
        ]);
      });
    });
  });
});
