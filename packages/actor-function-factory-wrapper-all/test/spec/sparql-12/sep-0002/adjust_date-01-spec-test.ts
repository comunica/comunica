/* eslint max-len: 0 */
import { dateTyped, dayTimeDurationTyped } from '@comunica/expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { runFuncTestTable } from '../../../util';

describe('adjust date duration', () => {
  /**
   * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
   * SELECT ?id ?adjusted WHERE {
   *  VALUES (?id ?tz ?d) {
   *   (1 "-PT10H"^^xsd:dayTimeDuration "2002-03-07"^^xsd:date)
   *   (2 "-PT10H"^^xsd:dayTimeDuration "2002-03-07-07:00"^^xsd:date)
   *   (3 "" "2002-03-07"^^xsd:date)
   *   (4 "" "2002-03-07-07:00"^^xsd:date)
   *  }
   *  BIND(ADJUST(?d, ?tz) AS ?adjusted)
   * }
   * }
   */

  // ADJUST has jet to be implemented
  // eslint-disable-next-line jest/no-disabled-tests
  describe.skip('respect the adjust_date-01 spec', () => {
    runFuncTestTable({
      operation: 'ADJUST',
      arity: 2,
      notation: Notation.Function,
      testTable: `
        '${dateTyped('2002-03-07')}' '${dayTimeDurationTyped('-PT10H')}' = '${dateTyped('2002-03-07-10:00')}'
        '${dateTyped('2002-03-07-07:00')}' '${dayTimeDurationTyped('-PT10H')}' = '${dateTyped('2002-03-06-10:00')}'
        '${dateTyped('2002-03-07')}' '' = '${dateTyped('2002-03-07')}'
        '${dateTyped('2002-03-07-07:00')}' '' = '${dateTyped('2002-03-07')}'
      `,
    });
  });

  /**
   * <?xml version="1.0" encoding="utf-8"?>
   * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
   * <head>
   *  <variable name="id"/>
   *  <variable name="adjusted"/>
   * </head>
   * <results>
   *    <result>
   *      <binding name="id"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">1</literal></binding>
   *      <binding name="adjusted"><literal datatype="http://www.w3.org/2001/XMLSchema#date">2002-03-07-10:00</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="id"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">2</literal></binding>
   *      <binding name="adjusted"><literal datatype="http://www.w3.org/2001/XMLSchema#date">2002-03-06-10:00</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="id"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">3</literal></binding>
   *      <binding name="adjusted"><literal datatype="http://www.w3.org/2001/XMLSchema#date">2002-03-07</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="id"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">4</literal></binding>
   *      <binding name="adjusted"><literal datatype="http://www.w3.org/2001/XMLSchema#date">2002-03-07</literal></binding>
   *    </result>
   * </results>
   * </sparql>
   */
});
