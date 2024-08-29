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
        '"P"' = 'Argument types not valid for operator'
        '"-P"' = 'Argument types not valid for operator'
        '"PT"' = 'Argument types not valid for operator'
        '"-PT"' = 'Argument types not valid for operator'
        '"PS"' = 'Argument types not valid for operator'
        '""' = 'Argument types not valid for operator'
        '"T1S"' = 'Argument types not valid for operator'
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
