import type { ActorRdfJoin, IActionRdfJoin } from '@comunica/bus-rdf-join';
import { KeysQueryOperation } from '@comunica/context-entries';
import type { IActorReply, IMediatorArgs } from '@comunica/core';
import { Actor, Mediator } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { IQueryOperationResult } from '@comunica/types';

interface ICoefficientData {
  cost: number;
  actor: ActorRdfJoin;
  coefficients: IMediatorTypeJoinCoefficients
}

function getBestActor(actors: ICoefficientData[]): ActorRdfJoin {
  let [best] = actors;
  for (let i = 1; i < actors.length; i++) {
    if (actors[i].cost < best.cost) {
      best = actors[i];
    }
  }
  return best.actor;
}

/**
 * A mediator that mediates over actors implementing the Join Coefficients mediator type and assigns fixed weights
 * to calculate an overall score and pick the actor with the lowest score.
 */
export class MediatorJoinCoefficientsFixed
  extends Mediator<ActorRdfJoin, IActionRdfJoin, IMediatorTypeJoinCoefficients, IQueryOperationResult> {
  public readonly cpuWeight: number;
  public readonly memoryWeight: number;
  public readonly timeWeight: number;
  public readonly ioWeight: number;

  public constructor(args: IMediatorJoinCoefficientsFixedArgs) {
    super(args);
  }

  private grossCost(coeff: IMediatorTypeJoinCoefficients): number {
    return coeff.iterations * this.cpuWeight +
      coeff.persistedItems * this.memoryWeight +
      coeff.blockingItems * this.timeWeight +
      coeff.requestTime * this.ioWeight;
  }

  private penalize(coeff: IMediatorTypeJoinCoefficients, limitIndicator: number): boolean {
    return coeff.persistedItems > 0 && coeff.iterations > limitIndicator;
  }

  protected async mediateWith(
    action: IActionRdfJoin,
    testResults: IActorReply<ActorRdfJoin, IActionRdfJoin, IMediatorTypeJoinCoefficients, IQueryOperationResult>[],
  ): Promise<ActorRdfJoin> {

    // Obtain test results
    const errors: Error[] = [];
    const costs: { cost: number, actor: ActorRdfJoin, coefficients: IMediatorTypeJoinCoefficients }[] = [];
    const penalized: { cost: number, actor: ActorRdfJoin, coefficients: IMediatorTypeJoinCoefficients }[] = [];


    const result = await new Promise<{ cost: number, actor: ActorRdfJoin, coefficients: IMediatorTypeJoinCoefficients } | false>(async (resolve) => {
      const limitIndicator: number | undefined = action.context.get(KeysQueryOperation.limitIndicator);

      const promises = testResults
      .map(({ reply, actor }) => reply
        .then(coefficients => {
          const cost = this.grossCost(coefficients);
          if (limitIndicator && this.penalize(coefficients, limitIndicator)) {
            penalized.push({ cost, actor, coefficients });
          } else if (cost === 0) {
            resolve({ cost, actor, coefficients }); // Early stopping if there is no penalty and the cost is 0
          } else {
            costs.push({ cost, actor, coefficients});
          }
        })
        .catch(error => { errors.push(error) }));
      await Promise.all(promises);
      resolve(false);
    });

    if (result) {
      // Emit calculations in logger
    if (result.actor.includeInLogs) {
      Actor.getContextLogger(action.context)?.debug(`Determined physical join operator '${result.actor.logicalType}-${result.actor.physicalName}'`, {
        entries: action.entries.length,
        variables: await Promise.all(action.entries
          .map(async entry => (await entry.output.metadata()).variables.map(variable => variable.value))),
        cost: result.cost,
        coefficients: result.coefficients
      });
    }
    return result.actor;
    }

    async function log(actor: ActorRdfJoin) {
      // Emit calculations in logger
    if (bestActor.includeInLogs) {
      Actor.getContextLogger(action.context)?.debug(`Determined physical join operator '${bestActor.logicalType}-${bestActor.physicalName}'`, {
        entries: action.entries.length,
        variables: await Promise.all(action.entries
          .map(async entry => (await entry.output.metadata()).variables.map(variable => variable.value))),
        costs: Object.fromEntries(costs.map((coeff, i) => [
          `${testResults[i].actor.logicalType}-${testResults[i].actor.physicalName}`,
          coeff,
        ])),
        coefficients: Object.fromEntries(coefficients.map((coeff, i) => [
          `${testResults[i].actor.logicalType}-${testResults[i].actor.physicalName}`,
          coeff,
        ])),
      });
    }
    }

    if (costs.length !== 0) {
      return getBestActor(costs)
    } else if (penalized.length !== 0) {
      return getBestActor(penalized);
    } else {
      throw new Error(`All actors rejected their test in ${this.name}\n${
        errors.map(error => error.message).join('\n')}`);
    }
  }
}

export interface IMediatorJoinCoefficientsFixedArgs
  extends IMediatorArgs<ActorRdfJoin, IActionRdfJoin, IMediatorTypeJoinCoefficients, IQueryOperationResult> {
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
