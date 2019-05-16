import * as Data from './_data';

import { aliases as a, testAll } from '../util/utils';

/**
 * REQUEST: strdt02.rq
 *
 * PREFIX : <http://example.org/>
 * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
 * SELECT ?s (STRDT(STR(?str),xsd:string) AS ?str1) WHERE {
 *   ?s :str ?str
 *   FILTER(LANGMATCHES(LANG(?str), "en"))
 * }
 */

/**
 * Manifest Entry
 * :strdt02 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "STRDT(STR())" ;
 *   mf:feature sparql:strdt ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <strdt02.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <strdt02.srx> ;
 *   .
 */

describe('We should respect the strdt02 spec', () => {
  const { s2 } = Data.data();
  testAll([
    `STRDT(STR(${s2}), xsd:string) = "bar"^^xsd:string`,
  ]);
});

/**
 * RESULTS: strdt02.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="s"/>
 *   <variable name="str1"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s2</uri></binding>
 *       <binding name="str1"><literal datatype="http://www.w3.org/2001/XMLSchema#string">bar</literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
