import type { MediatorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import { KeysInitQuery } from '@comunica/context-entries';
import { Bus } from '@comunica/core';
import type { ExtensionAggregator, IActionContext, IBindingsAggregator } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory } from '@comunica/utils-algebra';
import {
  BF,
  DF,
  getMockEEActionContext,
  getMockMediatorExpressionEvaluatorFactory,
  makeAggregate,
} from '@comunica/utils-jest';
import type * as RDF from '@rdfjs/types';
import { ActorBindingsAggregatorFactoryExtensions } from '../lib';

const AF = new AlgebraFactory(DF);

function makeNamedAggregate(iri: string, distinct = false): Algebra.AggregateExpression {
  return <Algebra.AggregateExpression> <unknown> {
    ...AF.createNamedExpression(DF.namedNode(iri), [
      AF.createTermExpression(DF.variable('x')),
      AF.createTermExpression(DF.literal('a')),
    ]),
    aggregate: true,
    distinct,
    variable: DF.variable('var0'),
  };
}

describe('ActorBindingsAggregatorFactoryExtensions', () => {
  let bus: any;
  let mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;
  let aggregator: IBindingsAggregator;
  let extensionAggregator: jest.Mock<ReturnType<ExtensionAggregator>, Parameters<ExtensionAggregator>>;
  const exception = 'Actor actor can only provide aggregators for extension aggregates that are provided ' +
    'through config entries like: @comunica/actor-init-query:extensionAggregatorCreator or ' +
    '@comunica/actor-init-query:extensionAggregators';

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorExpressionEvaluatorFactory = getMockMediatorExpressionEvaluatorFactory();
    aggregator = {
      putBindings: jest.fn(),
      result: jest.fn(),
    };
    extensionAggregator = jest.fn<ReturnType<ExtensionAggregator>, Parameters<ExtensionAggregator>>(() => aggregator);
  });

  describe('An ActorBindingsAggregatorFactoryExtensions instance', () => {
    let actor: ActorBindingsAggregatorFactoryExtensions;

    beforeEach(() => {
      actor = new ActorBindingsAggregatorFactoryExtensions({
        name: 'actor',
        bus,
        mediatorExpressionEvaluatorFactory,
      });
    });

    describe('with extensionAggregators', () => {
      let context: IActionContext;

      beforeEach(() => {
        context = getMockEEActionContext().set(KeysInitQuery.extensionAggregators, {
          'http://example.org/median': extensionAggregator,
        });
      });

      it('should test on a known extension aggregate', async() => {
        await expect(actor.test({ context, expr: makeNamedAggregate('http://example.org/median') }))
          .resolves.toPassTestVoid();
      });

      it('should not test on an unknown extension aggregate', async() => {
        await expect(actor.test({ context, expr: makeNamedAggregate('http://example.org/other') }))
          .resolves.toFailTest(exception);
      });

      it('should not test on a built-in aggregate', async() => {
        await expect(actor.test({ context, expr: makeAggregate('sum') }))
          .resolves.toFailTest(exception);
      });

      it('should run', async() => {
        await expect(actor.run({ context, expr: makeNamedAggregate('http://example.org/median') }))
          .resolves.toBe(aggregator);
        expect(extensionAggregator).toHaveBeenCalledWith({
          evaluateArguments: expect.any(Function),
          distinct: false,
        });
      });

      it('should run with distinct', async() => {
        await actor.run({ context, expr: makeNamedAggregate('http://example.org/median', true) });
        expect(extensionAggregator).toHaveBeenCalledWith({
          evaluateArguments: expect.any(Function),
          distinct: true,
        });
      });

      it('should run with an extension aggregate creating its aggregator asynchronously', async() => {
        extensionAggregator.mockImplementation(async() => aggregator);
        await expect(actor.run({ context, expr: makeNamedAggregate('http://example.org/median') }))
          .resolves.toBe(aggregator);
      });

      it('should evaluate the arguments of the aggregate', async() => {
        await actor.run({ context, expr: makeNamedAggregate('http://example.org/median') });
        const { evaluateArguments } = extensionAggregator.mock.calls[0][0];
        await expect(evaluateArguments(BF.bindings([[ DF.variable('x'), DF.literal('1') ]])))
          .resolves.toEqual([ DF.literal('1'), DF.literal('a') ]);
      });

      it('should reject evaluating the arguments of the aggregate for an unbound variable', async() => {
        await actor.run({ context, expr: makeNamedAggregate('http://example.org/median') });
        const { evaluateArguments } = extensionAggregator.mock.calls[0][0];
        await expect(evaluateArguments(BF.bindings())).rejects.toThrow('Unbound variable');
      });
    });

    describe('with extensionAggregatorCreator', () => {
      let context: IActionContext;
      let extensionAggregatorCreator: jest.Mock;

      beforeEach(() => {
        extensionAggregatorCreator = jest.fn((iri: RDF.NamedNode) =>
          iri.value === 'http://example.org/median' ? extensionAggregator : undefined);
        context = getMockEEActionContext()
          .set(KeysInitQuery.extensionAggregatorCreator, extensionAggregatorCreator);
      });

      it('should test on a known extension aggregate', async() => {
        await expect(actor.test({ context, expr: makeNamedAggregate('http://example.org/median') }))
          .resolves.toPassTestVoid();
        expect(extensionAggregatorCreator).toHaveBeenCalledWith(DF.namedNode('http://example.org/median'));
      });

      it('should not test on an unknown extension aggregate', async() => {
        await expect(actor.test({ context, expr: makeNamedAggregate('http://example.org/other') }))
          .resolves.toFailTest(exception);
      });

      it('should run', async() => {
        await expect(actor.run({ context, expr: makeNamedAggregate('http://example.org/median') }))
          .resolves.toBe(aggregator);
      });
    });

    describe('without extension aggregates', () => {
      it('should not test on an extension aggregate', async() => {
        await expect(actor.test({
          context: getMockEEActionContext(),
          expr: makeNamedAggregate('http://example.org/median'),
        })).resolves.toFailTest(exception);
      });
    });
  });
});
