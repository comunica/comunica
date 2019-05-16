import * as Data from './_data';

import { aliases as a, testAll } from '../util/utils';

/**
 * REQUEST: substring02.rq
 *
 * PREFIX : <http://example.org/>
 * SELECT ?s ?str (SUBSTR(?str,2) AS ?substr) WHERE {
 *   ?s :str ?str
 * }
 */

/**
 * Manifest Entry
 * :substring02 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "SUBSTR() (2-argument)" ;
 *   mf:feature sparql:substr ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <substring02.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <substring02.srx> ;
 *   .
 */

describe('We should respect the substring02 spec', () => {
  const { s1, s2, s3, s4, s5, s6, s7 } = Data.data();
  testAll([
    `SUBSTR(${s1}, 2) = "oo"`,
    `SUBSTR(${s2}, 2) = "ar"@en`,
    `SUBSTR(${s3}, 2) = "AZ"`,
    `SUBSTR(${s4}, 2) = "べ物"`,
    `SUBSTR(${s5}, 2) = "00%"`,
    `SUBSTR(${s6}, 2) = "bc"^^xsd:string`,
    `SUBSTR(${s7}, 2) = "EF"^^xsd:string`,
  ]);
});

/**
 * RESULTS: substring02.srx
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
 *       <binding name="substr"><literal xml:lang="en">ar</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s4</uri></binding>
 *       <binding name="str"><literal>食べ物</literal></binding>
 *       <binding name="substr"><literal>べ物</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s7</uri></binding>
 *       <binding name="str"><literal datatype="http://www.w3.org/2001/XMLSchema#string">DEF</literal></binding>
 *       <binding name="substr"><literal datatype="http://www.w3.org/2001/XMLSchema#string">EF</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s3</uri></binding>
 *       <binding name="str"><literal>BAZ</literal></binding>
 *       <binding name="substr"><literal>AZ</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s5</uri></binding>
 *       <binding name="str"><literal>100%</literal></binding>
 *       <binding name="substr"><literal>00%</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s6</uri></binding>
 *       <binding name="str"><literal datatype="http://www.w3.org/2001/XMLSchema#string">abc</literal></binding>
 *       <binding name="substr"><literal datatype="http://www.w3.org/2001/XMLSchema#string">bc</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s1</uri></binding>
 *       <binding name="str"><literal>foo</literal></binding>
 *       <binding name="substr"><literal>oo</literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
