import { ActorQueryOperation, Bindings } from '@comunica/bus-query-operation';
import { Actor, Bus } from '@comunica/core';
import type { IActorQueryOperationOutputBindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import * as sparqlee from 'sparqlee';

import { ActorQueryOperationExtend } from '../lib/ActorQueryOperationExtend';
const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory();

describe('ActorQueryOperationExtend', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  const example = (expression: any) => ({
    type: 'extend',
    input: {
      type: 'bgp',
      patterns: [{
        subject: { value: 's' },
        predicate: { value: 'p' },
        object: { value: 'o' },
        graph: { value: '' },
        type: 'pattern',
      }],
    },
    variable: { termType: 'Variable', value: 'l' },
    expression,
  });

  const defaultExpression = {
    type: 'expression',
    expressionType: 'operator',
    operator: 'strlen',
    args: [
      {
        type: 'expression',
        expressionType: 'term',
        term: { termType: 'Variable', value: 'a' },
      },
    ],
  };

  // We sum 2 strings, which should error
  const faultyExpression = {
    type: 'expression',
    expressionType: 'operator',
    operator: '+',
    args: [
      {
        type: 'expression',
        expressionType: 'term',
        term: { termType: 'Variable', value: 'a' },
      },
      {
        type: 'expression',
        expressionType: 'term',
        term: { termType: 'Variable', value: 'a' },
      },
    ],
  };

  const input = [
    Bindings({ '?a': DF.literal('1') }),
    Bindings({ '?a': DF.literal('2') }),
    Bindings({ '?a': DF.literal('3') }),
  ];

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator(input),
        metadata: () => Promise.resolve({ totalItems: 3 }),
        operated: arg,
        type: 'bindings',
        variables: [ '?a' ],
        canContainUndefs: false,
      }),
    };
  });

  describe('The ActorQueryOperationExtend module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationExtend).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationExtend constructor', () => {
      expect(new (<any> ActorQueryOperationExtend)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationExtend);
      expect(new (<any> ActorQueryOperationExtend)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationExtend objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationExtend)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationExtend instance', () => {
    let actor: ActorQueryOperationExtend;

    beforeEach(() => {
      actor = new ActorQueryOperationExtend({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on extend', () => {
      const op = { operation: example(defaultExpression) };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-extend', () => {
      const op = { operation: { type: 'some-other-type' }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', async() => {
      const op = { operation: example(defaultExpression) };
      const output: IActorQueryOperationOutputBindings = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({
          '?a': DF.literal('1'),
          '?l': DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')),
        }),
        Bindings({
          '?a': DF.literal('2'),
          '?l': DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')),
        }),
        Bindings({
          '?a': DF.literal('3'),
          '?l': DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')),
        }),
      ]);

      expect(output.type).toEqual('bindings');
      expect(await (<any> output).metadata()).toMatchObject({ totalItems: 3 });
      expect(output.variables).toMatchObject([ '?a', '?l' ]);
      expect(output.canContainUndefs).toEqual(false);
    });

    it('should not extend bindings on erroring expressions', async() => {
      const warn = jest.fn();
      spyOn(Actor, 'getContextLogger').and.returnValue({ warn });

      const op = { operation: example(faultyExpression) };
      const output: IActorQueryOperationOutputBindings = <any> await actor.run(op);

      expect(await arrayifyStream(output.bindingsStream)).toMatchObject(input);
      expect(warn).toHaveBeenCalledTimes(3);
      expect(output.type).toEqual('bindings');
      expect(await (<any> output).metadata()).toMatchObject({ totalItems: 3 });
      expect(output.variables).toMatchObject([ '?a', '?l' ]);
      expect(output.canContainUndefs).toEqual(false);
    });

    it('should emit error when evaluation code returns a hard error', async next => {
      const warn = jest.fn();
      spyOn(Actor, 'getContextLogger').and.returnValue({ warn });
      // eslint-disable-next-line no-import-assign
      Object.defineProperty(sparqlee, 'isExpressionError', { writable: true });
      (<any> sparqlee).isExpressionError = jest.fn(() => false);

      const op = { operation: example(faultyExpression) };
      const output: IActorQueryOperationOutputBindings = <any> await actor.run(op);
      output.bindingsStream.on('error', () => next());
      expect(warn).toBeCalledTimes(0);
    });
  });
});
