import { ActorFunctionFactoryTermDatatype } from '@comunica/actor-function-factory-term-datatype';
import { ActorFunctionFactoryTermEquality } from '@comunica/actor-function-factory-term-equality';
import {
  ActorFunctionFactoryTermGreaterThanEqual,
} from '@comunica/actor-function-factory-term-greater-than-equal';
import { ActorFunctionFactoryTermLesserThan } from '@comunica/actor-function-factory-term-lesser-than';
import {
  ActorFunctionFactoryTermLesserThanEqual,
} from '@comunica/actor-function-factory-term-lesser-than-equal';
import type { FuncTestTableConfig } from '@comunica/bus-function-factory/test/util';
import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { bool } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermRand } from '../lib';

describe('We should respect the rand01 spec', () => {
  const config: FuncTestTableConfig<object> = {
    registeredActors: [
      args => new ActorFunctionFactoryTermRand(args),
      args => new ActorFunctionFactoryTermGreaterThanEqual(args),
      args => new ActorFunctionFactoryTermLesserThanEqual(args),
      args => new ActorFunctionFactoryTermLesserThan(args),
      args => new ActorFunctionFactoryTermEquality(args),
      args => new ActorFunctionFactoryTermDatatype(args),
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
