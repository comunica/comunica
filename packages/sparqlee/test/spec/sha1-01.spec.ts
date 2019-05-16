import * as Data from './_data';

import { aliases as a, testAll } from '../util/utils';

/**
 * REQUEST: sha1-01.rq
 *
 * PREFIX : <http://example.org/>
 * SELECT (SHA1(?l) AS ?hash) WHERE {
 *   :s1 :str ?l
 * }
 */

/**
 * Manifest Entry
 *   mf:feature sparql:sha1 ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <sha1-01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <sha1-01.srx> ;
 *   .
 *   mf:feature sparql:sha1 ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <sha1-02.rq> ;
 *            qt:data   <hash-unicode.ttl> ] ;
 *     mf:result  <sha1-02.srx> ;
 *   .
 */

describe('We should respect the sha1-01 spec', () => {
  const { s1 } = Data.data();
  testAll([
    `SHA1(${s1}) = "0beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a33"`,
  ]);
});

/**
 * RESULTS: sha1-01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="hash"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="hash"><literal>0beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a33</literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
