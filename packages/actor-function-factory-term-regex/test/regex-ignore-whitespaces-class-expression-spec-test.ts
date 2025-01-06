import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import * as Data from '@comunica/utils-expression-evaluator/test/spec/_data';
import { bool } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermRegex } from '../lib';

/**
 * REQUEST: regex-ignore-whitespaces-class-expression.rq
 *
 * PREFIX  rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
 * PREFIX  ex: <http://example.com/#>
 *
 * SELECT ?val
 * WHERE {
 *    ex:foo rdf:value ?val .
 *    FILTER regex(?val, " a\n\r\t[\\n]c ", "x")
 * }
 */

/**
 * Manifest Entry
 * :regex-ignore-whitespaces-class-expression a mf:QueryEvaluationTest ;
 *       mf:name    "REGEX with the ignore spacing (x) option with class expression" ;
 *       mf:action
 *           [ qt:query  <regex-ignore-whitespaces-class-expression.rq> ;
 *             qt:data   <regex-data-quantifiers.ttl> ] ;
 *       mf:result  <regex-ignore-whitespaces-class-expression.srx> .
 */

describe('We should respect the regex-ignore-whitespaces-class-expression', () => {
  const { s1, s2, s3, s4, s5, s6, s7, s8, s9, s10 } = Data.dataRegexQuantifiers();
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermRegex(args),
    ],
    arity: 'vary',
    notation: Notation.Function,
    operation: 'regex',
    aliases: bool,
    testArray: [
      [ `'${s1}'`, '""" a\n\r\t[\\n]c """', '"x"', 'false' ],
      [ `'${s2}'`, '""" a\n\r\t[\\n]c """', '"x"', 'false' ],
      [ `'${s3}'`, '""" a\n\r\t[\\n]c """', '"x"', 'false' ],
      [ `'${s4}'`, '""" a\n\r\t[\\n]c """', '"x"', 'false' ],
      [ `'${s5}'`, '""" a\n\r\t[\\n]c """', '"x"', 'true' ],
      [ `'${s6}'`, '""" a\n\r\t[\\n]c """', '"x"', 'false' ],
      [ `'${s7}'`, '""" a\n\r\t[\\n]c """', '"x"', 'false' ],
      [ `'${s8}'`, '""" a\n\r\t[\\n]c """', '"x"', 'false' ],
      [ `'${s9}'`, '""" a\n\r\t[\\n]c """', '"x"', 'false' ],
      [ `'${s10}'`, '""" a\n\r\t[\\n]c """', '"x"', 'false' ],
    ],
  });
});

/**
 * RESULTS: regex-ignore-whitespaces-class-expression.srx
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
 *    </results>
 * </sparql>
 */
