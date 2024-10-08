import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import * as Data from '@comunica/utils-expression-evaluator/test/spec/_data';
import { int } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionDay } from '../lib';

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
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionDay(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'DAY',
    testTable: `
    '${d1}' = '${int('21')}'
    '${d2}' = '${int('21')}'
    '${d3}' = '${int('20')}'
    '${d4}' = '${int('1')}'
    `,
  });
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
