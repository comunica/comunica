import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { Bus } from '@comunica/core';
import type { IActionContext, IJoinEntry } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import {
  getMockEEActionContext,
} from '@comunica/utils-expression-evaluator/test/util/helpers';
import { getSafeBindings } from '@comunica/utils-query-operation';
import { ArrayIterator, UnionIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationLeftJoin } from '../lib';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const AF = new AlgebraFactory(DF);

describe('ActorQueryOperationLeftJoin', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let mediatorJoin: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: 3, variables: [
          { variable: DF.variable('a'), canBeUndef: false },
        ]}),
        operated: arg,
        type: 'bindings',
      }),
    };
    mediatorJoin = {
      mediate: jest.fn((arg: any) => Promise.resolve({
        bindingsStream: new UnionIterator(arg.entries.map((entry: IJoinEntry) => entry.output.bindingsStream)),
        metadata: () => Promise.resolve({
          cardinality: 100,
          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('b'), canBeUndef: true },
          ],
        }),
        operated: arg,
        type: 'bindings',
      })),
    };
  });

  describe('The ActorQueryOperationLeftJoin module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationLeftJoin).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationLeftJoin constructor', () => {
      expect(new (<any> ActorQueryOperationLeftJoin)({ name: 'actor', bus, mediatorQueryOperation, mediatorJoin }))
        .toBeInstanceOf(ActorQueryOperationLeftJoin);
      expect(new (<any> ActorQueryOperationLeftJoin)({ name: 'actor', bus, mediatorQueryOperation, mediatorJoin }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationLeftJoin objects without \'new\'', () => {
      expect(() => {
        (<any> ActorQueryOperationLeftJoin)();
      }).toThrow(`Class constructor ActorQueryOperationLeftJoin cannot be invoked without 'new'`);
    });
  });

  describe('An ActorQueryOperationLeftJoin instance', () => {
    let actor: ActorQueryOperationLeftJoin;
    let context: IActionContext;

    beforeEach(() => {
      actor = new ActorQueryOperationLeftJoin({
        name: 'actor',
        bus,
        mediatorQueryOperation,
        mediatorJoin,
      });

      context = getMockEEActionContext();
    });

    it('should test on leftjoin', async() => {
      const op: any = { operation: { type: 'leftjoin' }};
      await expect(actor.test(op)).resolves.toPassTestVoid();
    });

    it('should not test on non-leftjoin', async() => {
      const op: any = { operation: { type: 'some-other-type' }};
      await expect(actor.test(op)).resolves.toFailTest(`Actor actor only supports leftjoin operations, but got some-other-type`);
    });

    it('should run', async() => {
      const op: any = { operation: { type: 'leftjoin', input: [{}, {}]}, context };
      const output = getSafeBindings(await actor.run(op, undefined));
      expect(output.type).toBe('bindings');
      await expect(output.metadata()).resolves.toEqual({
        cardinality: 100,
        variables: [
          { variable: DF.variable('a'), canBeUndef: false },
          { variable: DF.variable('b'), canBeUndef: true },
        ],
      });
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
    });

    it('should correctly handle truthy expressions', async() => {
      const expression = AF.createTermExpression(DF.literal('nonemptystring'));
      const op: any = { operation: { type: 'leftjoin', input: [{}, {}], expression }, context };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
      await expect(output.metadata()).resolves.toMatchObject({
        cardinality: 100,
        variables: [
          { variable: DF.variable('a'), canBeUndef: false },
          { variable: DF.variable('b'), canBeUndef: true },
        ],
      });
      expect(output.type).toBe('bindings');
    });

    it('should correctly handle left hand bindings that are missing the variables of the expression', async() => {
      mediatorQueryOperation.mediate = (arg: any) => {
        const { side } = arg.operation;

        return Promise.resolve({
          bindingsStream: new ArrayIterator(side === 'left' ?
              [
                BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
              ] :
              [
                BF.bindings([[ DF.variable('c'), DF.literal('1') ]]),
              ], { autoStart: false }),
          metadata: () => Promise.resolve({
            cardinality: 1,
            variables: side === 'left' ?
                [{ variable: DF.variable('a'), canBeUndef: false }] :
                [{ variable: DF.variable('c'), canBeUndef: false }],
          }),
          operated: arg,
          type: 'bindings',
        });
      };

      const op: any = {
        operation: { type: 'leftjoin', input: [{ side: 'left' }, { side: 'right' }]},
        context,
      };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('c'), DF.literal('1') ]]),
      ]);
    });

    it('should correctly handle falsy expressions', async() => {
      const expression = AF.createTermExpression(DF.literal(''));
      const op: any = { operation: { type: 'leftjoin', input: [{}, {}], expression }, context };
      const output = getSafeBindings(await actor.run(op, undefined));
      expect(mediatorJoin.mediate).toHaveBeenCalledWith({
        context: expect.anything(),
        type: 'optional',
        entries: [
          {
            output: expect.anything(),
            operation: {},
          },
          {
            output: expect.anything(),
            operation: AF.createFilter(<any>{}, <any>expression),
            operationRequired: true,
          },
        ],
      });
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
      await expect(output.metadata()).resolves.toMatchObject({
        cardinality: 100,
        variables: [
          { variable: DF.variable('a'), canBeUndef: false },
          { variable: DF.variable('b'), canBeUndef: true },
        ],
      });
      expect(output.type).toBe('bindings');
    });
  });
});
