import type { FuncTestTableConfig } from '@comunica/utils-jest';
import {
  runFuncTestTable,
  bool,
  Notation,
} from '@comunica/utils-jest';
import { ActorFunctionFactoryTermNot } from '../lib';

describe('evaluation of \'! (unary)\' like', () => {
  const config: FuncTestTableConfig<object> = {
    registeredActors: [
      args => new ActorFunctionFactoryTermNot(args),
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
