import * as Data from './_data';

import { aliases as a, int, testAll } from '../util/utils';

/**
 * REQUEST: day-01.rq
 *
 * PREFIX : <http://example.org/>
 * SELECT ?s (DAY(?date) AS ?x) WHERE {
 *   ?s :date ?date
 * }
 */

/**
 * Manifest Entry
 * :day rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "DAY()" ;
 *   mf:feature sparql:day ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <day-01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <day-01.srx> ;
 *   .
 */

describe('We should respect the day-01 spec', () => {
  const { d1, d2, d3, d4 } = Data.data();
  testAll([
    `DAY(${d1}) = ${int('21')}`,
    `DAY(${d2}) = ${int('21')}`,
    `DAY(${d3}) = ${int('20')}`,
    `DAY(${d4}) = ${int('1')}`,
  ]);
});

/**
 * RESULTS: day-01.srx
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
 *       <binding name="x"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">21</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/d2</uri></binding>
 *       <binding name="x"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">21</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/d3</uri></binding>
 *       <binding name="x"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">20</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/d4</uri></binding>
 *       <binding name="x"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">1</literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
