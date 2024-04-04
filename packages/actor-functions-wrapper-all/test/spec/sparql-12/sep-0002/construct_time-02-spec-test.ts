import { Notation } from '../../../util/TestTable';
import { runTestTable } from '../../../util/utils';

describe('Construct time', () => {
  /**
   * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
   * SELECT (xsd:time(?literal) AS ?time) WHERE {
   *  VALUES ?literal {
   *    "24:00:01"
   *    "05:60:00"
   *    "00:00:61"
   *    ""
   *  }
   * }
   */

  describe('respect the construct_time-02 spec', () => {
    runTestTable({
      operation: 'xsd:time',
      arity: 1,
      notation: Notation.Function,
      errorTable: `
        '"24:00:01"' = ''
        '"05:60:00"' = ''
        '"00:00:61"' = ''
        '""' = ''
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
   *    <result></result>
   *    <result></result>
   *    <result></result>
   *    <result></result>
   * </results>
   * </sparql>
   */
});
