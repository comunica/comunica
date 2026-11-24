import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { RdfVariant } from '@comunica/types';
import type { FuncTestTableConfig } from '@comunica/utils-jest';
import {
  runFuncTestTable,
  Notation,
} from '@comunica/utils-jest';
import { ActorFunctionFactoryTermTriple } from '../lib';

function configFor(rdfVariant?: RdfVariant): Pick<FuncTestTableConfig<object>, 'config'> {
  return rdfVariant ? { config: new ActionContext({ [KeysInitQuery.rdfVariant.name]: rdfVariant }) } : {};
}

describe('evaluation of \'TRIPLE\'', () => {
  const config: Omit<FuncTestTableConfig<object>, 'testArray' | 'errorArray'> = {
    registeredActors: [
      args => new ActorFunctionFactoryTermTriple(args),
    ],
    arity: 'vary',
    notation: Notation.Function,
    operation: 'TRIPLE',
  };

  describe.each<RdfVariant | undefined>([ undefined, 'rdf' ])('for RDF variant %s', (rdfVariant) => {
    runFuncTestTable({
      ...config,
      ...configFor(rdfVariant),
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

  describe('for RDF variant symmetricRDF', () => {
    runFuncTestTable({
      ...config,
      ...configFor('symmetricRdf'),
      testArray: [
        [ '<ex:a>', '<ex:b>', '<ex:c>', '<< <ex:a> <ex:b> <ex:c> >>' ],
        [ '<ex:a>', '<ex:b>', '"123"', '<< <ex:a> <ex:b> "123" >>' ],
        [ '<ex:a>', '<ex:b>', '<<( <ex:a> <ex:b> <ex:c> )>>', '<< <ex:a> <ex:b> << <ex:a> <ex:b> <ex:c> >> >>' ],
        [ '"literal"', '<ex:b>', '<ex:c>', '<< "literal" <ex:b> <ex:c> >>' ],
        [ '<<( <ex:a> <ex:b> <ex:c> )>>', '<ex:b>', '<ex:c>', '<< << <ex:a> <ex:b> <ex:c> >> <ex:b> <ex:c> >>' ],
      ],
      errorArray: [
        [ '<ex:a>', '"literal"', '<ex:c>', 'Predicates in triple terms must be named nodes' ],
        [ '<ex:a>', '<<( <ex:a> <ex:b> <ex:c> )>>', '<ex:c>', 'Predicates in triple terms must be named nodes' ],
      ],
    });
  });

  describe('for RDF variant generalizedRDF', () => {
    runFuncTestTable({
      ...config,
      ...configFor('generalizedRdf'),
      testArray: [
        [ '<ex:a>', '<ex:b>', '<ex:c>', '<< <ex:a> <ex:b> <ex:c> >>' ],
        [ '<ex:a>', '<ex:b>', '"123"', '<< <ex:a> <ex:b> "123" >>' ],
        [ '"literal"', '<ex:b>', '<ex:c>', '<< "literal" <ex:b> <ex:c> >>' ],
        [ '<<( <ex:a> <ex:b> <ex:c> )>>', '<ex:b>', '<ex:c>', '<< << <ex:a> <ex:b> <ex:c> >> <ex:b> <ex:c> >>' ],
        [ '<ex:a>', '"literal"', '<ex:c>', '<< <ex:a> "literal" <ex:c> >>' ],
        [ '<ex:a>', '<<( <ex:a> <ex:b> <ex:c> )>>', '<ex:c>', '<< <ex:a> << <ex:a> <ex:b> <ex:c> >> <ex:c> >>' ],
        [ '"s"', '"p"', '"o"', '<< "s" "p" "o" >>' ],
      ],
    });
  });
});
