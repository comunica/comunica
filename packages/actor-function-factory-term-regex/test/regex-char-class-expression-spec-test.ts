import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import * as Data from '@comunica/utils-expression-evaluator/test/spec/_data';
import { bool } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermRegex } from '../lib';

/**
 * REQUEST: regex-char-class-expression.rq
 *
 * PREFIX  rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
 * PREFIX  ex: <http://example.com/#>
 *
 * SELECT ?val
 * WHERE {
 *    ex:foo rdf:value ?val .
 *    FILTER regex(?val, "a[b\\n]c")
 * }
 */

/**
 * Manifest Entry
 * :regex-char-class-expression a mf:QueryEvaluationTest ;
 *       mf:name    "REGEX with [] expression" ;
 *       mf:action
 *           [ qt:query  <regex-char-class-expression.rq> ;
 *             qt:data   <regex-data-quantifiers.ttl> ] ;
 *       mf:result  <regex-char-class-expression.srx> .
 */

describe('We should respect the regex-char-class-expression spec', () => {
  const { s1, s2, s3, s4, s5, s6, s7, s8, s9, s10 } = Data.dataRegexQuantifiers();
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermRegex(args),
    ],
    arity: 2,
    notation: Notation.Function,
    operation: 'regex',
    aliases: bool,
    testTable: `
      '${s1}' "a[b\\n]c" = false
      '${s2}' "a[b\\n]c" = true
      '${s3}' "a[b\\n]c" = false
      '${s4}' "a[b\\n]c" = false
      '${s5}' "a[b\\n]c" = true
      '${s6}' "a[b\\n]c" = false
      '${s7}' "a[b\\n]c" = false
      '${s8}' "a[b\\n]c" = false
      '${s9}' "a[b\\n]c" = false
      '${s10}' "a[b\\n]c" = false
    `,
  });
});

/**
 * RESULTS: regex-char-class-expression.srx
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
 *                <literal>a
 * c</literal>
 *            </binding>
 *        </result>
 *    </results>
 * </sparql>
 */
