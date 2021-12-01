import { BindingsFactory } from '@comunica/bindings-factory';
import { KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryableResultBindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Factory } from 'sparqlalgebrajs';
import { ActorQueryOperationBgpJoin } from '../lib/ActorQueryOperationBgpJoin';
const arrayifyStream = require('arrayify-stream');

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
          BF.bindings({ '?a': DF.literal('1') }),
          BF.bindings({ '?a': DF.literal('2') }),
          BF.bindings({ '?a': DF.literal('3') }),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false }),
        operated: arg,
        type: 'bindings',
        variables: [ '?a' ],
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
      const context = ActionContext({ a: 'b' });
      const op = <any> { operation: { type: 'bgp', patterns }, context };

      const output: IQueryableResultBindings = <any> await actor.run(op);
      expect(await output.metadata()).toEqual({ cardinality: 3, canContainUndefs: false });
      expect(output.variables).toEqual([ '?a' ]);
      expect(output.type).toEqual('bindings');
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        BF.bindings({ '?a': DF.literal('1') }),
        BF.bindings({ '?a': DF.literal('2') }),
        BF.bindings({ '?a': DF.literal('3') }),
      ]);

      expect(mediatorQueryOperation.mediate).toHaveBeenCalledWith({
        context: context.set(KeysQueryOperation.operation, op.operation),
        operation: FACTORY.createJoin(patterns),
      });
    });
  });
});
