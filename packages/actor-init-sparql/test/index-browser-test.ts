jest.mock('../lib/ActorInitSparql', () => {
  return {
    // eslint-disable-next-line object-shorthand
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

import { newEngine, bindingsStreamToGraphQl, ActorInitSparql } from '../lib/index-browser';

jest.setTimeout(30_000);

describe('index', () => {
  it('bindingsStreamToGraphQl to be a function', () => {
    return expect(bindingsStreamToGraphQl).toBeInstanceOf(Function);
  });

  it('newEngine should return a query engine', () => {
    return expect(newEngine()).toMatchObject({ mocked: true });
  });

  it('ActorInitSparql to be a class', () => {
    return expect(ActorInitSparql).toBeInstanceOf(Function);
  });
});
