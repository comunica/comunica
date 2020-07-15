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

jest.mock('../engine-default.js', () => {
  return {
    mocked: true,
    name: 'urn:comunica:sparqlinit',
    query: () => ({ queried: true }),
  };
});

import {evaluateQuery, newEngine, newEngineDynamic, bindingsStreamToGraphQl} from '../index';

jest.setTimeout(30000);

describe('index', () => {
  it('bindingsStreamToGraphQl to be a function', () => {
    return expect(bindingsStreamToGraphQl).toBeInstanceOf(Function);
  });

  it('newEngine should return a query engine', () => {
    return expect(newEngine()).toMatchObject({ mocked: true });
  });

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
