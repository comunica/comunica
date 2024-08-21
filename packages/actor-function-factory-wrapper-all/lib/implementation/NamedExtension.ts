// TODO: this thing will be it's own actor but it's just a little special.
//  It will also be the only consumer of the context items:
//  KeysInitQuery.extensionFunctions and KeysInitQuery.extensionFunctionCreator
import { BaseFunctionDefinition } from '@comunica/bus-function-factory/lib/implementation/Core';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import type { IEvalContext } from '@comunica/expression-evaluator';
import type * as E from '@comunica/expression-evaluator/lib/expressions';
import { TermTransformer } from '@comunica/expression-evaluator/lib/transformers/TermTransformer';
import { ExtensionFunctionError } from '@comunica/expression-evaluator/lib/util/Errors';
import type { AsyncExtensionFunction } from '@comunica/types';

export class NamedExtension extends BaseFunctionDefinition {
  // TODO: the context should be checked in the test part of the actor.
  //  The fact that this can be done is async now is a nice feature!
  //  It means that named function definitions could be queried over the web!
  // TODO: when all is done, this should be injected in some way!
  protected arity = Number.POSITIVE_INFINITY;
  public constructor(
    public readonly operator: string,
    private readonly functionDefinition: AsyncExtensionFunction,
  ) {
    super();
  }

  public apply = async({ args, exprEval, mapping }: IEvalContext): Promise<E.TermExpression> => {
    const evaluatedArgs: E.Term[] = await Promise.all(args.map(arg =>
      exprEval.evaluatorExpressionEvaluation(arg, mapping)));
    try {
      return new TermTransformer(exprEval.context.getSafe(KeysExpressionEvaluator.superTypeProvider))
        .transformRDFTermUnsafe(
          await this.functionDefinition(evaluatedArgs.map(term =>
            term.toRDF(exprEval.context.getSafe(KeysInitQuery.dataFactory)))),
        );
    } catch (error: unknown) {
      throw new ExtensionFunctionError(this.operator, error);
    }
  };
}
