import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { ComunicaDataFactory } from '@comunica/types';
import { Algebra, algebraUtils, AlgebraFactory } from '@comunica/utils-algebra';

/**
 * A comunica Join Connected Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationJoinConnected extends ActorOptimizeQueryOperation {
  public async test(_action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const factory = new AlgebraFactory(dataFactory);

    const operation = algebraUtils.mapOperation(action.operation, {
      [Algebra.Types.JOIN]: {
        transform: op => ActorOptimizeQueryOperationJoinConnected.cluster(op, factory),
      },
    });
    return { operation, context: action.context };
  }

  /**
   * Iteratively cluster join entries based on their overlapping variables.
   * @param op A join operation.
   * @param factory An algebra factory.
   */
  public static cluster(op: Algebra.Join, factory: AlgebraFactory): Algebra.Operation {
    // Initialize each entry to be in a separate cluster, after flattening nested joins
    const initialClusters: IJoinCluster[] = op.input
      .flatMap(subOp => algebraUtils.isKnownOperation(subOp, Algebra.Types.JOIN) ? subOp.input : [ subOp ])
      .map(subOp => ({
        inScopeVariables: ActorOptimizeQueryOperationJoinConnected.getInScopeVariables(subOp),
        entries: [ subOp ],
      }));

    // Iteratively merge clusters until they don't change anymore
    let oldClusters: IJoinCluster[];
    let newClusters: IJoinCluster[] = initialClusters;
    do {
      oldClusters = newClusters;
      newClusters = ActorOptimizeQueryOperationJoinConnected.clusterIteration(oldClusters);
    } while (oldClusters.length !== newClusters.length);

    // A join that forms a single cluster in its original order, without nested joins, stays the same
    if (newClusters.length === 1 && op.input.length > 1 && newClusters[0].entries.length === op.input.length &&
      newClusters[0].entries.every((entry, index) => entry === op.input[index]) &&
      (!op.metadata || Object.keys(op.metadata).length === 0)) {
      return op;
    }

    // Create new join operation of latest clusters
    const subJoins = newClusters
      .map(cluster => cluster.entries.length === 1 ? cluster.entries[0] : factory.createJoin(cluster.entries));
    return subJoins.length === 1 ? subJoins[0] : factory.createJoin(subJoins, false);
  }

  /**
   * Determine the variables in scope of a join entry.
   * The variables of patterns without quoted triples are read from their terms, without traversing them.
   * @param op A join entry.
   */
  public static getInScopeVariables(op: Algebra.Operation): Record<string, boolean> {
    if (algebraUtils.isKnownOperation(op, Algebra.Types.PATTERN)) {
      const variables: Record<string, boolean> = {};
      let quoted = false;
      for (const term of [ op.subject, op.predicate, op.object, op.graph ]) {
        if (term.termType === 'Variable') {
          variables[term.value] = true;
        } else if (term.termType === 'Quad') {
          quoted = true;
        }
      }
      if (!quoted) {
        return variables;
      }
    }
    return Object.fromEntries(algebraUtils.inScopeVariables(op).map(variable => [ variable.value, true ]));
  }

  /**
   * Perform a single clustering iteration.
   * Clusters will be joined if they have overlapping variables.
   * @param oldCluster
   */
  public static clusterIteration(oldCluster: IJoinCluster[]): IJoinCluster[] {
    const newClusters: IJoinCluster[] = [];

    for (const entry of oldCluster) {
      // Try to add entry to a join cluster
      let joined = false;
      for (const newEntry of newClusters) {
        if (ActorOptimizeQueryOperationJoinConnected
          .haveOverlappingVariables(entry.inScopeVariables, newEntry.inScopeVariables)) {
          newEntry.entries = [ ...newEntry.entries, ...entry.entries ];
          newEntry.inScopeVariables = { ...newEntry.inScopeVariables, ...entry.inScopeVariables };
          joined = true;
          break;
        }
      }

      // If none was found, create new cluster
      if (!joined) {
        newClusters.push({
          inScopeVariables: entry.inScopeVariables,
          entries: entry.entries,
        });
      }
    }

    return newClusters;
  }

  /**
   * Check if the two given variable objects are overlapping.
   * @param variablesA A variables objects.
   * @param variablesB A variables objects.
   */
  public static haveOverlappingVariables(
    variablesA: Record<string, boolean>,
    variablesB: Record<string, boolean>,
  ): boolean {
    for (const variableA of Object.keys(variablesA)) {
      if (variablesB[variableA]) {
        return true;
      }
    }
    return false;
  }
}

/**
 * A cluster of join entries.
 */
export interface IJoinCluster {
  /**
   * Union of all variables in scope within the join entries.
   */
  inScopeVariables: Record<string, boolean>;
  /**
   * Join entries
   */
  entries: Algebra.Operation[];
}
