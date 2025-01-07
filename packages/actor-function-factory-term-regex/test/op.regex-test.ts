import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { bool } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermRegex } from '../lib';

// Eventually, it might be nice to have a spec compliant regex engine
// eslint-disable-next-line jest/no-disabled-tests
describe.skip('unfortunately our engine is not spec compliant', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermRegex(args),
    ],
    arity: 'vary',
    operation: 'regex',
    notation: Notation.Function,
    aliases: bool,
    testArray: [
      // From https://www.w3.org/TR/xpath-functions/#flags
      [ '"apple"', '"^\\\\p{Lu}*$"', '"i"', 'false' ],
      [ '"APPLE"', '"^\\\\p{Lu}*$"', '"i"', 'true' ],
      [ '"APPLE"', '"^[A-Z-[IO]]*$"', 'true' ],
    ],
  });
});

describe('evaluation of \'regex\' like', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermRegex(args),
    ],
    arity: 'vary',
    operation: 'regex',
    notation: Notation.Function,
    aliases: bool,
    testArray: [
      // [ '"simple"', '"simple"', 'true' ],
      // [ '"aaaaaa"', '"a"', 'true' ],
      // [ '"simple"', '"blurgh"', 'false' ],
      // [ '"a"', '"^ab?$"', 'true' ],
      // [ '"ab"', '"^ab?$"', 'true' ],
      // [ '"aaa"', '"a+"', 'true' ],
      // [ '"AAA"', '"a+"', 'false' ],
      // [ '"AAA"', '"a+"', '"i"', 'true' ],
      // [ '"a\\na"', '".+"', '"s"', 'true' ],
      // [ '"a\\nb\\nc"', '"^b$"', 'false' ],
      // [ '"a\\nb\\nc"', '"^b$"', '"m"', 'true' ],
      //
      // // From https://www.w3.org/TR/xpath-functions/#flags
      // [ '"helloworld"', '"hello world"', '"x"', 'true' ],
      // [ '"helloworld"', '"hello[ ]world"', '"x"', 'false' ],
      [ '"hello world"', '"hello\\\\ sworld"', '"x"', 'true' ],
      [ '"hello world"', '"hello world"', '"x"', 'false' ],

      [ '""', '""', '"x"', 'true' ],
      [ `"""An 
apple
not pear"""`, '"^apple"', '"m"', 'true' ],
      [ `"""An 
apple
not pear"""`, '"^pear"', '"m"', 'false' ],

      // From https://www.w3.org/TR/xpath-functions/#flags
      [ '"Mum"', '"([md])[aeiou]\\\\1"', '"i"', 'true' ],
      [ '"mom"', '"([md])[aeiou]\\\\1"', '"i"', 'true' ],
      [ '"Dad"', '"([md])[aeiou]\\\\1"', '"i"', 'true' ],
      [ '"DUD"', '"([md])[aeiou]\\\\1"', '"i"', 'true' ],

      [ '"abcd"', '"B. OBAMA"', '"iq"', 'false' ],
      [ '"Mr. B. Obama"', '"B. OBAMA"', '"iq"', 'true' ],
    ],
    errorArray: [
      [ '"Invalid flags"', '"a"', '"a"', 'Invalid flags' ],
      [ '"Duplicate flag"', '"a"', '"ii"', 'Duplicate flag' ],
    ],
  });
});
