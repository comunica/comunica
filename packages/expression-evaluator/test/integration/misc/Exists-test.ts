import { DataFactory } from 'rdf-data-factory';
import { template } from '../../util/Aliases';
import { generalEvaluate } from '../../util/generalEvaluation';
import fn = jest.fn;

const DF = new DataFactory();

describe('exists', () => {
  it('rus with mock existence hooks and async calls but once', async() => {
    const hookMock = fn(() => Promise.resolve(true));
    const evaluated = await generalEvaluate({
      expression: template('EXISTS {?s ?p ?o}'),
      expectEquality: true,
      legacyContext: {
        exists: hookMock,
      },
    });
    // We need to double this because of the type system tests
    expect(hookMock).toBeCalledTimes(1);
    expect(evaluated.asyncResult).toEqual(DF.literal('true', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
  });
});
