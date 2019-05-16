import * as Data from './_data';

import { aliases as a, testAll, testAllErrors } from '../util/utils';

/**
 * REQUEST: strdt03.rq
 *
 * PREFIX : <http://example.org/>
 * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
 * SELECT ?s (STRDT(?o,xsd:string) AS ?str1) WHERE {
 *   ?s ?p ?o
 * }
 */

/**
 * Manifest Entry
 * :strdt03-rdf11 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "STRDT() TypeErrors (updated for RDF 1.1)" ;
 *   mf:feature sparql:strdt ;
 *     dawgt:approval dawgt:Proposed ;
 *     mf:action
 *          [ qt:query  <strdt03.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <strdt03-rdf11.srx> ;
 *   .
 */

describe('We should respect the strdt03 spec', () => {
  const { n1, n2, n3, n4, n5, s1, s2, s3, s4, s5, s6, s7, d1, d2, d3, d4 } = Data.data();
  testAll([
    `STRDT(${s1}, xsd:string) = "foo"^^xsd:string`,
    `STRDT(${s3}, xsd:string) = "BAZ"^^xsd:string`,
    `STRDT(${s4}, xsd:string) = "食べ物"^^xsd:string`,
    `STRDT(${s5}, xsd:string) = "100%"^^xsd:string`,
    `STRDT(${s6}, xsd:string) = "abc"^^xsd:string`,
    `STRDT(${s7}, xsd:string) = "DEF"^^xsd:string`,
  ]);

  testAllErrors([
    `STRDT(${n1}, xsd:string) = error`,
    `STRDT(${n2}, xsd:string) = error`,
    `STRDT(${n3}, xsd:string) = error`,
    `STRDT(${n4}, xsd:string) = error`,
    `STRDT(${n5}, xsd:string) = error`,

    `STRDT(${s2}, xsd:string) = error`,

    `STRDT(${d1}, xsd:string) = error`,
    `STRDT(${d2}, xsd:string) = error`,
    `STRDT(${d3}, xsd:string) = error`,
    `STRDT(${d4}, xsd:string) = error`,
  ]);
});

/**
 * RESULTS: strdt03.srx
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
 *       <binding name="str1"><literal datatype="http://www.w3.org/2001/XMLSchema#string">foo</literal></binding>
 *     </result>
 *     <result><binding name="s"><uri>http://example.org/s2</uri></binding></result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s3</uri></binding>
 *       <binding name="str1"><literal datatype="http://www.w3.org/2001/XMLSchema#string">BAZ</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s4</uri></binding>
 *       <binding name="str1"><literal datatype="http://www.w3.org/2001/XMLSchema#string">食べ物</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s5</uri></binding>
 *       <binding name="str1"><literal datatype="http://www.w3.org/2001/XMLSchema#string">100%</literal></binding>
 *     </result>
 *     <result>
 *        <binding name="s"><uri>http://example.org/s6</uri></binding>
 *        <binding name="str1"><literal datatype="http://www.w3.org/2001/XMLSchema#string">abc</literal></binding>
 *      </result>
 *     <result>
 *        <binding name="s"><uri>http://example.org/s7</uri></binding>
 *        <binding name="str1"><literal>DEF</literal></binding>
 *      </result>
 *
 *     <result><binding name="s"><uri>http://example.org/d1</uri></binding></result>
 *     <result><binding name="s"><uri>http://example.org/d2</uri></binding></result>
 *     <result><binding name="s"><uri>http://example.org/d3</uri></binding></result>
 *     <result><binding name="s"><uri>http://example.org/d4</uri></binding></result>
 * </results>
 * </sparql>
 */
