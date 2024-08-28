import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { runFuncTestTable } from '../../../bus-function-factory/test/util';

describe('evaluation of \'TRIPLE\'', () => {
  // Originates from: https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#triple-function
  runFuncTestTable({
    arity: 'vary',
    notation: Notation.Function,
    operation: 'TRIPLE',
    testArray: [
      [ '<ex:a>', '<ex:b>', '<ex:c>', '<< <ex:a> <ex:b> <ex:c> >>' ],
      [ '<ex:a>', '<ex:b>', '"123"', '<< <ex:a> <ex:b> "123" >>' ],
    ],
  });
});
