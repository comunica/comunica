import * as Data from './_data';

import { aliases as a, testAll } from '../util/utils';

/**
 * REQUEST: concat01.rq
 *
 * PREFIX : <http://example.org/>
 * SELECT (CONCAT(?str1,?str2) AS ?str) WHERE {
 *   :s6 :str ?str1 .
 *   :s7 :str ?str2 .
 * }
 */

/**
 * Manifest Entry
 * :concat01 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "CONCAT()" ;
 *   mf:feature sparql:concat ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <concat01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <concat01.srx> ;
 *   .
 */

describe('We should respect the concat01 spec', () => {
  const { s1, s2, s3, s4, s5, s6, s7 } = Data.data();
  testAll([
    `CONCAT(${s6}, ${s7}) = "abcDEF"^^xsd:string`,
  ]);
});

/**
 * RESULTS: concat01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="str"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="str"><literal datatype="http://www.w3.org/2001/XMLSchema#string">abcDEF</literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
