import {
  ActorQueryOperation, ActorQueryOperationTypedMediated, Bindings, IActorQueryOperationOutputBindings,
  IActorQueryOperationTypedMediatedArgs,
} from "@comunica/bus-query-operation";
import { ActorRdfJoin } from "@comunica/bus-rdf-join";
import { ActionContext, IActorTest } from "@comunica/core";
import { Algebra } from "sparqlalgebrajs";
import { AsyncEvaluator, ExpressionError } from 'sparqlee';

/**
 * A comunica LeftJoin NestedLoop Query Operation Actor.
 */
export class ActorQueryOperationLeftJoinNestedLoop extends ActorQueryOperationTypedMediated<Algebra.LeftJoin> {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'leftjoin');
  }

  public async testOperation(pattern: Algebra.LeftJoin, context: ActionContext): Promise<IActorTest> {
    return !pattern.expression;
  }

  public async runOperation(pattern: Algebra.LeftJoin, context: ActionContext)
    : Promise<IActorQueryOperationOutputBindings> {

    // uses nested loop join
    const leftRaw = await this.mediatorQueryOperation.mediate({ operation: pattern.left, context });
    const left = ActorQueryOperation.getSafeBindings(leftRaw);
    const rightRaw = await this.mediatorQueryOperation.mediate({ operation: pattern.right, context });
    const right = ActorQueryOperation.getSafeBindings(rightRaw);

    // When the right stream ends, and there have been no matches (pushes), the left
    // element should be pushed. This happens by setting the optional flag on the iterator.
    // TODO: There is a race condition if the stream ends before some async 'data' callbacks
    // have finished (which could match/push). Would be solved most easily by sparqlee exposing
    // a sync evaluator.
    const transform = (leftItem: Bindings, nextLeft: any) => {
      const rightStream = right.bindingsStream.clone();
      rightStream.on('end', () => nextLeft());
      rightStream.on('data', async (rightItem) => {
        const joinedBindings = ActorRdfJoin.join(leftItem, rightItem);
        if (!joinedBindings) { return; }
        if (!pattern.expression) { bindingsStream._push(joinedBindings); return; }
        try {
          const evaluator = new AsyncEvaluator(pattern.expression);
          const result = await evaluator.evaluateAsEBV(joinedBindings);
          if (result === true) {
            bindingsStream._push(joinedBindings);
          }
        } catch (err) {
          if (!this.isExpressionError(err)) {
            bindingsStream.emit('error', err);
          }
        }
      });
    };

    const bindingsStream = left.bindingsStream.transform<Bindings>({ optional: true, transform });

    const variables = ActorRdfJoin.joinVariables({ entries: [left, right] });
    const metadata = () => Promise.all([pattern.left, pattern.right].map((entry) => entry.metadata))
      .then((metadatas) => metadatas.reduce((acc, val) => acc * val.totalItems, 1))
      .catch(() => Infinity)
      .then((totalItems) => ({ totalItems }));

    return { type: 'bindings', bindingsStream, metadata, variables };
  }

  // TODO Duplication with e.g. Extend
  // Expression errors are errors intentionally thrown because of expression-data mismatches.
  // They are distinct from other errors in the sense that their behaviour is defined by
  // the SPARQL spec.
  // In this specific case, they should be ignored (while others obviously should not).
  // This function is separate so it can more easily be mocked in tests.
  public isExpressionError(error: Error): boolean {
    return error instanceof ExpressionError;
  }
}
