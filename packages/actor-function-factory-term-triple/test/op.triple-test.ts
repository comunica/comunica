import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermTriple } from '../lib';

describe('evaluation of \'TRIPLE\'', () => {
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
      [ '<ex:a>', '<ex:b>', '<<( <ex:a> <ex:b> <ex:c> )>>', '<< <ex:a> <ex:b> << <ex:a> <ex:b> <ex:c> >> >>' ],
    ],
    errorArray: [
      [ '"literal"', '<ex:b>', '<ex:c>', 'TRIPLE: invalid subject term type: literal' ],
      [ '<<( <ex:a> <ex:b> <ex:c> )>>', '<ex:b>', '<ex:c>', 'TRIPLE: invalid subject term type: quad' ],
      [ '<ex:a>', '"literal"', '<ex:c>', 'TRIPLE: invalid predicate term type: literal' ],
      [ '<ex:a>', '<<( <ex:a> <ex:b> <ex:c> )>>', '<ex:c>', 'TRIPLE: invalid predicate term type: quad' ],
    ],
  });
});
