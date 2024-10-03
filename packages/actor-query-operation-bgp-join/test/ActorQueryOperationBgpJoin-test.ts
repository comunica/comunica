import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryOperationResultBindings } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Factory } from 'sparqlalgebrajs';
import { ActorQueryOperationBgpJoin } from '../lib/ActorQueryOperationBgpJoin';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
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
        metadata: () => Promise.resolve({
          cardinality: 3,
          variables: [{ variable: DF.variable('a'), canBeUndef: false }],
        }),
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

    it('should test on bgp', async() => {
      const op = <any> { operation: { type: 'bgp' }};
      await expect(actor.test(op)).resolves.toPassTestVoid();
    });

    it('should not test on non-bgp', async() => {
      const op = <any> { operation: { type: 'some-other-type' }};
      await expect(actor.test(op)).resolves.toFailTest(`Actor actor only supports bgp operations, but got some-other-type`);
    });

    it('should run', async() => {
      const patterns: any[] = [ 'a', 'b' ];
      const context = new ActionContext({ a: 'b', [KeysInitQuery.dataFactory.name]: DF });
      const op = <any> { operation: { type: 'bgp', patterns }, context };

      const output: IQueryOperationResultBindings = <any> await actor.run(op, undefined);
      await expect(output.metadata()).resolves
        .toEqual({ cardinality: 3, variables: [{ variable: DF.variable('a'), canBeUndef: false }]});
      expect(output.type).toBe('bindings');
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
