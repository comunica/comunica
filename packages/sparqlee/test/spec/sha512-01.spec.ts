// tslint:disable:max-line-length
import * as Data from './_data';

import { aliases as a, testAll } from '../util/utils';

/**
 * REQUEST: sha512-01.rq
 *
 * PREFIX : <http://example.org/>
 * SELECT (SHA512(?l) AS ?hash) WHERE {
 *   :s1 :str ?l
 * }
 */

/**
 * Manifest Entry
 *   mf:feature sparql:sha512 ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <sha512-01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <sha512-01.srx> ;
 *   .
 *   mf:feature sparql:sha512 ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <sha512-02.rq> ;
 *            qt:data   <hash-unicode.ttl> ] ;
 *     mf:result  <sha512-02.srx> ;
 *   .
 */

describe('We should respect the sha512-01 spec', () => {
  const { s1 } = Data.data();
  testAll([
    `SHA512(${s1}) = "f7fbba6e0636f890e56fbbf3283e524c6fa3204ae298382d624741d0dc6638326e282c41be5e4254d8820772c5518a2c5a8c0c7f7eda19594a7eb539453e1ed7"`,
  ]);
});

/**
 * RESULTS: sha512-01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="hash"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="hash"><literal>f7fbba6e0636f890e56fbbf3283e524c6fa3204ae298382d624741d0dc6638326e282c41be5e4254d8820772c5518a2c5a8c0c7f7eda19594a7eb539453e1ed7</literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
