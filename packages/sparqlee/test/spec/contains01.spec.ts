import * as Data from './_data';

import { aliases as a, testAll } from '../util/utils';

/**
 * REQUEST: contains01.rq
 *
 * PREFIX : <http://example.org/>
 * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
 * SELECT ?s ?str WHERE {
 *   ?s :str ?str
 *   FILTER CONTAINS(?str, "a")
 * }
 */

/**
 * Manifest Entry
 * :contains01 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "CONTAINS()" ;
 *   mf:feature sparql:contains ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <contains01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <contains01.srx> ;
 *   .
 */

describe('We should respect the contains01 spec', () => {
  const { s1, s2, s3, s4, s5, s6, s7 } = Data.data();
  testAll([
    `CONTAINS(${s1}, "a") = ${a.false}`,
    `CONTAINS(${s2}, "a") = ${a.true}`,
    `CONTAINS(${s3}, "a") = ${a.false}`,
    `CONTAINS(${s4}, "a") = ${a.false}`,
    `CONTAINS(${s5}, "a") = ${a.false}`,
    `CONTAINS(${s6}, "a") = ${a.true}`,
    `CONTAINS(${s7}, "a") = ${a.false}`,
  ]);
});

/**
 * RESULTS: contains01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="s"/>
 *   <variable name="str"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s2</uri></binding>
 *       <binding name="str"><literal xml:lang="en">bar</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s6</uri></binding>
 *       <binding name="str"><literal datatype="http://www.w3.org/2001/XMLSchema#string">abc</literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
