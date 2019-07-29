import * as Data from './_data';

import { aliases as a, int, testAll } from '../util/utils';

/**
 * REQUEST: year-01.rq
 *
 * PREFIX : <http://example.org/>
 * SELECT ?s (YEAR(?date) AS ?x) WHERE {
 *   ?s :date ?date
 * }
 */

/**
 * Manifest Entry
 * :year rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "YEAR()" ;
 *   mf:feature sparql:year ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <year-01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <year-01.srx> ;
 *   .
 */

describe('We should respect the year-01 spec', () => {
  const { d1, d2, d3, d4 } = Data.data();
  testAll([
    `YEAR(${d1}) = ${int('2010')}`,
    `YEAR(${d2}) = ${int('2010')}`,
    `YEAR(${d3}) = ${int('2008')}`,
    `YEAR(${d4}) = ${int('2011')}`,
  ]);
});

/**
 * RESULTS: year-01.srx
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
 *       <binding name="x"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">2010</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/d2</uri></binding>
 *       <binding name="x"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">2010</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/d3</uri></binding>
 *       <binding name="x"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">2008</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/d4</uri></binding>
 *       <binding name="x"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">2011</literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */

describe('We should allow YEAR on xsd:date', () => {
  const { dr1, dr2, dr3, dr4 } = Data.data();
  testAll([
    `YEAR(${dr1}) = ${int('2010')}`,
    `YEAR(${dr2}) = ${int('2010')}`,
    `YEAR(${dr3}) = ${int('2008')}`,
    `YEAR(${dr4}) = ${int('2011')}`,
  ]);
});
