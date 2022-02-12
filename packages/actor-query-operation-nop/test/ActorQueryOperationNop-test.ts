import { BindingsFactory } from '@comunica/bindings-factory';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryOperationResultBindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationNop } from '../lib/ActorQueryOperationNop';
import '@comunica/jest';

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('ActorQueryOperationNop', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('x'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('x'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('x'), DF.literal('3') ]]),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: 3 }),
        operated: arg,
        type: 'bindings',
        variables: [ DF.variable('a') ],
        canContainUndefs: false,
      }),
    };
  });

  describe('An ActorQueryOperationNop instance', () => {
    let actor: ActorQueryOperationNop;

    beforeEach(() => {
      actor = new ActorQueryOperationNop({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on nop', () => {
      const op: any = { operation: { type: 'nop' }, context: new ActionContext() };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-nop', () => {
      const op: any = { operation: { type: 'some-other-type' }, context: new ActionContext() };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', () => {
      const op: any = { operation: { type: 'nop' }, context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        await expect(output.bindingsStream).toEqualBindingsStream([ BF.bindings() ]);
        expect(await output.metadata())
          .toMatchObject({ cardinality: { type: 'exact', value: 1 }, canContainUndefs: false, variables: []});
      });
    });
  });
});
