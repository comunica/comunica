import * as Data from './_data';

import { aliases as a, testAll } from '../util/utils';

/**
 * REQUEST: encode01.rq
 *
 * PREFIX : <http://example.org/>
 * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
 * SELECT ?s ?str (ENCODE_FOR_URI(?str) AS ?encoded) WHERE {
 *   ?s :str ?str
 * }
 */

/**
 * Manifest Entry
 * :encode01 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "ENCODE_FOR_URI()" ;
 *   mf:feature sparql:encode_for_uri ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <encode01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <encode01.srx> ;
 *   .
 */

describe('We should respect the encode01 spec', () => {
  const { s1, s2, s3, s4, s5, s6, s7 } = Data.data();
  testAll([
    `ENCODE_FOR_URI(${s1}) = "foo"`,
    `ENCODE_FOR_URI(${s2}) = "bar"`,
    `ENCODE_FOR_URI(${s3}) = "BAZ"`,
    `ENCODE_FOR_URI(${s4}) = "%E9%A3%9F%E3%81%B9%E7%89%A9"`,
    `ENCODE_FOR_URI(${s5}) = "100%25"`,
    `ENCODE_FOR_URI(${s6}) = "abc"^^xsd:string`,
    `ENCODE_FOR_URI(${s7}) = "DEF"^^xsd:string`,
  ]);
});

/**
 * RESULTS: encode01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="s"/>
 *   <variable name="str"/>
 *   <variable name="encoded"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s1</uri></binding>
 *       <binding name="str"><literal>foo</literal></binding>
 *       <binding name="encoded"><literal>foo</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s2</uri></binding>
 *       <binding name="str"><literal xml:lang="en">bar</literal></binding>
 *       <binding name="encoded"><literal>bar</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s3</uri></binding>
 *       <binding name="str"><literal>BAZ</literal></binding>
 *       <binding name="encoded"><literal>BAZ</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s4</uri></binding>
 *       <binding name="str"><literal>食べ物</literal></binding>
 *       <binding name="encoded"><literal>%E9%A3%9F%E3%81%B9%E7%89%A9</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s5</uri></binding>
 *       <binding name="str"><literal>100%</literal></binding>
 *       <binding name="encoded"><literal>100%25</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s6</uri></binding>
 *       <binding name="str"><literal datatype="http://www.w3.org/2001/XMLSchema#string">abc</literal></binding>
 *       <binding name="encoded"><literal>abc</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s7</uri></binding>
 *       <binding name="str"><literal datatype="http://www.w3.org/2001/XMLSchema#string">DEF</literal></binding>
 *       <binding name="encoded"><literal>DEF</literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
