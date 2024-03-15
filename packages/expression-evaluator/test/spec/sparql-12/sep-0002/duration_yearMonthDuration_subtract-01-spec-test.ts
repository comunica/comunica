/* eslint max-len: 0 */
import {
  dateTyped,
  dateTimeTyped, dayTimeDurationTyped,
  yearMonthDurationTyped,
} from '../../../util/Aliases';
import { Notation } from '../../../util/TestTable';
import { runTestTable } from '../../../util/utils';

describe('subtract duration and dayTimeDuration 01', () => {
  /**
   * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
   * SELECT (?d - ?duration AS ?year_ago)
   * WHERE {
   *  VALUES (?duration ?d) {
   *   ("P1Y"^^xsd:yearMonthDuration "2019-05-28T12:14:45Z"^^xsd:dateTime)
   *   ("P1Y"^^xsd:yearMonthDuration "2019-05-28"^^xsd:date)
   *  }
   * }
   */

  describe('respect the duration_yearMonthDuration_subtract-01 spec', () => {
    runTestTable({
      operation: '-',
      arity: 2,
      notation: Notation.Infix,
      testTable: `
        '${dateTimeTyped('2019-05-28T12:14:45Z')}' '${yearMonthDurationTyped('P1Y')}' = '${dateTimeTyped('2018-05-28T12:14:45Z')}'
        '${dateTyped('2019-05-28')}' '${yearMonthDurationTyped('P1Y')}' = '${dateTyped('2018-05-28')}'
        '${dateTimeTyped('2000-10-30T11:12:00')}' '${dayTimeDurationTyped('P3DT1H15M5S')}' = '${dateTimeTyped('2000-10-27T09:56:55')}'
      `,
    });
  });

  /**
   * <?xml version="1.0" encoding="utf-8"?>
   * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
   * <head>
   *  <variable name="year_ago"/>
   * </head>
   * <results>
   *    <result>
   *      <binding name="year_ago"><literal datatype="http://www.w3.org/2001/XMLSchema#dateTime">2018-05-28T12:14:45Z</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="year_ago"><literal datatype="http://www.w3.org/2001/XMLSchema#date">2018-05-28</literal></binding>
   *    </result>
   * </results>
   * </sparql>
   */
});
