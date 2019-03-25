import * as RDFDM from '@rdfjs/data-model';
import { evaluate } from '../../util/Util';

describe('exists', () => {
  it('runs with mock existence hooks', () => {
    expect(evaluate('EXISTS {?s ?p ?o}'))
      .resolves
      .toEqual(RDFDM.literal('true', RDFDM.namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
  });
});
