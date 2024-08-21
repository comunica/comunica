import { BindingsFactory } from '@comunica/bindings-factory';
import { TypeURL as DT } from '@comunica/expression-evaluator/lib/util/Consts';
import * as Err from '@comunica/expression-evaluator/lib/util/Errors';
import { generalEvaluate } from '@comunica/expression-evaluator/test/util/generalEvaluation';
import { getMockEEActionContext, getMockEEFactory } from '@comunica/jest';
import { DataFactory } from 'rdf-data-factory';
import { expressionTypes, types } from 'sparqlalgebrajs/lib/algebra';
import { createFuncMediator } from '../util';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

describe('evaluation of \'bound\'', () => {
  it('\'bound\' on bounded variable returns true', async() => {
    const evaluated = await generalEvaluate({
      expression: 'SELECT * WHERE { ?s ?p ?o FILTER(BOUND(?s))}',
      expectEquality: true,
      exprEvalFactory: getMockEEFactory({
        mediatorFunctionFactory: createFuncMediator(),
      }),
      bindings: BF.bindings([
        [ DF.variable('s'), DF.namedNode('http://example.com') ],
      ]),
    });
    expect(evaluated.asyncResult).toEqual(DF.literal('true', DF.namedNode(DT.XSD_BOOLEAN)));
  });

  it('\'bound\' on unbounded variable returns false', async() => {
    const evaluated = await generalEvaluate({
      expression: 'SELECT * WHERE { ?s ?p ?o FILTER(BOUND(?s))}',
      expectEquality: true,
      exprEvalFactory: getMockEEFactory({
        mediatorFunctionFactory: createFuncMediator(),
      }),
    });
    expect(evaluated.asyncResult).toEqual(DF.literal('false', DF.namedNode(DT.XSD_BOOLEAN)));
  });

  it('\'bound\' on term returns error', async() => {
    const evaluator = await getMockEEFactory({
      mediatorFunctionFactory: createFuncMediator(),
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
    });
    await expect(evaluator.evaluate(BF.bindings())).rejects.toThrow(Err.InvalidArgumentTypes);
  });
});
