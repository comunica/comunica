import * as Data from './_data';

import { aliases as a, testAll, testAllErrors } from '../util/utils';

/**
 * REQUEST: replace01.rq
 *
 * PREFIX : <http://example.org/>
 * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
 * SELECT ?s (REPLACE(?str,"[^a-z0-9]", "-") AS ?new) WHERE {
 *   ?s :str ?str
 * }
 */

/**
 * Manifest Entry
 * :replace01 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "REPLACE()" ;
 *   mf:feature sparql:replace ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <replace01.rq> ;
 *            qt:data   <data3.ttl> ] ;
 *     mf:result  <replace01.srx> ;
 *   .
 */

describe('We should respect the replace01 spec', () => {
  const { s1, s2, s3, s4, s5, s6, s7, s8, s9 } = Data.data3();
  testAll([
    `REPLACE(${s1}, "[^a-z0-9]", "-") = "123"`,
    `REPLACE(${s2}, "[^a-z0-9]", "-") = "---"@ja`,
    `REPLACE(${s3}, "[^a-z0-9]", "-") = "-nglish"@en`,

    `REPLACE(${s4}, "[^a-z0-9]", "-") = "-ran-ais"@fr`,
    `REPLACE(${s5}, "[^a-z0-9]", "-") = "abc"^^xsd:string`,
    `REPLACE(${s6}, "[^a-z0-9]", "-") = "def"^^xsd:string`,

    `REPLACE(${s8}, "[^a-z0-9]", "-") = "banana"`,
    `REPLACE(${s9}, "[^a-z0-9]", "-") = "abcd"`,
  ]);

  testAllErrors([
    `REPLACE(${s7}, "[^a-z0-9]", "-") = error`,
  ]);
});

/**
 * RESULTS: replace01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="s"/>
 *   <variable name="new"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s1</uri></binding>
 *       <binding name="new"><literal>123</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s2</uri></binding>
 *       <binding name="new"><literal xml:lang="ja">---</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s3</uri></binding>
 *       <binding name="new"><literal xml:lang="en">-nglish</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s4</uri></binding>
 *       <binding name="new"><literal xml:lang="fr">-ran-ais</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s5</uri></binding>
 *       <binding name="new"><literal datatype="http://www.w3.org/2001/XMLSchema#string">abc</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s6</uri></binding>
 *       <binding name="new"><literal datatype="http://www.w3.org/2001/XMLSchema#string">def</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s7</uri></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s8</uri></binding>
 *       <binding name="new"><literal>banana</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s9</uri></binding>
 *       <binding name="new"><literal>abcd</literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
