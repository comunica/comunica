import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { getSafeBindings } from '@comunica/utils-query-operation';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationService } from '../lib/ActorQueryOperationService';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const mediatorMergeBindingsContext: any = {
  mediate: () => ({}),
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
            variables: [
              { variable: DF.variable('a'), canBeUndef: false },
            ],
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
      expect(() => {
        (<any> ActorQueryOperationService)();
      }).toThrow(`Class constructor ActorQueryOperationService cannot be invoked without 'new'`);
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

    it('should test on service', async() => {
      const op: any = {
        operation: { type: 'service', silent: false, name: DF.namedNode('dummy') },
        context: new ActionContext(),
      };
      await expect(actor.test(op)).resolves.toPassTestVoid();
    });

    it('should not test on non-service', async() => {
      const op: any = {
        operation: { type: 'some-other-type' },
        context: new ActionContext(),
      };
      await expect(actor.test(op)).resolves.toFailTest(`Actor actor only supports service operations, but got some-other-type`);
    });

    it('should not test on service with a non-named node name', async() => {
      const op: any = {
        operation: { type: 'service', silent: false, name: DF.literal('dummy') },
        context: new ActionContext(),
      };
      await expect(actor.test(op)).resolves.toFailTest(`actor can only query services by IRI, while a Literal was given.`);
    });

    it('should run', async() => {
      const op: any = {
        operation: { type: 'service', silent: false, name: DF.literal('dummy') },
        context: new ActionContext(),
      };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves
        .toEqual({ cardinality: 3, variables: [
          { variable: DF.variable('a'), canBeUndef: false },
        ]});
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
      expect((<any> output).operated.operation.metadata).toEqual({
        scopedSource: { value: 'QUERY_SOURCE_WRAPPER', type: 'sparql' },
      });
    });

    it('should run on a silent operation when the endpoint errors', async() => {
      const op: any = {
        operation: { type: 'service', silent: true, name: DF.literal('dummy'), input: { type: 'error' }},
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves
        .toMatchObject({ cardinality: { type: 'exact', value: 1 }, variables: []});
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings(),
      ]);
    });

    it('should not run on a non-silent operation when the endpoint errors', async() => {
      const op: any = {
        operation: { type: 'service', silent: false, name: DF.literal('dummy'), input: { type: 'error' }},
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      await expect(actor.run(op, undefined)).rejects.toBeTruthy();
    });

    it('should run and use undefined source type when forceSparqlEndpoint is disabled', async() => {
      const op: any = {
        operation: { type: 'service', silent: false, name: DF.literal('dummy') },
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const actorThis = new ActorQueryOperationService({
        bus,
        forceSparqlEndpoint: false,
        mediatorQueryOperation,
        name: 'actor',
        mediatorMergeBindingsContext,
        mediatorQuerySourceIdentify,
      });

      const output = getSafeBindings(await actorThis.run(op, undefined));
      expect((<any> output).operated.operation.metadata).toEqual({
        scopedSource: { value: 'QUERY_SOURCE_WRAPPER', type: undefined },
      });
      await expect(output.metadata()).resolves
        .toEqual({ cardinality: 3, variables: [
          { variable: DF.variable('a'), canBeUndef: false },
        ]});
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
    });

    it('should run and use sparql source type when forceSparqlEndpoint is enabled', async() => {
      const op: any = {
        operation: { type: 'service', silent: false, name: DF.literal('dummy') },
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };

      const output = getSafeBindings(await actor.run(op, undefined));
      expect((<any> output).operated.operation.metadata).toEqual({
        scopedSource: { value: 'QUERY_SOURCE_WRAPPER', type: 'sparql' },
      });
      await expect(output.metadata()).resolves
        .toEqual({ cardinality: 3, variables: [
          { variable: DF.variable('a'), canBeUndef: false },
        ]});
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
    });
  });
});
