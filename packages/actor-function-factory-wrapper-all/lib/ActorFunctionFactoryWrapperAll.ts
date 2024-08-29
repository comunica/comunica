import type {
  IActionFunctionFactory,
  IActorFunctionFactoryArgs,
  IActorFunctionFactoryOutput,
  IActorFunctionFactoryOutputTerm,
} from '@comunica/bus-function-factory';
import {
  ActorFunctionFactory,
} from '@comunica/bus-function-factory';
import { KeysExpressionEvaluator } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import * as Eval from '@comunica/expression-evaluator';
import type { AsyncExtensionFunctionCreator } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { NamedExtension } from './implementation/NamedExtension';

/**
 * A comunica Wrapper All Functions Actor.
 */
export class ActorFunctionFactoryWrapperAll extends ActorFunctionFactory {
  public constructor(args: IActorFunctionFactoryArgs) {
    super(args);
  }

  public async test(args: IActionFunctionFactory): Promise<IActorTest> {
    if (args.functionName.startsWith('http') && !args.functionName.startsWith('http://www.w3.org/')) {
      return true;
    }
    throw new Error('no');
  }

  public async run<T extends IActionFunctionFactory>({ functionName, context }: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    context = Eval.prepareEvaluatorActionContext(context);

    const extensionFinder: AsyncExtensionFunctionCreator =
      context.getSafe(KeysExpressionEvaluator.extensionFunctionCreator);
    const definition = await extensionFinder(new DataFactory<RDF.Quad>().namedNode(functionName));
    if (definition) {
      return <T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm :
        IActorFunctionFactoryOutput><unknown> new NamedExtension({
          operator: functionName,
          functionDefinition: definition,
        });
    }
    throw new Eval.UnknownOperator(functionName);
  }
}
