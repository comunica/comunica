import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { FragmentSelectorShape, IActionContext, IQuerySourceWrapper } from '@comunica/types';
import { Algebra, AlgebraFactory, algebraUtils } from '@comunica/utils-algebra';
import {
  assignOperationSource,
  doesShapeAcceptOperationInContext,
  getOperationSource,
  getSourceSelectorShape,
  removeOperationSource,
} from '@comunica/utils-query-operation';

/**
 * A comunica Push Source Joins Optimize Query Operation Actor.
 *
 * After source operations are grouped, a join can still have an entry with a single source S
 * next to a union of an operation over multiple sources that include S.
 * Such a join is evaluated by fetching both from S separately, or by passing bindings between them.
 * This actor rewrites Join(A@S, Union(B@S, B@T, ...)) into Union(Join(A, B)@S, Join(A@S, Union(B@T, ...))),
 * which has the same results, so that S evaluates its own part of the join in one request.
 * This also keeps joins over blank nodes of S within S.
 */
export class ActorOptimizeQueryOperationPushSourceJoins extends ActorOptimizeQueryOperation {
  public constructor(args: IActorOptimizeQueryOperationArgs) {
    super(args);
  }

  public async test(_action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const algebraFactory = new AlgebraFactory(action.context.getSafe(KeysInitQuery.dataFactory));

    // Determine the shapes of all sources up front, so the operation can be rewritten synchronously
    const shapes = new Map<IQuerySourceWrapper, FragmentSelectorShape>();
    const sources = new Set<IQuerySourceWrapper>();
    ActorOptimizeQueryOperationPushSourceJoins.collectSources(action.operation, sources);
    await Promise.all([ ...sources ].map(async(source) => {
      shapes.set(source, await getSourceSelectorShape(source, action.context));
    }));

    return {
      operation: this.pushJoins(action.operation, shapes, algebraFactory, action.context),
      context: action.context,
    };
  }

  /**
   * Collect the sources of an operation.
   */
  public static collectSources(operation: Algebra.Operation, sources: Set<IQuerySourceWrapper>): void {
    const source = getOperationSource(operation);
    if (source) {
      sources.add(source);
      return;
    }
    for (const input of ActorOptimizeQueryOperationPushSourceJoins.getInputs(operation)) {
      ActorOptimizeQueryOperationPushSourceJoins.collectSources(input, sources);
    }
  }

  /**
   * The input operations of an operation.
   */
  public static getInputs(operation: Algebra.Operation): Algebra.Operation[] {
    const input = (<any> operation).input;
    if (Array.isArray(input)) {
      return input;
    }
    if (input && typeof input === 'object' && 'type' in input) {
      return [ input ];
    }
    return [];
  }

  /**
   * Rewrite the joins in an operation, recursively.
   */
  public pushJoins(
    operation: Algebra.Operation,
    shapes: Map<IQuerySourceWrapper, FragmentSelectorShape>,
    algebraFactory: AlgebraFactory,
    context: IActionContext,
  ): Algebra.Operation {
    if (getOperationSource(operation)) {
      return operation;
    }
    const input = (<any> operation).input;
    if (Array.isArray(input)) {
      operation = <Algebra.Operation> { ...operation, input: input
        .map(subInput => this.pushJoins(subInput, shapes, algebraFactory, context)) };
    } else if (input && typeof input === 'object' && 'type' in input) {
      operation = <Algebra.Operation> { ...operation, input: this.pushJoins(input, shapes, algebraFactory, context) };
    }
    if (operation.type === Algebra.Types.JOIN) {
      return this.pushJoin(<Algebra.Join> operation, shapes, algebraFactory, context);
    }
    return operation;
  }

  /**
   * Rewrite a join, for each entry with a single source and a union entry it is connected to with that source.
   */
  public pushJoin(
    join: Algebra.Join,
    shapes: Map<IQuerySourceWrapper, FragmentSelectorShape>,
    algebraFactory: AlgebraFactory,
    context: IActionContext,
  ): Algebra.Operation {
    const entries = join.input;
    const used = new Set<number>();
    const rewritten: Algebra.Operation[] = [];
    for (const [ index, entry ] of entries.entries()) {
      const source = getOperationSource(entry);
      if (!source || used.has(index)) {
        continue;
      }
      const variables = new Set(algebraUtils.inScopeVariables(entry).map(variable => variable.value));
      const unionIndex = entries.findIndex((other, otherIndex) => !used.has(otherIndex) && otherIndex !== index &&
        other.type === Algebra.Types.UNION &&
        (<Algebra.Union> other).input.every(branch => getOperationSource(branch)) &&
        (<Algebra.Union> other).input.some(branch => getOperationSource(branch) === source) &&
        algebraUtils.inScopeVariables(other).some(variable => variables.has(variable.value)));
      if (unionIndex < 0) {
        continue;
      }
      const branches = (<Algebra.Union> entries[unionIndex]).input;
      const localBranches = branches.filter(branch => getOperationSource(branch) === source);
      const otherBranches = branches.filter(branch => getOperationSource(branch) !== source);
      const local = algebraFactory.createJoin([ entry, ...localBranches ]
        .map(operation => ActorOptimizeQueryOperationPushSourceJoins.withoutSource(operation)), true);
      if (!doesShapeAcceptOperationInContext(shapes.get(source)!, local, context)) {
        continue;
      }
      used.add(index);
      used.add(unionIndex);
      const localWithSource = assignOperationSource(local, source);
      if (otherBranches.length === 0) {
        rewritten.push(localWithSource);
      } else {
        const others = otherBranches.length === 1 ? otherBranches[0] : algebraFactory.createUnion(otherBranches, false);
        rewritten.push(algebraFactory.createUnion([
          localWithSource,
          algebraFactory.createJoin([ entry, others ], false),
        ], false));
      }
    }
    if (used.size === 0) {
      return join;
    }
    const remaining = entries.filter((_, index) => !used.has(index));
    const inputs = [ ...rewritten, ...remaining ];
    return inputs.length === 1 ? inputs[0] : algebraFactory.createJoin(inputs, false);
  }

  /**
   * A copy of an operation without its source annotation.
   */
  public static withoutSource(operation: Algebra.Operation): Algebra.Operation {
    const copy = { ...operation, metadata: operation.metadata ? { ...operation.metadata } : undefined };
    removeOperationSource(copy);
    return copy;
  }
}
