import {
  ActorFunctionFactoryExpressionFunctionBnode,
} from '@comunica/actor-function-factory-expression-function-bnode';
import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import * as Data from '@comunica/utils-expression-evaluator/test/spec/_data';
import { int, decimal } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionAddition } from '../lib';

/**
 * REQUEST: plus-1-corrected.rq
 *
 * PREFIX  : <http://example/>
 * SELECT  ?x ?y ( ?x + ?y AS ?sum)
 * WHERE
 *     { ?s :p ?x ; :q ?y .
 *     }
 */

/**
 * Manifest Entry
 * :plus-1-corrected a mf:QueryEvaluationTest ;
 *     mf:name    "plus-1-corrected" ;
 *     rdfs:comment  "plus operator on ?x + ?y on string and numeric values" ;
 *     dawgt:approval dawgt:Proposed ;
 *     mf:action
 *        [ qt:query  <plus-1-corrected.rq> ;
 *    qt:data   <data-builtin-3.ttl> ] ;
 *     mf:result  <plus-1.srx> ;
 *     .
 */

describe('We should respect the plus-1-corrected spec', () => {
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
    ],
    notation: Notation.Infix,
    operation: '+',
    arity: 2,
    testTable: `
      '${x4p}' '${x4q}' = '${int('3')}'
      '${x5p}' '${x5q}' = '${decimal('3')}'
    `,
    errorTable: `
      '${x1p}' '${x1q}' = 'Argument types not valid for operator'
      'BNODE()' '${x2q}' = 'Argument types not valid for operator'
      '<http://example/a>' '${x3q}' = 'Argument types not valid for operator'
      '${x6p}' '${x6q}' = 'Argument types not valid for operator'
      '${x7p}' '${x7q}' = 'Argument types not valid for operator'
      '${x8p}' '${x8q}' = 'Argument types not valid for operator'
    `,
  });
});

/**
 * RESULTS: plus-1-corrected.srx
 *
 * <?xml version="1.0"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 *   <head>
 *     <variable name="x"/>
 *     <variable name="y"/>
 *     <variable name="sum"/>
 *   </head>
 *   <results>
 *     <result>                                //x2
 *       <binding name="x">
 *         <bnode>b0</bnode>
 *       </binding>
 *       <binding name="y">
 *         <literal>1</literal>
 *       </binding>
 *     </result>
 *     <result>                                //x3
 *       <binding name="x">
 *         <uri>http://example/a</uri>
 *       </binding>
 *       <binding name="y">
 *         <literal>1</literal>
 *       </binding>
 *     </result>
 *     <result>                               //x6
 *       <binding name="x">
 *         <literal>1</literal>
 *       </binding>
 *       <binding name="y">
 *         <literal>2</literal>
 *       </binding>
 *     </result>
 *     <result>                              //x4
 *       <binding name="x">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#integer">1</literal>
 *       </binding>
 *       <binding name="y">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#integer">2</literal>
 *       </binding>
 *       <binding name="sum">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#integer">3</literal>
 *       </binding>
 *     </result>                            //x7
 *     <result>
 *       <binding name="x">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#string">1</literal>
 *       </binding>
 *       <binding name="y">
 *         <literal>2</literal>
 *       </binding>
 *     </result>
 *     <result>                             //x8
 *       <binding name="x">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#string">1</literal>
 *       </binding>
 *       <binding name="y">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#integer">2</literal>
 *       </binding>
 *     </result>
 *     <result>                             //x5
 *       <binding name="x">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#decimal">1.0</literal>
 *       </binding>
 *       <binding name="y">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#integer">2</literal>
 *       </binding>
 *       <binding name="sum">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#decimal">3.0</literal>
 *       </binding>
 *     </result>                           //x1
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
