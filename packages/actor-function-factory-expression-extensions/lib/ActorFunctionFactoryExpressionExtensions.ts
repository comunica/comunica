import type {
  IActionFunctionFactory,
  IActorFunctionFactoryOutput,
  IActorFunctionFactoryArgs,
  IActorFunctionFactoryOutputTerm,
} from '@comunica/bus-function-factory';
import {
  ActorFunctionFactory,
} from '@comunica/bus-function-factory';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoidWithSideData } from '@comunica/core';
import type { AsyncExtensionFunction, AsyncExtensionFunctionCreator } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { NamedExtension } from './NamedExtension';

/**
 * A comunica Expression Function Extensions Function Factory Actor.
 */
export class ActorFunctionFactoryExpressionExtensions extends ActorFunctionFactory<AsyncExtensionFunction> {
  public constructor(args: IActorFunctionFactoryArgs<AsyncExtensionFunction>) {
    super(args);
  }

  public async test({ context, functionName }: IActionFunctionFactory):
  Promise<TestResult<IActorTest, AsyncExtensionFunction>> {
    const extensionFinder: AsyncExtensionFunctionCreator =
      context.getSafe(KeysExpressionEvaluator.extensionFunctionCreator);
    const definition = await extensionFinder(new DataFactory<RDF.Quad>().namedNode(functionName));
    if (definition) {
      return passTestVoidWithSideData(definition);
    }
    return failTest(
      `Actor ${this.name} can only provide non-termExpression implementations for functions that are provided through config entries like: ${KeysInitQuery.extensionFunctionCreator.name} or ${KeysInitQuery.extensionFunctions.name}`,
    );
  }

  public async run<T extends IActionFunctionFactory>({ functionName }: T, definition: AsyncExtensionFunction):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    return <T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm :
      IActorFunctionFactoryOutput><unknown> new NamedExtension({
        operator: functionName,
        functionDefinition: definition,
      });
  }
}
