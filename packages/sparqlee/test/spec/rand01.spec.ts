import * as Data from './_data';

import { aliases as a, testAll } from '../util/utils';

/**
 * REQUEST: rand01.rq
 *
 * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
 * ASK {
 *   BIND(RAND() AS ?r)
 *   FILTER(DATATYPE(?r) = xsd:double && ?r >= 0.0 && ?r < 1.0)
 * }
 */

/**
 * Manifest Entry
 * :rand01 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "RAND()" ;
 *   mf:feature sparql:rand ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <rand01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <rand01.srx> ;
 *   .
 */

describe('We should respect the rand01 spec', () => {
  const { } = Data.data();
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
