import { aliases as a, testAll } from '../util/utils';

/**
 * REQUEST: in01.rq
 *
 * ASK {
 *   FILTER(2 IN (1, 2, 3))
 * }
 */

/**
 * Manifest Entry
 * :in01 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "IN 1" ;
 *   mf:feature sparql:in ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <in01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <in01.srx> ;
 *   .
 */

describe('We should respect the in01 spec', () => {
  testAll([
    `2 IN(1, 2, 3) = ${a.true}`,
  ]);
});

/**
 * RESULTS: in01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head/>
 * <boolean>true</boolean>
 * </sparql>
 */
