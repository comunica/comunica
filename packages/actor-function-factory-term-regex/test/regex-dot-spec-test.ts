import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import * as Data from '@comunica/utils-expression-evaluator/test/spec/_data';
import { bool } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermRegex } from '../lib';

/**
 * REQUEST: regex-dot.rq
 *
 * PREFIX  rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
 * PREFIX  ex: <http://example.com/#>
 *
 * SELECT ?val
 * WHERE {
 *    ex:foo rdf:value ?val .
 *    FILTER regex(?val, "a.c")
 * }
 */

/**
 * Manifest Entry
 * :regex-dot a mf:QueryEvaluationTest ;
 *       mf:name    "REGEX with an . operator" ;
 *       mf:action
 *           [ qt:query  <regex-dot.rq> ;
 *             qt:data   <regex-data-quantifiers.ttl> ] ;
 *       mf:result  <regex-dot.srx> .
 */

describe('We should respect the regex-dot spec', () => {
  const { s1, s2, s3, s4, s5, s6, s7, s8, s9, s10 } = Data.dataRegexQuantifiers();
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermRegex(args),
    ],
    arity: 'vary',
    notation: Notation.Function,
    operation: 'regex',
    aliases: bool,
    testTable: `
      '${s1}' "a.c" = false
      '${s2}' "a.c" = true
      '${s3}' "a.c" = false
      '${s4}' "a.c" = false
      '${s5}' "a.c" = false
      '${s6}' "a.c" = false
      '${s7}' "a.c" = true
      '${s8}' "a.c" = false
      '${s9}' "a.c" = false
      '${s10}' "a.c" = false
    `,
  });
});

/**
 * RESULTS: regex-dot.srx
 *
 * <?xml version="1.0"?>
 * <sparql>
 *   <head>
 *     <variable name="val"/>
 *   </head>
 *   <results>
 *     <result>
 *       <binding name="val">
 *           <literal>abc</literal>
 *       </binding>
 *     </result>
 *     <result>
 *       <binding name="val">
 *           <literal>a.c</literal>
 *       </binding>
 *     </result>
 *   </results>
 * </sparql>
 */
