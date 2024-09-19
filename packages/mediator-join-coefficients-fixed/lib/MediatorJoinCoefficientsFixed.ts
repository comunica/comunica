import type { ActorRdfJoin, IActionRdfJoin, IActorRdfJoinTestSideData } from '@comunica/bus-rdf-join';
import { KeysQueryOperation } from '@comunica/context-entries';
import type { IActorReply, IMediatorArgs, TestResult } from '@comunica/core';
import { passTestWithSideData, failTest, Actor, Mediator } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { IQueryOperationResult } from '@comunica/types';

/**
 * A mediator that mediates over actors implementing the Join Coefficients mediator type and assigns fixed weights
 * to calculate an overall score and pick the actor with the lowest score.
 */
export class MediatorJoinCoefficientsFixed extends Mediator<
  ActorRdfJoin,
IActionRdfJoin,
IMediatorTypeJoinCoefficients,
IQueryOperationResult,
IActorRdfJoinTestSideData
> {
  public readonly cpuWeight: number;
  public readonly memoryWeight: number;
  public readonly timeWeight: number;
  public readonly ioWeight: number;

  public constructor(args: IMediatorJoinCoefficientsFixedArgs) {
    super(args);
  }

  protected async mediateWith(
    action: IActionRdfJoin,
    testResults: IActorReply<
      ActorRdfJoin,
IActionRdfJoin,
IMediatorTypeJoinCoefficients,
IQueryOperationResult,
IActorRdfJoinTestSideData
>[],
  ): Promise<TestResult<ActorRdfJoin, IActorRdfJoinTestSideData>> {
    // Obtain test results
    const errors: string[] = [];
    const promises = testResults.map(({ reply }) => reply);
    const results = (await Promise.all(promises)).map((testResult) => {
      if (testResult.isFailed()) {
        errors.push(testResult.getFailMessage());
        // eslint-disable-next-line array-callback-return
        return;
      }
      return { value: testResult.get(), sideData: testResult.getSideData() };
    });

    // Calculate costs
    let costs: (number | undefined)[] = results
      // eslint-disable-next-line array-callback-return
      .map((result) => {
        if (result) {
          return result.value.iterations * this.cpuWeight +
            result.value.persistedItems * this.memoryWeight +
            result.value.blockingItems * this.timeWeight +
            result.value.requestTime * this.ioWeight;
        }
      });
    const maxCost = Math.max(...(<number[]> costs.filter(cost => cost !== undefined)));

    // If we have a limit indicator in the context,
    // increase cost of entries that have a number of iterations that is higher than the limit AND block items.
    // In these cases, join operators that produce results early on will be preferred.
    const limitIndicator: number | undefined = action.context.get(KeysQueryOperation.limitIndicator);
    if (limitIndicator) {
      costs = costs.map((cost, i) => {
        if (cost !== undefined && (<any> results[i]?.value).blockingItems > 0 &&

          (<any> results[i]?.value).iterations > limitIndicator) {
          return cost + maxCost;
        }
        return cost;
      });
    }

    // Determine index with lowest cost
    let minIndex = -1;
    let minValue = Number.POSITIVE_INFINITY;
    for (const [ i, cost ] of costs.entries()) {
      if (cost !== undefined && (minIndex === -1 || cost < minValue)) {
        minIndex = i;
        minValue = cost;
      }
    }

    // Reject if all actors rejected
    if (minIndex < 0) {
      return failTest(this.constructFailureMessage(action, errors));
    }

    // Return actor with lowest cost
    const bestActor = testResults[minIndex].actor;

    // Emit calculations in logger
    if (bestActor.includeInLogs) {
      Actor.getContextLogger(action.context)?.debug(`Determined physical join operator '${bestActor.logicalType}-${bestActor.physicalName}'`, {
        entries: action.entries.length,
        variables: await Promise.all(action.entries
          .map(async entry => (await entry.output.metadata()).variables.map(variable => variable.variable.value))),
        costs: Object.fromEntries(costs.map((coeff, i) => [
          `${testResults[i].actor.logicalType}-${testResults[i].actor.physicalName}`,
          coeff,
        ]).filter(entry => entry[1] !== undefined)),
        coefficients: Object.fromEntries(results.map((result, i) => [
          `${testResults[i].actor.logicalType}-${testResults[i].actor.physicalName}`,
          result?.value,
        ]).filter(entry => entry[1] !== undefined)),
      });
    }

    return passTestWithSideData(bestActor, results[minIndex]!.sideData);
  }
}

export interface IMediatorJoinCoefficientsFixedArgs extends IMediatorArgs<
  ActorRdfJoin,
IActionRdfJoin,
IMediatorTypeJoinCoefficients,
IQueryOperationResult,
IActorRdfJoinTestSideData
> {
  /**
   * Weight for the CPU cost
   */
  cpuWeight: number;
  /**
   * Weight for the memory cost
   */
  memoryWeight: number;
  /**
   * Weight for the execution time cost
   */
  timeWeight: number;
  /**
   * Weight for the I/O cost
   */
  ioWeight: number;
}
