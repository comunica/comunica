import * as Data from './_data';

import { aliases as a, testAll, testAllErrors } from '../util/utils';

/**
 * REQUEST: strafter02.rq
 *
 * PREFIX : <http://example.org/>
 * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
 * SELECT
 *   ?s
 *   ?str
 *   (STRAFTER(?str,"b") AS ?ab)
 *   (STRAFTER(?str,"ab") AS ?aab)
 *   (STRAFTER(?str,"b"@cy) AS ?abcy)
 *   (STRAFTER(?str,"") AS ?a)
 *   (STRAFTER(?str,""@en) AS ?aen)
 *   (STRAFTER(?str,"b"^^xsd:string) AS ?abx)
 *   (STRAFTER(?str,"xyz"^^xsd:string) AS ?axyzx)
 * WHERE {
 *   ?s :str ?str
 * }
 */

/**
 * Manifest Entry
 * :strafter02 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "STRAFTER() datatyping" ;
 *   mf:feature sparql:strafter ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-08-07#resolution_2> ;
 *     mf:action
 *          [ qt:query  <strafter02.rq> ;
 *            qt:data   <data4.ttl> ] ;
 *     mf:result  <strafter02.srx> ;
 *   .
 */

describe('We should respect the strafter02 spec', () => {
  const { s1, s2, s3 } = Data.data4();
  testAll([
    `STRAFTER(${s1}, "b") = "c"`,
    `STRAFTER(${s1}, "ab") = "c"`,
    `STRAFTER(${s1}, "") = "abc"`,
    `STRAFTER(${s1}, "b"^^xsd:string) = "c"`,
    `STRAFTER(${s1}, "xyz"^^xsd:string) = ""`,

    `STRAFTER(${s2}, "b") = "c"@en`,
    `STRAFTER(${s2}, "ab") = "c"@en`,
    `STRAFTER(${s2}, "") = "abc"@en`,
    `STRAFTER(${s2}, ""@en) = "abc"@en`,
    `STRAFTER(${s2}, "b"^^xsd:string) = "c"@en`,
    `STRAFTER(${s2}, "xyz"^^xsd:string) = ""`,

    `STRAFTER(${s3}, "b") = "c"^^xsd:string`,
    `STRAFTER(${s3}, "ab") = "c"^^xsd:string`,
    `STRAFTER(${s3}, "") = "abc"^^xsd:string`,
    `STRAFTER(${s3}, "b"^^xsd:string) = "c"^^xsd:string`,
    `STRAFTER(${s3}, "xyz"^^xsd:string) = ""^^xsd:string`,
  ]);

  testAllErrors([
    `STRAFTER(${s1}, "b"@cy) = error`,
    `STRAFTER(${s1}, ""@en)  = error`,

    `STRAFTER(${s2}, "b"@cy) = error`,

    `STRAFTER(${s3}, ""@en)  = error`,
    `STRAFTER(${s3}, "b"@cy) = error`,
  ]);
});

/**
 * RESULTS: strafter02.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="s"/>
 *   <variable name="str"/>
 *   <variable name="ab"/>
 *   <variable name="aab"/>
 *   <variable name="abcy"/>
 *   <variable name="a"/>
 *   <variable name="aen"/>
 *   <variable name="abx"/>
 *   <variable name="axyzx"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s1</uri></binding>
 *       <binding name="str"><literal>abc</literal></binding>
 *       <binding name="ab"><literal>c</literal></binding>
 *       <binding name="aab"><literal>c</literal></binding>
 *       <binding name="a"><literal>abc</literal></binding>
 *       <binding name="abx"><literal>c</literal></binding>
 *       <binding name="axyzx"><literal></literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s2</uri></binding>
 *       <binding name="str"><literal xml:lang="en">abc</literal></binding>
 *       <binding name="ab"><literal xml:lang="en">c</literal></binding>
 *       <binding name="aab"><literal xml:lang="en">c</literal></binding>
 *       <binding name="a"><literal xml:lang="en">abc</literal></binding>
 *       <binding name="aen"><literal xml:lang="en">abc</literal></binding>
 *       <binding name="abx"><literal xml:lang="en">c</literal></binding>
 *       <binding name="axyzx"><literal></literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s3</uri></binding>
 *       <binding name="str"><literal datatype="http://www.w3.org/2001/XMLSchema#string">abc</literal></binding>
 *       <binding name="ab"><literal datatype="http://www.w3.org/2001/XMLSchema#string">c</literal></binding>
 *       <binding name="aab"><literal datatype="http://www.w3.org/2001/XMLSchema#string">c</literal></binding>
 *       <binding name="a"><literal datatype="http://www.w3.org/2001/XMLSchema#string">abc</literal></binding>
 *       <binding name="abx"><literal datatype="http://www.w3.org/2001/XMLSchema#string">c</literal></binding>
 *       <binding name="axyzx"><literal></literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
