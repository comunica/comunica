import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { runTestTable } from '@comunica/expression-evaluator/test/util/utils';

describe('evaluation of \'ISTRIPLE\'', () => {
  // Originates from: https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#istriple
  runTestTable({
    arity: 1,
    notation: Notation.Function,
    operation: 'ISTRIPLE',
    testArray: [
      [ '<< <ex:a> <ex:b> <ex:c> >>', '"true"^^xsd:boolean' ],
      [ '"123"', '"false"^^xsd:boolean' ],
      [ '<ex:abc>', '"false"^^xsd:boolean' ],
    ],
  });
});
