import * as Data from './_data';

import { aliases as a, testAll } from '../util/utils';

/**
 * REQUEST: abs01.rq
 *
 * PREFIX : <http://example.org/>
 * SELECT * WHERE {
 *   ?s :num ?num
 *   FILTER(ABS(?num) >= 2)
 * }
 */

/**
 * Manifest Entry
 * :abs01 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "ABS()" ;
 *   mf:feature sparql:abs ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <abs01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <abs01.srx> ;
 *   .
 */

describe('We should respect the abs01 spec', () => {
  const { n1, n2, n3, n4, n5 } = Data.data();
  testAll([
    `abs(${n1}) >= 2 = ${a.false}`,
    `abs(${n2}) >= 2 = ${a.false}`,
    `abs(${n3}) >= 2 = ${a.false}`,
    `abs(${n4}) >= 2 = ${a.true}`,
    `abs(${n5}) >= 2 = ${a.true}`,
  ]);
});

/**
 * RESULTS: abs01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="s"/>
 *   <variable name="num"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="s"><uri>http://example.org/n5</uri></binding>
 *       <binding name="num"><literal datatype="http://www.w3.org/2001/XMLSchema#decimal">2.5</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/n4</uri></binding>
 *       <binding name="num"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">-2</literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
