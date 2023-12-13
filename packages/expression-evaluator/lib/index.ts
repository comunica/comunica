export { ExpressionEvaluator } from './evaluators/ExpressionEvaluator';

export { TermTransformer } from './transformers/TermTransformer';
export { ExpressionError, isExpressionError, EmptyAggregateError } from './util/Errors';
export { typedLiteral, TypeURL, TypeAlias, RegularOperator } from './util/Consts';
export { isSubTypeOf } from './util/TypeHandling';
export { IExpressionFunction } from './types';
export { FunctionApplication } from './types';
export { IEvalContext } from './types';
export { IExpressionEvaluator } from './types';
export { IInternalEvaluator } from './types';

