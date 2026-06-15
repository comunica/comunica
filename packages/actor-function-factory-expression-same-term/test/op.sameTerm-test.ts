import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import {
  bool,
  merge,
  numeric,
  Notation,
} from '@comunica/utils-jest';

import { ActorFunctionFactoryExpressionSameTerm } from '../lib';

describe('evaluation of \'sameTerm\'', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryExpressionSameTerm(args),
    ],
    operation: 'sameTerm',
    arity: 2,
    notation: Notation.Function,
    aliases: merge(numeric, bool),
    testTable: `
      <http://example.com> <http://example.com> = true
      <http://example.com/é> <http://example.com/%A9> = false
      1 1 = true
      1 1.0 = false
      true true = true
      true "1"^^xsd:boolean = false
      "a" "a" = true
      "a" "a"^^xsd:string = true
      "a"@en "a"@en = true
      "a"@en "a"@en-US = false
      `,
  });
});
