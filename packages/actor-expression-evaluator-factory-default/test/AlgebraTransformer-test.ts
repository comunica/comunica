import {
  ActorFunctionFactoryExpressionBnode,
} from '@comunica/actor-function-factory-expression-bnode';
import {
  ActorFunctionFactoryExpressionCoalesce,
} from '@comunica/actor-function-factory-expression-coalesce';
import { ActorFunctionFactoryExpressionIf } from '@comunica/actor-function-factory-expression-if';
import { ActorFunctionFactoryTermNot } from '@comunica/actor-function-factory-term-not';
import { ActorFunctionFactoryTermUnaryMinus } from '@comunica/actor-function-factory-term-unary-minus';
import { createFuncMediator } from '@comunica/bus-function-factory/test/util';
import { AlgebraFactory } from '@comunica/utils-algebra';
import * as Eval from '@comunica/utils-expression-evaluator';
import { getMockEEActionContext } from '@comunica/utils-expression-evaluator/test/util/helpers';
import { DataFactory } from 'rdf-data-factory';
import { AlgebraTransformer } from '../lib/AlgebraTransformer';

const DF = new DataFactory();
const AF = new AlgebraFactory(DF);

describe('AlgebraTransformer', () => {
  let algebraTransformer: AlgebraTransformer;
  beforeEach(() => {
    algebraTransformer = new AlgebraTransformer(
      // This basically requires the function bus.
      Eval.prepareEvaluatorActionContext(getMockEEActionContext()),
      createFuncMediator([
        args => new ActorFunctionFactoryExpressionBnode(args),
        args => new ActorFunctionFactoryExpressionIf(args),
        args => new ActorFunctionFactoryExpressionCoalesce(args),
        args => new ActorFunctionFactoryTermUnaryMinus(args),
        args => new ActorFunctionFactoryTermNot(args),
      ], {}),
    );
  });

  it('transform term', async() => {
    await expect(algebraTransformer.transformAlgebra(
      AF.createTermExpression(DF.namedNode('http://example.com')),
    )).resolves.toEqual(new Eval.NamedNode('http://example.com'));

    await expect(algebraTransformer.transformAlgebra(
      AF.createTermExpression(DF.blankNode('foo')),
    )).resolves.toEqual(new Eval.BlankNode('foo'));

    await expect(algebraTransformer.transformAlgebra(
      AF.createTermExpression(DF.literal('foo')),
    )).resolves.toEqual(new Eval.StringLiteral('foo'));

    await expect(algebraTransformer.transformAlgebra(
      AF.createTermExpression(DF.variable('foo')),
    )).resolves.toEqual(new Eval.Variable('?foo'));
  });

  it('transform bnode', async() => {
    await expect(algebraTransformer.transformAlgebra(
      AF.createOperatorExpression('bnode', []),
    )).resolves.toBeInstanceOf(Eval.Operator);
  });

  it('transform special operator bad arity', async() => {
    await expect(() => algebraTransformer.transformAlgebra(
      AF.createOperatorExpression('if', []),
    )).rejects.toThrow(Eval.InvalidArity);
  });

  it('transform special operator infinite arity', async() => {
    await expect(algebraTransformer.transformAlgebra(
      AF.createOperatorExpression('coalesce', []),
    )).resolves.toBeInstanceOf(Eval.Operator);
  });

  it('transform regular operator lower case', async() => {
    await expect(algebraTransformer.transformAlgebra(
      AF.createOperatorExpression('uminus', [ AF.createTermExpression(DF.literal('')) ]),
    )).resolves.toBeInstanceOf(Eval.Operator);
  });

  it('transform regular operator upper case', async() => {
    await expect(algebraTransformer.transformAlgebra(
      AF.createOperatorExpression('UMINUS', [ AF.createTermExpression(DF.literal('')) ]),
    )).resolves.toBeInstanceOf(Eval.Operator);
  });

  it('transform regular operator bad arity', async() => {
    await expect(() => algebraTransformer.transformAlgebra(
      AF.createOperatorExpression('!', []),
    )).rejects.toThrow(Eval.InvalidArity);
  });

  it('transform not existing operator bad arity', async() => {
    await expect(() => algebraTransformer.transformAlgebra(
      AF.createOperatorExpression('foo', []),
    )).rejects.toThrow('No actors are able to reply to a message in the bus test-bus-function-factory');
  });

  it('transform existence', async() => {
    await expect(algebraTransformer.transformAlgebra(
      AF.createExistenceExpression(false, AF.createValues([], [])),
    )).resolves.toEqual(new Eval.Existence(
      AF.createExistenceExpression(false, AF.createValues([], [])),
    ));
  });

  it('transform aggregate', async() => {
    await expect(algebraTransformer.transformAlgebra(
      AF.createAggregateExpression('count', AF.createTermExpression(DF.variable('a')), false),
    )).resolves.toEqual(new Eval.Aggregate('count', AF.createAggregateExpression(
      'count',
      AF.createTermExpression(DF.variable('a')),
      false,
    )));
  });

  it('transform wildcard', async() => {
    await expect(algebraTransformer.transformAlgebra(
      AF.createWildcardExpression(),
    )).resolves.toEqual(new Eval.NamedNode('*'));
  });

  it('throws on unknown expression type', async() => {
    const notWildcard = AF.createWildcardExpression();
    notWildcard.subType = <any> 'unknown type';
    await expect(async() => await algebraTransformer.transformAlgebra(notWildcard))
      .rejects.toThrow('unknown type cannot be converted into internal representation of expression.');
  });
});
