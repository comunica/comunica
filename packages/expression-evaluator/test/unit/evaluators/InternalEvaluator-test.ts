import { BindingsFactory } from '@comunica/bindings-factory';
import type { ActorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import { getMockEEActionContext, getMockEEFactory } from '@comunica/jest';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

describe('MaterializedEvaluatorContext', () => {
  let mediatorQueryOperation: any;

  let expressionEvaluatorFactory: ActorExpressionEvaluatorFactory;
  let factory: Factory;

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
    expressionEvaluatorFactory = getMockEEFactory({
      mediatorQueryOperation,
    });
    factory = new Factory();
  });

  describe('should be able to handle EXIST filters', () => {
    it('like a simple EXIST that is true', async() => {
      const expr: Algebra.ExistenceExpression = factory.createExistenceExpression(
        false,
        factory.createBgp([]),
      );
      const evaluator = await expressionEvaluatorFactory.run({
        algExpr: expr,
        context: getMockEEActionContext(),
      });
      const result = evaluator.evaluateAsEBV(BF.bindings());
      await expect(result).resolves.toBe(true);
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
      const evaluator = await expressionEvaluatorFactory.run({
        algExpr: expr,
        context: getMockEEActionContext(),
      });
      const result = evaluator.evaluateAsEBV(BF.bindings());
      await expect(result).resolves.toBe(false);
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
      const evaluator = await expressionEvaluatorFactory.run({
        algExpr: expr,
        context: getMockEEActionContext(),
      });
      const result = evaluator.evaluateAsEBV(BF.bindings());
      await expect(result).resolves.toBe(true);
    });

    it('like an EXIST that errors', async() => {
      const bindingsStream = new ArrayIterator([{}, {}, {}]).transform({
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
      const evaluator = await expressionEvaluatorFactory.run({
        algExpr: expr,
        context: getMockEEActionContext(),
      });
      await expect(evaluator.evaluateAsEBV(BF.bindings())).rejects.toBeTruthy();
    });
  });
});
