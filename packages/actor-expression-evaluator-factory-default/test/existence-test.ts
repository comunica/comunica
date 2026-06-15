import type { ActorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
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
});
