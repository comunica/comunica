import { ActorFunctionFactoryTermFunctionEquality } from '@comunica/actor-function-factory-term-function-equality';
import { ActorFunctionFactoryTermFunctionInequality } from '@comunica/actor-function-factory-term-function-inequality';
import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { bool } from '@comunica/expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryExpressionFunctionBnode } from '../lib';

/**
 * REQUEST: bnode01.rq
 *
 * PREFIX : <http://example.org/>
 * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
 * SELECT ?s1 ?s2
 * (BNODE(?s1) AS ?b1) (BNODE(?s2) AS ?b2)
 * WHERE {
 *   ?a :str ?s1 .
 *   ?b :str ?s2 .
 *   FILTER (?a = :s1 || ?a = :s3)
 *   FILTER (?b = :s1 || ?b = :s3)
 * }
 */

/**
 * Manifest Entry
 * :bnode01 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "BNODE(str)" ;
 *   mf:feature sparql:bnode ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <bnode01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <bnode01.srx> ;
 *   .
 */

// This does of course not correspond to the actual spec test.
describe('We should respect the bnode01 spec', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryExpressionFunctionBnode(args),
      args => new ActorFunctionFactoryTermFunctionInequality(args),
      args => new ActorFunctionFactoryTermFunctionEquality(args),
    ],
    arity: 2,
    operation: '!=',
    aliases: bool,
    notation: Notation.Infix,
    testTable: `
      'BNODE()' 'BNODE()' = true
    `,
  });
});

/**
 * RESULTS: bnode01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="s1"/>
 *   <variable name="s2"/>
 *   <variable name="b1"/>
 *   <variable name="b2"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="s1"><literal>BAZ</literal></binding>
 *       <binding name="s2"><literal>BAZ</literal></binding>
 *       <binding name="b1"><bnode>b0</bnode></binding>
 *       <binding name="b2"><bnode>b0</bnode></binding>
 *     </result>
 *     <result>
 *       <binding name="s1"><literal>foo</literal></binding>
 *       <binding name="s2"><literal>foo</literal></binding>
 *       <binding name="b1"><bnode>b1</bnode></binding>
 *       <binding name="b2"><bnode>b1</bnode></binding>
 *     </result>
 *     <result>
 *       <binding name="s1"><literal>foo</literal></binding>
 *       <binding name="s2"><literal>BAZ</literal></binding>
 *       <binding name="b1"><bnode>b2</bnode></binding>
 *       <binding name="b2"><bnode>b3</bnode></binding>
 *     </result>
 *     <result>
 *       <binding name="s1"><literal>BAZ</literal></binding>
 *       <binding name="s2"><literal>foo</literal></binding>
 *       <binding name="b1"><bnode>b4</bnode></binding>
 *       <binding name="b2"><bnode>b5</bnode></binding>
 *     </result>
 * </results>
 * </sparql>
 *
 */
