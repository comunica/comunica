import { ActorFunctionFactoryTermAddition } from '@comunica/actor-function-factory-term-addition';
import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermStr } from '../lib';

describe('like \'str\' receiving', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermStr(args),
      args => new ActorFunctionFactoryTermAddition(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'str',
    testTable: `
        "" = ""
        "simple" = "simple"
        "lang"@en = "lang"
        "3"^^xsd:integer = "3"',
        "badlex"^^xsd:integer = "badlex"
        <http://dbpedia.org/resource/Adventist_Heritage> = "http://dbpedia.org/resource/Adventist_Heritage"
        '"1000"^^xsd:integer + "1e3"^^xsd:double' = "2.0E3"
      `,
  });

  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermStr(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'STR',
    testTable: `
        "simple" = "simple"
        "lang"@en = "lang"
      `,
  });
});
