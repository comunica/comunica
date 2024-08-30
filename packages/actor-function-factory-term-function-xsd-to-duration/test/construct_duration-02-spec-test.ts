import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionXsdToDuration } from '../lib';

describe('Construct duration', () => {
  /**
   * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
   * SELECT (xsd:duration(?literal) AS ?duration) WHERE {
   *  VALUES ?literal {
   *    "P"
   *    "-P"
   *    "PT"
   *    "-PT"
   *    "PS"
   *    ""
   *    "T1S"
   *  }
   * }
   */

  describe('respect the construct_duration-02 spec', () => {
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionXsdToDuration(args),
      ],
      operation: 'xsd:duration',
      arity: 1,
      notation: Notation.Function,
      errorTable: `
        '"P"' = 'Failed to parse "P" as duration'
        '"-P"' = 'Failed to parse "-P" as duration'
        '"PT"' = 'Failed to parse "PT" as duration'
        '"-PT"' = 'Failed to parse "-PT" as duration'
        '"PS"' = 'Failed to parse "PS" as duration'
        '""' = 'Failed to parse "" as duration'
        '"T1S"' = 'Failed to parse "T1S" as duration'
      `,
    });
  });

  /**
   * <?xml version="1.0" encoding="utf-8"?>
   * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
   * <head>
   *  <variable name="duration"/>
   * </head>
   * <results>
   *    <result></result>
   *    <result></result>
   *    <result></result>
   *    <result></result>
   *    <result></result>
   *    <result></result>
   *    <result></result>
   * </results>
   * </sparql>
   */
});
