import { ActorQueryOperation, Bindings } from '@comunica/bus-query-operation';
import { Bus } from '@comunica/core';
import type { IActorQueryOperationOutputBindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import * as sparqlee from 'sparqlee';
import { ActorQueryOperationLeftJoinNestedLoop } from '../lib/ActorQueryOperationLeftJoinNestedLoop';
const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory();

describe('ActorQueryOperationLeftJoinNestedLoop', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let left: any;

  const truthyExpression = {
    expressionType: 'term',
    term: DF.literal('nonemptystring'),
    type: 'expression',
  };
  const falsyExpression = {
    expressionType: 'term',
    term: DF.literal(''),
    type: 'expression',
  };
  const erroringExpression = {
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

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    left = false;
    const bindingStreamLeft = new ArrayIterator([
      Bindings({ '?a': DF.literal('1') }),
      Bindings({ '?a': DF.literal('2') }),
      Bindings({ '?a': DF.literal('3') }),
    ]);
    const bindingStreamRight = new ArrayIterator([
      Bindings({ '?a': DF.literal('1'), '?b': DF.literal('1') }),
      Bindings({ '?a': DF.literal('3'), '?b': DF.literal('1') }),
      Bindings({ '?a': DF.literal('3'), '?b': DF.literal('2') }),
    ]);
    mediatorQueryOperation = {
      mediate(arg: any) {
        left = !left;
        return Promise.resolve({
          bindingsStream: left ? bindingStreamLeft : bindingStreamRight,
          metadata: () => arg.operation.rejectMetadata ?
            Promise.reject(new Error('fail')) :
            Promise.resolve({ totalItems: 3 }),
          operated: arg,
          type: 'bindings',
          variables: left ? [ '?a' ] : [ '?a', '?b' ],
          canContainUndefs: false,
        });
      },
    };
  });

  describe('The ActorQueryOperationLeftJoinNestedLoop module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationLeftJoinNestedLoop).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationLeftJoinNestedLoop constructor', () => {
      expect(new (<any> ActorQueryOperationLeftJoinNestedLoop)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationLeftJoinNestedLoop);
      expect(new (<any> ActorQueryOperationLeftJoinNestedLoop)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationLeftJoinNestedLoop objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationLeftJoinNestedLoop)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationLeftJoinNestedLoop instance', () => {
    let actor: ActorQueryOperationLeftJoinNestedLoop;

    beforeEach(() => {
      actor = new ActorQueryOperationLeftJoinNestedLoop({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on leftjoin', () => {
      const op = { operation: { type: 'leftjoin' }};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-leftjoin', () => {
      const op = { operation: { type: 'some-other-type' }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', () => {
      const op = { operation: { type: 'leftjoin', left: {}, right: {}}};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ '?a': DF.literal('1'), '?b': DF.literal('1') }),
          Bindings({ '?a': DF.literal('2') }),
          Bindings({ '?a': DF.literal('3'), '?b': DF.literal('1') }),
          Bindings({ '?a': DF.literal('3'), '?b': DF.literal('2') }),
        ]);
        expect(await (<any> output).metadata()).toMatchObject({ totalItems: 9 });
        expect(output.type).toEqual('bindings');
        expect(output.variables).toMatchObject([ '?a', '?b' ]);
        expect(output.canContainUndefs).toEqual(true);
      });
    });

    it('should correctly handle rejecting promise in left and right', () => {
      const op = { operation: { type: 'leftjoin', left: { rejectMetadata: true }, right: { rejectMetadata: true }}};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await (<any> output).metadata()).toMatchObject({ totalItems: Number.POSITIVE_INFINITY });
      });
    });

    it('should correctly handle rejecting promise in left', () => {
      const op = { operation: { type: 'leftjoin', left: { rejectMetadata: true }, right: {}}};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await (<any> output).metadata()).toMatchObject({ totalItems: Number.POSITIVE_INFINITY });
      });
    });

    it('should correctly handle rejecting promise in right', () => {
      const op = { operation: { type: 'leftjoin', left: {}, right: { rejectMetadata: true }}};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await (<any> output).metadata()).toMatchObject({ totalItems: Number.POSITIVE_INFINITY });
      });
    });

    it('should correctly handle truthy expressions', async() => {
      const expression = truthyExpression;
      const op = { operation: { type: 'leftjoin', left: {}, right: {}, expression }};
      await actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ '?a': DF.literal('1'), '?b': DF.literal('1') }),
          Bindings({ '?a': DF.literal('2') }),
          Bindings({ '?a': DF.literal('3'), '?b': DF.literal('1') }),
          Bindings({ '?a': DF.literal('3'), '?b': DF.literal('2') }),
        ]);
        expect(await (<any> output).metadata()).toMatchObject({ totalItems: 9 });
        expect(output.type).toEqual('bindings');
        expect(output.variables).toMatchObject([ '?a', '?b' ]);
        expect(output.canContainUndefs).toEqual(true);
      });
    });

    it('should correctly handle falsy expressions', async() => {
      const expression = falsyExpression;
      const op = { operation: { type: 'leftjoin', left: {}, right: {}, expression }};
      await actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ '?a': DF.literal('1') }),
          Bindings({ '?a': DF.literal('2') }),
          Bindings({ '?a': DF.literal('3') }),
        ]);
        expect(await (<any> output).metadata()).toMatchObject({ totalItems: 9 });
        expect(output.type).toEqual('bindings');
        expect(output.variables).toMatchObject([ '?a', '?b' ]);
        expect(output.canContainUndefs).toEqual(true);
      });
    });

    it('should correctly handle erroring expressions', async() => {
      const expression = erroringExpression;
      const op = { operation: { type: 'leftjoin', left: {}, right: {}, expression }};
      await actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ '?a': DF.literal('1') }),
          Bindings({ '?a': DF.literal('2') }),
          Bindings({ '?a': DF.literal('3') }),
        ]);
        expect(await (<any> output).metadata()).toMatchObject({ totalItems: 9 });
        expect(output.type).toEqual('bindings');
        expect(output.variables).toMatchObject([ '?a', '?b' ]);
        expect(output.canContainUndefs).toEqual(true);
      });
    });

    it('should emit an error on a hard erroring expression', async next => {
      // Mock the expression error test so we can force 'a programming error' and test the branch
      // eslint-disable-next-line no-import-assign
      Object.defineProperty(sparqlee, 'isExpressionError', { writable: true });
      (<any> sparqlee).isExpressionError = jest.fn(() => false);
      const op = { operation: { type: 'leftjoin', input: {}, expression: erroringExpression }};
      const output: IActorQueryOperationOutputBindings = <any> await actor.run(op);
      output.bindingsStream.on('error', () => next());
    });
  });
});
