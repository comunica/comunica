import * as Data from './_data';

import { aliases as a, testAll } from '../util/utils';

/**
 * REQUEST: md5-01.rq
 *
 * PREFIX : <http://example.org/>
 * SELECT (MD5(?l) AS ?hash) WHERE {
 *   :s1 :str ?l
 * }
 */

/**
 * Manifest Entry
 *   mf:feature sparql:md5 ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <md5-01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <md5-01.srx> ;
 *   .
 *   mf:feature sparql:md5 ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <md5-02.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <md5-02.srx> ;
 *   .
 */

describe('We should respect the md5-01 spec', () => {
  const { s1 } = Data.data();
  testAll([
    `MD5(${s1}) = "acbd18db4cc2f85cedef654fccc4a4d8"`,
  ]);
});

/**
 * RESULTS: md5-01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="hash"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="hash"><literal>acbd18db4cc2f85cedef654fccc4a4d8</literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
