import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import * as Data from '@comunica/utils-expression-evaluator/test/spec/_data';
import { bool } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermRegex } from '../lib';

/**
 * REQUEST: regex-start-end.rq
 *
 * PREFIX  rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
 * PREFIX  ex: <http://example.com/#>
 *
 * SELECT ?val
 * WHERE {
 *    ex:foo rdf:value ?val .
 *    FILTER regex(?val, "^b$")
 * }
 */

/**
 * Manifest Entry
 * :regex-start-end a mf:QueryEvaluationTest ;
 *       mf:name    "REGEX with ^ and $" ;
 *       mf:action
 *           [ qt:query  <regex-start-end.rq> ;
 *             qt:data   <regex-data-quantifiers.ttl> ] ;
 *       mf:result  <regex-start-end.srx> .
 */

describe('We should respect the regex-start-end spec', () => {
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
      '${s1}' '"^b$"' = false
      '${s2}' '"^b$"' = false
      '${s3}' '"^b$"' = false
      '${s4}' '"^b$"' = false
      '${s5}' '"^b$"' = false
      '${s6}' '"^b$"' = false
      '${s7}' '"^b$"' = false
      '${s8}' '"^b$"' = false
      '${s9}' '"^b$"' = false
      '${s10}' '"^b$"' = true
    `,
  });
});

/**
 * RESULTS: regex-start-end.srx
 *
 * <?xml version="1.0"?>
 * <sparql>
 *    <head>
 *        <variable name="val"/>
 *    </head>
 *    <results>
 *        <result>
 *            <binding name="val">
 *                <literal>b</literal>
 *            </binding>
 *        </result>
 *    </results>
 * </sparql>
 */
