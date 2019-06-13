import {evaluateQuery, newEngineDynamic} from '../index';
import {ActorInitSparql} from "../lib/ActorInitSparql";

jest.setTimeout(20000);

describe('index', () => {
  it('newEngineDynamic should return a query engine', () => {
    return expect(newEngineDynamic()).resolves.toBeInstanceOf(ActorInitSparql);
  });

  it('evaluateQuery should evaluate a query', () => {
    const context = {
      sources: [
        { type: 'sparql', value: 'http://fragments.dbpedia.org/2016-04/en' },
      ],
    };
    return expect(evaluateQuery('select * where { ?s ?p ?o } limit 1', context))
      .resolves.toMatchObject({
        type: 'bindings',
        variables: ['?s', '?p', '?o'],
      });
  });
});
