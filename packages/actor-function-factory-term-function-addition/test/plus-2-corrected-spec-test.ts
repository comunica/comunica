import {
  ActorFunctionFactoryExpressionFunctionBnode,
} from '@comunica/actor-function-factory-expression-function-bnode';

import { ActorFunctionFactoryTermFunctionStr } from '@comunica/actor-function-factory-term-function-str';
import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import * as Data from '@comunica/expression-evaluator/test/spec/_data';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionAddition } from '../lib';

/**
 * REQUEST: plus-2-corrected.rq
 *
 * PREFIX  : <http://example/>
 *
 * SELECT  ?x ?y ( str(?x) + str(?y) AS ?sum)
 * WHERE
 *     { ?s :p ?x ; :q ?y .
 *     }
 */

/**
 * Manifest Entry
 * :plus-2-corrected a mf:QueryEvaluationTest ;
 *     mf:name    "plus-2-corrected" ;
 *     rdfs:comment  "plus operator in combination with str(), i.e.  str(?x) + str(?y), on string and numeric values" ;
 *     dawgt:approval dawgt:Proposed ;
 *     mf:action
 *        [ qt:query  <plus-2-corrected.rq> ;
 *    qt:data   <data-builtin-3.ttl> ] ;
 *     mf:result  <plus-2.srx> ;
 *     .
 */

describe('We should respect the plus-2-corrected spec', () => {
  const {
    x1p,
    x1q,
    x2q,
    x3q,
    x4p,
    x4q,
    x5p,
    x5q,
    x6p,
    x6q,
    x7p,
    x7q,
    x8p,
    x8q,
  } = Data.dataBuiltin3();
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionAddition(args),
      args => new ActorFunctionFactoryExpressionFunctionBnode(args),
      args => new ActorFunctionFactoryTermFunctionStr(args),
    ],
    notation: Notation.Infix,
    operation: '+',
    arity: 2,
    errorTable: `
    'str(${x1p})'              'str(${x1q})' = 'Argument types not valid for operator'
    'str(BNODE())'             'str(${x2q})' = 'Argument types not valid for operator'
    'str(<http://example/a>)'  'str(${x3q})' = 'Argument types not valid for operator'
    'str(${x4p})'              'str(${x4q})' = 'Argument types not valid for operator'
    'str(${x5p})'              'str(${x5q})' = 'Argument types not valid for operator'
    'str(${x6p})'              'str(${x6q})' = 'Argument types not valid for operator'
    'str(${x7p})'              'str(${x7q})' = 'Argument types not valid for operator'
    'str(${x8p})'              'str(${x8q})' = 'Argument types not valid for operator'
    `,
  });
});

/**
 * RESULTS: plus-2-corrected.srx
 *
 * <?xml version="1.0"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 *   <head>
 *     <variable name="x"/>
 *     <variable name="y"/>
 *     <variable name="sum"/>
 *   </head>
 *   <results>
 *     <result>
 *       <binding name="x">
 *         <bnode>b0</bnode>
 *       </binding>
 *       <binding name="y">
 *         <literal>1</literal>
 *       </binding>
 *     </result>
 *     <result>
 *       <binding name="x">
 *         <uri>http://example/a</uri>
 *       </binding>
 *       <binding name="y">
 *         <literal>1</literal>
 *       </binding>
 *     </result>
 *     <result>
 *       <binding name="x">
 *         <literal>1</literal>
 *       </binding>
 *       <binding name="y">
 *         <literal>2</literal>
 *       </binding>
 *     </result>
 *     <result>
 *       <binding name="x">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#integer">1</literal>
 *       </binding>
 *       <binding name="y">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#integer">2</literal>
 *       </binding>
 *     </result>
 *     <result>
 *       <binding name="x">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#string">1</literal>
 *       </binding>
 *       <binding name="y">
 *         <literal>2</literal>
 *       </binding>
 *     </result>
 *     <result>
 *       <binding name="x">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#string">1</literal>
 *       </binding>
 *       <binding name="y">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#integer">2</literal>
 *       </binding>
 *     </result>
 *     <result>
 *       <binding name="x">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#decimal">1.0</literal>
 *       </binding>
 *       <binding name="y">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#integer">2</literal>
 *       </binding>
 *     </result>
 *     <result>
 *       <binding name="x">
 *         <literal>a</literal>
 *       </binding>
 *       <binding name="y">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#integer">1</literal>
 *       </binding>
 *     </result>
 *   </results>
 * </sparql>
 */
