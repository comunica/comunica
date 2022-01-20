jest.mock('../lib/ActorInitSparql', () => {
  return {
    // eslint-disable-next-line object-shorthand
    ActorInitSparql: function() {
      return {
        mocked: true,
        name: 'urn:comunica:default:init/actors#sparql',
        query: () => ({ queried: true }),
      };
    },
  };
});

jest.mock('../engine-default.js', () => {
  return {
    mocked: true,
    name: 'urn:comunica:default:init/actors#sparql',
    query: () => ({ queried: true }),
  };
});

import { newEngine, newEngineDynamic, bindingsStreamToGraphQl, ActorInitSparql } from '..';

jest.setTimeout(30_000);

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

  it('ActorInitSparql to be a class', () => {
    return expect(ActorInitSparql).toBeInstanceOf(Function);
  });
});
