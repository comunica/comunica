import * as Data from './_data';

import { aliases as a, testAll, testAllErrors } from '../util/utils';

/**
 * REQUEST: substring01.rq
 *
 * PREFIX : <http://example.org/>
 * SELECT ?s ?str (SUBSTR(?str,1,1) AS ?substr) WHERE {
 *   ?s :str ?str
 * }
 */

/**
 * Manifest Entry
 * :substring01 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "SUBSTR() (3-argument)" ;
 *   mf:feature sparql:substr ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <substring01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <substring01.srx> ;
 *   .
 */

describe('We should respect the substring01 spec', () => {
  const { s1, s2, s3, s4, s5, s6, s7 } = Data.data();
  testAll([
    `SUBSTR(${s1}, 1, 1) = "f"`,
    `SUBSTR(${s2}, 1, 1) = "b"@en`,
    `SUBSTR(${s3}, 1, 1) = "B"`,
    `SUBSTR(${s4}, 1, 1) = "食"`,
    `SUBSTR(${s5}, 1, 1) = "1"`,
    `SUBSTR(${s6}, 1, 1) = "a"^^xsd:string`,
    `SUBSTR(${s7}, 1, 1) = "D"^^xsd:string`,
  ]);
});

/**
 * RESULTS: substring01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="s"/>
 *   <variable name="str"/>
 *   <variable name="substr"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s2</uri></binding>
 *       <binding name="str"><literal xml:lang="en">bar</literal></binding>
 *       <binding name="substr"><literal xml:lang="en">b</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s4</uri></binding>
 *       <binding name="str"><literal>食べ物</literal></binding>
 *       <binding name="substr"><literal>食</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s7</uri></binding>
 *       <binding name="str"><literal datatype="http://www.w3.org/2001/XMLSchema#string">DEF</literal></binding>
 *       <binding name="substr"><literal datatype="http://www.w3.org/2001/XMLSchema#string">D</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s3</uri></binding>
 *       <binding name="str"><literal>BAZ</literal></binding>
 *       <binding name="substr"><literal>B</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s5</uri></binding>
 *       <binding name="str"><literal>100%</literal></binding>
 *       <binding name="substr"><literal>1</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s6</uri></binding>
 *       <binding name="str"><literal datatype="http://www.w3.org/2001/XMLSchema#string">abc</literal></binding>
 *       <binding name="substr"><literal datatype="http://www.w3.org/2001/XMLSchema#string">a</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s1</uri></binding>
 *       <binding name="str"><literal>foo</literal></binding>
 *       <binding name="substr"><literal>f</literal></binding>
 *     </result>
 * </results>
 * </sparql>
 *
 */
