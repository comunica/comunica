import { NamedExtension } from '@comunica/actor-function-factory-wrapper-all/lib/implementation/NamedExtension';
import {
  sparqlFunctions,
  namedFunctions,
} from '@comunica/actor-function-factory-wrapper-all/lib/implementation/SparqlFunctions';
import { createFuncMediator } from '@comunica/actor-function-factory-wrapper-all/test/util';
import type { IExpressionFunction, MediatorFunctionFactory } from '@comunica/bus-function-factory';
import * as Eval from '@comunica/expression-evaluator';
import { getMockEEActionContext, getMockEEFactory } from '@comunica/jest';
import { DataFactory } from 'rdf-data-factory';
import { expressionTypes, types } from 'sparqlalgebrajs/lib/algebra';
import { Wildcard } from 'sparqljs';
import { AlgebraTransformer } from '../lib/AlgebraTransformer';

const DF = new DataFactory();

describe('AlgebraTransformer', () => {
  let algebraTransformer: AlgebraTransformer;
  beforeEach(() => {
    const factory = getMockEEFactory({ mediatorFunctionFactory: <MediatorFunctionFactory> {
      async mediate({ functionName }) {
        const res: IExpressionFunction | undefined = {
          ...sparqlFunctions,
          ...namedFunctions,
        }[functionName];
        if (res) {
          return res;
        }
        return new NamedExtension(functionName, async() => DF.namedNode('http://example.com'));
      },
    }});
    algebraTransformer = new AlgebraTransformer(
      // This basically requires the function bus.
      Eval.prepareEvaluatorActionContext(getMockEEActionContext()),
      createFuncMediator(),
    );
  });

  it('transform term', async() => {
    await expect(algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.TERM,
      term: DF.namedNode('http://example.com'),
    })).resolves.toEqual(new Eval.NamedNode('http://example.com'));

    await expect(algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.TERM,
      term: DF.blankNode('foo'),
    })).resolves.toEqual(new Eval.BlankNode('foo'));

    await expect(algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.TERM,
      term: DF.literal('foo'),
    })).resolves.toEqual(new Eval.StringLiteral('foo'));

    await expect(algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.TERM,
      term: DF.variable('foo'),
    })).resolves.toEqual(new Eval.Variable('?foo'));
  });

  it('transform special operator upper case', async() => {
    await expect(algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.OPERATOR,
      operator: 'BNODE',
      args: [],
    })).resolves.toBeInstanceOf(Eval.Operator);
  });

  it('transform special operator lower case', async() => {
    await expect(algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.OPERATOR,
      operator: 'bnode',
      args: [],
    })).resolves.toBeInstanceOf(Eval.Operator);
  });

  it('transform special operator bad arity', async() => {
    await expect(() => algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.OPERATOR,
      operator: 'if',
      args: [],
    })).rejects.toThrow(Eval.InvalidArity);
  });

  it('transform special operator infinite arity', async() => {
    await expect(algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.OPERATOR,
      operator: 'coalesce',
      args: [],
    })).resolves.toBeInstanceOf(Eval.Operator);
  });

  it('transform regular operator lower case', async() => {
    await expect(algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.OPERATOR,
      operator: 'uminus',
      args: [{
        type: types.EXPRESSION,
        expressionType: expressionTypes.TERM,
        term: DF.literal(''),
      }],
    })).resolves.toBeInstanceOf(Eval.Operator);
  });

  it('transform regular operator upper case', async() => {
    await expect(algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.OPERATOR,
      operator: 'UMINUS',
      args: [{
        type: types.EXPRESSION,
        expressionType: expressionTypes.TERM,
        term: DF.literal(''),
      }],
    })).resolves.toBeInstanceOf(Eval.Operator);
  });

  it('transform regular operator bad arity', async() => {
    await expect(() => algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.OPERATOR,
      operator: '!',
      args: [],
    })).rejects.toThrow(Eval.InvalidArity);
  });

  it('transform not existing operator bad arity', async() => {
    await expect(() => algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.OPERATOR,
      operator: 'foo',
      args: [],
    })).rejects.toThrow(Eval.UnknownOperator);
  });

  it('transform existence', async() => {
    await expect(algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.EXISTENCE,
      not: false,
      input: {
        type: types.VALUES,
        variables: [],
        bindings: [],
      },
    })).resolves.toEqual(new Eval.Existence({
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
    await expect(algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.AGGREGATE,
      aggregator: 'count',
      distinct: false,
      expression: {
        type: types.EXPRESSION,
        expressionType: expressionTypes.TERM,
        term: DF.variable('a'),
      },
    })).resolves.toEqual(new Eval.Aggregate('count', {
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
    await expect(algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.WILDCARD,
      wildcard: new Wildcard(),
    })).resolves.toEqual(new Eval.NamedNode('*'));
  });
});
