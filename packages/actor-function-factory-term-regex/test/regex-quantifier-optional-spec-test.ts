import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import * as Data from '@comunica/utils-expression-evaluator/test/spec/_data';
import { bool } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermRegex } from '../lib';

/**
 * REQUEST: regex-quantifier-optional.rq
 *
 * PREFIX  rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
 * PREFIX  ex: <http://example.com/#>
 *
 * SELECT ?val
 * WHERE {
 *    ex:foo rdf:value ?val .
 *    FILTER regex(?val, "ab?c")
 * }
 */

/**
 * Manifest Entry
 * :regex-data-quantifier-optional a mf:QueryEvaluationTest ;
 *       mf:name    "REGEX with an ? quantifier" ;
 *       mf:action
 *           [ qt:query  <regex-quantifier-optional.rq> ;
 *             qt:data   <regex-data-quantifiers.ttl> ] ;
 *       mf:result  <regex-quantifier-optional.srx> .
 */

describe('We should respect the regex-data-quantifier-optional spec', () => {
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
      '${s1}' '"ab?c"' = true
      '${s2}' '"ab?c"' = true
      '${s3}' '"ab?c"' = false
      '${s4}' '"ab?c"' = false
      '${s5}' '"ab?c"' = false
      '${s6}' '"ab?c"' = false
      '${s7}' '"ab?c"' = false
      '${s8}' '"ab?c"' = false
      '${s9}' '"ab?c"' = false
      '${s10}' '"ab?c"' = false
    `,
  });
});

/**
 * RESULTS: regex-quantifier-optional.srx
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
 *   </results>
 * </sparql>
 */
