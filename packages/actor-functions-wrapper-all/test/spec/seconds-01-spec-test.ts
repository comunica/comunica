import { decimal } from '../util/Aliases';
import { Notation } from '../util/TestTable';
import { runTestTable } from '../util/utils';
import * as Data from './_data';

/**
 * REQUEST: seconds-01.rq
 *
 * PREFIX : <http://example.org/>
 * SELECT ?s (SECONDS(?date) AS ?x) WHERE {
 *   ?s :date ?date
 * }
 */

/**
 * Manifest Entry
 * :seconds rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "SECONDS()" ;
 *   mf:feature sparql:seconds ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <seconds-01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <seconds-01.srx> ;
 *   .
 */

describe('We should respect the seconds-01 spec', () => {
  const { d1, d2, d3, d4 } = Data.data();
  runTestTable({
    arity: 1,
    operation: 'SECONDS',
    notation: Notation.Function,
    testTable: `
      '${d1}' = '${decimal('1')}'
      '${d2}' = '${decimal('2')}'
      '${d3}' = '${decimal('0')}'
      '${d4}' = '${decimal('3')}'
    `,
  });
});

/**
 * RESULTS: seconds-01.srx
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
 *       <binding name="x"><literal datatype="http://www.w3.org/2001/XMLSchema#decimal">1</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/d2</uri></binding>
 *       <binding name="x"><literal datatype="http://www.w3.org/2001/XMLSchema#decimal">2</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/d3</uri></binding>
 *       <binding name="x"><literal datatype="http://www.w3.org/2001/XMLSchema#decimal">0</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/d4</uri></binding>
 *       <binding name="x"><literal datatype="http://www.w3.org/2001/XMLSchema#decimal">3</literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
