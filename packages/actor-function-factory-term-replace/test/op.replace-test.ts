import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermReplace } from '../lib';

// Eventually, it might be nice to have a spec compliant regex engine
// eslint-disable-next-line jest/no-disabled-tests
describe.skip('unfortunately our engine is not spec compliant', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermReplace(args),
    ],
    arity: 'vary',
    operation: 'replace',
    notation: Notation.Function,
    testArray: [
      // According to note 3 of https://www.w3.org/TR/xpath-functions/#func-replace
      //  this should result in the empty string.
      [ '"abc"', '"(a)(b)c"', '"$3"', '""' ],
      // Tests note 4
      [ '"abc"', '"(a)(b)c"', '"$83"', '""' ],
    ],
  });
});

describe('evaluation of \'replace\' like', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermReplace(args),
    ],
    arity: 'vary',
    operation: 'replace',
    notation: Notation.Function,
    // Parts from: https://www.w3.org/TR/xpath-functions/#flags
    testTable: `
      "baaab" "a+" "c" = "bcb"
      "bAAAb" "a+" "c" = "bAAAb"
      "bAAAb" "a+" "c" "i" = "bcb"
      "baaab"@en "a+" "c" = "bcb"@en
      "bAAAb"@en "a+" "c" "i" = "bcb"@en
      
      "apple" "apple" '"$0 $0"' = '"apple apple"'
      "abcde" "(a)(b)(c)?(d)(e)" '"$1$2$3$4$5"' = '"abcde"'
      "abde" "(a)(b)(c)?(d)(e)" '"$1$2$3$4$5"' = '"abde"'
      '"abc"' '"(a)(b)c"' '"$13"' = '"a3"'
      "abcdefghijklmno" "(a)(b)(c)(d)(e)(f)(g)(h)(i)(j)(k)(l)(m)(n)(o)" '"$1$2$3$4$5$6$7$8$9$10$11$12$13$14$15"' = '"abcdefghijklmno"'  

      '"a\\\\b\\\\c"' '"\\\\"' '"\\\\\\\\"'  '"q"' = '"a\\\\b\\\\c"'
      '"a/b/c"' '"/"' '"$"' '"q"' = '"a$b$c"'
      '"(a/b)/c"' '"/"' '"$1"' '"q"' = '"(a$1b)$1c"'
      '"(a/b)/c"' '"/"' '"$0"' '"q"' = '"(a$0b)$0c"'
      '"helloworld"' '"hello world"' '"apple'" '"x"' = '"apple"'
      '"helloworld"' '"hello[ ]world"' '"apple"' '"x"' = '"helloworld"'
      '"hello world"' '"hello\\\\ sworld"' '"apple"' '"x"' = '"apple"'
      '"hello world"' '"hello world"' '"apple"' '"x"' = '"hello world"'
      `,
  });
});
