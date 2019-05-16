import * as Data from './_data';

import { aliases as a, testAll } from '../util/utils';

/**
 * REQUEST: md5-02.rq
 *
 * PREFIX : <http://example.org/>
 * SELECT (MD5(?l) AS ?hash) WHERE {
 *   :s4 :str ?l
 * }
 */

/**
 * Manifest Entry
 * :md5-02 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "MD5() over Unicode data" ;
 *   mf:feature sparql:md5 ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <md5-02.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <md5-02.srx> ;
 *   .
 */

describe('We should respect the md5-02 spec', () => {
  const { s4 } = Data.data();
  testAll([
    `MD5(${s4}) = "e7ada485d13b1decf628c9211bc3a97b"`,
  ]);
});

/**
 * RESULTS: md5-02.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="hash"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="hash"><literal>e7ada485d13b1decf628c9211bc3a97b</literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
