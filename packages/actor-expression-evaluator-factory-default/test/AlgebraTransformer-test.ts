import { AlgebraTransformer } from '@comunica/actor-expression-evaluator-factory-default/lib/AlgebraTransformer';
import { NamedExtension } from '@comunica/actor-function-factory-wrapper-all/lib/implementation/NamedExtension';
import { namedFunctions } from '@comunica/actor-function-factory-wrapper-all/lib/implementation/NamedFunctions';
import { regularFunctions } from '@comunica/actor-function-factory-wrapper-all/lib/implementation/RegularFunctions';
import { specialFunctions } from '@comunica/actor-function-factory-wrapper-all/lib/implementation/SpecialFunctions';
import { createFuncMediator } from '@comunica/actor-function-factory-wrapper-all/test/util';
import type { IExpressionFunction, MediatorFunctionFactory } from '@comunica/bus-function-factory';
import * as E from '@comunica/expression-evaluator/lib/expressions';
import type * as C from '@comunica/expression-evaluator/lib/util/Consts';
import { prepareEvaluatorActionContext } from '@comunica/expression-evaluator/lib/util/Context';
import * as Err from '@comunica/expression-evaluator/lib/util/Errors';
import { getMockEEActionContext, getMockEEFactory } from '@comunica/jest';
import { DataFactory } from 'rdf-data-factory';
import { expressionTypes, types } from 'sparqlalgebrajs/lib/algebra';
import { Wildcard } from 'sparqljs';

const DF = new DataFactory();

describe('AlgebraTransformer', () => {
  let algebraTransformer: AlgebraTransformer;
  beforeEach(() => {
    const factory = getMockEEFactory({ mediatorFunctionFactory: <MediatorFunctionFactory> {
      async mediate({ functionName }) {
        const res: IExpressionFunction | undefined = {
          ...regularFunctions,
          ...specialFunctions,
          ...namedFunctions,
        }[<C.NamedOperator | C.Operator> functionName];
        if (res) {
          return res;
        }
        return new NamedExtension(functionName, async() => DF.namedNode('http://example.com'));
      },
    }});
    algebraTransformer = new AlgebraTransformer(
      // This basically requires the function bus.
      prepareEvaluatorActionContext(getMockEEActionContext()),
      createFuncMediator(),
    );
  });

  it('transform term', async() => {
    expect(await algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.TERM,
      term: DF.namedNode('http://example.com'),
    })).toEqual(new E.NamedNode('http://example.com'));

    expect(await algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.TERM,
      term: DF.blankNode('foo'),
    })).toEqual(new E.BlankNode('foo'));

    expect(await algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.TERM,
      term: DF.literal('foo'),
    })).toEqual(new E.StringLiteral('foo'));

    expect(await algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.TERM,
      term: DF.variable('foo'),
    })).toEqual(new E.Variable('?foo'));
  });

  it('transform special operator upper case', async() => {
    expect(await algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.OPERATOR,
      operator: 'BNODE',
      args: [],
    })).toBeInstanceOf(E.SpecialOperator);
  });

  it('transform special operator lower case', async() => {
    expect(await algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.OPERATOR,
      operator: 'bnode',
      args: [],
    })).toBeInstanceOf(E.SpecialOperator);
  });

  it('transform special operator bad arity', async() => {
    await expect(() => algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.OPERATOR,
      operator: 'if',
      args: [],
    })).rejects.toThrow(Err.InvalidArity);
  });

  it('transform special operator infinite arity', async() => {
    expect(await algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.OPERATOR,
      operator: 'coalesce',
      args: [],
    })).toBeInstanceOf(E.SpecialOperator);
  });

  it('transform regular operator lower case', async() => {
    expect(await algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.OPERATOR,
      operator: 'uminus',
      args: [{
        type: types.EXPRESSION,
        expressionType: expressionTypes.TERM,
        term: DF.literal(''),
      }],
    })).toBeInstanceOf(E.Operator);
  });

  it('transform regular operator upper case', async() => {
    expect(await algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.OPERATOR,
      operator: 'UMINUS',
      args: [{
        type: types.EXPRESSION,
        expressionType: expressionTypes.TERM,
        term: DF.literal(''),
      }],
    })).toBeInstanceOf(E.Operator);
  });

  it('transform regular operator bad arity', async() => {
    await expect(() => algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.OPERATOR,
      operator: '!',
      args: [],
    })).rejects.toThrow(Err.InvalidArity);
  });

  it('transform not existing operator bad arity', async() => {
    await expect(() => algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.OPERATOR,
      operator: 'foo',
      args: [],
    })).rejects.toThrow(Err.UnknownOperator);
  });

  it('transform existence', async() => {
    expect(await algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.EXISTENCE,
      not: false,
      input: {
        type: types.VALUES,
        variables: [],
        bindings: [],
      },
    })).toEqual(new E.Existence({
      type: types.EXPRESSION,
      expressionType: expressionTypes.EXISTENCE,
      not: false,
      input: {
        type: types.VALUES,
        variables: [],
        bindings: [],
      },
    }));
  });

  it('transform aggregate', async() => {
    expect(await algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.AGGREGATE,
      aggregator: 'count',
      distinct: false,
      expression: {
        type: types.EXPRESSION,
        expressionType: expressionTypes.TERM,
        term: DF.variable('a'),
      },
    })).toEqual(new E.Aggregate('count', {
      type: types.EXPRESSION,
      expressionType: expressionTypes.AGGREGATE,
      aggregator: 'count',
      distinct: false,
      expression: {
        type: types.EXPRESSION,
        expressionType: expressionTypes.TERM,
        term: DF.variable('a'),
      },
    }));
  });

  it('transform wildcard', async() => {
    expect(await algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.WILDCARD,
      wildcard: new Wildcard(),
    })).toEqual(new E.NamedNode('*'));
  });
});
