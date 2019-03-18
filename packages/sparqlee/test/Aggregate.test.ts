import { testAll } from './util/utils';

describe.skip('aggregates', () => {
  testAll([
    'avg(?a) = "3.14"^^xsd:float',
  ]);
});
