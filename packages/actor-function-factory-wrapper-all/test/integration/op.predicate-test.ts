import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { runFuncTestTable } from '../util';

describe('evaluation of \'PREDICATE\'', () => {
  // Originates from: https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#predicate
  runFuncTestTable({
    arity: 1,
    notation: Notation.Function,
    operation: 'PREDICATE',
    testArray: [
      [ '<< <ex:a> <ex:b> <ex:c> >>', 'ex:b' ],
      [ '<< <ex:a2> <ex:b2> "123" >>', 'ex:b2' ],
    ],
  });
  runFuncTestTable({
    arity: 1,
    notation: Notation.Function,
    operation: 'PREDICATE',
    errorArray: [
      [ '<ex:a>', `Argument types not valid for operator: '"predicate"' with '[{"expressionType":"term","value":"ex:a","termType":"namedNode"}]` ],
    ],
  });
});
