import { ActorFunctionFactoryTermFunctionNot } from '@comunica/actor-function-factory-term-function-not';
import { ActorFunctionFactoryTermFunctionUnaryMinus } from '@comunica/actor-function-factory-term-function-unary-minus';
import type { FuncTestTableConfig } from '@comunica/bus-function-factory/test/util';
import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { bool } from '@comunica/expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionUnaryPlus } from '../lib';

describe('unary functions', () => {
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

  describe('evaluation of \'+ (unary)\' like', () => {
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionUnaryPlus(args),
      ],
      arity: 1,
      operation: '+',
      notation: Notation.Prefix,
      testTable: `
        "3"^^xsd:integer     = "3"^^xsd:integer
        "3"^^xsd:decimal     = "3"^^xsd:decimal
        "3"^^xsd:float       = "3"^^xsd:float
        "3"^^xsd:double      = "3.0E0"^^xsd:double
        "-10.5"^^xsd:decimal = "-10.5"^^xsd:decimal
        "NaN"^^xsd:float     = "NaN"^^xsd:float
      `,
    });
  });

  describe('evaluation of \'- (unary)\' like', () => {
    // '- "0"^^xsd:float       = "-0."^^xsd:float   ' // TODO: Document
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionUnaryMinus(args),
      ],
      arity: 1,
      operation: '-',
      notation: Notation.Prefix,
      testTable: `
        "3"^^xsd:integer     = "-3"^^xsd:integer
        "3"^^xsd:decimal     = "-3"^^xsd:decimal
        "3"^^xsd:float       = "-3"^^xsd:float
        "3"^^xsd:double      = "-3.0E0"^^xsd:double
        "0"^^xsd:integer     = "0"^^xsd:integer
        "-10.5"^^xsd:decimal = "10.5"^^xsd:decimal
        "NaN"^^xsd:float     = "NaN"^^xsd:float
        "-0"^^xsd:float      = "0"^^xsd:float
        "-INF"^^xsd:float    = "INF"^^xsd:float
        "INF"^^xsd:float     = "-INF"^^xsd:float
      `,
    });
  });
});
