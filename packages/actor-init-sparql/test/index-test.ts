jest.mock('../lib/ActorInitSparql', () => {
  return {
    // tslint:disable:only-arrow-functions
    // tslint:disable:object-literal-shorthand
    ActorInitSparql: function() {
      return {
        mocked: true,
        name: 'urn:comunica:sparqlinit',
        query: () => ({ queried: true }),
      };
    },
  };
});

import {evaluateQuery, newEngineDynamic} from '../index';

jest.setTimeout(20000);

describe('index', () => {
  it('newEngineDynamic should return a query engine', () => {
    return expect(newEngineDynamic()).resolves.toMatchObject({ mocked: true });
  });

  it('evaluateQuery should evaluate a query', async () => {
    const context = {
      sources: ['http://fragments.dbpedia.org/2016-04/en'],
    };
    expect(await evaluateQuery('select * where { ?s ?p ?o } limit 1', context)).toEqual({ queried: true });
  });
});
