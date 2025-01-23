import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { bool } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermStrAfter } from '../lib';

describe('evaluations of \'strafter\' like', () => {
  // Inspired on the specs: https://www.w3.org/TR/sparql11-query/#func-strafter
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermStrAfter(args),
    ],
    arity: 2,
    aliases: bool,
    operation: 'STRAFTER',
    notation: Notation.Function,
    testTable: `
        "abc" "b" = "c"
        "abc"@en "ab" = "c"@en
        "abc"@en--ltr "ab" = "c"@en--ltr
        "abc"@en--ltr "ab"@en = "c"@en--ltr
        "abc"^^xsd:string "" = "abc"^^xsd:string
        "abc" "xyz" = ""
        "abc"@en "z"@en = ""
        "abc"@en "z" = ""
        "abc"@en--ltr "z"@en--ltr = ""
        "abc"@en--ltr "z"@en = ""
        "abc"@en--ltr "z" = ""
        "abc" "z" = ""
        "abc"@en ""@en = "abc"@en
        "abc"@en--ltr ""@en--ltr = "abc"@en--ltr
        "abc"@en "" = "abc"@en
      `,
    errorTable: `
        "abc"@en "b"@cy = 'Operation on incompatible language literals'
        "abc"@en--ltr "b"@nl--ltr = 'Operation on incompatible language literals'
        "abc"@en--ltr "b"@en--rtl = 'Operation on incompatible directional language literals'
        "abc"@en--ltr "b"@nl = 'Operation on incompatible language literals'
      `,
  });
});
