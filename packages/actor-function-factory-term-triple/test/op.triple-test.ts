import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermTriple } from '../lib';

describe('evaluation of \'TRIPLE\'', () => {
  // Originates from: https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#triple-function
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
  });
});
