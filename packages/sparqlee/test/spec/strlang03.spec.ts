import * as Data from './_data';

import { aliases as a, testAll, testAllErrors } from '../util/utils';

/**
 * REQUEST: strlang03.rq
 *
 * PREFIX : <http://example.org/>
 * SELECT ?s (STRLANG(?o,"en-US") AS ?str1) WHERE {
 *   ?s ?p ?o
 * }
 */

/**
 * Manifest Entry
 * :strlang03-rdf11 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "STRLANG() TypeErrors (updated for RDF 1.1)" ;
 *   mf:feature sparql:strlang ;
 *     dawgt:approval dawgt:Proposed ;
 *     mf:action
 *          [ qt:query  <strlang03.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <strlang03-rdf11.srx> ;
 *   .
 */

describe('We should respect the strlang03 spec', () => {
  const { n1, n2, n3, n4, n5, s1, s2, s3, s4, s5, s6, s7, d1, d2, d3, d4 } = Data.data();
  testAll([
    `STRLANG(${s1}, "en-US") = "foo"@en-us`,
    `STRLANG(${s3}, "en-US") = "BAZ"@en-us`,
    `STRLANG(${s4}, "en-US") = "食べ物"@en-us`,
    `STRLANG(${s5}, "en-US") = "100%"@en-us`,
    `STRLANG(${s6}, "en-US") = "abc"@en-us`,
    `STRLANG(${s7}, "en-US") = "DEF"@en-us`,
  ]);

  testAllErrors([
    `STRLANG(${n1}, "en-US") = error`,
    `STRLANG(${n2}, "en-US") = error`,
    `STRLANG(${n3}, "en-US") = error`,
    `STRLANG(${n4}, "en-US") = error`,
    `STRLANG(${n5}, "en-US") = error`,

    `STRLANG(${s2}, "en-US") = error`,

    `STRLANG(${d1}, "en-US") = error`,
    `STRLANG(${d2}, "en-US") = error`,
    `STRLANG(${d3}, "en-US") = error`,
    `STRLANG(${d4}, "en-US") = error`,
  ]);
});

/**
 * RESULTS: strlang03.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="s"/>
 *   <variable name="str1"/>
 * </head>
 * <results>
 *     <result><binding name="s"><uri>http://example.org/n1</uri></binding></result>
 *     <result><binding name="s"><uri>http://example.org/n2</uri></binding></result>
 *     <result><binding name="s"><uri>http://example.org/n3</uri></binding></result>
 *     <result><binding name="s"><uri>http://example.org/n4</uri></binding></result>
 *     <result><binding name="s"><uri>http://example.org/n5</uri></binding></result>
 *
 *     <result>
 *       <binding name="s"><uri>http://example.org/s1</uri></binding>
 *       <binding name="str1"><literal xml:lang="en-us">foo</literal></binding>
 *     </result>
 *     <result><binding name="s"><uri>http://example.org/s2</uri></binding></result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s3</uri></binding>
 *       <binding name="str1"><literal xml:lang="en-us">BAZ</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s4</uri></binding>
 *       <binding name="str1"><literal xml:lang="en-us">食べ物</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s5</uri></binding>
 *       <binding name="str1"><literal xml:lang="en-us">100%</literal></binding>
 *     </result>
 *     <result>
 *        <binding name="s"><uri>http://example.org/s6</uri></binding>
 *        <binding name="str1"><literal xml:lang="en-us">abc</literal></binding>
 *      </result>
 *     <result>
 *        <binding name="s"><uri>http://example.org/s7</uri></binding>
 *        <binding name="str1"><literal xml:lang="en-us">DEF</literal></binding>
 *      </result>
 *
 *     <result><binding name="s"><uri>http://example.org/d1</uri></binding></result>
 *     <result><binding name="s"><uri>http://example.org/d2</uri></binding></result>
 *     <result><binding name="s"><uri>http://example.org/d3</uri></binding></result>
 *     <result><binding name="s"><uri>http://example.org/d4</uri></binding></result>
 * </results>
 * </sparql>
 */
