// TODO: this thing will be it's own actor but it's just a little special.
//  It will also be the only consumer of the context items:
//  KeysInitQuery.extensionFunctions and KeysInitQuery.extensionFunctionCreator
import { KeysExpressionEvaluator } from '@comunica/context-entries';
import type { IEvalContext } from '@comunica/types';
import type { AsyncExtensionFunction } from '../evaluators/InternalEvaluator';
import type * as E from '../expressions';
import { TermTransformer } from '../transformers/TermTransformer';
import { ExtensionFunctionError } from '../util/Errors';
import { BaseFunctionDefinition } from './Core';

export class NamedExtension extends BaseFunctionDefinition {
  // TODO: the context should be checked in the test part of the actor.
  //  The fact that this can be done is async now is a nice feature!
  //  It means that named function definitions could be queried over the web!
  // TODO: when all is done, this should be injected in some way!
  protected arity = Number.POSITIVE_INFINITY;
  public constructor(private readonly name: string, private readonly functionDefinition: AsyncExtensionFunction) {
    super();
  }

  public apply = async({ args, exprEval, mapping }: IEvalContext): Promise<E.TermExpression> => {
    const evaluatedArgs: E.Term[] = await Promise.all(args.map(arg => exprEval.internalEvaluation(arg, mapping)));
    try {
      return new TermTransformer(exprEval.context.getSafe(KeysExpressionEvaluator.superTypeProvider))
        .transformRDFTermUnsafe(
          await this.functionDefinition(evaluatedArgs.map(term => term.toRDF())),
        );
    } catch (error: unknown) {
      throw new ExtensionFunctionError(this.name, error);
    }
  };
}
