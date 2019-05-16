import * as Data from './_data';

import { aliases as a, testAll, testAllErrors } from '../util/utils';

/**
 * REQUEST: strlang02.rq
 *
 * PREFIX : <http://example.org/>
 * SELECT ?s (STRLANG(STR(?str),"en-US") AS ?s2) WHERE {
 *   ?s :str ?str
 *   FILTER(LANGMATCHES(LANG(?str), "en"))
 * }
 */

/**
 * Manifest Entry
 * :strlang02 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "STRLANG(STR())" ;
 *   mf:feature sparql:strlang ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <strlang02.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <strlang02.srx> ;
 *   .
 */

describe('We should respect the strlang02 spec', () => {
  const { s2 } = Data.data();
  testAll([
    `STRLANG(STR(${s2}), "en-US") = "bar"@en-US`,
  ]);
});

/**
 * RESULTS: strlang02.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="s"/>
 *   <variable name="s2"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s2</uri></binding>
 *       <binding name="s2"><literal xml:lang="en-US">bar</literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
