import type { ActorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import { KeysExpressionEvaluator } from '@comunica/context-entries';
import type { IActionContext } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import type { Algebra } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { getMockEEActionContext, getMockEEFactory } from '@comunica/utils-jest';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';

const DF = new DataFactory();
const BF = new BindingsFactory(DF, {});

describe('should be able to handle EXIST filters', () => {
  let factory: AlgebraFactory;
  let evaluatorFactory: ActorExpressionEvaluatorFactory;
  let context: IActionContext;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false, variables: [ DF.variable('a') ]}),
        operated: arg,
        type: 'bindings',
      }),
    };

    factory = new AlgebraFactory();
    evaluatorFactory = getMockEEFactory({ mediatorQueryOperation });
    context = getMockEEActionContext();
  });

  it('like a simple EXIST that is true', async() => {
    const expr: Algebra.ExistenceExpression = factory.createExistenceExpression(
      false,
      factory.createBgp([]),
    );
    const evaluator = await evaluatorFactory.run({ context, algExpr: expr }, undefined);
    await expect(evaluator.evaluateAsEBV(BF.bindings())).resolves.toBe(true);
  });

  it('like a simple EXIST that is false', async() => {
    mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
      bindingsStream: new ArrayIterator([], { autoStart: false }),
      metadata: () => Promise.resolve({ cardinality: 0, canContainUndefs: false }),
      operated: arg,
      type: 'bindings',
      variables: [ DF.variable('a') ],
    });
    const expr: Algebra.ExistenceExpression = factory.createExistenceExpression(
      false,
      factory.createBgp([]),
    );
    const evaluator = await evaluatorFactory.run({ context, algExpr: expr }, undefined);
    await expect(evaluator.evaluateAsEBV(BF.bindings())).resolves.toBe(false);
  });

  it('like a NOT EXISTS', async() => {
    mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
      bindingsStream: new ArrayIterator([], { autoStart: false }),
      metadata: () => Promise.resolve({ cardinality: 0, canContainUndefs: false }),
      operated: arg,
      type: 'bindings',
      variables: [ DF.variable('a') ],
    });
    const expr: Algebra.ExistenceExpression = factory.createExistenceExpression(
      true,
      factory.createBgp([]),
    );
    const evaluator = await evaluatorFactory.run({ context, algExpr: expr }, undefined);
    await expect(evaluator.evaluateAsEBV(BF.bindings())).resolves.toBe(true);
  });

  it('like an EXIST that errors', async() => {
    const bindingsStream = new ArrayIterator([{}, {}, {}], { autoStart: false }).transform({
      autoStart: false,
      transform(item, done, push) {
        push(item);
        bindingsStream.emit('error', 'Test error');
        done();
      },
    });
    mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
      bindingsStream,
      metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false }),
      operated: arg,
      type: 'bindings',
      variables: [ DF.variable('a') ],
    });
    const expr: Algebra.ExistenceExpression = factory.createExistenceExpression(
      false,
      factory.createBgp([]),
    );
    const evaluator = await evaluatorFactory.run({ context, algExpr: expr }, undefined);
    await expect(evaluator.evaluateAsEBV(BF.bindings())).rejects.toBeTruthy();
  });

  describe('with an existenceResolver in the context', () => {
    let existenceResolver: jest.Mock;

    beforeEach(() => {
      existenceResolver = jest.fn().mockResolvedValue(true);
      context = context.set(KeysExpressionEvaluator.existenceResolver, existenceResolver);
      mediatorQueryOperation.mediate = () => {
        throw new Error('mediatorQueryOperation must not be reached');
      };
    });

    it('delegates to the resolver, without materializing the operation', async() => {
      const expr = factory.createExistenceExpression(false, factory.createBgp([]));
      const bindings = BF.bindings([[ DF.variable('a'), DF.literal('1') ]]);

      const evaluator = await evaluatorFactory.run({ context, algExpr: expr }, undefined);
      await expect(evaluator.evaluateAsEBV(bindings)).resolves.toBe(true);
      expect(existenceResolver).toHaveBeenCalledWith(expr, bindings);
    });

    it('leaves the not flag to the resolver', async() => {
      existenceResolver.mockResolvedValue(false);
      const expr = factory.createExistenceExpression(true, factory.createBgp([]));

      const evaluator = await evaluatorFactory.run({ context, algExpr: expr }, undefined);
      await expect(evaluator.evaluateAsEBV(BF.bindings())).resolves.toBe(false);
    });

    it('propagates errors thrown by the resolver', async() => {
      existenceResolver.mockRejectedValue(new Error('Resolver error'));
      const expr = factory.createExistenceExpression(false, factory.createBgp([]));

      const evaluator = await evaluatorFactory.run({ context, algExpr: expr }, undefined);
      await expect(evaluator.evaluateAsEBV(BF.bindings())).rejects.toThrow('Resolver error');
    });
  });
});
