import * as Data from './_data';

import { aliases as a, int, testAll } from '../util/utils';

/**
 * REQUEST: hours-01.rq
 *
 * PREFIX : <http://example.org/>
 * SELECT ?s (HOURS(?date) AS ?x) WHERE {
 *   ?s :date ?date
 * }
 */

/**
 * Manifest Entry
 * :hours rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "HOURS()" ;
 *   mf:feature sparql:hours ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <hours-01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <hours-01.srx> ;
 *   .
 */

describe('We should respect the hours-01 spec', () => {
  const { d1, d2, d3, d4 } = Data.data();
  testAll([
    `HOURS(${d1}) = ${int('11')}`,
    `HOURS(${d2}) = ${int('15')}`,
    `HOURS(${d3}) = ${int('23')}`,
    `HOURS(${d4}) = ${int('1')}`,
  ]);
});

/**
 * RESULTS: hours-01.srx
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
 *       <binding name="x"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">11</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/d2</uri></binding>
 *       <binding name="x"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">15</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/d3</uri></binding>
 *       <binding name="x"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">23</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/d4</uri></binding>
 *       <binding name="x"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">1</literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
