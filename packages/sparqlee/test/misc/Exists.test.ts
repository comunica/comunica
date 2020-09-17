import {DataFactory} from 'rdf-data-factory';
import { evaluate } from '../util/utils';

const DF = new DataFactory();

describe.skip('exists', () => {
  it('runs with mock existence hooks', () => {
    return expect(evaluate('EXISTS {?s ?p ?o}'))
      .resolves
      .toEqual(DF.literal('true', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
  });
});
