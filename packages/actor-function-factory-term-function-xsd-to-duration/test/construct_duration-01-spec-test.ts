/* eslint max-len: 0 */
import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { TypeURL } from '@comunica/utils-expression-evaluator';
import {
  compactTermString,
} from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionXsdToDuration } from '../lib';

describe('construct duration', () => {
  /**
   * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
   * SELECT (xsd:duration(?literal) AS ?duration) WHERE {
   *  VALUES ?literal {
   *    "PT0S"
   *    "-P0M"
   *    "P1Y"
   *    "-P1Y"
   *    "P1M"
   *    "P1D"
   *    "PT1H"
   *    "PT1M"
   *    "PT1S"
   *    "P3Y1DT2H7S"
   *    "P36MT120M"
   *  }
   * }
   */

  describe('respect the construct_duration-01 spec', () => {
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionXsdToDuration(args),
      ],
      operation: 'xsd:duration',
      arity: 1,
      notation: Notation.Function,
      testTable: `
        '"PT0S"' = ${compactTermString('PT0S', TypeURL.XSD_DURATION)}
        '"-P0M"' = ${compactTermString('PT0S', TypeURL.XSD_DURATION)}
        '"P1Y"' = ${compactTermString('P1Y', TypeURL.XSD_DURATION)}
        '"-P1Y"' = ${compactTermString('-P1Y', TypeURL.XSD_DURATION)}
        '"P1M"' = ${compactTermString('P1M', TypeURL.XSD_DURATION)}
        '"P1D"' = ${compactTermString('P1D', TypeURL.XSD_DURATION)}
        '"PT1H"' = ${compactTermString('PT1H', TypeURL.XSD_DURATION)}
        '"PT1M"' = ${compactTermString('PT1M', TypeURL.XSD_DURATION)}
        '"PT1S"' = ${compactTermString('PT1S', TypeURL.XSD_DURATION)}
        '"P3Y1DT2H7S"' = ${compactTermString('P3Y1DT2H7S', TypeURL.XSD_DURATION)}
        '"P36MT120M"' = ${compactTermString('P3YT2H', TypeURL.XSD_DURATION)}
      `,
    });
  });

  /**
   * <?xml version="1.0" encoding="utf-8"?>
   * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
   * <head>
   *  <variable name="duration"/>
   * </head>
   * <results>
   *    <result>
   *      <binding name="duration"><literal datatype="http://www.w3.org/2001/XMLSchema#duration">PT0S</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="duration"><literal datatype="http://www.w3.org/2001/XMLSchema#duration">PT0S</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="duration"><literal datatype="http://www.w3.org/2001/XMLSchema#duration">P1Y</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="duration"><literal datatype="http://www.w3.org/2001/XMLSchema#duration">-P1Y</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="duration"><literal datatype="http://www.w3.org/2001/XMLSchema#duration">P1M</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="duration"><literal datatype="http://www.w3.org/2001/XMLSchema#duration">P1D</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="duration"><literal datatype="http://www.w3.org/2001/XMLSchema#duration">PT1H</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="duration"><literal datatype="http://www.w3.org/2001/XMLSchema#duration">PT1M</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="duration"><literal datatype="http://www.w3.org/2001/XMLSchema#duration">PT1S</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="duration"><literal datatype="http://www.w3.org/2001/XMLSchema#duration">P3Y1DT2H7S</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="duration"><literal datatype="http://www.w3.org/2001/XMLSchema#duration">P3YT2H</literal></binding>
   *    </result>
   * </results>
   * </sparql>
   */
});
