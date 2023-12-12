import { BindingsFactory } from '@comunica/bindings-factory';
import { KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryOperationResultBindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Factory } from 'sparqlalgebrajs';
import { ActorQueryOperationBgpJoin } from '../lib/ActorQueryOperationBgpJoin';
import '@comunica/jest';

const DF = new DataFactory();
const BF = new BindingsFactory();
const FACTORY = new Factory();

describe('ActorQueryOperationBgpJoin', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: jest.fn((arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false, variables: [ DF.variable('a') ]}),
        operated: arg,
        type: 'bindings',
      })),
    };
  });

  describe('An ActorQueryOperationBgpJoin instance', () => {
    let actor: ActorQueryOperationBgpJoin;

    beforeEach(() => {
      actor = new ActorQueryOperationBgpJoin({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on bgp', () => {
      const op = <any> { operation: { type: 'bgp' }};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-bgp', () => {
      const op = <any> { operation: { type: 'some-other-type' }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', async() => {
      const patterns: any[] = [ 'a', 'b' ];
      const context = new ActionContext({ a: 'b' });
      const op = <any> { operation: { type: 'bgp', patterns }, context };

      const output: IQueryOperationResultBindings = <any> await actor.run(op);
      expect(await output.metadata())
        .toEqual({ cardinality: 3, canContainUndefs: false, variables: [ DF.variable('a') ]});
      expect(output.type).toEqual('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);

      expect(mediatorQueryOperation.mediate).toHaveBeenCalledWith({
        context: context.set(KeysQueryOperation.operation, op.operation),
        operation: FACTORY.createJoin(patterns),
      });
    });
  });
});
