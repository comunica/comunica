import * as Data from './_data';

import { aliases as a, int, testAll } from '../util/utils';

/**
 * REQUEST: length01.rq
 *
 * PREFIX : <http://example.org/>
 * SELECT ?str (STRLEN(?str) AS ?len) WHERE {
 *   ?s :str ?str
 * }
 */

/**
 * Manifest Entry
 * :length01 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "STRLEN()" ;
 *   mf:feature sparql:strlen ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <length01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <length01.srx> ;
 *   .
 */

describe('We should respect the length01 spec', () => {
  const { s1, s2, s3, s4, s5, s6, s7 } = Data.data();
  testAll([
    `STRLEN(${s1}) = ${int('3')}`,
    `STRLEN(${s2}) = ${int('3')}`,
    `STRLEN(${s3}) = ${int('3')}`,
    `STRLEN(${s4}) = ${int('3')}`,
    `STRLEN(${s5}) = ${int('4')}`,
    `STRLEN(${s6}) = ${int('3')}`,
    `STRLEN(${s7}) = ${int('3')}`,
  ]);
});

/**
 * RESULTS: length01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="str"/>
 *   <variable name="len"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="str"><literal xml:lang="en">bar</literal></binding>
 *       <binding name="len"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">3</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="str"><literal>食べ物</literal></binding>
 *       <binding name="len"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">3</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="str"><literal datatype="http://www.w3.org/2001/XMLSchema#string">DEF</literal></binding>
 *       <binding name="len"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">3</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="str"><literal>BAZ</literal></binding>
 *       <binding name="len"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">3</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="str"><literal>100%</literal></binding>
 *       <binding name="len"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">4</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="str"><literal datatype="http://www.w3.org/2001/XMLSchema#string">abc</literal></binding>
 *       <binding name="len"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">3</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="str"><literal>foo</literal></binding>
 *       <binding name="len"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">3</literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
