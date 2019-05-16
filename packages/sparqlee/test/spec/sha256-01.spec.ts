import * as Data from './_data';

import { aliases as a, testAll } from '../util/utils';

/**
 * REQUEST: sha256-01.rq
 *
 * PREFIX : <http://example.org/>
 * SELECT (SHA256(?l) AS ?hash) WHERE {
 *   :s1 :str ?l
 * }
 */

/**
 * Manifest Entry
 *   mf:feature sparql:sha256 ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <sha256-01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <sha256-01.srx> ;
 *   .
 *   mf:feature sparql:sha256 ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <sha256-02.rq> ;
 *            qt:data   <hash-unicode.ttl> ] ;
 *     mf:result  <sha256-02.srx> ;
 *   .
 */

describe('We should respect the sha256-01 spec', () => {
  const { s1 } = Data.data();
  testAll([
    `SHA256(${s1}) = "2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae"`,
  ]);
});

/**
 * RESULTS: sha256-01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="hash"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="hash">
 *         <literal>2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae</literal>
 *       </binding>
 *     </result>
 * </results>
 * </sparql>
 */
