import { TypeURL } from '../../../../lib/util/Consts';
import { compactTermString } from '../../../util/Aliases';
import { Notation } from '../../../util/TestTable';
import { runTestTable } from '../../../util/utils';

describe('construct time', () => {
  /**
   * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
   * SELECT (xsd:time(?literal) AS ?time) WHERE {
   *  VALUES ?literal {
   *    "00:00:00"
   *    "24:00:00"
   *    "01:02:03"
   *    "23:59:59"
   *  }
   * }
   */

  describe('respect the construct_time-01 spec', () => {
    runTestTable({
      operation: 'xsd:time',
      arity: 1,
      notation: Notation.Function,
      testTable: `
        '"00:00:00"' = '${compactTermString('00:00:00', TypeURL.XSD_TIME)}'
        '"24:00:00"' = '${compactTermString('00:00:00', TypeURL.XSD_TIME)}'
        '"01:02:03"' = '${compactTermString('01:02:03', TypeURL.XSD_TIME)}'
        '"23:59:59"' = '${compactTermString('23:59:59', TypeURL.XSD_TIME)}'
      `,
    });
  });

  /**
   * <?xml version="1.0" encoding="utf-8"?>
   * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
   * <head>
   *  <variable name="time"/>
   * </head>
   * <results>
   *    <result>
   *      <binding name="time"><literal datatype="http://www.w3.org/2001/XMLSchema#time">00:00:00</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="time"><literal datatype="http://www.w3.org/2001/XMLSchema#time">00:00:00</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="time"><literal datatype="http://www.w3.org/2001/XMLSchema#time">01:02:03</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="time"><literal datatype="http://www.w3.org/2001/XMLSchema#time">23:59:59</literal></binding>
   *    </result>
   * </results>
   * </sparql>
   */
});
