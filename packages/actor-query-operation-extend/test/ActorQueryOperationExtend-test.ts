import { createFuncMediator } from '@comunica/actor-function-factory-wrapper-all/test/util';
import { BindingsFactory } from '@comunica/bindings-factory';
import type {
  MediatorExpressionEvaluatorFactory,
} from '@comunica/bus-expression-evaluator-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { Actor, Bus } from '@comunica/core';
import * as sparqlee from '@comunica/expression-evaluator';
import { getMockEEActionContext, getMockMediatorExpressionEvaluatorFactory } from '@comunica/jest';
import type { IActionContext, IQueryOperationResultBindings } from '@comunica/types';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';

import { ActorQueryOperationExtend } from '../lib';

const DF = new DataFactory();
const BF = new BindingsFactory(DF, {});

describe('ActorQueryOperationExtend', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;
  let context: IActionContext;

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
    mediatorExpressionEvaluatorFactory = getMockMediatorExpressionEvaluatorFactory({
      mediatorQueryOperation,
      mediatorFunctionFactory: createFuncMediator(),
    });

    context = getMockEEActionContext();
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
      expect(() => {
        (<any> ActorQueryOperationExtend)();
      }).toThrow(`Class constructor ActorQueryOperationExtend cannot be invoked without 'new'`);
    });
  });

  describe('An ActorQueryOperationExtend instance', () => {
    let actor: ActorQueryOperationExtend;
    beforeEach(() => {
      actor = new ActorQueryOperationExtend({
        name: 'actor',
        bus,
        mediatorQueryOperation,
        mediatorExpressionEvaluatorFactory,
      });
    });

    it('should test on extend', async() => {
      const op: any = { operation: example(defaultExpression), context };
      await expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-extend', async() => {
      const op: any = { operation: { type: 'some-other-type' }, context };
      await expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', async() => {
      const op: any = { operation: example(defaultExpression), context };
      const output: IQueryOperationResultBindings = <any> await actor.run(op);
      await expect(output.bindingsStream).toEqualBindingsStream([
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

      expect(output.type).toBe('bindings');
      await expect(output.metadata()).resolves
        .toMatchObject({ cardinality: 3, canContainUndefs: false, variables: [ DF.variable('a'), DF.variable('l') ]});
    });

    it('should not extend bindings on erroring expressions', async() => {
      const warn = jest.fn();
      jest.spyOn(Actor, 'getContextLogger').mockImplementation(() => (<any>{ warn }));

      const op: any = { operation: example(faultyExpression), context };
      const output: IQueryOperationResultBindings = <any> await actor.run(op);

      await expect(arrayifyStream(output.bindingsStream)).resolves.toMatchObject(input);
      expect(warn).toHaveBeenCalledTimes(3);
      expect(output.type).toBe('bindings');
      await expect(output.metadata()).resolves
        .toMatchObject({ cardinality: 3, canContainUndefs: false, variables: [ DF.variable('a'), DF.variable('l') ]});
    });

    it('should emit error when evaluation code returns a hard error', async() => {
      const warn = jest.fn();
      jest.spyOn(Actor, 'getContextLogger').mockImplementation(() => (<any>{ warn }));

      Object.defineProperty(sparqlee, 'isExpressionError', { writable: true });
      // eslint-disable-next-line jest/prefer-spy-on
      (<any> sparqlee).isExpressionError = jest.fn(() => false);

      const op: any = { operation: example(faultyExpression), context };
      const output: IQueryOperationResultBindings = <any> await actor.run(op);
      await new Promise<void>((resolve, reject) => {
        output.bindingsStream.on('error', () => resolve());
        output.bindingsStream.on('data', reject);
      });
      expect(warn).toHaveBeenCalledTimes(0);
    });

    it('throws ia a variable was already bound', async() => {
      const op: any = {
        operation: {
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
          variable: { termType: 'Variable', value: 'a' },
          defaultExpression,
        },
        context,
      };
      await expect(actor.run(op)).rejects.toThrow(`Illegal binding to variable 'a' that has already been bound`);
    });
  });
});
