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
      [ '"literal"', '<ex:b>', '<ex:c>', 'Subjects in triple terms must either be named nodes or blank nodes' ],
      [ '<<( <ex:a> <ex:b> <ex:c> )>>', '<ex:b>', '<ex:c>', `Subjects in triple terms must either be named nodes or blank nodes` ],
      [ '<ex:a>', '"literal"', '<ex:c>', 'Predicates in triple terms must be named nodes' ],
      [ '<ex:a>', '<<( <ex:a> <ex:b> <ex:c> )>>', '<ex:c>', 'Predicates in triple terms must be named nodes' ],
    ],
  });
});
