import { ActorFunctionFactoryTermEquality } from '@comunica/actor-function-factory-term-equality';
import {
  ActorFunctionFactoryTermGreaterThanEqual,
} from '@comunica/actor-function-factory-term-greater-than-equal';
import { ActorFunctionFactoryTermLesserThan } from '@comunica/actor-function-factory-term-lesser-than';
import {
  ActorFunctionFactoryTermLesserThanEqual,
} from '@comunica/actor-function-factory-term-lesser-than-equal';
import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import * as Data from '@comunica/utils-expression-evaluator/test/spec/_data';
import { bool } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermAbs } from '../lib';

/**
 * REQUEST: abs01.rq
 *
 * PREFIX : <http://example.org/>
 * SELECT * WHERE {
 *   ?s :num ?num
 *   FILTER(ABS(?num) >= 2)
 * }
 */

/**
 * Manifest Entry
 * :abs01 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "ABS()" ;
 *   mf:feature sparql:abs ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <abs01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <abs01.srx> ;
 *   .
 */

describe('We should respect the abs01 spec', () => {
  const { n1, n2, n3, n4, n5 } = Data.data();
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermGreaterThanEqual(args),
      args => new ActorFunctionFactoryTermLesserThanEqual(args),
      args => new ActorFunctionFactoryTermLesserThan(args),
      args => new ActorFunctionFactoryTermEquality(args),
      args => new ActorFunctionFactoryTermAbs(args),
    ],
    arity: 2,
    notation: Notation.Infix,
    operation: '>=',
    aliases: bool,
    testTable: `
      'abs(${n1})' 2 = false
      'abs(${n2})' 2 = false
      'abs(${n3})' 2 = false
      'abs(${n4})' 2 = true
      'abs(${n5})' 2 = true
    `,
  });
});

/**
 * RESULTS: abs01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="s"/>
 *   <variable name="num"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="s"><uri>http://example.org/n5</uri></binding>
 *       <binding name="num"><literal datatype="http://www.w3.org/2001/XMLSchema#decimal">2.5</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/n4</uri></binding>
 *       <binding name="num"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">-2</literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
