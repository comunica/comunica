import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import * as Data from '@comunica/utils-expression-evaluator/test/spec/_data';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermStrLang } from '../lib/ActorFunctionFactoryTermStrLang';

/**
 * REQUEST: strlang03.rq
 *
 * PREFIX : <http://example.org/>
 * SELECT ?s (STRLANG(?o,"en-US") AS ?str1) WHERE {
 *   ?s ?p ?o
 * }
 */

/**
 * Manifest Entry
 * :strlang03-rdf11 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "STRLANG() TypeErrors (updated for RDF 1.1)" ;
 *   mf:feature sparql:strlang ;
 *     dawgt:approval dawgt:Proposed ;
 *     mf:action
 *          [ qt:query  <strlang03.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <strlang03-rdf11.srx> ;
 *   .
 */

describe('We should respect the strlang03 spec', () => {
  const { n1, n2, n3, n4, n5, s1, s2, s3, s4, s5, s6, s7, d1, d2, d3, d4 } = Data.data();
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermStrLang(args),
    ],
    arity: 2,
    operation: 'STRLANG',
    notation: Notation.Function,
    testTable: `
      ${s1} "en-US" = "foo"@en-us
      ${s3} "en-US" = "BAZ"@en-us
      ${s4} "en-US" = "食べ物"@en-us
      ${s5} "en-US" = "100%"@en-us
      ${s6} "en-US" = "abc"@en-us
      ${s7} "en-US" = "DEF"@en-us    
    `,
    errorTable: `
    '${n1}' "en-US" = 'Argument types not valid for operator'
    '${n2}' "en-US" = 'Argument types not valid for operator'
    '${n3}' "en-US" = 'Argument types not valid for operator'
    '${n4}' "en-US" = 'Argument types not valid for operator'
    '${n5}' "en-US" = 'Argument types not valid for operator'

    '${s2}' "en-US" = 'Argument types not valid for operator'

    '${d1}' "en-US" = 'Argument types not valid for operator'
    '${d2}' "en-US" = 'Argument types not valid for operator'
    '${d3}' "en-US" = 'Argument types not valid for operator'
    '${d4}' "en-US" = 'Argument types not valid for operator'
    `,
  });
});

/**
 * RESULTS: strlang03.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="s"/>
 *   <variable name="str1"/>
 * </head>
 * <results>
 *     <result><binding name="s"><uri>http://example.org/n1</uri></binding></result>
 *     <result><binding name="s"><uri>http://example.org/n2</uri></binding></result>
 *     <result><binding name="s"><uri>http://example.org/n3</uri></binding></result>
 *     <result><binding name="s"><uri>http://example.org/n4</uri></binding></result>
 *     <result><binding name="s"><uri>http://example.org/n5</uri></binding></result>
 *
 *     <result>
 *       <binding name="s"><uri>http://example.org/s1</uri></binding>
 *       <binding name="str1"><literal xml:lang="en-us">foo</literal></binding>
 *     </result>
 *     <result><binding name="s"><uri>http://example.org/s2</uri></binding></result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s3</uri></binding>
 *       <binding name="str1"><literal xml:lang="en-us">BAZ</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s4</uri></binding>
 *       <binding name="str1"><literal xml:lang="en-us">食べ物</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s5</uri></binding>
 *       <binding name="str1"><literal xml:lang="en-us">100%</literal></binding>
 *     </result>
 *     <result>
 *        <binding name="s"><uri>http://example.org/s6</uri></binding>
 *        <binding name="str1"><literal xml:lang="en-us">abc</literal></binding>
 *      </result>
 *     <result>
 *        <binding name="s"><uri>http://example.org/s7</uri></binding>
 *        <binding name="str1"><literal xml:lang="en-us">DEF</literal></binding>
 *      </result>
 *
 *     <result><binding name="s"><uri>http://example.org/d1</uri></binding></result>
 *     <result><binding name="s"><uri>http://example.org/d2</uri></binding></result>
 *     <result><binding name="s"><uri>http://example.org/d3</uri></binding></result>
 *     <result><binding name="s"><uri>http://example.org/d4</uri></binding></result>
 * </results>
 * </sparql>
 */
