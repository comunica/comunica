import type { ActorRdfJoin, IActionRdfJoin } from '@comunica/bus-rdf-join';
import type { IActorReply, IMediatorArgs } from '@comunica/core';
import { Actor, Mediator } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { IActorQueryOperationOutput } from '@comunica/types';

/**
 * A mediator that mediates over actors implementing the Join Coefficients mediator type and assigns fixed weights
 * to calculate an overall score and pick the actor with the lowest score.
 */
export class MediatorJoinCoefficientsFixed
  extends Mediator<ActorRdfJoin, IActionRdfJoin, IMediatorTypeJoinCoefficients, IActorQueryOperationOutput> {
  public readonly cpuWeight: number;
  public readonly memoryWeight: number;
  public readonly timeWeight: number;
  public readonly ioWeight: number;

  public constructor(args: IMediatorJoinCoefficientsFixedArgs) {
    super(args);
  }

  protected async mediateWith(
    action: IActionRdfJoin,
    testResults: IActorReply<ActorRdfJoin, IActionRdfJoin, IMediatorTypeJoinCoefficients, IActorQueryOperationOutput>[],
  ): Promise<ActorRdfJoin> {
    // Obtain test results
    const errors: Error[] = [];
    const promises = testResults
      .map(({ reply }) => reply)
      .map(promise => promise.catch(error => {
        errors.push(error);
      }));
    const coefficients = await Promise.all(promises);

    // Calculate costs
    const costs: (number | undefined)[] = coefficients
      // eslint-disable-next-line array-callback-return
      .map(coeff => {
        if (coeff) {
          return coeff.iterations * this.cpuWeight +
            coeff.persistedItems * this.memoryWeight +
            coeff.blockingItems * this.timeWeight +
            coeff.requestTime * this.ioWeight;
        }
      });

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
      throw new Error(`All actors rejected their test in ${this.name}\n${
        errors.map(error => error.message).join('\n')}`);
    }

    // Return actor with lowest cost
    const bestActor = testResults[minIndex].actor;

    // Emit calculations in logger
    Actor.getContextLogger(action.context)?.debug(`Determined physical join operator '${bestActor.physicalName}'`, {
      entries: action.entries.length,
      variables: action.entries.map(entry => entry.output.variables),
      costs: costs.reduce<any>((acc, coeff, i) => {
        acc[testResults[i].actor.physicalName] = coeff;
        return acc;
      }, {}),
      coefficients: coefficients.reduce<any>((acc, coeff, i) => {
        acc[testResults[i].actor.physicalName] = coeff;
        return acc;
      }, {}),
    });

    return bestActor;
  }
}

export interface IMediatorJoinCoefficientsFixedArgs
  extends IMediatorArgs<ActorRdfJoin, IActionRdfJoin, IMediatorTypeJoinCoefficients, IActorQueryOperationOutput> {
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
