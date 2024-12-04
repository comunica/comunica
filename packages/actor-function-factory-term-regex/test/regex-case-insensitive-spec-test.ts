import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import * as Data from '@comunica/utils-expression-evaluator/test/spec/_data';
import { bool } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermRegex } from '../lib';

/**
 * REQUEST: regex-case-insensitive.rq
 *
 * PREFIX  rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
 * PREFIX  ex: <http://example.com/#>
 * SELECT ?val
 * WHERE {
 *    ex:foo rdf:value ?val .
 *    FILTER regex(?val, "abc", "i")
 * }
 */

/**
 * Manifest Entry
 * :regex-case-insensitive a mf:QueryEvaluationTest ;
 *       mf:name    "REGEX with the i option" ;
 *       mf:action
 *           [ qt:query  <regex-case-insensitive.rq> ;
 *             qt:data   <regex-data-quantifiers.ttl> ] ;
 *       mf:result  <regex-case-insensitive.srx> .
 */

describe('We should respect the regex-case-insensitive spec', () => {
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
      '${s1}' "abc" "i" = false
      '${s2}' "abc" "i" = true
      '${s3}' "abc" "i" = false
      '${s4}' "abc" "i" = false
      '${s5}' "abc" "i" = false
      '${s6}' "abc" "i" = false
      '${s7}' "abc" "i" = false
      '${s8}' "abc" "i" = true
      '${s9}' "abc" "i" = false
      '${s10}' "abc" "i" = false
    `,
  });
});

/**
 * RESULTS: regex-case-insensitive.srx
 *
 * <?xml version="1.0"?>
 * <sparql>
 *    <head>
 *        <variable name="val"/>
 *    </head>
 *    <results>
 *        <result>
 *            <binding name="val">
 *                <literal>abc</literal>
 *            </binding>
 *        </result>
 *        <result>
 *            <binding name="val">
 *                <literal>ABC</literal>
 *            </binding>
 *        </result>
 *    </results>
 * </sparql>
 */
