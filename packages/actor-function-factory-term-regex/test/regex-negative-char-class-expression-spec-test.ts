import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import * as Data from '@comunica/utils-expression-evaluator/test/spec/_data';
import { bool } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermRegex } from '../lib';

/**
 * REQUEST: regex-negative-char-class-expression.rq
 *
 * PREFIX  rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
 * PREFIX  ex: <http://example.com/#>
 *
 * SELECT ?val
 * WHERE {
 *    ex:foo rdf:value ?val .
 *    FILTER regex(?val, "a[^b]c")
 * }
 */

/**
 * Manifest Entry
 * :regex-negative-char-class-expression a mf:QueryEvaluationTest ;
 *       mf:name    "REGEX with a [^] expression" ;
 *       mf:action
 *           [ qt:query  <regex-negative-char-class-expression.rq> ;
 *             qt:data   <regex-data-quantifiers.ttl> ] ;
 *       mf:result  <regex-negative-char-class-expression.srx> .
 */

describe('We should respect the regex-negative-char-class-expression spec', () => {
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
      '${s1}' '"a[^b]c"' = false
      '${s2}' '"a[^b]c"' = false
      '${s3}' '"a[^b]c"' = false
      '${s4}' '"a[^b]c"' = false
      '${s5}' '"a[^b]c"' = true
      '${s6}' '"a[^b]c"' = false
      '${s7}' '"a[^b]c"' = true
      '${s8}' '"a[^b]c"' = false
      '${s9}' '"a[^b]c"' = false
      '${s10}' '"a[^b]c"' = false
    `,
  });
});

/**
 * RESULTS: regex-negative-char-class-expression.srx
 *
 * <?xml version="1.0"?>
 * <sparql>
 *    <head>
 *        <variable name="val"/>
 *    </head>
 *    <results>
 *        <result>
 *            <binding name="val">
 *                <literal>a
 * c</literal>
 *            </binding>
 *        </result>
 *        <result>
 *            <binding name="val">
 *                <literal>a.c</literal>
 *            </binding>
 *        </result>
 *    </results>
 * </sparql>
 */
