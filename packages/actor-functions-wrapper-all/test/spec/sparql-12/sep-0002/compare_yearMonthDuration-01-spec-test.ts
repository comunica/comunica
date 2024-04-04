import { bool, yearMonthDurationTyped } from '../../../util/Aliases';
import { Notation } from '../../../util/TestTable';
import { runTestTable } from '../../../util/utils';

describe('compare yearMonthDuration 01', () => {
  /**
   * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
   * SELECT ?id ?lt ?gt WHERE {
   *  VALUES (?id ?l ?r) {
   *    (1 "P1Y"^^xsd:yearMonthDuration "P1Y"^^xsd:yearMonthDuration)
   *    (2 "P1Y"^^xsd:yearMonthDuration "P12M"^^xsd:yearMonthDuration)
   *    (3 "P1Y1M"^^xsd:yearMonthDuration "P12M"^^xsd:yearMonthDuration)
   *    (4 "P1M"^^xsd:yearMonthDuration "-P2M"^^xsd:yearMonthDuration)
   *    (5 "-P1Y"^^xsd:yearMonthDuration "P13M"^^xsd:yearMonthDuration)
   *  }
   *  BIND(?l < ?r AS ?lt)
   *  BIND(?l > ?r AS ?gt)
   * }
   */

  describe('respect the lesserThan compare_yearMonthDuration-01 spec', () => {
    runTestTable({
      operation: '<',
      arity: 2,
      notation: Notation.Infix,
      aliases: bool,
      testTable: `
        '${yearMonthDurationTyped('P1Y')}' '${yearMonthDurationTyped('P1Y')}' = false
        '${yearMonthDurationTyped('P1Y')}' '${yearMonthDurationTyped('P12M')}' = false
        '${yearMonthDurationTyped('P1Y1M')}' '${yearMonthDurationTyped('P12M')}' = false
        '${yearMonthDurationTyped('P1M')}' '${yearMonthDurationTyped('-P2M')}' = false
        '${yearMonthDurationTyped('-P1Y')}' '${yearMonthDurationTyped('P13M')}' = true
      `,
    });
  });

  describe('respect the largerThan compare_yearMonthDuration-01 spec', () => {
    runTestTable({
      operation: '>',
      arity: 2,
      notation: Notation.Infix,
      aliases: bool,
      testTable: `
        '${yearMonthDurationTyped('P1Y')}' '${yearMonthDurationTyped('P1Y')}' = false
        '${yearMonthDurationTyped('P1Y')}' '${yearMonthDurationTyped('P12M')}' = false
        '${yearMonthDurationTyped('P1Y1M')}' '${yearMonthDurationTyped('P12M')}' = true
        '${yearMonthDurationTyped('P1M')}' '${yearMonthDurationTyped('-P2M')}' = true
        '${yearMonthDurationTyped('-P1Y')}' '${yearMonthDurationTyped('P13M')}' = false
      `,
    });
  });

  /**
   * <?xml version="1.0" encoding="utf-8"?>
   * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
   * <head>
   *  <variable name="id"/>
   *  <variable name="lt"/>
   *  <variable name="gt"/>
   * </head>
   * <results>
   *    <result>
   *      <binding name="id"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">1</literal></binding>
   *      <binding name="lt"><literal datatype="http://www.w3.org/2001/XMLSchema#boolean">false</literal></binding>
   *      <binding name="gt"><literal datatype="http://www.w3.org/2001/XMLSchema#boolean">false</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="id"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">2</literal></binding>
   *      <binding name="lt"><literal datatype="http://www.w3.org/2001/XMLSchema#boolean">false</literal></binding>
   *      <binding name="gt"><literal datatype="http://www.w3.org/2001/XMLSchema#boolean">false</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="id"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">3</literal></binding>
   *      <binding name="lt"><literal datatype="http://www.w3.org/2001/XMLSchema#boolean">false</literal></binding>
   *      <binding name="gt"><literal datatype="http://www.w3.org/2001/XMLSchema#boolean">true</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="id"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">4</literal></binding>
   *      <binding name="lt"><literal datatype="http://www.w3.org/2001/XMLSchema#boolean">false</literal></binding>
   *      <binding name="gt"><literal datatype="http://www.w3.org/2001/XMLSchema#boolean">true</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="id"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">5</literal></binding>
   *      <binding name="lt"><literal datatype="http://www.w3.org/2001/XMLSchema#boolean">true</literal></binding>
   *      <binding name="gt"><literal datatype="http://www.w3.org/2001/XMLSchema#boolean">false</literal></binding>
   *    </result>
   * </results>
   * </sparql>
   */
});
