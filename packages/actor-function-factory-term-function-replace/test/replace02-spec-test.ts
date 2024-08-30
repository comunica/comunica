import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import * as Data from '@comunica/expression-evaluator/test/spec/_data';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionReplace } from '../lib';

/**
 * REQUEST: replace02.rq
 *
 * PREFIX : <http://example.org/>
 * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
 * SELECT (REPLACE(?str,"ana", "*") AS ?new) WHERE {
 *   :s8 :str ?str
 * }
 */

/**
 * Manifest Entry
 * :replace02 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "REPLACE() with overlapping pattern" ;
 *   mf:feature sparql:replace ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <replace02.rq> ;
 *            qt:data   <data3.ttl> ] ;
 *     mf:result  <replace02.srx> ;
 *   .
 */

describe('We should respect the replace02 spec', () => {
  const { s8 } = Data.data3();
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionReplace(args),
    ],
    operation: 'REPLACE',
    arity: 'vary',
    notation: Notation.Function,
    testTable: `
      '${s8}' "ana" "*" = "b*na"
    `,
  });
});

/**
 * RESULTS: replace02.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="new"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="new"><literal>b*na</literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
