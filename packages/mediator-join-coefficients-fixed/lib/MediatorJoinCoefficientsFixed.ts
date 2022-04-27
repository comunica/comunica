import type { ActorRdfJoin, IActionRdfJoin } from '@comunica/bus-rdf-join';
import { KeysQueryOperation } from '@comunica/context-entries';
import type { IActorReply, IMediatorArgs } from '@comunica/core';
import { Actor, Mediator } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { IQueryOperationResult } from '@comunica/types';

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

  private async logJoinActor(bestActor: ActorRdfJoin, action: IActionRdfJoin, costs: number[], coefficients: IMediatorTypeJoinCoefficients) {
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

  protected async mediateWith(
    action: IActionRdfJoin,
    testResults: IActorReply<ActorRdfJoin, IActionRdfJoin, IMediatorTypeJoinCoefficients, IQueryOperationResult>[],
  ): Promise<ActorRdfJoin> {

    // Obtain test results
    const errors: Error[] = [];
    const costs: { cost: number, actor: ActorRdfJoin }[] = [];
    const penalized: { cost: number, actor: ActorRdfJoin }[] = [];


    const result = await new Promise<{ cost: number, actor: ActorRdfJoin } | false>(async (resolve) => {
      const limitIndicator: number | undefined = action.context.get(KeysQueryOperation.limitIndicator);

      const promises = testResults
      .map(({ reply, actor }) => reply
        .then(coeff => {
          const cost = this.grossCost(coeff);
          if (limitIndicator && this.penalize(coeff, limitIndicator)) {
            penalized.push({ cost, actor });
          } else if (cost === 0) {
            resolve({ cost, actor }); // Early stopping if there is no penalty and the cost is 0
          } else {
            costs.push({ cost, actor });
          }
        })
        .catch(error => { errors.push(error) }));
      await Promise.all(promises);
      resolve(false);
    });

    if (result) {
      // Emit calculations in logger
    if (result.actor.includeInLogs) {
      Actor.getContextLogger(action.context)?.debug(`Determined physical join operator '${bestActor.logicalType}-${bestActor.physicalName}'`, {
        entries: action.entries.length,
        variables: await Promise.all(action.entries
          .map(async entry => (await entry.output.metadata()).variables.map(variable => variable.value))),
        costs: Object.fromEntries(costs.map((coeff, i) => [
          `${testResults[i].actor.logicalType}-${testResults[i].actor.physicalName}`,
          coeff,
        ])),
        coefficients: Object.fromEntries(result.coeffs.map((coeff, i) => [
          `${testResults[i].actor.logicalType}-${testResults[i].actor.physicalName}`,
          coeff,
        ])),
      });
    }
    return result.actor;
    }
      
    
    if (costs.length !== 0) {
      // Select from costs
    } else {
      // Select from penalized
    }
    
    
    console.log('mediating with fixed coefficients');
    
    const promises = testResults
      .map(({ reply }, i) => reply
        .then(coeff => { costs.push({
          cost: this.grossCost(coeff),
          index: i
        }) })
        .catch(error => { errors.push(error) }));
    
    

    const maxCost = Math.max(...(<number[]> costs.filter(cost => cost !== undefined)));

    // If we have a limit indicator in the context,
    // increase cost of entries that have a number of iterations that is higher than the limit AND persist items.
    // In these cases, join operators that produce results early on will be preferred.
    // const limitIndicator: number | undefined = action.context.get(KeysQueryOperation.limitIndicator);
    if (limitIndicator) {
      costs = costs.map((cost, i) => {
        if (cost !== undefined && coefficients[i]!.persistedItems > 0 && coefficients[i]!.iterations > limitIndicator) {
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
      throw new Error(`All actors rejected their test in ${this.name}\n${
        errors.map(error => error.message).join('\n')}`);
    }

    // Return actor with lowest cost
    const bestActor = testResults[minIndex].actor;

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

    return bestActor;
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
