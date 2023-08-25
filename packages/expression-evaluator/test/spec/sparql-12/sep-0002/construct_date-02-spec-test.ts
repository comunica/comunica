import { Notation } from '../../../util/TestTable';
import { runTestTable } from '../../../util/utils';

describe('Construct date', () => {
  /**
   * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
   * SELECT (xsd:date(?literal) AS ?date) WHERE {
   *  VALUES ?literal {
   *    "2000-00-01"
   *    "2000-13-01"
   *    "2000-06-00"
   *    "2000-06-32"
   *  }
   * }
   */

  describe('respect the construct_date-02 spec', () => {
    runTestTable({
      operation: 'xsd:date',
      arity: 1,
      notation: Notation.Function,
      errorTable: `
        '"2000-00-01"' = ''
        '"2000-13-01"' = ''
        '"2000-06-00"' = ''
        '"2000-06-32"' = ''
      `,
    });
  });

  /**
   * <?xml version="1.0" encoding="utf-8"?>
   * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
   * <head>
   *  <variable name="date"/>
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
