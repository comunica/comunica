import * as Data from './_data';

import { aliases as a, decimal, int, testAll } from '../util/utils';

/**
 * REQUEST: round01.rq
 *
 * PREFIX : <http://example.org/>
 * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
 * SELECT ?s ?num (ROUND(?num) AS ?round) WHERE {
 *   ?s :num ?num
 * }
 */

/**
 * Manifest Entry
 * :round01 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "ROUND()" ;
 *   mf:feature sparql:round ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <round01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <round01.srx> ;
 *   .
 */

describe('We should respect the round01 spec', () => {
  const { n1, n2, n3, n4, n5 } = Data.data();
  testAll([
    `ROUND(${n1}) = ${int('-1')}`,
    `ROUND(${n2}) = ${decimal('-2')}`,
    `ROUND(${n3}) = ${decimal('1')}`,
    `ROUND(${n4}) = ${int('-2')}`,
    `ROUND(${n5}) = ${decimal('3')}`,
  ]);
});

/**
 * RESULTS: round01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="s"/>
 *   <variable name="num"/>
 *   <variable name="round"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="s"><uri>http://example.org/n1</uri></binding>
 *       <binding name="num"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">-1</literal></binding>
 *       <binding name="round"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">-1</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/n5</uri></binding>
 *       <binding name="num"><literal datatype="http://www.w3.org/2001/XMLSchema#decimal">2.5</literal></binding>
 *       <binding name="round"><literal datatype="http://www.w3.org/2001/XMLSchema#decimal">3</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/n4</uri></binding>
 *       <binding name="num"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">-2</literal></binding>
 *       <binding name="round"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">-2</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/n3</uri></binding>
 *       <binding name="num"><literal datatype="http://www.w3.org/2001/XMLSchema#decimal">1.1</literal></binding>
 *       <binding name="round"><literal datatype="http://www.w3.org/2001/XMLSchema#decimal">1</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/n2</uri></binding>
 *       <binding name="num"><literal datatype="http://www.w3.org/2001/XMLSchema#decimal">-1.6</literal></binding>
 *       <binding name="round"><literal datatype="http://www.w3.org/2001/XMLSchema#decimal">-2</literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
