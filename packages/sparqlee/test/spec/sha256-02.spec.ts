import * as Data from './_data';

import { aliases as a, testAll } from '../util/utils';

/**
 * REQUEST: sha256-02.rq
 *
 * PREFIX : <http://example.org/>
 * SELECT (SHA256(?l) AS ?hash) WHERE {
 *   :s8 :str ?l
 * }
 */

/**
 * Manifest Entry
 * :sha256-02 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "SHA256() on Unicode data" ;
 *   mf:feature sparql:sha256 ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <sha256-02.rq> ;
 *            qt:data   <hash-unicode.ttl> ] ;
 *     mf:result  <sha256-02.srx> ;
 *   .
 */

describe('We should respect the sha256-02 spec', () => {
  const { s8 } = Data.hashUnicode();
  testAll([
    `SHA256(${s8}) = "0fbe868d1df356ca9df7ebff346da3a56280e059a7ea81186ef885b140d254ee"`,
  ]);
});

/**
 * RESULTS: sha256-02.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="hash"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="hash">
 *         <literal>0fbe868d1df356ca9df7ebff346da3a56280e059a7ea81186ef885b140d254ee</literal>
 *       </binding>
 *     </result>
 * </results>
 * </sparql>
 */
