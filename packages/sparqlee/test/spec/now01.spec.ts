import * as Data from './_data';

import { aliases as a, testAll } from '../util/utils';

/**
 * REQUEST: now01.rq
 *
 * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
 * ASK {
 *   BIND(NOW() AS ?n)
 *   FILTER(DATATYPE(?n) = xsd:dateTime)
 * }
 */

/**
 * Manifest Entry
 * :now01 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "NOW()" ;
 *   mf:feature sparql:now ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <now01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <now01.srx> ;
 *   .
 */

describe('We should respect the now01 spec', () => {
  const { } = Data.data();
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
