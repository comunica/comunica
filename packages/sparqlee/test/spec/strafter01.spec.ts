import * as Data from './_data';

import { aliases as a, testAll, testAllErrors } from '../util/utils';

/**
 * REQUEST: strafter01.rq
 *
 * PREFIX : <http://example.org/>
 * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
 * SELECT ?s (STRAFTER(?str,"e") AS ?suffix) WHERE {
 *   ?s :str ?str
 * }
 */

/**
 * Manifest Entry
 * :strafter01a rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "STRAFTER()" ;
 *   mf:feature sparql:strafter ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-08-07#resolution_2> ;
 *     mf:action
 *          [ qt:query  <strafter01.rq> ;
 *            qt:data   <data2.ttl> ] ;
 *     mf:result  <strafter01a.srx> ;
 *   .
 */

describe('We should respect the strafter01 spec', () => {
  const { s1, s2, s3, s4, s5, s6, s7 } = Data.data2();
  testAll([
    `STRAFTER(${s1}, "e") = ""`,
    `STRAFTER(${s2}, "e") = ""`,
    `STRAFTER(${s3}, "e") = "nglish"@en`,
    `STRAFTER(${s4}, "e") = ""`,
    `STRAFTER(${s5}, "e") = ""^^xsd:string`,
    `STRAFTER(${s6}, "e") = "f"^^xsd:string`,
  ]);

  testAllErrors([
    `STRAFTER(${s7}, "e") = error`,
  ]);
});

/**
 * RESULTS: strafter01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="s"/>
 *   <variable name="suffix"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s1</uri></binding>
 *       <binding name="suffix"><literal></literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s2</uri></binding>
 *       <binding name="suffix"><literal></literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s3</uri></binding>
 *       <binding name="suffix"><literal xml:lang="en">nglish</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s4</uri></binding>
 *       <binding name="suffix"><literal></literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s5</uri></binding>
 *       <binding name="suffix"><literal></literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s6</uri></binding>
 *       <binding name="suffix"><literal datatype="http://www.w3.org/2001/XMLSchema#string">f</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s7</uri></binding>
 *     </result>
 * </results>
 * </sparql>
 */
