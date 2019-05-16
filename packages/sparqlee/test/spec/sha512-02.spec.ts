// tslint:disable:max-line-length
import * as Data from './_data';

import { aliases as a, testAll } from '../util/utils';

/**
 * REQUEST: sha512-02.rq
 *
 * PREFIX : <http://example.org/>
 * SELECT (SHA512(?l) AS ?hash) WHERE {
 *   :s8 :str ?l
 * }
 */

/**
 * Manifest Entry
 * :sha512-02 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "SHA512() on Unicode data" ;
 *   mf:feature sparql:sha512 ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <sha512-02.rq> ;
 *            qt:data   <hash-unicode.ttl> ] ;
 *     mf:result  <sha512-02.srx> ;
 *   .
 */

describe('We should respect the sha512-02 spec', () => {
  const { s8 } = Data.hashUnicode();
  testAll([
    `SHA512(${s8}) = "b433ed0e60c818bea72d3aa1a43db89b3ed2b624597407b7912bbb7685f2e45ae5500e092da5f938391d282b26bc43e4035b12460c93ab5e2e1a05d582331d85"`,
  ]);
});

/**
 * RESULTS: sha512-02.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="hash"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="hash">
 *         <literal>
 *           b433ed0e60c818bea72d3aa1a43db89b3ed2b624597407b7912bbb7685f2e45ae5500e092da5f938391d282b26bc43e4035b12460c93ab5e2e1a05d582331d85
 *         </literal>
 *       </binding>
 *     </result>
 * </results>
 * </sparql>
 */
