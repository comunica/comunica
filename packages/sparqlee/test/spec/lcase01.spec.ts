import * as Data from './_data';

import { aliases as a, testAll } from '../util/utils';

/**
 * REQUEST: lcase01.rq
 *
 * PREFIX : <http://example.org/>
 * SELECT ?s (LCASE(?str) AS ?lstr) WHERE {
 *   ?s :str ?str
 * }
 */

/**
 * Manifest Entry
 * :lcase01 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "LCASE()" ;
 *   mf:feature sparql:lcase ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <lcase01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <lcase01.srx> ;
 *   .
 */

describe('We should respect the lcase01 spec', () => {
  const { s1, s2, s3, s4, s5, s6, s7 } = Data.data();
  testAll([
    `LCASE(${s1}) = "foo"`,
    `LCASE(${s2}) = "bar"@en`,
    `LCASE(${s3}) = "baz"`,
    `LCASE(${s4}) = "食べ物"`,
    `LCASE(${s5}) = "100%"`,
    `LCASE(${s6}) = "abc"^^xsd:string`,
    `LCASE(${s7}) = "def"^^xsd:string`,
  ]);
});

/**
 * RESULTS: lcase01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="s"/>
 *   <variable name="lstr"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s2</uri></binding>
 *       <binding name="lstr"><literal xml:lang="en">bar</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s4</uri></binding>
 *       <binding name="lstr"><literal>食べ物</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s7</uri></binding>
 *       <binding name="lstr"><literal datatype="http://www.w3.org/2001/XMLSchema#string">def</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s3</uri></binding>
 *       <binding name="lstr"><literal>baz</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s5</uri></binding>
 *       <binding name="lstr"><literal>100%</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s6</uri></binding>
 *       <binding name="lstr"><literal datatype="http://www.w3.org/2001/XMLSchema#string">abc</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s1</uri></binding>
 *       <binding name="lstr"><literal>foo</literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
