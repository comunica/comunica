import { BindingsFactory } from '@comunica/bindings-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { ActionContext, Actor, Bus } from '@comunica/core';
import type { IQueryOperationResultBindings } from '@comunica/types';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import * as sparqlee from 'sparqlee';

import { ActorQueryOperationExtend } from '../lib/ActorQueryOperationExtend';

const DF = new DataFactory();
const BF = new BindingsFactory();

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
    BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
    BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
    BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
  ];

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator(input),
        metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false, variables: [ DF.variable('a') ]}),
        operated: arg,
        type: 'bindings',
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
      const op: any = { operation: example(defaultExpression), context: new ActionContext() };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-extend', () => {
      const op: any = { operation: { type: 'some-other-type' }, context: new ActionContext() };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', async() => {
      const op: any = { operation: example(defaultExpression), context: new ActionContext() };
      const output: IQueryOperationResultBindings = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        BF.bindings([
          [ DF.variable('a'), DF.literal('1') ],
          [ DF.variable('l'), DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('2') ],
          [ DF.variable('l'), DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('3') ],
          [ DF.variable('l'), DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) ],
        ]),
      ]);

      expect(output.type).toEqual('bindings');
      expect(await output.metadata())
        .toMatchObject({ cardinality: 3, canContainUndefs: false, variables: [ DF.variable('a'), DF.variable('l') ]});
    });

    it('should not extend bindings on erroring expressions', async() => {
      const warn = jest.fn();
      jest.spyOn(Actor, 'getContextLogger').mockImplementation(() => (<any>{ warn }));

      const op: any = { operation: example(faultyExpression), context: new ActionContext() };
      const output: IQueryOperationResultBindings = <any> await actor.run(op);

      expect(await arrayifyStream(output.bindingsStream)).toMatchObject(input);
      expect(warn).toHaveBeenCalledTimes(3);
      expect(output.type).toEqual('bindings');
      expect(await output.metadata())
        .toMatchObject({ cardinality: 3, canContainUndefs: false, variables: [ DF.variable('a'), DF.variable('l') ]});
    });

    it('should emit error when evaluation code returns a hard error', async() => {
      const warn = jest.fn();
      jest.spyOn(Actor, 'getContextLogger').mockImplementation(() => (<any>{ warn }));
      // eslint-disable-next-line no-import-assign
      Object.defineProperty(sparqlee, 'isExpressionError', { writable: true });
      (<any> sparqlee).isExpressionError = jest.fn(() => false);

      const op: any = { operation: example(faultyExpression), context: new ActionContext() };
      const output: IQueryOperationResultBindings = <any> await actor.run(op);
      await new Promise<void>((resolve, reject) => {
        output.bindingsStream.on('error', () => resolve());
        output.bindingsStream.on('data', reject);
      });
      expect(warn).toBeCalledTimes(0);
    });
  });
});
