import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { bool } from '@comunica/expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionStrBefore } from '../lib';

describe('evaluations of \'strbefore\' like', () => {
  // Inspired on the specs: https://www.w3.org/TR/sparql11-query/#func-strbefore
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionStrBefore(args),
    ],
    arity: 2,
    aliases: bool,
    operation: 'STRBEFORE',
    notation: Notation.Function,
    testTable: `
        "abc" "b" = "a"
        "abc"@en "bc" = "a"@en
        "abc"^^xsd:string "" = ""^^xsd:string
        "abc" "xyz" = ""
        "abc"@en "z"@en = ""
        "abc" "z" = ""
        "abc"@en ""@en = ""@en
        "abc"@en "" = ""@en
      `,
    errorTable: `
        "abc"@en "b"@cy = 'Operation on incompatible language literals'
      `,
  });
});
