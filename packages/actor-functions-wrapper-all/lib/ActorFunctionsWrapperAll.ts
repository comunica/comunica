import type { IActionFunctions,
  IActorFunctionsOutput,
  IActorFunctionsArgs,
  IExpressionFunction,
  IActorFunctionsOutputTerm } from '@comunica/bus-functions';
import {
  ActorFunctions,
} from '@comunica/bus-functions';
import { KeysExpressionEvaluator } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import type * as C from '@comunica/expression-evaluator/lib/util/Consts';
import type { AsyncExtensionFunctionCreator } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { NamedExtension } from './implementation/NamedExtension';
import { namedFunctions } from './implementation/NamedFunctions';
import { regularFunctions } from './implementation/RegularFunctions';
import { specialFunctions } from './implementation/SpecialFunctions';

/**
 * A comunica Wrapper All Functions Actor.
 */
export class ActorFunctionsWrapperAll extends ActorFunctions {
  public constructor(args: IActorFunctionsArgs) {
    super(args);
  }

  public async test(action: IActionFunctions): Promise<IActorTest> {
    return true;
  }

  public async run<T extends IActionFunctions>({ functionName, context }: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionsOutputTerm : IActorFunctionsOutput> {
    const res: IExpressionFunction | undefined = {
      ...regularFunctions,
      ...specialFunctions,
      ...namedFunctions,
    }[<C.NamedOperator | C.Operator> functionName];
    if (res) {
      return <T extends { requireTermExpression: true } ? IActorFunctionsOutputTerm : IActorFunctionsOutput>res;
    }

    const extensionFinder: AsyncExtensionFunctionCreator =
      context.getSafe(KeysExpressionEvaluator.extensionFunctionCreator);
    const definition = await extensionFinder(new DataFactory<RDF.Quad>().namedNode(functionName));
    if (definition) {
      return <T extends { requireTermExpression: true } ? IActorFunctionsOutputTerm :
        IActorFunctionsOutput><unknown> new NamedExtension(functionName, definition);
    }
    throw new Error('no');
  }
}
