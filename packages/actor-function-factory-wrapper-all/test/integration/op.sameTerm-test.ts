import { bool, merge, numeric } from '@comunica/expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { runFuncTestTable } from '../util';

describe('evaluation of \'sameTerm\'', () => {
  runFuncTestTable({
    operation: 'sameTerm',
    arity: 2,
    notation: Notation.Function,
    aliases: merge(numeric, bool),
    testTable: `
      <http://example.com> <http://example.com> = true
      <http://example.com/é> <http://example.com/%A9> = false
      1 1 = true
      1 1.0 = false
      true true = true
      true "1"^^xsd:boolean = false
      "a" "a" = true
      "a" "a"^^xsd:string = true
      "a"@en "a"@en = true
      "a"@en "a"@en-US = false
      `,
  });
});
