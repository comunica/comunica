import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import * as Data from '@comunica/utils-expression-evaluator/test/spec/_data';
import { bool } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermRegex } from '../lib';

/**
 * REQUEST: regex-dot-all.rq
 *
 * PREFIX  rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
 * PREFIX  ex: <http://example.com/#>
 *
 * SELECT ?val
 * WHERE {
 *    ex:foo rdf:value ?val .
 *    FILTER regex(?val, "a.c", "s")
 * }
 */

/**
 * Manifest Entry
 * :regex-dot-all a mf:QueryEvaluationTest ;
 *       mf:name    "REGEX with an . operator and the s option" ;
 *       mf:action
 *           [ qt:query  <regex-dot-all.rq> ;
 *             qt:data   <regex-data-quantifiers.ttl> ] ;
 *       mf:result  <regex-dot-all.srx> .
 */

describe('We should respect the regex-dot-all spec', () => {
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
      '${s1}' "a.c" "s" = false
      '${s2}' "a.c" "s" = true
      '${s3}' "a.c" "s" = false
      '${s4}' "a.c" "s" = false
      '${s5}' "a.c" "s" = true
      '${s6}' "a.c" "s" = false
      '${s7}' "a.c" "s" = true
      '${s8}' "a.c" "s" = false
      '${s9}' "a.c" "s" = false
      '${s10}' "a.c" "s" = false
    `,
  });
});

/**
 * RESULTS: regex-dot-all.srx
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
 *           <literal>a
 * c</literal>
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
