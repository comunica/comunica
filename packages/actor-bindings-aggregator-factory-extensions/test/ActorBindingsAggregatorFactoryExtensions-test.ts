import type { MediatorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import { KeysInitQuery } from '@comunica/context-entries';
import { Bus } from '@comunica/core';
import type { ExtensionAggregator, IActionContext, IExtensionAggregator } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import {
  BF,
  DF,
  getMockEEActionContext,
  getMockMediatorExpressionEvaluatorFactory,
  makeAggregate,
  makeNamedAggregate,
} from '@comunica/utils-jest';
import type * as RDF from '@rdfjs/types';
import { ActorBindingsAggregatorFactoryExtensions } from '../lib';
import { NamedAggregator } from '../lib/NamedAggregator';

const AF = new AlgebraFactory(DF);
const args = [ AF.createTermExpression(DF.variable('x')), AF.createTermExpression(DF.literal('a')) ];

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

    describe.each([
      [ 'extensionAggregators', (aggregate: ExtensionAggregator) => getMockEEActionContext()
        .set(KeysInitQuery.extensionAggregators, { 'http://example.org/median': aggregate }) ],
      [ 'extensionAggregatorCreator', (aggregate: ExtensionAggregator) => getMockEEActionContext()
        .set(KeysInitQuery.extensionAggregatorCreator, (iri: RDF.NamedNode) =>
          iri.value === 'http://example.org/median' ? aggregate : undefined) ],
    ])('with %s', (_, makeContext) => {
      let context: IActionContext;

      beforeEach(() => {
        context = makeContext(extensionAggregator);
      });

      it('should test on a known extension aggregate', async() => {
        const result = await actor.test({ context, expr: makeNamedAggregate('http://example.org/median', args) });
        expect(result).toPassTestVoid();
        expect(result.getSideData()).toBe(extensionAggregator);
      });

      it('should not test on an unknown extension aggregate', async() => {
        await expect(actor.test({ context, expr: makeNamedAggregate('http://example.org/other', args) }))
          .resolves.toFailTest(exception);
      });

      it('should not test on a built-in aggregate', async() => {
        await expect(actor.test({ context, expr: makeAggregate('sum') }))
          .resolves.toFailTest(exception);
      });
    });

    describe('run', () => {
      const context = getMockEEActionContext();

      it('should create an aggregator', async() => {
        await expect(actor
          .run({ context, expr: makeNamedAggregate('http://example.org/median', args) }, extensionAggregator))
          .resolves.toBeInstanceOf(NamedAggregator);
        expect(extensionAggregator).toHaveBeenCalledTimes(1);
      });

      it('should put the evaluated arguments of the aggregate', async() => {
        const bindingsAggregator = await actor
          .run({ context, expr: makeNamedAggregate('http://example.org/median', args) }, extensionAggregator);
        await bindingsAggregator.putBindings(BF.bindings([[ DF.variable('x'), DF.literal('1') ]]));
        await expect(bindingsAggregator.result()).resolves.toEqual(DF.literal('result'));
        expect(aggregator.put).toHaveBeenCalledWith([ DF.literal('1'), DF.literal('a') ]);
      });

      it('should apply distinct to the arguments of the aggregate', async() => {
        const bindingsAggregator = await actor
          .run({ context, expr: makeNamedAggregate('http://example.org/median', args, true) }, extensionAggregator);
        await bindingsAggregator.putBindings(BF.bindings([[ DF.variable('x'), DF.literal('1') ]]));
        await bindingsAggregator.putBindings(BF.bindings([[ DF.variable('x'), DF.literal('1') ]]));
        expect(aggregator.put).toHaveBeenCalledTimes(1);
      });

      it('should log a warning when the aggregate errors', async() => {
        const logWarnSpy = jest.spyOn(<any> actor, 'logWarn');
        aggregator.put = () => {
          throw new Error('put error');
        };
        const bindingsAggregator = await actor
          .run({ context, expr: makeNamedAggregate('http://example.org/median', args) }, extensionAggregator);
        await bindingsAggregator.putBindings(BF.bindings([[ DF.variable('x'), DF.literal('1') ]]));
        await expect(bindingsAggregator.result()).resolves.toBeUndefined();
        expect(logWarnSpy).toHaveBeenCalledTimes(1);
        expect(logWarnSpy).toHaveBeenCalledWith(
          context,
          'Error occurred while aggregating with extension aggregate http://example.org/median.',
          expect.any(Function),
        );
      });
    });
  });
});
