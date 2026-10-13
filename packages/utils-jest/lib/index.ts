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

declare module 'vitest' {
  interface Matchers<T = any> {
    toEqualBindings: (actual: RDF.Bindings) => T;
    toEqualBindingsArray: (actual: RDF.Bindings[], ignoreOrder?: boolean) => T;
    toEqualBindingsStream: (actual: RDF.Bindings[], ignoreOrder?: boolean) => Promise<T>;
    toPassTest: (actual: any) => T;
    toPassTestVoid: () => T;
    toFailTest: (actual: string) => T;
    toBeRdfIsomorphic: (actual: Iterable<RDF.BaseQuad>) => T;
    toEqualRdfTerm: (actual: RDF.Term) => T;
    toEqualRdfQuad: (actual: RDF.BaseQuad) => T;
    toEqualRdfQuadArray: (actual: RDF.BaseQuad[]) => T;
  }
}

// The global 'expect' is used instead of importing it, as this package is built to CommonJS,
// and 'vitest' throws when it is required rather than imported.
(<any> globalThis).expect.extend(matchers);
