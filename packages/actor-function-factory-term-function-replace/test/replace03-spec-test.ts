import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import * as Data from '@comunica/expression-evaluator/test/spec/_data';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionReplace } from '../lib';

/**
 * REQUEST: replace03.rq
 *
 * PREFIX : <http://example.org/>
 * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
 * SELECT (REPLACE(?str,"(ab)|(a)", "[1=$1][2=$2]") AS ?new) WHERE {
 *   :s9 :str ?str
 * }
 */

/**
 * Manifest Entry
 * :replace03 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "REPLACE() with captured substring" ;
 *   mf:feature sparql:replace ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <replace03.rq> ;
 *            qt:data   <data3.ttl> ] ;
 *     mf:result  <replace03.srx> ;
 *   .
 */

describe('We should respect the replace03 spec', () => {
  const { s9 } = Data.data3();
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionReplace(args),
    ],
    operation: 'REPLACE',
    arity: 'vary',
    notation: Notation.Function,
    testTable: `
      '${s9}' "(ab)|(a)" "[1=$1][2=$2]" = "[1=ab][2=]cd"
    `,
  });
});

/**
 * RESULTS: replace03.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="new"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="new"><literal>[1=ab][2=]cd</literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
