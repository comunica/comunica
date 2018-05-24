import {
  ActorQueryOperation, ActorQueryOperationTypedMediated, Bindings, IActorQueryOperationOutputBindings,
  IActorQueryOperationTypedMediatedArgs,
} from "@comunica/bus-query-operation";
import { ActorRdfJoin } from "@comunica/bus-rdf-join";
import { IActorTest } from "@comunica/core";
import { Algebra } from "sparqlalgebrajs";
import { AsyncEvaluator, ExpressionError } from 'sparqlee';

/**
 * A comunica LeftJoin NestedLoop Query Operation Actor.
 */
export class ActorQueryOperationLeftJoinNestedLoop extends ActorQueryOperationTypedMediated<Algebra.LeftJoin> {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'leftjoin');
  }

  public async testOperation(pattern: Algebra.LeftJoin, context?: { [id: string]: any }): Promise<IActorTest> {
    return !pattern.expression;
  }

  public async runOperation(pattern: Algebra.LeftJoin, context?: { [id: string]: any })
    : Promise<IActorQueryOperationOutputBindings> {

    // uses nested loop join
    const left: IActorQueryOperationOutputBindings = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: pattern.left, context }));
    const right: IActorQueryOperationOutputBindings = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: pattern.right, context }));

    const evaluator = (pattern.expression)
      ? new AsyncEvaluator(pattern.expression)
      : undefined;

    const throwIfHardError = (err: any) => {
      if (!(err instanceof ExpressionError)) {
        bindingsStream.emit('error', err);
        throw err;
      }
    };

    const bindingsStream = left.bindingsStream.transform<Bindings>({
      optional: true,
      transform: (leftItem, next) => {
        const rightStream = right.bindingsStream.clone();
        rightStream.on('end', next);
        rightStream.on('data', (rightItem) => {
          const join = ActorRdfJoin.join(leftItem, rightItem);
          if (join) {
            // If we want to keep orderening, next() should be used here.
            if (pattern.expression) {
              evaluator.evaluateAsEBV(join)
                .then((result) => { if (result) { bindingsStream._push(join); } })
                .catch(throwIfHardError);
            } else {
              bindingsStream._push(join);
            }
          }
        });
      },
    });

    const variables = ActorRdfJoin.joinVariables({ entries: [left, right] });
    const metadata = () => Promise.all([pattern.left, pattern.right].map((entry) => entry.metadata))
      .then((metadatas) => metadatas.reduce((acc, val) => acc * val.totalItems, 1))
      .catch(() => Infinity)
      .then((totalItems) => ({ totalItems }));

    return { type: 'bindings', bindingsStream, metadata, variables };
  }

}
