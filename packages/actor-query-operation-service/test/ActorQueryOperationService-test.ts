import { BindingsFactory } from '@comunica/bindings-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryOperationResultBindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationService } from '../lib/ActorQueryOperationService';
import '@comunica/jest';

const DF = new DataFactory();
const BF = new BindingsFactory();
const mediatorMergeBindingsContext: any = {
  mediate(arg: any) {
    return {};
  },
};

describe('ActorQueryOperationService', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let mediatorQuerySourceIdentify: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => arg.operation.type === 'error' ?
        Promise.reject(new Error('Endpoint error')) :
        Promise.resolve({
          bindingsStream: new ArrayIterator([
            BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
            BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
            BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
          ]),
          metadata: () => Promise.resolve({
            cardinality: 3,
            canContainUndefs: true,
            variables: [ DF.variable('a') ],
          }),
          operated: arg,
          type: 'bindings',
        }),
    };
    mediatorQuerySourceIdentify = {
      mediate: jest.fn((arg: any) => ({
        querySource: {
          value: 'QUERY_SOURCE_WRAPPER',
          type: arg.querySourceUnidentified.type,
        },
      })),
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
      actor = new ActorQueryOperationService({
        name: 'actor',
        bus,
        mediatorQueryOperation,
        forceSparqlEndpoint,
        mediatorMergeBindingsContext,
        mediatorQuerySourceIdentify,
      });
    });

    it('should test on service', () => {
      const op: any = { operation: { type: 'service', silent: false, name: DF.namedNode('dummy') },
        context: new ActionContext() };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-service', () => {
      const op: any = { operation: { type: 'some-other-type' }, context: new ActionContext() };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should not test on service with a non-named node name', () => {
      const op: any = { operation: { type: 'service', silent: false, name: DF.literal('dummy') },
        context: new ActionContext() };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', () => {
      const op: any = { operation: { type: 'service', silent: false, name: DF.literal('dummy') },
        context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata())
          .toEqual({ cardinality: 3, canContainUndefs: true, variables: [ DF.variable('a') ]});
        await expect(output.bindingsStream).toEqualBindingsStream([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ]);
        expect((<any> output).operated.operation.metadata).toEqual({
          scopedSource: { value: 'QUERY_SOURCE_WRAPPER', type: 'sparql' },
        });
      });
    });

    it('should run on a silent operation when the endpoint errors', () => {
      const op: any = {
        operation: { type: 'service', silent: true, name: DF.literal('dummy'), input: { type: 'error' }},
        context: new ActionContext(),
      };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata())
          .toMatchObject({ cardinality: { type: 'exact', value: 1 }, canContainUndefs: false, variables: []});
        await expect(output.bindingsStream).toEqualBindingsStream([
          BF.bindings(),
        ]);
      });
    });

    it('should not run on a non-silent operation when the endpoint errors', () => {
      const op: any = {
        operation: { type: 'service', silent: false, name: DF.literal('dummy'), input: { type: 'error' }},
        context: new ActionContext(),
      };
      return expect(actor.run(op)).rejects.toBeTruthy();
    });

    it('should run and use undefined source type when forceSparqlEndpoint is disabled', () => {
      const op: any = { operation: { type: 'service', silent: false, name: DF.literal('dummy') },
        context: new ActionContext() };
      const actorThis = new ActorQueryOperationService({
        bus,
        forceSparqlEndpoint: false,
        mediatorQueryOperation,
        name: 'actor',
        mediatorMergeBindingsContext,
        mediatorQuerySourceIdentify,
      });

      return actorThis.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect((<any> output).operated.operation.metadata).toEqual({
          scopedSource: { value: 'QUERY_SOURCE_WRAPPER', type: undefined },
        });
        expect(await output.metadata())
          .toEqual({ cardinality: 3, canContainUndefs: true, variables: [ DF.variable('a') ]});
        await expect(output.bindingsStream).toEqualBindingsStream([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ]);
      });
    });

    it('should run and use sparql source type when forceSparqlEndpoint is enabled', () => {
      const op: any = { operation: { type: 'service', silent: false, name: DF.literal('dummy') },
        context: new ActionContext() };
      const actorThis = new ActorQueryOperationService({
        bus,
        forceSparqlEndpoint: true,
        mediatorQueryOperation,
        name: 'actor',
        mediatorMergeBindingsContext,
        mediatorQuerySourceIdentify,
      });

      return actorThis.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect((<any> output).operated.operation.metadata).toEqual({
          scopedSource: { value: 'QUERY_SOURCE_WRAPPER', type: 'sparql' },
        });
        expect(await output.metadata())
          .toEqual({ cardinality: 3, canContainUndefs: true, variables: [ DF.variable('a') ]});
        await expect(output.bindingsStream).toEqualBindingsStream([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ]);
      });
    });
  });
});
