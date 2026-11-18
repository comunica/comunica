import {
  runFuncTestTable,
  bool,
  Notation,
} from '@comunica/utils-jest';
import { ActorFunctionFactoryTermLangmatches } from '../lib';

// TODO: Add errors for when non BCP47 strings are passed
// https://www.rfc-editor.org/rfc/rfc4647#section-3.3.1
describe('evaluation of \'langMatches\' like', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermLangmatches(args),
    ],
    arity: 2,
    operation: 'langMatches',
    notation: Notation.Function,
    aliases: bool,
    testTable: `
       "de-DE" "de-de" = true
       "de-DE-1996" "de-de" = true
       "de-Deva" "de-de" = false
       "de-Latn-DE" "de-de" = false
       "en" "en" = true
       "en-GB" "en" = true
       "EN-gb" "en" = true
       "en-GB" "EN" = true
       "en-GB" "en-gb" = true
       "eng" "en" = false
       "eng-GB" "en" = false
       "en" "en-GB" = false
       "en" "" = false
       "de" "fr" = false
       "fr" "*" = true
       "fr-CA" "*" = true
       "" "*" = false
       "" "en" = false
       "" "" = false
       "en" "e." = false
       "en" "e(" = false
       "*" "en" = false
       "k" "K" = false
       "de-Latn-DE" "de-*-DE" = false
       "de-DE" "de-*-DE" = false
       "de" "de-*" = false
      `,
  });
});
