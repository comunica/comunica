/* eslint max-len: 0 */
import { dateTimeTyped, dayTimeDurationTyped } from '../../../util/Aliases';
import { Notation } from '../../../util/TestTable';
import { runTestTable } from '../../../util/utils';

describe('adjust dateTime duration', () => {
  /**
   * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
   * SELECT ?id ?adjusted WHERE {
   *  VALUES (?id ?tz ?d) {
   *   (1 "-PT10H"^^xsd:dayTimeDuration "2002-03-07T10:00:00"^^xsd:dateTime)
   *   (2 "-PT10H"^^xsd:dayTimeDuration "2002-03-07T10:00:00-07:00"^^xsd:dateTime)
   *   (3 "PT10H"^^xsd:dayTimeDuration  "2002-03-07T10:00:00-07:00"^^xsd:dateTime)
   *   (4 "-PT8H"^^xsd:dayTimeDuration "2002-03-07T00:00:00+01:00"^^xsd:dateTime)
   *   (5 "" "2002-03-07T10:00:00-07:00"^^xsd:dateTime)
   *  }
   *  BIND(ADJUST(?d, ?tz) AS ?adjusted)
   * }
   */

  describe.skip('respect the adjust_dateTime-01 spec', () => {
    runTestTable({
      operation: 'ADJUST',
      arity: 2,
      notation: Notation.Function,
      testTable: `
        '${dateTimeTyped('2002-03-07T10:00:00')}' '${dayTimeDurationTyped('-PT10H')}' = '${dateTimeTyped('2002-03-07T10:00:00-10:00')}'
        '${dateTimeTyped('2002-03-07T10:00:00-07:00')}' '${dayTimeDurationTyped('-PT10H')}' = '${dateTimeTyped('2002-03-07T07:00:00-10:00')}'
        '${dateTimeTyped('2002-03-07T10:00:00-07:00')}' '${dayTimeDurationTyped('PT10H')}' = '${dateTimeTyped('2002-03-08T03:00:00+10:00')}'
        '${dateTimeTyped('2002-03-07T00:00:00+01:00')}' '${dayTimeDurationTyped('-PT8H')}' = '${dateTimeTyped('2002-03-06T15:00:00-08:00')}'
        '${dateTimeTyped('2002-03-07T10:00:00-07:00')}' '${dayTimeDurationTyped('')}' = '${dateTimeTyped('2002-03-07T10:00:00')}'
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
   *      <binding name="adjusted"><literal datatype="http://www.w3.org/2001/XMLSchema#dateTime">2002-03-07T10:00:00-10:00</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="id"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">2</literal></binding>
   *      <binding name="adjusted"><literal datatype="http://www.w3.org/2001/XMLSchema#dateTime">2002-03-07T07:00:00-10:00</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="id"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">3</literal></binding>
   *      <binding name="adjusted"><literal datatype="http://www.w3.org/2001/XMLSchema#dateTime">2002-03-08T03:00:00+10:00</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="id"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">4</literal></binding>
   *      <binding name="adjusted"><literal datatype="http://www.w3.org/2001/XMLSchema#dateTime">2002-03-06T15:00:00-08:00</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="id"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">5</literal></binding>
   *      <binding name="adjusted"><literal datatype="http://www.w3.org/2001/XMLSchema#dateTime">2002-03-07T10:00:00</literal></binding>
   *    </result>
   * </results>
   * </sparql>
   */
});
