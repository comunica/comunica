import { ActionContext, Bus } from '@comunica/core';
import { BlankNodeBindingsScoped } from '@comunica/data-factory';
import type { IActionContext } from '@comunica/types';
import { LRUCache } from 'lru-cache';
import type { Algebra as Alg } from 'sparqlalgebrajs';
import { translate } from 'sparqlalgebrajs';
import { ExpressionEvaluatorFactory } from '../../lib';
import type { ICompleteEEContext } from '../../lib/evaluators/evaluatorHelpers/AsyncRecursiveEvaluator';
import type { IAsyncEvaluatorContext } from '../../lib/evaluators/ExpressionEvaluator';
import type { AliasMap } from './Aliases';
import type { Notation } from './TestTable';
import { ArrayTable, BinaryTable, UnaryTable, VariableTable } from './TestTable';

export function getMockEEActionContext(): IActionContext {
  return new ActionContext({});
}

export function getMockEEFactory(): ExpressionEvaluatorFactory {
  const bus: any = new Bus({ name: 'bus' });

  const mediatorQueryOperation: any = {
    async mediate(arg: any) { return {}; },
  };

  return new ExpressionEvaluatorFactory({
    mediatorQueryOperation,
    mediatorBindingsAggregatorFactory: mediatorQueryOperation,
  });
}

export function getMockExpression(expr: string): Alg.Expression {
  return translate(`SELECT * WHERE { ?s ?p ?o FILTER (${expr})}`).input.expression;
}

export interface ITestTableConfigBase {
  /**
   * Operation / function that needs to be called on the arguments provided in the TestTable.
   */
  operation: string;
  /**
   * How many arguments does the operation take. The vary option means you don't know. This can only be provided
   * when the notation is Notation.Function.
   */
  arity: 1 | 2 | 'vary';
  notation: Notation;
  /**
   * Configuration that'll we provided to the Evaluator.
   * If the type is sync, the test will be preformed both sync and async.
   */
  config?: IActionContext;
  // TODO: remove legacyContext in *final* update (probably when preparing the EE for function bussification)
  legacyContext?: Partial<IAsyncEvaluatorContext>;
  aliases?: AliasMap;
  /**
   * Additional prefixes can be provided if the defaultPrefixes in ./Aliases.ts are not enough.
   */
  additionalPrefixes?: Record<string, string>;
}
export type TestTableConfig = ITestTableConfigBase & {
  /**
   * TestTable that will check equality;
   */
  testTable?: string;
  /**
   * Test array that will check equality;
   */
  testArray?: string[][];
  /**
   * TestTable that will check if a given error is thrown.
   * Result can be '' if the message doesn't need to be checked.
   */
  errorTable?: string;
  /**
   * Test array that will check if a given error is thrown.
   * Result can be '' if the message doesn't need to be checked.
   */
  errorArray?: string[][];
};

export function runTestTable(arg: TestTableConfig): void {
  if (!(arg.testTable || arg.testArray || arg.errorTable || arg.errorArray)) {
    // We throw this error and don't just say all is well because not providing a table is probably a user mistake.
    throw new Error('Can not test if no testTable, testArray, or errorTable is provided');
  }

  let testTable: ArrayTable | UnaryTable | BinaryTable | VariableTable;
  if (arg.testArray || arg.errorArray) {
    testTable = new ArrayTable(arg);
  } else if (arg.arity === 1) {
    testTable = new UnaryTable(arg);
  } else if (arg.arity === 2) {
    testTable = new BinaryTable(arg);
  } else {
    testTable = new VariableTable(arg);
  }

  testTable.test();
}

export function getDefaultCompleteEEContext(actionContext?: IActionContext): ICompleteEEContext {
  return {
    actionContext: actionContext || getMockEEActionContext(),
    now: new Date(),
    superTypeProvider: {
      cache: new LRUCache({ max: 1_000 }),
      discoverer: () => 'term',
    },
    functionArgumentsCache: {},
    defaultTimeZone: { zoneMinutes: 0, zoneHours: 0 },
    bnode: (input?: string) => Promise.resolve(new BlankNodeBindingsScoped(input || `BNODE_0`)),
    exists: () => Promise.resolve(false),
  };
}

