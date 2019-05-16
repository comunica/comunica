import * as Data from './_data';

import { aliases as a, int, testAll } from '../util/utils';

/**
 * REQUEST: month-01.rq
 *
 * PREFIX : <http://example.org/>
 * SELECT ?s (MONTH(?date) AS ?x) WHERE {
 *   ?s :date ?date
 * }
 */

/**
 * Manifest Entry
 * :month rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "MONTH()" ;
 *   mf:feature sparql:month ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <month-01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <month-01.srx> ;
 *   .
 */

describe('We should respect the month-01 spec', () => {
  const { d1, d2, d3, d4 } = Data.data();
  testAll([
    `MONTH(${d1}) = ${int('6')}`,
    `MONTH(${d2}) = ${int('12')}`,
    `MONTH(${d3}) = ${int('6')}`,
    `MONTH(${d4}) = ${int('2')}`,
  ]);
});

/**
 * RESULTS: month-01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="s"/>
 *   <variable name="x"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="s"><uri>http://example.org/d1</uri></binding>
 *       <binding name="x"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">6</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/d2</uri></binding>
 *       <binding name="x"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">12</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/d3</uri></binding>
 *       <binding name="x"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">6</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/d4</uri></binding>
 *       <binding name="x"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">2</literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
