import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import * as Data from '@comunica/utils-expression-evaluator/test/spec/_data';
import { bool } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermRegex } from '../lib';

/**
 * REQUEST: regex-no-metacharacters.rq
 *
 * PREFIX  rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
 * PREFIX  ex: <http://example.com/#>
 *
 * SELECT ?val
 * WHERE {
 *    ex:foo rdf:value ?val .
 *    FILTER regex(?val, "a?+*.{}()[]c", "q")
 * }
 */

/**
 * Manifest Entry
 * :regex-no-metacharacters a mf:QueryEvaluationTest ;
 *       mf:name    "REGEX with the q option" ;
 *       mf:action
 *           [ qt:query  <regex-no-metacharacters.rq> ;
 *             qt:data   <regex-data-quantifiers.ttl> ] ;
 *       mf:result  <regex-no-metacharacters.srx> .
 */

describe('We should respect the regex-no-metacharacters spec', () => {
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
      '${s1}' '"a?+*.{}()[]c"' '"q"' = false
      '${s2}' '"a?+*.{}()[]c"' '"q"' = false
      '${s3}' '"a?+*.{}()[]c"' '"q"' = false
      '${s4}' '"a?+*.{}()[]c"' '"q"' = false
      '${s5}' '"a?+*.{}()[]c"' '"q"' = false
      '${s6}' '"a?+*.{}()[]c"' '"q"' = false
      '${s7}' '"a?+*.{}()[]c"' '"q"' = false
      '${s8}' '"a?+*.{}()[]c"' '"q"' = false
      '${s9}' '"a?+*.{}()[]c"' '"q"' = true
      '${s10}' '"a?+*.{}()[]c"' '"q"' = false
    `,
  });
});

/**
 * RESULTS: regex-no-metacharacters.srx
 *
 * <?xml version="1.0"?>
 * <sparql>
 *    <head>
 *        <variable name="val"/>
 *    </head>
 *    <results>
 *        <result>
 *            <binding name="val">
 *                <literal>a?+*.{}()[]c</literal>
 *            </binding>
 *        </result>
 *    </results>
 * </sparql>
 */
