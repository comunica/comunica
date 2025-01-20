import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermHasLang } from '../lib';

describe('evaluation of \'hasLANG\'', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermHasLang(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'hasLANG',
    testTable: `
        "a"@fr = "true"^^xsd:boolean
        "a"@fr--rtl = "true"^^xsd:boolean
        "a"@fr--ltr = "true"^^xsd:boolean
        "a" = "false"^^xsd:boolean
        123 = "false"^^xsd:boolean
        <http://example.org/> = "false"^^xsd:boolean
      `,
  });
});
