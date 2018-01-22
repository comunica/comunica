import {ActorQueryOperationTypedMediated, Bindings, IActorQueryOperationOutput,
  IActorQueryOperationTypedMediatedArgs} from "@comunica/bus-query-operation";
import {ActorRdfJoin} from "@comunica/bus-rdf-join";
import {IActorTest} from "@comunica/core";
import {Algebra} from "sparqlalgebrajs";

/**
 * A comunica LeftJoin NestedLoop Query Operation Actor.
 */
export class ActorQueryOperationLeftJoinNestedLoop extends ActorQueryOperationTypedMediated<Algebra.LeftJoin> {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'leftjoin');
  }

  public async testOperation(pattern: Algebra.LeftJoin, context?: {[id: string]: any}): Promise<IActorTest> {
    return !pattern.expression;
  }

  public async runOperation(pattern: Algebra.LeftJoin, context?: {[id: string]: any})
    : Promise<IActorQueryOperationOutput> {

    // uses nested loop join
    const left = await this.mediatorQueryOperation.mediate({ operation: pattern.left, context });
    const right = await this.mediatorQueryOperation.mediate({ operation: pattern.right, context });
    const bindingsStream = left.bindingsStream.transform<Bindings>({
      optional: true,
      transform: (leftItem, next) => {
        const rightStream = right.bindingsStream.clone();
        rightStream.on('end', next);
        rightStream.on('data', (rightItem) => {
          const join = ActorRdfJoin.join(leftItem, rightItem);
          if (join) {
            if (pattern.expression) {
              // TODO: do this once expressions are implemented
              // Values of both streams can be used for this expression
            }

            bindingsStream._push(join);
          }
        });
      },
    });

    const variables = ActorRdfJoin.joinVariables({ entries: [left, right] });
    const metadata = Promise.all([pattern.left, pattern.right].map((entry) => entry.metadata))
      .then((metadatas) => metadatas.reduce((acc, val) => acc * val.totalItems, 1))
      .catch(() => Infinity)
      .then((totalItems) =>  ({ totalItems }) );

    return { bindingsStream, metadata, variables };
  }

}
