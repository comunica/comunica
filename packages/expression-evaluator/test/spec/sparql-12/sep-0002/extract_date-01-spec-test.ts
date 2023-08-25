import { dateTyped, int } from '../../../util/Aliases';
import { Notation } from '../../../util/TestTable';
import { runTestTable } from '../../../util/utils';

describe('Extract date', () => {
  /**
   * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
   * SELECT (YEAR(?date) AS ?y) (MONTH(?date) AS ?m) (DAY(?date) AS ?d) WHERE {
   *   VALUES ?date {
   *     "2000-11-02"^^xsd:date
   *   }
   * }
   */

  describe('respect the extract_date-01 spec', () => {
    runTestTable({
      operation: 'YEAR',
      arity: 1,
      notation: Notation.Function,
      testTable: `
        '${dateTyped('2000-11-02')}' = '${int('2000')}'
      `,
    });

    runTestTable({
      operation: 'MONTH',
      arity: 1,
      notation: Notation.Function,
      testTable: `
        '${dateTyped('2000-11-02')}' = '${int('11')}'
      `,
    });

    runTestTable({
      operation: 'DAY',
      arity: 1,
      notation: Notation.Function,
      testTable: `
        '${dateTyped('2000-11-02')}' = '${int('2')}'
      `,
    });
  });

  /**
   * <?xml version="1.0" encoding="utf-8"?>
   * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
   * <head>
   *  <variable name="y"/>
   *  <variable name="m"/>
   *  <variable name="d"/>
   * </head>
   * <results>
   *    <result>
   *      <binding name="y"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">2000</literal></binding>
   *      <binding name="m"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">11</literal></binding>
   *      <binding name="d"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">2</literal></binding>
   *    </result>
   * </results>
   * </sparql>
   */
});
