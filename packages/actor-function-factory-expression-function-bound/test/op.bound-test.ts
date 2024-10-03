import type { MediatorFunctionFactory } from '@comunica/bus-function-factory';
import { createFuncMediator } from '@comunica/bus-function-factory/test/util';
import * as Eval from '@comunica/expression-evaluator';
import { generalEvaluate } from '@comunica/expression-evaluator/test/util/generalEvaluation';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { getMockEEActionContext, getMockEEFactory } from '@comunica/utils-jest';
import { DataFactory } from 'rdf-data-factory';
import { expressionTypes, types } from 'sparqlalgebrajs/lib/algebra';
import { ActorFunctionFactoryExpressionFunctionBound } from '../lib';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

describe('evaluation of \'bound\'', () => {
  let mediatorFunctionFactory: MediatorFunctionFactory;

  beforeEach(() => {
    mediatorFunctionFactory = createFuncMediator([
      args => new ActorFunctionFactoryExpressionFunctionBound(args),
    ], {});
  });

  it('\'bound\' on bounded variable returns true', async() => {
    const evaluated = await generalEvaluate({
      expression: 'SELECT * WHERE { ?s ?p ?o FILTER(BOUND(?s))}',
      exprEvalFactory: getMockEEFactory({
        mediatorFunctionFactory,
      }),
      bindings: BF.bindings([
        [ DF.variable('s'), DF.namedNode('http://example.com') ],
      ]),
    });
    expect(evaluated.asyncResult).toEqual(DF.literal('true', DF.namedNode(Eval.TypeURL.XSD_BOOLEAN)));
  });

  it('\'bound\' on unbounded variable returns false', async() => {
    const evaluated = await generalEvaluate({
      expression: 'SELECT * WHERE { ?s ?p ?o FILTER(BOUND(?s))}',
      exprEvalFactory: getMockEEFactory({
        mediatorFunctionFactory,
      }),
    });
    expect(evaluated.asyncResult).toEqual(DF.literal('false', DF.namedNode(Eval.TypeURL.XSD_BOOLEAN)));
  });

  it('\'bound\' on term returns error', async() => {
    const evaluator = await getMockEEFactory({
      mediatorFunctionFactory,
    }).run({
      algExpr: {
        type: types.EXPRESSION,
        expressionType: expressionTypes.OPERATOR,
        operator: 'bound',
        args: [{
          type: types.EXPRESSION,
          expressionType: expressionTypes.TERM,
          term: DF.namedNode('http://example.com'),
        }],
      },
      context: getMockEEActionContext(),
    }, undefined);
    await expect(evaluator.evaluate(BF.bindings())).rejects.toThrow(Eval.InvalidArgumentTypes);
  });
});
