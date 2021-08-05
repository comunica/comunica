import { aliases as a, testAll } from '../util/utils';

describe('We should respect the rand01 spec', () => {
  testAll([
    'DATATYPE(RAND()) = http://www.w3.org/2001/XMLSchema#double',
    `RAND() >= 0.0 = ${a.true}`,
    `RAND() < 1.0 = ${a.true}`,
  ]);
});

/**
 * RESULTS: rand01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head></head>
 * <boolean>true</boolean>
 * </sparql>
 */
