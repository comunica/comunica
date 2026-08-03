import type * as RDF from '@rdfjs/types';
import matchers from './matchers';

export * from './expressionEvaluator/Aliases';
export * from './expressionEvaluator/TestTable';
export * from './expressionEvaluator/functionFactory';
export * from './expressionEvaluator/generalEvaluation';
export * from './expressionEvaluator/utils';
export * as EvalTestData from './expressionEvaluator/data';
// Explicit re-export from helpers to avoid name conflicts with Aliases
// (int, decimal, double in helpers return RDF.Term; in Aliases they return strings)
// termInt/termDecimal/termDouble are the RDF.Term-returning versions from helpers
export {
  BF,
  DF,
  date,
  float,
  getMockEEActionContext,
  getMockEEFactory,
  getMockInternalEvaluator,
  getMockMediatorExpressionEvaluatorFactory,
  getMockMediatorFunctionFactory,
  getMockMediatorMergeBindingsContext,
  getMockMediatorQueryOperation,
  getMockSuperTypeProvider,
  makeAggregate,
  nonLiteral,
  string,
  int as termInt,
  decimal as termDecimal,
  double as termDouble,
} from './expressionEvaluator/helpers';

declare global {
  // eslint-disable-next-line ts/no-namespace
  namespace jest {
    interface Matchers<R> {
      toEqualBindings: (actual: RDF.Bindings) => R;
      toEqualBindingsArray: (actual: RDF.Bindings[], ignoreOrder?: boolean) => R;
      toEqualBindingsStream: (actual: RDF.Bindings[], ignoreOrder?: boolean) => Promise<R>;
      toPassTest: (actual: any) => R;
      toPassTestVoid: () => R;
      toFailTest: (actual: string) => R;
    }
  }
}

(<any> globalThis).expect.extend(matchers);
