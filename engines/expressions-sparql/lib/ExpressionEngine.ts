import { ExpressionEngineBase } from '@comunica/actor-init-expressions';
import type { ActorInitExpressions } from '@comunica/actor-init-expressions';
import { KeysExpressionEvaluator } from '@comunica/context-entries';
import type { ExistenceResolver, IActionContext } from '@comunica/types';

// eslint-disable-next-line ts/no-require-imports,ts/no-var-requires,import/extensions
const engineDefault = require('../engine-default.js');

/**
 * Used when the caller did not provide an existence resolver.
 * This engine configures no query operations, so it cannot evaluate the sub-query of an EXISTS itself.
 */
const unsupportedExistence: ExistenceResolver = () => {
  throw new Error(`Evaluating EXISTS requires a ${KeysExpressionEvaluator.existenceResolver.name} in the context`);
};

/**
 * A Comunica engine for evaluating SPARQL expressions, without executing queries.
 */
export class ExpressionEngine extends ExpressionEngineBase {
  public constructor(engine: ActorInitExpressions = engineDefault()) {
    super(engine);
  }

  protected override prepareContext(context?: IActionContext): IActionContext {
    return super.prepareContext(context)
      .setDefault(KeysExpressionEvaluator.existenceResolver, unsupportedExistence);
  }
}
