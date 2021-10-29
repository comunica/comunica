import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActorQueryOperationOutputBindings } from '@comunica/bus-query-operation';
import { Bus } from '@comunica/core';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationNop } from '../lib/ActorQueryOperationNop';
const arrayifyStream = require('arrayify-stream');

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
          BF.bindings({ '?a': DF.literal('1') }),
          BF.bindings({ '?a': DF.literal('2') }),
          BF.bindings({ '?a': DF.literal('3') }),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: 3 }),
        operated: arg,
        type: 'bindings',
        variables: [ '?a' ],
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
      const op: any = { operation: { type: 'nop' }};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-nop', () => {
      const op: any = { operation: { type: 'some-other-type' }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', () => {
      const op: any = { operation: { type: 'nop' }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await arrayifyStream(output.bindingsStream)).toEqual([ BF.bindings({}) ]);
        expect(output.variables).toEqual([]);
        expect(await output.metadata()).toMatchObject({ cardinality: 1, canContainUndefs: false });
      });
    });
  });
});
