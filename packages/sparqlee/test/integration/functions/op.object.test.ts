import { Notation } from '../../util/TestTable';
import { runTestTable } from '../../util/utils';

describe('evaluation of \'OBJECT\'', () => {
  // Originates from: https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#object
  runTestTable({
    arity: 1,
    notation: Notation.Function,
    operation: 'OBJECT',
    testArray: [
      [ '<< <ex:a> <ex:b> <ex:c> >>', 'ex:c' ],
      [ '<< <ex:a2> <ex:b2> "123" >>', '"123"' ],
    ],
  });
  runTestTable({
    arity: 1,
    notation: Notation.Function,
    operation: 'OBJECT',
    errorArray: [
      [ '<ex:a>', `Argument types not valid for operator: '"object"' with '[{"expressionType":"term","value":"ex:a","termType":"namedNode"}]` ],
    ],
  });
});
