import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionXsdToTime } from '../lib';

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
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionXsdToTime(args),
      ],
      operation: 'xsd:time',
      arity: 1,
      notation: Notation.Function,
      errorTable: `
        '"24:00:01"' = 'Failed to parse "24:00:01" as time'
        '"05:60:00"' = 'Failed to parse "05:60:00" as time'
        '"00:00:61"' = 'Failed to parse "00:00:61" as time'
        '""' = 'Failed to parse "" as time'
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
