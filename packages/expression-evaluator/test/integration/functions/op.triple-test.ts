import { Notation } from '../../util/TestTable';
import { runTestTable } from '../../util/utils';

describe('evaluation of \'TRIPLE\'', () => {
  // Originates from: https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#triple-function
  runTestTable({
    arity: 'vary',
    notation: Notation.Function,
    operation: 'TRIPLE',
    testArray: [
      [ '<ex:a>', '<ex:b>', '<ex:c>', '<< <ex:a> <ex:b> <ex:c> >>' ],
      [ '<ex:a>', '<ex:b>', '"123"', '<< <ex:a> <ex:b> "123" >>' ],
    ],
  });
});
