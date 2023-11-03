// TODO: this thing will be it's own actor but it's just a little special.
//  It will also be the only consumer of the context items:
//  KeysInitQuery.extensionFunctions and KeysInitQuery.extensionFunctionCreator
import type { IEvalContext } from '@comunica/types';
import type { AsyncExtensionFunction } from '../evaluators/ContextualizedEvaluator';
import type * as E from '../expressions';
import { ExtensionFunctionError } from '../util/Errors';
import { FunctionDefinition } from './Core';

export class NamedExtension extends FunctionDefinition {
  // TODO: the context should be checked in the test part of the actor.
  //  The fact that this can be done is async now is a nice feature!
  //  It means that named function definitions could be queried over the web!
  // TODO: when all is done, this should be injected in some way!
  protected arity = Number.POSITIVE_INFINITY;
  public constructor(private readonly name: string, private readonly functionDefinition: AsyncExtensionFunction) {
    super();
  }

  public apply = async({ args, exprEval, mapping }: IEvalContext): Promise<E.TermExpression> => {
    const evaluatedArgs: E.Term[] = await Promise.all(args.map(arg => exprEval.evaluateAsInternal(arg, mapping)));
    try {
      return exprEval.transformer.transformRDFTermUnsafe(
        await this.functionDefinition(evaluatedArgs.map(term => term.toRDF())),
      );
    } catch (error: unknown) {
      throw new ExtensionFunctionError(this.name, error);
    }
  };
}
