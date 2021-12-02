import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import type { IActorTest } from '@comunica/core';
import type { Algebra, Factory } from 'sparqlalgebrajs';
import { Util } from 'sparqlalgebrajs';

/**
 * A comunica Join Connected Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationJoinConnected extends ActorOptimizeQueryOperation {
  public async test(action: IActionOptimizeQueryOperation): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const operation = Util.mapOperation(action.operation, {
      join(op: Algebra.Join, factory: Factory) {
        return {
          recurse: false,
          result: ActorOptimizeQueryOperationJoinConnected.cluster(op, factory),
        };
      },
    });
    return { operation, context: action.context };
  }

  /**
   * Iteratively cluster join entries based on their overlapping variables.
   * @param op A join operation.
   * @param factory An algebra factory.
   */
  public static cluster(op: Algebra.Join, factory: Factory): Algebra.Join {
    // Initialize each entry to be in a separate cluster
    const initialClusters: IJoinCluster[] = op.input.map(subOp => ({
      inScopeVariables: Object.fromEntries(Util.inScopeVariables(subOp).map(variable => [ variable.value, true ])),
      entries: [ subOp ],
    }));

    // Iteratively merge clusters until they don't change anymore
    let oldClusters: IJoinCluster[];
    let newClusters: IJoinCluster[] = initialClusters;
    do {
      oldClusters = newClusters;
      newClusters = ActorOptimizeQueryOperationJoinConnected.clusterIteration(oldClusters);
    } while (oldClusters.length !== newClusters.length);

    // Create new join operation of latest clusters
    const subJoins = newClusters.map(cluster => factory.createJoin(cluster.entries));
    return subJoins.length === 1 ? subJoins[0] : factory.createJoin(subJoins, false);
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
