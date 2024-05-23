import { DataFactory } from 'rdf-data-factory';
import { template } from '../../util/Aliases';
import { generalEvaluate } from '../../util/generalEvaluation';
import fn = jest.fn;

const DF = new DataFactory();

// eslint-disable-next-line jest/no-disabled-tests
describe.skip('exists', () => {
  it('runs and async calls but once', async() => {
    const hookMock = fn(() => Promise.resolve(true));
    const evaluated = await generalEvaluate({
      expression: template('EXISTS {?s ?p ?o}'),
      expectEquality: true,
    });
    // We need to double this because of the type system tests
    expect(hookMock).toHaveBeenCalledTimes(1);
    expect(evaluated.asyncResult).toEqual(DF.literal('true', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
  });
});
