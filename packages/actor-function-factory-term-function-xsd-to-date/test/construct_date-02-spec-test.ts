import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionXsdToDate } from '../lib';

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
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionXsdToDate(args),
      ],
      operation: 'xsd:date',
      arity: 1,
      notation: Notation.Function,
      errorTable: `
        '"2000-00-01"' = 'Failed to parse "2000-00-01" as date'
        '"2000-13-01"' = 'Failed to parse "2000-13-01" as date'
        '"2000-06-00"' = 'Failed to parse "2000-06-00" as date'
        '"2000-06-32"' = 'Failed to parse "2000-06-32" as date'
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
