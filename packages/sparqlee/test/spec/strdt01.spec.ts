import * as Data from './_data';

import { aliases as a, testAll, testAllErrors } from '../util/utils';

/**
 * REQUEST: strdt01.rq
 *
 * PREFIX : <http://example.org/>
 * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
 * SELECT ?s (STRDT(?str,xsd:string) AS ?str1) WHERE {
 *   ?s :str ?str
 *   FILTER(LANGMATCHES(LANG(?str), "en"))
 * }
 */

/**
 * Manifest Entry
 * :strdt01 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "STRDT()" ;
 *   mf:feature sparql:strdt ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <strdt01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <strdt01.srx> ;
 *   .
 */

describe('We should respect the strdt01 spec', () => {
  const { s2 } = Data.data();
  testAllErrors([
    `STRDT(${s2}, xsd:string) = error`,
  ]);
});

/**
 * RESULTS: strdt01.srx
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
 *     </result>
 * </results>
 * </sparql>
 */
