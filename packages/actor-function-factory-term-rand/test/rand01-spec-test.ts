import { ActorFunctionFactoryTermFunctionDatatype } from '@comunica/actor-function-factory-term-function-datatype';
import { ActorFunctionFactoryTermFunctionEquality } from '@comunica/actor-function-factory-term-function-equality';
import {
  ActorFunctionFactoryTermFunctionGreaterThanEqual,
} from '@comunica/actor-function-factory-term-function-greater-than-equal';
import { ActorFunctionFactoryTermFunctionLesserThan } from '@comunica/actor-function-factory-term-function-lesser-than';
import {
  ActorFunctionFactoryTermFunctionLesserThanEqual,
} from '@comunica/actor-function-factory-term-function-lesser-than-equal';
import type { FuncTestTableConfig } from '@comunica/bus-function-factory/test/util';
import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { bool } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionRand } from '../lib';

describe('We should respect the rand01 spec', () => {
  const config: FuncTestTableConfig<object> = {
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionRand(args),
      args => new ActorFunctionFactoryTermFunctionGreaterThanEqual(args),
      args => new ActorFunctionFactoryTermFunctionLesserThanEqual(args),
      args => new ActorFunctionFactoryTermFunctionLesserThan(args),
      args => new ActorFunctionFactoryTermFunctionEquality(args),
      args => new ActorFunctionFactoryTermFunctionDatatype(args),
    ],
    arity: 2,
    notation: Notation.Infix,
    aliases: bool,
    operation: '',
  };
  runFuncTestTable({
    ...config,
    operation: '>=',
    testTable: `
      RAND() 0.0 = true
    `,
  });
  runFuncTestTable({
    ...config,
    operation: '<',
    testTable: `
      RAND() 1.0 = true    
    `,
  });
  runFuncTestTable({
    ...config,
    arity: 1,
    operation: 'DATATYPE',
    notation: Notation.Function,
    testTable: `
      RAND() = http://www.w3.org/2001/XMLSchema#double    
    `,
  });
});

/**
 * RESULTS: rand01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head></head>
 * <boolean>true</boolean>
 * </sparql>
 */
