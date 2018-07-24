import {ActorQueryOperationTypedMediated, IActorQueryOperationOutput,
  IActorQueryOperationTypedMediatedArgs} from "@comunica/bus-query-operation";
import {ActionContext, IActorTest} from "@comunica/core";
import {Algebra} from "sparqlalgebrajs";

/**
 * A comunica Query Operation Actor for BGPs with a single pattern.
 */
export class ActorQueryOperationBgpSingle extends ActorQueryOperationTypedMediated<Algebra.Bgp> {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'bgp');
  }

  public async testOperation(pattern: Algebra.Bgp, context?: ActionContext): Promise<IActorTest> {
    if (pattern.patterns.length !== 1) {
      throw new Error('Actor ' + this.name + ' can only operate on BGPs with a single pattern.');
    }
    return true;
  }

  public runOperation(pattern: Algebra.Bgp, context?: ActionContext): Promise<IActorQueryOperationOutput> {
    return this.mediatorQueryOperation.mediate({ operation: pattern.patterns[0], context });
  }

}
