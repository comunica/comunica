import { testAll } from './util/utils';

describe('aggregates', () => {
  testAll([
    'avg(?a) = "3.14"^^xsd:float',
  ]);
});
