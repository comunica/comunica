import type { IActorQueryOperationOutputBindings } from '@comunica/bus-query-operation';
import { Bindings } from '@comunica/bus-query-operation';
import { Bus } from '@comunica/core';
import { literal } from '@rdfjs/data-model';
import { ArrayIterator } from 'asynciterator';
import { ActorQueryOperationNop } from '../lib/ActorQueryOperationNop';
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationNop', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ '?a': literal('1') }),
          Bindings({ '?a': literal('2') }),
          Bindings({ '?a': literal('3') }),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({ totalItems: 3 }),
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
        expect(await arrayifyStream(output.bindingsStream)).toEqual([ Bindings({}) ]);
        expect(output.variables).toEqual([]);
        expect(output.canContainUndefs).toEqual(false);
        expect(await (<any> output).metadata()).toMatchObject({ totalItems: 1 });
      });
    });
  });
});
