import { bool, timeTyped } from '../../../util/Aliases';
import { Notation } from '../../../util/TestTable';
import { runTestTable } from '../../../util/utils';

describe('compare date', () => {
  /**
   * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
   * SELECT ?id ?eq ?lt ?gt WHERE {
   *  VALUES (?id ?l ?r) {
   *    (1 "00:00:00"^^xsd:time "00:00:00"^^xsd:time)
   *    (2 "00:00:00"^^xsd:time "00:00:01"^^xsd:time)
   *    (3 "00:00:02"^^xsd:time "00:00:01"^^xsd:time)
   *    (4 "10:00:00"^^xsd:time "00:59:01"^^xsd:time)
   *    (5 "00:00:00"^^xsd:time "24:00:00"^^xsd:time)
   *  }
   *  BIND(?l < ?r AS ?lt)
   *  BIND(?l > ?r AS ?gt)
   *  BIND(?l = ?r AS ?eq)
   * }
   */

  describe('respect the op:time-equal xpath-functions spec', () => {
    runTestTable({
      operation: '=',
      arity: 2,
      notation: Notation.Infix,
      aliases: bool,
      testTable: `
        '${timeTyped('00:00:00')}' '${timeTyped('00:00:00')}' = true
        '${timeTyped('00:00:00')}' '${timeTyped('00:00:01')}' = false
        '${timeTyped('00:00:02')}' '${timeTyped('00:00:01')}' = false
        '${timeTyped('10:00:00')}' '${timeTyped('00:59:01')}' = false
        '${timeTyped('00:00:00')}' '${timeTyped('24:00:00')}' = true
      `,
    });
  });

  describe('respect the op:time-less-than xpath-functions spec', () => {
    runTestTable({
      operation: '<',
      arity: 2,
      notation: Notation.Infix,
      aliases: bool,
      testTable: `
        '${timeTyped('00:00:00')}' '${timeTyped('00:00:00')}' = false
        '${timeTyped('00:00:00')}' '${timeTyped('00:00:01')}' = true
        '${timeTyped('00:00:02')}' '${timeTyped('00:00:01')}' = false
        '${timeTyped('10:00:00')}' '${timeTyped('00:59:01')}' = false
        '${timeTyped('00:00:00')}' '${timeTyped('24:00:00')}' = false
      `,
    });
  });

  describe('respect the op:date-greater-than xpath-functions spec', () => {
    runTestTable({
      operation: '>',
      arity: 2,
      notation: Notation.Infix,
      aliases: bool,
      testTable: `
        '${timeTyped('00:00:00')}' '${timeTyped('00:00:00')}' = false
        '${timeTyped('00:00:00')}' '${timeTyped('00:00:01')}' = false
        '${timeTyped('00:00:02')}' '${timeTyped('00:00:01')}' = true
        '${timeTyped('10:00:00')}' '${timeTyped('00:59:01')}' = true
        '${timeTyped('00:00:00')}' '${timeTyped('24:00:00')}' = false
      `,
    });
  });

  /**
   * <?xml version="1.0" encoding="utf-8"?>
   * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
   * <head>
   *  <variable name="id"/>
   *  <variable name="eq"/>
   *  <variable name="lt"/>
   *  <variable name="gt"/>
   * </head>
   * <results>
   *    <result>
   *      <binding name="id"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">1</literal></binding>
   *      <binding name="eq"><literal datatype="http://www.w3.org/2001/XMLSchema#boolean">true</literal></binding>
   *      <binding name="lt"><literal datatype="http://www.w3.org/2001/XMLSchema#boolean">false</literal></binding>
   *      <binding name="gt"><literal datatype="http://www.w3.org/2001/XMLSchema#boolean">false</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="id"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">2</literal></binding>
   *      <binding name="eq"><literal datatype="http://www.w3.org/2001/XMLSchema#boolean">false</literal></binding>
   *      <binding name="lt"><literal datatype="http://www.w3.org/2001/XMLSchema#boolean">true</literal></binding>
   *      <binding name="gt"><literal datatype="http://www.w3.org/2001/XMLSchema#boolean">false</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="id"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">3</literal></binding>
   *      <binding name="eq"><literal datatype="http://www.w3.org/2001/XMLSchema#boolean">false</literal></binding>
   *      <binding name="lt"><literal datatype="http://www.w3.org/2001/XMLSchema#boolean">false</literal></binding>
   *      <binding name="gt"><literal datatype="http://www.w3.org/2001/XMLSchema#boolean">true</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="id"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">4</literal></binding>
   *      <binding name="eq"><literal datatype="http://www.w3.org/2001/XMLSchema#boolean">false</literal></binding>
   *      <binding name="lt"><literal datatype="http://www.w3.org/2001/XMLSchema#boolean">false</literal></binding>
   *      <binding name="gt"><literal datatype="http://www.w3.org/2001/XMLSchema#boolean">true</literal></binding>
   *    </result>
   *    <result>
   *      <binding name="id"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">5</literal></binding>
   *      <binding name="eq"><literal datatype="http://www.w3.org/2001/XMLSchema#boolean">true</literal></binding>
   *      <binding name="lt"><literal datatype="http://www.w3.org/2001/XMLSchema#boolean">false</literal></binding>
   *      <binding name="gt"><literal datatype="http://www.w3.org/2001/XMLSchema#boolean">false</literal></binding>
   *    </result>
   * </results>
   * </sparql>
   */
});
