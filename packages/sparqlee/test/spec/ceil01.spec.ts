import * as Data from './_data';

import { decimal, int, testAll } from '../util/utils';

/**
 * REQUEST: ceil01.rq
 *
 * PREFIX : <http://example.org/>
 * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
 * SELECT ?s ?num (CEIL(?num) AS ?ceil) WHERE {
 *   ?s :num ?num
 * }
 */

/**
 * Manifest Entry
 * :ceil01 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "CEIL()" ;
 *   mf:feature sparql:ceil ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <ceil01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <ceil01.srx> ;
 *   .
 */

describe('We should respect the ceil01 spec', () => {
  const { n1, n2, n3, n4, n5 } = Data.data();
  testAll([
    `ceil(${n1}) = ${int('-1')}`,
    `ceil(${n2}) = ${decimal('-1')}`,
    `ceil(${n3}) = ${decimal('2')}`,
    `ceil(${n4}) = ${int('-2')}`,
    `ceil(${n5}) = ${decimal('3')}`,
  ]);
});

/**
 * RESULTS: ceil01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="s"/>
 *   <variable name="num"/>
 *   <variable name="ceil"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="s"><uri>http://example.org/n1</uri></binding>
 *       <binding name="num"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">-1</literal></binding>
 *       <binding name="ceil"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">-1</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/n5</uri></binding>
 *       <binding name="num"><literal datatype="http://www.w3.org/2001/XMLSchema#decimal">2.5</literal></binding>
 *       <binding name="ceil"><literal datatype="http://www.w3.org/2001/XMLSchema#decimal">3</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/n4</uri></binding>
 *       <binding name="num"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">-2</literal></binding>
 *       <binding name="ceil"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">-2</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/n3</uri></binding>
 *       <binding name="num"><literal datatype="http://www.w3.org/2001/XMLSchema#decimal">1.1</literal></binding>
 *       <binding name="ceil"><literal datatype="http://www.w3.org/2001/XMLSchema#decimal">2</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/n2</uri></binding>
 *       <binding name="num"><literal datatype="http://www.w3.org/2001/XMLSchema#decimal">-1.6</literal></binding>
 *       <binding name="ceil"><literal datatype="http://www.w3.org/2001/XMLSchema#decimal">-1</literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
