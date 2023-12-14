export { ExpressionEvaluator } from '@comunica/actor-expression-evaluator-factory-base/lib/ExpressionEvaluator';

export { TermTransformer } from './transformers/TermTransformer';
export { ExpressionError, isExpressionError, EmptyAggregateError } from './util/Errors';
export { typedLiteral, TypeURL, TypeAlias, RegularOperator } from './util/Consts';
export { isSubTypeOf } from './util/TypeHandling';
export { FunctionApplication } from './types';
export { IEvalContext } from './types';

