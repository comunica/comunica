import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { bool } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermStrBefore } from '../lib';

describe('evaluations of \'strbefore\' like', () => {
  // Inspired on the specs: https://www.w3.org/TR/sparql11-query/#func-strbefore
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermStrBefore(args),
    ],
    arity: 2,
    aliases: bool,
    operation: 'STRBEFORE',
    notation: Notation.Function,
    testTable: `
        "abc" "b" = "a"
        "abc"@en "bc" = "a"@en
        "abc"@en--ltr "bc" = "a"@en--ltr
        "abc"@en--ltr "bc"@en = "a"@en--ltr
        "abc"^^xsd:string "" = ""^^xsd:string
        "abc" "xyz" = ""
        "abc"@en "z"@en = ""
        "abc"@en "z" = ""
        "abc"@en--ltr "z"@en--ltr = ""
        "abc"@en--ltr "z"@en = ""
        "abc"@en--ltr "z" = ""
        "abc" "z" = ""
        "abc"@en ""@en = ""@en
        "abc"@en--ltr ""@en--ltr = ""@en--ltr
        "abc"@en "" = ""@en
      `,
    errorTable: `
        "abc"@en "b"@cy = 'Operation on incompatible language literals'
        "abc"@en--ltr "b"@nl--ltr = 'Operation on incompatible language literals'
        "abc"@en--ltr "b"@en--rtl = 'Operation on incompatible directional language literals'
        "abc"@en--ltr "b"@nl = 'Operation on incompatible language literals'
      `,
  });
});
