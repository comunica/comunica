import {ActorOptimizeQueryOperation, IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput} from "@comunica/bus-optimize-query-operation";
import {IActorArgs, IActorTest} from "@comunica/core";
import {Algebra, Factory, Util} from "sparqlalgebrajs";

/**
 * A comunica Join BGP Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationJoinBgp extends ActorOptimizeQueryOperation {

  constructor(args: IActorArgs<IActionOptimizeQueryOperation, IActorTest, IActorOptimizeQueryOperationOutput>) {
    super(args);
  }

  public async test(action: IActionOptimizeQueryOperation): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const operation = Util.mapOperation(action.operation, {
      join: (op: Algebra.Join, factory: Factory) => {
        if (op.left.type === 'bgp' && op.right.type === 'bgp') {
          return {
            recurse: false,
            result: factory.createBgp(op.left.patterns.concat(op.right.patterns)),
          };
        } else {
          return {
            recurse: false,
            result: op,
          };
        }
      },
    });
    return { operation };
  }

}
