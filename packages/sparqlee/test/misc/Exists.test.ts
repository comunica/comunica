import { DataFactory } from 'rdf-data-factory';
import { template } from '../util/Aliases';
import { generalEvaluate } from '../util/generalEvaluation';
import fn = jest.fn;

const DF = new DataFactory();

describe('exists', () => {
  it('runs with mock existence hooks', async() => {
    const hookMock = fn(() => true);
    const evaluated = await generalEvaluate({
      expression: template('EXISTS {?s ?p ?o}'),
      expectEquality: true,
      generalEvaluationConfig: {
        type: 'sync',
        config: {
          exists: hookMock,
        },
      },
    });
    // Called 2 times (once by sync and once by async)
    // We will check if async truly cals only once.
    expect(hookMock).toBeCalledTimes(2);
    expect(evaluated.asyncResult).toEqual(DF.literal('true', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
  });
  it('rus with mock existence hooks and async calls but once', async() => {
    const hookMock = fn(() => Promise.resolve(true));
    const evaluated = await generalEvaluate({
      expression: template('EXISTS {?s ?p ?o}'),
      expectEquality: true,
      generalEvaluationConfig: {
        type: 'async',
        config: {
          exists: hookMock,
        },
      },
    });
    expect(hookMock).toBeCalledTimes(1);
    expect(evaluated.asyncResult).toEqual(DF.literal('true', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
  });
});
