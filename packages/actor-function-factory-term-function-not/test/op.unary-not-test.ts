import type { FuncTestTableConfig } from '@comunica/bus-function-factory/test/util';
import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { bool } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionNot } from '../lib';

describe('evaluation of \'! (unary)\' like', () => {
  const config: FuncTestTableConfig<object> = {
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionNot(args),
    ],
    arity: 1,
    operation: '!',
    notation: Notation.Prefix,
    aliases: bool,
  };
  runFuncTestTable({
    ...config,
    testTable: `
        true = false
        false = true
      `,
  });
  describe('should cast to EVB so', () => {
    runFuncTestTable({
      ...config,
      testTable: `
          "" = true
          "3"^^xsd:integer = false                  
        `,
    });
  });
});
