// TODO: this thing will be it's own actor but it's just a little special.
//  It will also be the only consumer of the context items:
//  KeysInitQuery.extensionFunctions and KeysInitQuery.extensionFunctionCreator
import { ExpressionFunctionBase } from '@comunica/bus-function-factory/lib/implementation/Core';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import * as Eval from '@comunica/expression-evaluator';
import type { AsyncExtensionFunction } from '@comunica/types';

interface NamedExtensionArgs {
  operator: string;
  functionDefinition: AsyncExtensionFunction;
}

export class NamedExtension extends ExpressionFunctionBase {
  // TODO: the context should be checked in the test part of the actor.
  //  The fact that this can be done is async now is a nice feature!
  //  It means that named function definitions could be queried over the web!
  // TODO: when all is done, this should be injected in some way!
  public constructor({ operator, functionDefinition }: NamedExtensionArgs) {
    super({
      arity: Number.POSITIVE_INFINITY,
      operator,
      apply: async({ args, exprEval, mapping }: Eval.IEvalContext): Promise<Eval.TermExpression> => {
        const evaluatedArgs: Eval.Term[] = await Promise.all(args.map(arg =>
          exprEval.evaluatorExpressionEvaluation(arg, mapping)));
        try {
          return new Eval.TermTransformer(exprEval.context.getSafe(KeysExpressionEvaluator.superTypeProvider))
            .transformRDFTermUnsafe(
              await functionDefinition(evaluatedArgs.map(term =>
                term.toRDF(exprEval.context.getSafe(KeysInitQuery.dataFactory)))),
            );
        } catch (error: unknown) {
          throw new Eval.ExtensionFunctionError(this.operator, error);
        }
      }
      ,
    });
  }
}
