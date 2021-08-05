import { testAll } from '../util/utils';

describe('We should respect the now01 spec', () => {
  testAll([
    'DATATYPE(NOW()) = http://www.w3.org/2001/XMLSchema#dateTime',
  ]);
});

/**
 * RESULTS: now01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head/>
 * <boolean>true</boolean>
 * </sparql>
 */
