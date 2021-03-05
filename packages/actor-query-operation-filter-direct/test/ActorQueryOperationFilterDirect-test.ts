import { ActorQueryOperation, Bindings } from '@comunica/bus-query-operation';
import { Bus } from '@comunica/core';
import type { IActorQueryOperationOutputBindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationFilterDirect } from '../lib/ActorQueryOperationFilterDirect';
import * as SparqlExpressionEvaluator from '../lib/SparqlExpressionEvaluator';
const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory();

describe('ActorQueryOperationFilterDirect', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  const truthyExpression = {
    expressionType: 'term',
    term: { termType: 'Literal', value: 'true' },
    type: 'expression',
  };
  const falsyExpression = {
    expressionType: 'term',
    term: { termType: 'Literal', value: 'false' },
    type: 'expression',
  };
  const unknownExpression = {
    args: [],
    expressionType: 'term',
    operator: 'DUMMY',
    type: 'operator',
  };

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ '?a': DF.literal('1') }),
          Bindings({ '?a': DF.literal('2') }),
          Bindings({ '?a': DF.literal('3') }),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({ totalItems: 3 }),
        operated: arg,
        type: 'bindings',
        variables: [ 'a' ],
        canContainUndefs: false,
      }),
    };
  });

  describe('The ActorQueryOperationFilterDirect module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationFilterDirect).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationFilterDirect constructor', () => {
      expect(new (<any> ActorQueryOperationFilterDirect)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationFilterDirect);
      expect(new (<any> ActorQueryOperationFilterDirect)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationFilterDirect objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationFilterDirect)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationFilterDirect instance', () => {
    let actor: ActorQueryOperationFilterDirect;

    beforeEach(() => {
      actor = new ActorQueryOperationFilterDirect({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on filter', () => {
      const op = { operation: { type: 'filter', expression: truthyExpression }};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should fail on unsupported operators', () => {
      const op = { operation: { type: 'filter', expression: unknownExpression }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should not test on non-filter', () => {
      const op = { operation: { type: 'some-other-type' }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should return the full stream for a truthy filter', async() => {
      const op = { operation: { type: 'filter', input: {}, expression: truthyExpression }};
      const output: IActorQueryOperationOutputBindings = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ '?a': DF.literal('1') }),
        Bindings({ '?a': DF.literal('2') }),
        Bindings({ '?a': DF.literal('3') }),
      ]);
      expect(output.type).toEqual('bindings');
      expect(await (<any> output).metadata()).toMatchObject({ totalItems: 3 });
      expect(output.variables).toMatchObject([ 'a' ]);
      expect(output.canContainUndefs).toEqual(false);
    });

    it('should return an empty stream for a falsy filter', async() => {
      const op = { operation: { type: 'filter', input: {}, expression: falsyExpression }};
      const output: IActorQueryOperationOutputBindings = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([]);
      expect(await (<any> output).metadata()).toMatchObject({ totalItems: 3 });
      expect(output.type).toEqual('bindings');
      expect(output.variables).toMatchObject([ 'a' ]);
      expect(output.canContainUndefs).toEqual(false);
    });

    it('should emit an error for an erroring filter', async() => {
      (<any> SparqlExpressionEvaluator).createEvaluator = () => () => { throw new Error('filter direct error'); };
      const op = { operation: { type: 'filter', input: {}, expression: falsyExpression }};
      const output: IActorQueryOperationOutputBindings = <any> await actor.run(op);
      await expect(arrayifyStream(output.bindingsStream)).rejects.toBeTruthy();
      expect(output.canContainUndefs).toEqual(false);
    });
  });
});
