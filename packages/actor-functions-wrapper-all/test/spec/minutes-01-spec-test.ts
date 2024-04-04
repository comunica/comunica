import { int } from '../util/Aliases';
import { Notation } from '../util/TestTable';
import { runTestTable } from '../util/utils';
import * as Data from './_data';

/**
 * REQUEST: minutes-01.rq
 *
 * PREFIX : <http://example.org/>
 * SELECT ?s (MINUTES(?date) AS ?x) WHERE {
 *   ?s :date ?date
 * }
 */

/**
 * Manifest Entry
 * :minutes rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "MINUTES()" ;
 *   mf:feature sparql:minutes ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <minutes-01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <minutes-01.srx> ;
 *   .
 */

describe('We should respect the minutes-01 spec', () => {
  const { d1, d2, d3, d4 } = Data.data();
  runTestTable({
    arity: 1,
    notation: Notation.Function,
    operation: 'MINUTES',
    testTable: `
      '${d1}' = '${int('28')}'
      '${d2}' = '${int('38')}'
      '${d3}' = '${int('59')}'
      '${d4}' = '${int('2')}'
    `,
  });
});

/**
 * RESULTS: minutes-01.srx
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
 *       <binding name="x"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">28</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/d2</uri></binding>
 *       <binding name="x"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">38</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/d3</uri></binding>
 *       <binding name="x"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">59</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/d4</uri></binding>
 *       <binding name="x"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">2</literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
