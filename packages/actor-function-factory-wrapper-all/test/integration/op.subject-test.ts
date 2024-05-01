import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { runFuncTestTable } from '../util';

describe('evaluation of \'SUBJECT\'', () => {
  // Originates from: https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#subject
  runFuncTestTable({
    arity: 1,
    notation: Notation.Function,
    operation: 'SUBJECT',
    testArray: [
      [ '<< <ex:a> <ex:b> <ex:c> >>', 'ex:a' ],
      [ '<< <ex:a2> <ex:b2> "123" >>', 'ex:a2' ],
    ],
  });
  runFuncTestTable({
    arity: 1,
    notation: Notation.Function,
    operation: 'SUBJECT',
    errorArray: [
      [ '<ex:a>', `Argument types not valid for operator: '"subject"' with '[{"expressionType":"term","value":"ex:a","termType":"namedNode"}]` ],
    ],
  });
});
