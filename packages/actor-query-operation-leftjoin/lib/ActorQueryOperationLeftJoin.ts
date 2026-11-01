import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { MediatorRdfJoin } from '@comunica/bus-rdf-join';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { Bindings, IActionContext, IJoinEntry, IQueryOperationResult, MetadataVariable } from '@comunica/types';
import { Algebra, algebraUtils } from '@comunica/utils-algebra';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { getSafeBindings } from '@comunica/utils-query-operation';
import { ArrayIterator } from 'asynciterator';

/**
 * A comunica LeftJoin Query Operation Actor.
 */
export class ActorQueryOperationLeftJoin extends ActorQueryOperationTypedMediated<Algebra.LeftJoin> {
  public readonly mediatorJoin: MediatorRdfJoin;

  public constructor(args: IActorQueryOperationLeftJoinArgs) {
    super(args, Algebra.Types.LEFT_JOIN);
    this.mediatorJoin = args.mediatorJoin;
  }

  public async testOperation(_operation: Algebra.LeftJoin, _context: IActionContext): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async runOperation(operationOriginal: Algebra.LeftJoin, context: IActionContext):
  Promise<IQueryOperationResult> {
    // Prototype: an empty left side produces no results, so the right side does not need to be evaluated
    if ((<any> globalThis).__proto?.lazyRight) {
      const left = getSafeBindings(await this.mediatorQueryOperation
        .mediate({ operation: operationOriginal.input[0], context }));
      const leftMetadata = await left.metadata();
      if (leftMetadata.cardinality.type === 'exact' && leftMetadata.cardinality.value === 0) {
        left.bindingsStream.close();
        const leftVariables = new Set(leftMetadata.variables.map(variable => variable.variable.value));
        const rightVariables: MetadataVariable[] = algebraUtils.inScopeVariables(operationOriginal.input[1])
          .filter(variable => !leftVariables.has(variable.value))
          .map(variable => ({ variable, canBeUndef: true }));
        return {
          type: 'bindings',
          bindingsStream: new ArrayIterator<Bindings>([], { autoStart: false }),
          metadata: async() => ({
            state: new MetadataValidationState(),
            cardinality: { type: 'exact', value: 0 },
            variables: [ ...leftMetadata.variables, ...rightVariables ],
          }),
        };
      }
      const right = getSafeBindings(await this.mediatorQueryOperation
        .mediate({ operation: operationOriginal.input[1], context }));
      const expression = operationOriginal.expression;
      return await this.mediatorJoin.mediate({
        type: 'optional',
        entries: [
          { output: left, operation: operationOriginal.input[0] },
          { output: right, operation: operationOriginal.input[1] },
        ],
        context,
        ...expression ? { expression } : {},
      });
    }

    // Delegate to join bus, which decides how the expression is evaluated
    const entries: IJoinEntry[] = await Promise.all(operationOriginal.input
      .map(async subOperation => ({
        output: getSafeBindings(await this.mediatorQueryOperation.mediate({ operation: subOperation, context })),
        operation: subOperation,
      })));

    const expression = operationOriginal.expression;
    return await this.mediatorJoin.mediate({
      type: 'optional',
      entries,
      context,
      ...expression ? { expression } : {},
    });
  }
}

export interface IActorQueryOperationLeftJoinArgs extends IActorQueryOperationTypedMediatedArgs {
  /**
   * A mediator for joining Bindings streams
   */
  mediatorJoin: MediatorRdfJoin;
}
