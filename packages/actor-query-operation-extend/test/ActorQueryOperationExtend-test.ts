import { ActorFunctionFactoryTermAddition } from '@comunica/actor-function-factory-term-addition';
import { ActorFunctionFactoryTermStrLen } from '@comunica/actor-function-factory-term-str-len';
import type {
  MediatorExpressionEvaluatorFactory,
} from '@comunica/bus-expression-evaluator-factory';
import { createFuncMediator } from '@comunica/bus-function-factory/test/util';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { Actor, Bus } from '@comunica/core';
import type { IActionContext, IQueryOperationResultBindings } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import * as sparqlee from '@comunica/utils-expression-evaluator';
import {
  getMockEEActionContext,
  getMockMediatorExpressionEvaluatorFactory,
} from '@comunica/utils-expression-evaluator/test/util/helpers';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import '@comunica/utils-jest';
import { ActorQueryOperationExtend } from '../lib';

const DF = new DataFactory();
const BF = new BindingsFactory(DF, {});
const AF = new AlgebraFactory(DF);

describe('ActorQueryOperationExtend', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;
  let context: IActionContext;

  const example = (expression: any) => AF.createExtend(
    AF.createBgp([ AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')) ]),
    DF.variable('l'),
    expression,
  );

  const defaultExpression = AF.createOperatorExpression('strlen', [ AF.createTermExpression(DF.variable('a')) ]);

  // We sum 2 strings, which should error
  const faultyExpression = AF.createOperatorExpression(
    '+',
    [ AF.createTermExpression(DF.variable('a')), AF.createTermExpression(DF.variable('a')) ],
  );

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
        metadata: () => Promise.resolve({
          cardinality: 3,
          variables: [{ variable: DF.variable('a'), canBeUndef: false }],
        }),
        operated: arg,
        type: 'bindings',
      }),
    };
    mediatorExpressionEvaluatorFactory = getMockMediatorExpressionEvaluatorFactory({
      mediatorQueryOperation,
      mediatorFunctionFactory: createFuncMediator([
        args => new ActorFunctionFactoryTermStrLen(args),
        args => new ActorFunctionFactoryTermAddition(args),
      ], {}),
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
      await expect(actor.test(op)).resolves.toPassTestVoid();
    });

    it('should not test on non-extend', async() => {
      const op: any = { operation: { type: 'some-other-type' }, context };
      await expect(actor.test(op)).resolves.toFailTest(`Actor actor only supports extend operations, but got some-other-type`);
    });

    it('should test but not run on unsupported operators', async() => {
      const op: any = {
        operation: AF.createExtend(
          AF.createBgp([ AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')) ]),
          DF.variable('l'),
          AF.createOperatorExpression('DUMMY', []),
        ),
        context,
      };
      await expect(actor.test(op)).resolves.toPassTestVoid();
      await expect(actor.run(op, undefined)).rejects.toThrow(
        `No actors are able to reply to a message`,
      );
    });

    it('should run', async() => {
      const op: any = { operation: example(defaultExpression), context };
      const output: IQueryOperationResultBindings = <any> await actor.run(op, undefined);
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
        .toMatchObject({ cardinality: 3, variables: [
          { variable: DF.variable('a'), canBeUndef: false },
          { variable: DF.variable('l'), canBeUndef: false },
        ]});
    });

    it('should not extend bindings on erroring expressions', async() => {
      const warn = jest.fn();
      jest.spyOn(Actor, 'getContextLogger').mockImplementation(() => (<any>{ warn }));

      const op: any = { operation: example(faultyExpression), context };
      const output: IQueryOperationResultBindings = <any> await actor.run(op, undefined);

      await expect(arrayifyStream(output.bindingsStream)).resolves.toMatchObject(input);
      expect(warn).toHaveBeenCalledTimes(3);
      expect(output.type).toBe('bindings');
      await expect(output.metadata()).resolves
        .toMatchObject({ cardinality: 3, variables: [
          { variable: DF.variable('a'), canBeUndef: false },
          { variable: DF.variable('l'), canBeUndef: false },
        ]});
    });

    it('should emit error when evaluation code returns a hard error', async() => {
      const warn = jest.fn();
      jest.spyOn(Actor, 'getContextLogger').mockImplementation(() => (<any>{ warn }));

      Object.defineProperty(sparqlee, 'isExpressionError', { writable: true });
      // eslint-disable-next-line jest/prefer-spy-on
      (<any> sparqlee).isExpressionError = jest.fn(() => false);

      const op: any = { operation: example(faultyExpression), context };
      const output: IQueryOperationResultBindings = <any> await actor.run(op, undefined);
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
      await expect(actor.run(op, undefined)).rejects.toThrow(`Illegal binding to variable 'a' that has already been bound`);
    });
  });
});
