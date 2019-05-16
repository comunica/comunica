import * as Data from './_data';

import { aliases as a, testAll, testAllErrors } from '../util/utils';

/**
 * REQUEST: timezone-01.rq
 *
 * PREFIX : <http://example.org/>
 * SELECT ?s (TIMEZONE(?date) AS ?x) WHERE {
 *   ?s :date ?date
 * }
 */

/**
 * Manifest Entry
 * :timezone rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "TIMEZONE()" ;
 *   mf:feature sparql:timezone ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <timezone-01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <timezone-01.srx> ;
 *   .
 */

describe('We should respect the timezone-01 spec', () => {
  const { d1, d2, d3, d4 } = Data.data();
  testAll([
    `TIMEZONE(${d1}) = "PT0S"^^xsd:dayTimeDuration`,
    `TIMEZONE(${d2}) = "-PT8H"^^xsd:dayTimeDuration`,
    `TIMEZONE(${d3}) = "PT0S"^^xsd:dayTimeDuration`,
  ]);

  testAllErrors([
    `TIMEZONE(${d4}) = error`,
  ]);
});

/**
 * RESULTS: timezone-01.srx
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
 *       <binding name="x"><literal datatype="http://www.w3.org/2001/XMLSchema#dayTimeDuration">PT0S</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/d2</uri></binding>
 *       <binding name="x">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#dayTimeDuration">-PT8H</literal>
 *       </binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/d3</uri></binding>
 *       <binding name="x"><literal datatype="http://www.w3.org/2001/XMLSchema#dayTimeDuration">PT0S</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/d4</uri></binding>
 *     </result>
 * </results>
 * </sparql>
 */
