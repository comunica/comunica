import { int, timeTyped } from '../../../util/Aliases';
import { Notation } from '../../../util/TestTable';
import { runTestTable } from '../../../util/utils';

describe('Extract time', () => {
  /**
   * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
   * SELECT (HOURS(?time) AS ?h) (MINUTES(?time) AS ?m) (SECONDS(?time) AS ?s) WHERE {
   *  VALUES ?time {
   *    "02:12:59"^^xsd:time
   *  }
   * }
   */

  describe('respect the extract_time-01 spec', () => {
    runTestTable({
      operation: 'HOURS',
      arity: 1,
      notation: Notation.Function,
      testTable: `
        '${timeTyped('02:12:59')}' = '${int('2')}'
      `,
    });

    runTestTable({
      operation: 'MINUTES',
      arity: 1,
      notation: Notation.Function,
      testTable: `
        '${timeTyped('02:12:59')}' = '${int('12')}'
      `,
    });

    runTestTable({
      operation: 'SECONDS',
      arity: 1,
      notation: Notation.Function,
      testTable: `
        '${timeTyped('02:12:59')}' = '${int('59')}'
      `,
    });
  });

  /**
   * <?xml version="1.0" encoding="utf-8"?>
   * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
   * <head>
   *  <variable name="h"/>
   *  <variable name="m"/>
   *  <variable name="s"/>
   * </head>
   * <results>
   *    <result>
   *      <binding name="h"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">2</literal></binding>
   *      <binding name="m"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">12</literal></binding>
   *      <binding name="s"><literal datatype="http://www.w3.org/2001/XMLSchema#decimal">59.0</literal></binding>
   *    </result>
   * </results>
   * </sparql>
   */
});
