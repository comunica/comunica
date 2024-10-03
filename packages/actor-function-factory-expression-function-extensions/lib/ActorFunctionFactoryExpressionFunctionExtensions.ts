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
import { failTest, passTestVoid } from '@comunica/core';
import type { AsyncExtensionFunctionCreator } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { NamedExtension } from './NamedExtension';

/**
 * A comunica Expression Function Extensions Function Factory Actor.
 */
export class ActorFunctionFactoryExpressionFunctionExtensions extends ActorFunctionFactory {
  public constructor(args: IActorFunctionFactoryArgs) {
    super(args);
  }

  public async test({ context, functionName }: IActionFunctionFactory): Promise<TestResult<IActorTest>> {
    const extensionFinder: AsyncExtensionFunctionCreator =
      context.getSafe(KeysExpressionEvaluator.extensionFunctionCreator);
    const definition = await extensionFinder(new DataFactory<RDF.Quad>().namedNode(functionName));
    if (definition) {
      return passTestVoid();
    }
    return failTest(
      `Actor ${this.name} can only provide non-termExpression implementations for functions that are provided through config entries like: ${KeysInitQuery.extensionFunctionCreator.name} or ${KeysInitQuery.extensionFunctions.name}`,
    );
  }

  public async run<T extends IActionFunctionFactory>({ context, functionName }: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    const extensionFinder: AsyncExtensionFunctionCreator =
      context.getSafe(KeysExpressionEvaluator.extensionFunctionCreator);
    const definition = await extensionFinder(new DataFactory<RDF.Quad>().namedNode(functionName));
    return <T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm :
      IActorFunctionFactoryOutput><unknown> new NamedExtension({
        operator: functionName,
        functionDefinition: definition!,
      });
  }
}
