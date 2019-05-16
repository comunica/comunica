import * as Data from './_data';

import { aliases as a, testAll } from '../util/utils';

/**
 * REQUEST: sha1-02.rq
 *
 * PREFIX : <http://example.org/>
 * SELECT (SHA1(?l) AS ?hash) WHERE {
 *   :s8 :str ?l
 * }
 */

/**
 * Manifest Entry
 * :sha1-02 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "SHA1() on Unicode data" ;
 *   mf:feature sparql:sha1 ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <sha1-02.rq> ;
 *            qt:data   <hash-unicode.ttl> ] ;
 *     mf:result  <sha1-02.srx> ;
 *   .
 */

describe('We should respect the sha1-02 spec', () => {
  const { s8 } = Data.hashUnicode();
  testAll([
    `SHA1(${s8}) = "d46696735b6a09ff407bfc1a9407e008840db9c9"`,
  ]);
});

/**
 * RESULTS: sha1-02.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="hash"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="hash"><literal>d46696735b6a09ff407bfc1a9407e008840db9c9</literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
