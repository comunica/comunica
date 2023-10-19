import { BindingsFactory } from '@comunica/bindings-factory';
import { DataFactory } from 'rdf-data-factory';
import { expressionTypes, types } from 'sparqlalgebrajs/lib/algebra';
import { TypeURL as DT } from '../../../lib/util/Consts';
import * as Err from '../../../lib/util/Errors';
import { generalEvaluate } from '../../util/generalEvaluation';
import { getMockEEActionContext, getMockEEFactory } from '../../util/utils';

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('evaluation of \'bound\'', () => {
  it('\'bound\' on bounded variable returns true', async() => {
    const evaluated = await generalEvaluate({
      expression: 'SELECT * WHERE { ?s ?p ?o FILTER(BOUND(?s))}',
      expectEquality: true,
      bindings: BF.bindings([
        [ DF.variable('s'), DF.namedNode('http://example.com') ],
      ]),
    });
    expect(evaluated.asyncResult).toEqual(DF.literal('true', DF.namedNode(DT.XSD_BOOLEAN)));
  });

  it('\'bound\' on unbounded variable returns false', async() => {
    const evaluated = await generalEvaluate({
      expression: 'SELECT * WHERE { ?s ?p ?o FILTER(BOUND(?s))}', expectEquality: true,
    });
    expect(evaluated.asyncResult).toEqual(DF.literal('false', DF.namedNode(DT.XSD_BOOLEAN)));
  });

  it('\'bound\' on term returns error', async() => {
    const evaluator = getMockEEFactory().createEvaluator({
      type: types.EXPRESSION,
      expressionType: expressionTypes.OPERATOR,
      operator: 'bound',
      args: [{
        type: types.EXPRESSION,
        expressionType: expressionTypes.TERM,
        term: DF.namedNode('http://example.com'),
      }],
    }, getMockEEActionContext());
    await expect(evaluator.evaluate(BF.bindings())).rejects.toThrow(Err.InvalidArgumentTypes);
  });
});
