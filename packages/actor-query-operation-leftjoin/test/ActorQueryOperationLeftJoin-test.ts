import { ActorFunctionFactoryTermFunctionAddition } from '@comunica/actor-function-factory-term-function-addition';
import type { MediatorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import { createFuncMediator } from '@comunica/bus-function-factory/test/util';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { Bus } from '@comunica/core';
import * as sparqlee from '@comunica/expression-evaluator';
import { isExpressionError } from '@comunica/expression-evaluator';
import type { Bindings, IActionContext, IJoinEntry, IQueryOperationResultBindings } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { getMockEEActionContext, getMockMediatorExpressionEvaluatorFactory } from '@comunica/utils-jest';
import { getSafeBindings } from '@comunica/utils-query-operation';
import { ArrayIterator, UnionIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationLeftJoin } from '../lib';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

describe('ActorQueryOperationLeftJoin', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let mediatorJoin: any;
  let mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;

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
    mediatorExpressionEvaluatorFactory = getMockMediatorExpressionEvaluatorFactory({
      mediatorQueryOperation,
      mediatorFunctionFactory: createFuncMediator([
        args => new ActorFunctionFactoryTermFunctionAddition(args),
      ], {}),
    });
    mediatorJoin = {
      mediate: (arg: any) => Promise.resolve({
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
      }),
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
        mediatorExpressionEvaluatorFactory,
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
      const expression = {
        expressionType: 'term',
        term: DF.literal('nonemptystring'),
        type: 'expression',
      };
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
      const expression = {
        expressionType: 'term',
        term: DF.literal(''),
        type: 'expression',
      };
      const op: any = { operation: { type: 'leftjoin', input: [{}, {}], expression }, context };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.bindingsStream).toEqualBindingsStream([]);
      await expect(output.metadata()).resolves.toMatchObject({
        cardinality: 100,
        variables: [
          { variable: DF.variable('a'), canBeUndef: false },
          { variable: DF.variable('b'), canBeUndef: true },
        ],
      });
      expect(output.type).toBe('bindings');
    });

    it('should correctly handle erroring expressions', async() => {
      const logWarnSpy = jest.spyOn(<any> actor, 'logWarn');
      const expression = {
        type: 'expression',
        expressionType: 'operator',
        operator: '+',
        args: [
          {
            type: 'expression',
            expressionType: 'term',
            term: DF.variable('a'),
          },
          {
            type: 'expression',
            expressionType: 'term',
            term: DF.variable('a'),
          },
        ],
      };
      const op: any = { operation: { type: 'leftjoin', input: [{}, {}], expression }, context };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.bindingsStream).toEqualBindingsStream([]);
      await expect(output.metadata()).resolves.toMatchObject({
        cardinality: 100,
        variables: [
          { variable: DF.variable('a'), canBeUndef: false },
          { variable: DF.variable('b'), canBeUndef: true },
        ],
      });
      expect(output.type).toBe('bindings');

      expect(logWarnSpy).toHaveBeenCalledTimes(6);
      for (const [ index, call ] of logWarnSpy.mock.calls.entries()) {
        const dataCB = <() => { error: any; bindings: Bindings }> call[2];
        const { error, bindings } = dataCB();
        expect(isExpressionError(error)).toBeTruthy();
        expect(bindings).toEqual(BF.bindings([[
          DF.variable('a'),
          DF.literal(String(1 + Math.floor(index / 2)), DF.namedNode('http://www.w3.org/2001/XMLSchema#string')),
        ]]));
      }
    });

    it('should correctly handle hard erroring expressions', async() => {
      // Mock the expression error test so we can force 'a programming error' and test the branch

      Object.defineProperty(sparqlee, 'isExpressionError', { writable: true });
      // eslint-disable-next-line jest/prefer-spy-on
      (<any> sparqlee).isExpressionError = jest.fn(() => false);

      const expression = {
        type: 'expression',
        expressionType: 'operator',
        operator: '+',
        args: [
          {
            type: 'expression',
            expressionType: 'term',
            term: DF.variable('a'),
          },
          {
            type: 'expression',
            expressionType: 'term',
            term: DF.variable('a'),
          },
        ],
      };
      const op: any = { operation: { type: 'leftjoin', input: [{}, {}], expression }, context };
      const output: IQueryOperationResultBindings = <IQueryOperationResultBindings> await actor.run(op, undefined);
      await new Promise<void>((resolve) => {
        output.bindingsStream.on('error', () => resolve());
        output.bindingsStream.on('data', () => {
          // Do nothing
        });
      });
      output.bindingsStream.destroy();
    });
  });
});
