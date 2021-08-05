// TODO: this form is deprecated, we should not rename these types. Should change in next mayor update.
export { AsyncEvaluator, IAsyncEvaluatorConfig as AsyncEvaluatorConfig } from './lib/evaluators/AsyncEvaluator';
export { SyncEvaluator, ISyncEvaluatorConfig as SyncEvaluatorConfig } from './lib/evaluators/SyncEvaluator';
export { AggregateEvaluator } from './lib/evaluators/AggregateEvaluator';

export { ExpressionError, isExpressionError } from './lib/util/Errors';
export { orderTypes } from './lib/util/Ordering';
export { AsyncAggregateEvaluator } from './lib/evaluators/AsyncAggregateEvaluator';
