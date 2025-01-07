import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import * as Data from '@comunica/utils-expression-evaluator/test/spec/_data';
import { bool } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermRegex } from '../lib';

/**
 * REQUEST: regex-quantifier-zero-or-more.rq
 *
 * PREFIX  rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
 * PREFIX  ex: <http://example.com/#>
 *
 * SELECT ?val
 * WHERE {
 *    ex:foo rdf:value ?val .
 *    FILTER regex(?val, "ab*c")
 * }
 */

/**
 * Manifest Entry
 * :regex-quantifier-zero-or-more a mf:QueryEvaluationTest ;
 *       mf:name    "REGEX with an * quantifier" ;
 *       mf:action
 *           [ qt:query  <regex-quantifier-zero-or-more.rq> ;
 *             qt:data   <regex-data-quantifiers.ttl> ] ;
 *       mf:result  <regex-quantifier-zero-or-more.srx> .
 */

describe('We should respect the regex-quantifier-zero-or-more spec', () => {
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
      '${s1}' '"ab*c"' = true
      '${s2}' '"ab*c"' = true
      '${s3}' '"ab*c"' = true
      '${s4}' '"ab*c"' = true
      '${s5}' '"ab*c"' = false
      '${s6}' '"ab*c"' = false
      '${s7}' '"ab*c"' = false
      '${s8}' '"ab*c"' = false
      '${s9}' '"ab*c"' = false
      '${s10}' '"ab*c"' = false
    `,
  });
});

/**
 * RESULTS: regex-quantifier-zero-or-more.srx
 *
 * <?xml version="1.0"?>
 * <sparql>
 *   <head>
 *     <variable name="val"/>
 *   </head>
 *   <results>
 *     <result>
 *       <binding name="val">
 *           <literal>ac</literal>
 *       </binding>
 *     </result>
 *     <result>
 *       <binding name="val">
 *           <literal>abc</literal>
 *       </binding>
 *     </result>
 *     <result>
 *       <binding name="val">
 *           <literal>abbc</literal>
 *       </binding>
 *     </result>
 *     <result>
 *       <binding name="val">
 *         <literal>abbbc</literal>
 *       </binding>
 *     </result>
 *   </results>
 * </sparql>
 */
