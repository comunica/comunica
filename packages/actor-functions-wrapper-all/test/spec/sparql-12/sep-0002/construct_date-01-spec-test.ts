import { TypeURL } from '../../../../lib/util/Consts';
import { compactTermString } from '../../../util/Aliases';
import { Notation } from '../../../util/TestTable';
import { runTestTable } from '../../../util/utils';

describe('Construct date', () => {
  /**
   * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
   * SELECT (xsd:date(?literal) AS ?date) WHERE {
   *  VALUES ?literal {
   *   "2000-11-02"
   *  }
   * }
   */

  describe('respect the construct_date-01 spec', () => {
    runTestTable({
      operation: 'xsd:date',
      arity: 1,
      notation: Notation.Function,
      testTable: `
        '"2000-11-02"' = '${compactTermString('2000-11-02', TypeURL.XSD_DATE)}'
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
   *    <result>
   *      <binding name="date"><literal datatype="http://www.w3.org/2001/XMLSchema#date">2000-11-02</literal></binding>
   *    </result>
   * </results>
   * </sparql>
   */
});
