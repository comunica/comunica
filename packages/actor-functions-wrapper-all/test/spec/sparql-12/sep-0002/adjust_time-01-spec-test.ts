/* eslint max-len: 0 */
import { dayTimeDurationTyped, timeTyped } from '../../../util/Aliases';
import { Notation } from '../../../util/TestTable';
import { runTestTable } from '../../../util/utils';

describe('adjust time duration', () => {
  /**
   * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
   * SELECT ?id ?adjusted WHERE {
   *  VALUES (?id ?tz ?d) {
   *   (1 "-PT10H"^^xsd:dayTimeDuration "10:00:00"^^xsd:time)
   *   (2 "-PT10H"^^xsd:dayTimeDuration "10:00:00-07:00"^^xsd:time)
   *   (3 "PT10H"^^xsd:dayTimeDuration"10:00:00-07:00"^^xsd:time)
   *   (4 "" "10:00:00"^^xsd:time)
   *   (5 "" "10:00:00-07:00"^^xsd:time)
   *  }
   *  BIND(ADJUST(?d, ?tz) AS ?adjusted)
   * }
   */

  // ADJUST has jet to be implemented
  // eslint-disable-next-line mocha/no-skipped-tests
  describe.skip('respect the adjust_time-01 spec', () => {
    runTestTable({
      operation: 'ADJUST',
      arity: 2,
      notation: Notation.Function,
      testTable: `
        '${timeTyped('10:00:00')}' '${dayTimeDurationTyped('-PT10H')}' = '${timeTyped('10:00:00-10:00')}'
        '${timeTyped('10:00:00-07:00')}' '${dayTimeDurationTyped('-PT10H')}' = '${timeTyped('07:00:00-10:00')}'
        '${timeTyped('10:00:00-07:00')}' '${dayTimeDurationTyped('PT10H')}' = '${timeTyped('03:00:00+10:00')}'
        '${timeTyped('10:00:00')}' '' = '${timeTyped('10:00:00')}'
        '${timeTyped('10:00:00-07:00')}' '' = '${timeTyped('10:00:00')}'
      `,
    });
  });

  /**
   * ?xml version="1.0" encoding="utf-8"?>
   * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
   * <head>
   *  <variable name="id"/>
   *  <variable name="adjusted"/>
   * </head>
   * <results>
   *    <result>
   *      <binding name="id"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">1</literal></binding>
   *      <binding name="adjusted"><literal datatype="http://www.w3.org/2001/XMLSchema#time">10:00:00-10:00</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="id"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">2</literal></binding>
   *      <binding name="adjusted"><literal datatype="http://www.w3.org/2001/XMLSchema#time">07:00:00-10:00</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="id"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">3</literal></binding>
   *      <binding name="adjusted"><literal datatype="http://www.w3.org/2001/XMLSchema#time">03:00:00+10:00</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="id"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">4</literal></binding>
   *      <binding name="adjusted"><literal datatype="http://www.w3.org/2001/XMLSchema#time">10:00:00</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="id"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">5</literal></binding>
   *      <binding name="adjusted"><literal datatype="http://www.w3.org/2001/XMLSchema#time">10:00:00</literal></binding>
   *    </result>
   * </results>
   * </sparql>
   */
});
