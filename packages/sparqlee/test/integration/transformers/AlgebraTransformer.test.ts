import { DataFactory } from 'rdf-data-factory';
import { expressionTypes, types } from 'sparqlalgebrajs/lib/algebra';
import { Wildcard } from 'sparqljs';
import * as E from '../../../lib/expressions';
import { AlgebraTransformer } from '../../../lib/transformers/AlgebraTransformer';
import * as Err from '../../../lib/util/Errors';
import { getDefaultSharedContext } from '../../util/utils';

const DF = new DataFactory();

describe('AlgebraTransformer', () => {
  let algebraTransformer: AlgebraTransformer;
  beforeEach(() => {
    algebraTransformer = new AlgebraTransformer({
      creator: _ => args => DF.namedNode('http://example.com'),
      type: 'sync',
      ...getDefaultSharedContext(),
    });
  });

  it('transform term', () => {
    expect(algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.TERM,
      term: DF.namedNode('http://example.com'),
    })).toEqual(new E.NamedNode('http://example.com'));

    expect(algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.TERM,
      term: DF.blankNode('foo'),
    })).toEqual(new E.BlankNode('foo'));

    expect(algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.TERM,
      term: DF.literal('foo'),
    })).toEqual(new E.StringLiteral('foo'));

    expect(algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.TERM,
      term: DF.variable('foo'),
    })).toEqual(new E.Variable('?foo'));
  });

  it('transform special operator', () => {
    expect(algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.OPERATOR,
      operator: 'BNODE',
      args: [],
    })).toBeInstanceOf(E.SpecialOperator);
  });

  it('transform special operator bad arity', () => {
    expect(() => algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.OPERATOR,
      operator: 'if',
      args: [],
    })).toThrow(Err.InvalidArity);
  });

  it('transform special operator infinite arity', () => {
    expect(algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.OPERATOR,
      operator: 'coalesce',
      args: [],
    })).toBeInstanceOf(E.SpecialOperator);
  });

  it('transform regular operator', () => {
    expect(algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.OPERATOR,
      operator: '!',
      args: [{
        type: types.EXPRESSION,
        expressionType: expressionTypes.TERM,
        term: DF.literal(''),
      }],
    })).toBeInstanceOf(E.Operator);
  });

  it('transform regular operator bad arity', () => {
    expect(() => algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.OPERATOR,
      operator: '!',
      args: [],
    })).toThrow(Err.InvalidArity);
  });

  it('transform not existing operator bad arity', () => {
    expect(() => algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.OPERATOR,
      operator: 'foo',
      args: [],
    })).toThrow(Err.UnknownOperator);
  });

  it('transform existence', () => {
    expect(algebraTransformer.transformAlgebra({
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

  it('transform aggregate', () => {
    expect(algebraTransformer.transformAlgebra({
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

  it('transform wildcard', () => {
    expect(algebraTransformer.transformAlgebra({
      type: types.EXPRESSION,
      expressionType: expressionTypes.WILDCARD,
      wildcard: new Wildcard(),
    })).toEqual(new E.NamedNode('*'));
  });
});
