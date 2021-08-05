import { DataFactory } from 'rdf-data-factory';
import { generalEvaluate } from '../util/generalEvaluation';
import { template } from '../util/utils';

const DF = new DataFactory();

describe.skip('exists', () => {
  it('runs with mock existence hooks', async() => {
    const evaluated = await generalEvaluate({
      expression: template('EXISTS {?s ?p ?o}'), expectEquality: true,
    });
    expect(evaluated.asyncResult).toEqual(DF.literal('true', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
  });
});
