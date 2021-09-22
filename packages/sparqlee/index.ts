// TODO: this form is deprecated, we should not rename these types. Should change in next mayor update.
export { AsyncEvaluator, IAsyncEvaluatorContext as AsyncEvaluatorConfig,
  IAsyncEvaluatorContext as IAsyncEvaluatorConfig } from './lib/evaluators/AsyncEvaluator';
export { SyncEvaluator, ISyncEvaluatorContext as SyncEvaluatorConfig,
  ISyncEvaluatorContext as ISyncEvaluatorConfig } from './lib/evaluators/SyncEvaluator';
export { AggregateEvaluator } from './lib/evaluators/AggregateEvaluator';

export { ExpressionError, isExpressionError } from './lib/util/Errors';
export { orderTypes } from './lib/util/Ordering';
export { AsyncAggregateEvaluator } from './lib/evaluators/AsyncAggregateEvaluator';
