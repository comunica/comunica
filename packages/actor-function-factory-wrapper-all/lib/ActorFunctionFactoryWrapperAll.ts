import type {
  IActionFunctionFactory,
  IActorFunctionFactoryArgs,
  IActorFunctionFactoryOutput,
  IActorFunctionFactoryOutputTerm,
  IExpressionFunction,
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
import { namedFunctions } from './implementation/NamedFunctions';
import { regularFunctions } from './implementation/RegularFunctions';

/**
 * A comunica Wrapper All Functions Actor.
 */
export class ActorFunctionFactoryWrapperAll extends ActorFunctionFactory {
  public constructor(args: IActorFunctionFactoryArgs) {
    super(args);
  }

  public async test(action: IActionFunctionFactory): Promise<IActorTest> {
    if (action.functionName === Eval.SparqlOperator.NOT) {
      throw new Error(`Actor does not execute the NOT function (so we can test the test the dedicated actor)`);
    }
    return true;
  }

  public async run<T extends IActionFunctionFactory>({ functionName, context }: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    if (functionName === Eval.SparqlOperator.NOT) {
      throw new Error(`Actor does not execute the NOT function (so we can test the test the dedicated actor)`);
    }
    context = Eval.prepareEvaluatorActionContext(context);
    const res: IExpressionFunction | undefined = {
      ...regularFunctions,
      ...namedFunctions,
    }[functionName];
    if (res) {
      return <T extends { requireTermExpression: true } ?
        IActorFunctionFactoryOutputTerm :
        IActorFunctionFactoryOutput>res;
    }

    const extensionFinder: AsyncExtensionFunctionCreator =
      context.getSafe(KeysExpressionEvaluator.extensionFunctionCreator);
    const definition = await extensionFinder(new DataFactory<RDF.Quad>().namedNode(functionName));
    if (definition) {
      return <T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm :
        IActorFunctionFactoryOutput><unknown> new NamedExtension(functionName, definition, functionName);
    }
    throw new Error('Unknown function');
  }
}