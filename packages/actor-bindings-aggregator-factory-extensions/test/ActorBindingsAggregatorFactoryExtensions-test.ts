import type { MediatorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import { KeysInitQuery } from '@comunica/context-entries';
import { Bus } from '@comunica/core';
import type { IActionContext, IExtensionAggregator } from '@comunica/types';
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
import { NamedAggregator } from '../lib/NamedAggregator';

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
  let aggregator: IExtensionAggregator;
  let extensionAggregator: jest.Mock<IExtensionAggregator, []>;
  const exception = 'Actor actor can only provide aggregators for extension aggregates that are provided ' +
    'through config entries like: @comunica/actor-init-query:extensionAggregatorCreator or ' +
    '@comunica/actor-init-query:extensionAggregators';

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorExpressionEvaluatorFactory = getMockMediatorExpressionEvaluatorFactory();
    aggregator = {
      put: jest.fn(),
      result: jest.fn(() => DF.literal('result')),
    };
    extensionAggregator = jest.fn(() => aggregator);
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
          .resolves.toBeInstanceOf(NamedAggregator);
        expect(extensionAggregator).toHaveBeenCalledTimes(1);
      });

      it('should put the evaluated arguments of the aggregate', async() => {
        const bindingsAggregator = await actor.run({ context, expr: makeNamedAggregate('http://example.org/median') });
        await bindingsAggregator.putBindings(BF.bindings([[ DF.variable('x'), DF.literal('1') ]]));
        await expect(bindingsAggregator.result()).resolves.toEqual(DF.literal('result'));
        expect(aggregator.put).toHaveBeenCalledWith([ DF.literal('1'), DF.literal('a') ]);
      });

      it('should apply distinct to the arguments of the aggregate', async() => {
        const bindingsAggregator = await actor.run({
          context,
          expr: makeNamedAggregate('http://example.org/median', true),
        });
        await bindingsAggregator.putBindings(BF.bindings([[ DF.variable('x'), DF.literal('1') ]]));
        await bindingsAggregator.putBindings(BF.bindings([[ DF.variable('x'), DF.literal('1') ]]));
        expect(aggregator.put).toHaveBeenCalledTimes(1);
      });

      it('should skip bindings for which an argument is unbound', async() => {
        const bindingsAggregator = await actor.run({ context, expr: makeNamedAggregate('http://example.org/median') });
        await bindingsAggregator.putBindings(BF.bindings());
        await expect(bindingsAggregator.result()).resolves.toEqual(DF.literal('result'));
        expect(aggregator.put).not.toHaveBeenCalled();
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
          .resolves.toBeInstanceOf(NamedAggregator);
        expect(extensionAggregator).toHaveBeenCalledTimes(1);
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
