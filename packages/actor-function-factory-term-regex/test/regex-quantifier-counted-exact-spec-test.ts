import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import * as Data from '@comunica/utils-expression-evaluator/test/spec/_data';
import { bool } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermRegex } from '../lib';

/**
 * REQUEST: regex-quantifier-counted-exact.rq
 *
 * PREFIX  rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
 * PREFIX  ex: <http://example.com/#>
 *
 * SELECT ?val
 * WHERE {
 *    ex:foo rdf:value ?val .
 *    FILTER regex(?val, "ab{2}c")
 * }
 */

/**
 * Manifest Entry
 * :regex-quantifier-counted-exact a mf:QueryEvaluationTest ;
 *       mf:name    "REGEX with an {2} quantifier" ;
 *       mf:action
 *           [ qt:query  <regex-quantifier-counted-exact.rq> ;
 *             qt:data   <regex-data-quantifiers.ttl> ] ;
 *       mf:result  <regex-quantifier-counted-exact.srx> .
 */

describe('We should respect the regex-quantifier-counted-exact spec', () => {
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
      '${s1}' '"ab{2}c"' = false
      '${s2}' '"ab{2}c"' = false
      '${s3}' '"ab{2}c"' = true
      '${s4}' '"ab{2}c"' = false
      '${s5}' '"ab{2}c"' = false
      '${s6}' '"ab{2}c"' = false
      '${s7}' '"ab{2}c"' = false
      '${s8}' '"ab{2}c"' = false
      '${s9}' '"ab{2}c"' = false
      '${s10}' '"ab{2}c"' = false
    `,
  });
});

/**
 * RESULTS: regex-quantifier-counted-exact.srx
 *
 * <?xml version="1.0"?>
 * <sparql>
 *    <head>
 *        <variable name="val"/>
 *    </head>
 *    <results>
 *        <result>
 *            <binding name="val">
 *                <literal>abbc</literal>
 *            </binding>
 *        </result>
 *    </results>
 * </sparql>
 */
