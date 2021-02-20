import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import type { ActionContext, IActorTest } from '@comunica/core';
import type { IActorQueryOperationOutputBindings } from '@comunica/types';
import { TransformIterator } from 'asynciterator';
import type { Algebra } from 'sparqlalgebrajs';
import { BindingsIndex } from './BindingsIndex';

/**
 * A comunica Minus Query Operation Actor.
 */
export class ActorQueryOperationMinus extends ActorQueryOperationTypedMediated<Algebra.Minus> {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'minus');
  }

  public async testOperation(operation: Algebra.Minus, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.Minus, context: ActionContext):
  Promise<IActorQueryOperationOutputBindings> {
    const buffer = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: pattern.right, context }),
    );
    const output = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: pattern.left, context }),
    );

    const commons: string[] = this.getCommonVariables(buffer.variables, output.variables);
    if (commons.length > 0) {
      /**
       * To assure we've filtered all B (`buffer`) values from A (`output`) we wait until we've fetched all values of B.
       * Then we save these triples in `index` and use it to filter our A-stream.
       */
      const index: BindingsIndex = new BindingsIndex(commons);
      const bindingsStream = new TransformIterator(async() => {
        await new Promise(resolve => {
          buffer.bindingsStream.on('data', data => index.add(data));
          buffer.bindingsStream.on('end', resolve);
        });
        return output.bindingsStream.filter(data => !index.contains(data));
      }, { autoStart: false });
      const canContainUndefs = buffer.canContainUndefs || output.canContainUndefs;
      return {
        type: 'bindings',
        bindingsStream,
        variables: output.variables,
        metadata: output.metadata,
        canContainUndefs,
      };
    }
    return output;
  }

  /**
   * This function puts all common values between 2 arrays in a map with `value` : true
   */
  private getCommonVariables(array1: string[], array2: string[]): string[] {
    return Object.keys(array1.filter(
      (value: string) => array2.includes(value),
    ).reduce((hash: Record<string, boolean>, key: string) => {
      hash[key] = true;
      return hash;
    }, {}));
  }
}
