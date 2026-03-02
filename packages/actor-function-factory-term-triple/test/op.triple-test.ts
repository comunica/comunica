import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermTriple } from '../lib';

describe('evaluation of \'TRIPLE\'', () => {
  // Originates from: https://www.w3.org/TR/sparql12-query/#func-triple
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermTriple(args),
    ],
    arity: 'vary',
    notation: Notation.Function,
    operation: 'TRIPLE',
    testArray: [
      [ '<ex:a>', '<ex:b>', '<ex:c>', '<< <ex:a> <ex:b> <ex:c> >>' ],
      [ '<ex:a>', '<ex:b>', '"123"', '<< <ex:a> <ex:b> "123" >>' ],
    ],
    errorArray: [
      [ '"literal"', '<ex:b>', '<ex:c>', 'TRIPLE: invalid subject term type: literal' ],
      [ '<ex:a>', '"literal"', '<ex:c>', 'TRIPLE: invalid predicate term type: literal' ],
    ],
  });
});
