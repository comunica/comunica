import { BindingsFactory } from '@comunica/bindings-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryOperationResultBindings, Bindings, IJoinEntry } from '@comunica/types';
import { ArrayIterator, UnionIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import * as sparqlee from 'sparqlee';
import { isExpressionError } from 'sparqlee';
import { ActorQueryOperationLeftJoin } from '../lib/ActorQueryOperationLeftJoin';
import '@comunica/jest';

const DF = new DataFactory();
const BF = new BindingsFactory();

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
        metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: true, variables: [ DF.variable('a') ]}),
        operated: arg,
        type: 'bindings',
      }),
    };
    mediatorJoin = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new UnionIterator(arg.entries.map((entry: IJoinEntry) => entry.output.bindingsStream)),
        metadata: () => Promise.resolve({
          cardinality: 100,
          canContainUndefs: true,
          variables: [ DF.variable('a'), DF.variable('b') ],
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
      expect(() => { (<any> ActorQueryOperationLeftJoin)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationLeftJoin instance', () => {
    let actor: ActorQueryOperationLeftJoin;

    beforeEach(() => {
      actor = new ActorQueryOperationLeftJoin({ name: 'actor', bus, mediatorQueryOperation, mediatorJoin });
    });

    it('should test on leftjoin', () => {
      const op: any = { operation: { type: 'leftjoin' }};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-leftjoin', () => {
      const op: any = { operation: { type: 'some-other-type' }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', () => {
      const op: any = { operation: { type: 'leftjoin', input: [{}, {}]}, context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(output.type).toEqual('bindings');
        expect(await output.metadata()).toEqual({
          cardinality: 100,
          canContainUndefs: true,
          variables: [ DF.variable('a'), DF.variable('b') ],
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
    });

    it('should correctly handle truthy expressions', async() => {
      const expression = {
        expressionType: 'term',
        term: DF.literal('nonemptystring'),
        type: 'expression',
      };
      const op: any = { operation: { type: 'leftjoin', input: [{}, {}], expression }, context: new ActionContext() };
      await actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        await expect(output.bindingsStream).toEqualBindingsStream([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ]);
        expect(await output.metadata()).toMatchObject({
          cardinality: 100,
          canContainUndefs: true,
          variables: [ DF.variable('a'), DF.variable('b') ],
        });
        expect(output.type).toEqual('bindings');
      });
    });

    it('should correctly handle falsy expressions', async() => {
      const expression = {
        expressionType: 'term',
        term: DF.literal(''),
        type: 'expression',
      };
      const op: any = { operation: { type: 'leftjoin', input: [{}, {}], expression }, context: new ActionContext() };
      await actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        await expect(output.bindingsStream).toEqualBindingsStream([]);
        expect(await output.metadata()).toMatchObject({
          cardinality: 100,
          canContainUndefs: true,
          variables: [ DF.variable('a'), DF.variable('b') ],
        });
        expect(output.type).toEqual('bindings');
      });
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
      const op: any = { operation: { type: 'leftjoin', input: [{}, {}], expression }, context: new ActionContext() };
      await actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        await expect(output.bindingsStream).toEqualBindingsStream([]);
        expect(await output.metadata()).toMatchObject({
          cardinality: 100,
          canContainUndefs: true,
          variables: [ DF.variable('a'), DF.variable('b') ],
        });
        expect(output.type).toEqual('bindings');

        expect(logWarnSpy).toHaveBeenCalledTimes(6);
        logWarnSpy.mock.calls.forEach((call, index) => {
          const dataCB = <() => { error: any; bindings: Bindings }> call[2];
          const { error, bindings } = dataCB();
          expect(isExpressionError(error)).toBeTruthy();
          expect(bindings).toEqual(BF.bindings([[
            DF.variable('a'), DF.literal(String(1 + Math.floor(index / 2)),
              DF.namedNode('http://www.w3.org/2001/XMLSchema#string')),
          ]]));
        });
      });
    });

    it('should correctly handle hard erroring expressions', async() => {
      // Mock the expression error test so we can force 'a programming error' and test the branch
      // eslint-disable-next-line no-import-assign
      Object.defineProperty(sparqlee, 'isExpressionError', { writable: true });
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
      const op: any = { operation: { type: 'leftjoin', input: [{}, {}], expression }, context: new ActionContext() };
      const output: IQueryOperationResultBindings = <IQueryOperationResultBindings> await actor.run(op);
      await new Promise<void>(resolve => {
        output.bindingsStream.on('error', () => resolve());
        output.bindingsStream.on('data', () => {
          // Do nothing
        });
      });
    });
  });
});
