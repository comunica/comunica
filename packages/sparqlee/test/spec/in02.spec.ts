import { aliases as a, testAll } from '../util/utils';

/**
 * REQUEST: in02.rq
 *
 * ASK {
 *   FILTER(2 IN (1, 3))
 * }
 */

/**
 * Manifest Entry
 * :in02 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "IN 2" ;
 *   mf:feature sparql:in ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <in02.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <in02.srx> ;
 *   .
 */

describe('We should respect the in02 spec', () => {
  testAll([
    `2 IN (1, 3) = ${a.false}`,
  ]);
});

/**
 * RESULTS: in02.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head/>
 * <boolean>false</boolean>
 * </sparql>
 */
