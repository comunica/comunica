import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { bool } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionStrAfter } from '../lib';

describe('evaluations of \'strafter\' like', () => {
  // Inspired on the specs: https://www.w3.org/TR/sparql11-query/#func-strafter
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionStrAfter(args),
    ],
    arity: 2,
    aliases: bool,
    operation: 'STRAFTER',
    notation: Notation.Function,
    testTable: `
        "abc" "b" = "c"
        "abc"@en "ab" = "c"@en
        "abc"^^xsd:string "" = "abc"^^xsd:string
        "abc" "xyz" = ""
        "abc"@en "z"@en = ""
        "abc" "z" = ""
        "abc"@en ""@en = "abc"@en
        "abc"@en "" = "abc"@en
      `,
    errorTable: `
        "abc"@en "b"@cy = 'Operation on incompatible language literals'
      `,
  });
});
