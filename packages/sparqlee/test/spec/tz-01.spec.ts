import * as Data from './_data';

import { aliases as a, testAll } from '../util/utils';

/**
 * REQUEST: tz-01.rq
 *
 * PREFIX : <http://example.org/>
 * SELECT ?s (TZ(?date) AS ?x) WHERE {
 *   ?s :date ?date
 * }
 */

/**
 * Manifest Entry
 * :tz rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "TZ()" ;
 *   mf:feature sparql:tz ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <tz-01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <tz-01.srx> ;
 *   .
 */

describe('We should respect the tz-01 spec', () => {
  const { d1, d2, d3, d4 } = Data.data();
  testAll([
    `TZ(${d1}) = "Z"`,
    `TZ(${d2}) = "-08:00"`,
    `TZ(${d3}) = "Z"`,
    `TZ(${d4}) = ""`,
  ]);
});

/**
 * RESULTS: tz-01.srx
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
 *       <binding name="x"><literal>Z</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/d2</uri></binding>
 *       <binding name="x"><literal>-08:00</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/d3</uri></binding>
 *       <binding name="x"><literal>Z</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/d4</uri></binding>
 *       <binding name="x"><literal></literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
