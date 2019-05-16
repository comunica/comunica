import { aliases as a, testAll } from '../util/utils';

/**
 * REQUEST: notin02.rq
 *
 * ASK {
 *   FILTER(2 NOT IN (1/0, 2))
 * }
 */

/**
 * Manifest Entry
 * :notin02 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "NOT IN 2" ;
 *   mf:feature sparql:in ;
 *   mf:feature sparql:not ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <notin02.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <notin02.srx> ;
 *   .
 */

describe('We should respect the notin02 spec', () => {
  testAll([
    `2 NOT IN (1/0, 2) = ${a.false}`,
  ]);
});

/**
 * RESULTS: notin02.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head/>
 * <boolean>false</boolean>
 * </sparql>
 */
