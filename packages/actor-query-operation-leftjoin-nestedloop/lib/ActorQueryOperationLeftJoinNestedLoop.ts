import {
  ActorQueryOperation, ActorQueryOperationTypedMediated, Bindings, IActorQueryOperationOutputBindings,
  IActorQueryOperationTypedMediatedArgs,
} from "@comunica/bus-query-operation";
import { ActorRdfJoin } from "@comunica/bus-rdf-join";
import { ActionContext, IActorTest } from "@comunica/core";
import { ClonedIterator } from "asynciterator";
import { Algebra } from "sparqlalgebrajs";
import { AsyncEvaluator, isExpressionError } from 'sparqlee';

/**
 * A comunica LeftJoin NestedLoop Query Operation Actor.
 */
export class ActorQueryOperationLeftJoinNestedLoop extends ActorQueryOperationTypedMediated<Algebra.LeftJoin> {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'leftjoin');
  }

  public async testOperation(pattern: Algebra.LeftJoin, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.LeftJoin, context: ActionContext)
    : Promise<IActorQueryOperationOutputBindings> {

    const leftRaw = await this.mediatorQueryOperation.mediate({ operation: pattern.left, context });
    const left = ActorQueryOperation.getSafeBindings(leftRaw);
    const rightRaw = await this.mediatorQueryOperation.mediate({ operation: pattern.right, context });
    const right = ActorQueryOperation.getSafeBindings(rightRaw);

    // TODO: refactor custom handling of pattern.expression. Should be pushed on the bus instead as a filter operation.
    const config = { ...ActorQueryOperation.getExpressionContext(context) };
    const evaluator = (pattern.expression)
      ? new AsyncEvaluator(pattern.expression, config)
      : null;

    const leftJoinInner = (outerItem: Bindings, innerStream: ClonedIterator<Bindings>) => {
      const joinedStream = innerStream
        .transform({
          transform: async (innerItem: Bindings, nextInner: any) => {
            const joinedBindings = ActorRdfJoin.join(outerItem, innerItem);
            if (!joinedBindings) { nextInner(); return; }
            if (!pattern.expression) {
              joinedStream._push({ joinedBindings, result: true });
              nextInner();
              return;
            }
            try {
              const result = await evaluator.evaluateAsEBV(joinedBindings);
              joinedStream._push({ joinedBindings, result });
            } catch (err) {
              if (!isExpressionError(err)) {
                bindingsStream.emit('error', err);
              }
            }
            nextInner();
          },
        });
      return joinedStream;
    };

    const leftJoinOuter = (leftItem: Bindings, nextLeft: any) => {
      const innerStream = right.bindingsStream.clone();
      const joinedStream = leftJoinInner(leftItem, innerStream);

      // TODO: This will not work for larger streams.
      // The full inner stream is kept in memory.
      joinedStream.on('end', () => nextLeft());
      joinedStream.on('data', async ({ joinedBindings, result }) => {
        if (result) {
          bindingsStream._push(joinedBindings);
        }
      });
    };

    const transform = leftJoinOuter;
    const bindingsStream = left.bindingsStream
      .transform<Bindings>({ optional: true, transform });

    const variables = ActorRdfJoin.joinVariables({ entries: [left, right] });
    const metadata = () => Promise.all([left, right].map((entry) => entry.metadata()))
      .then((metadatas) => metadatas.reduce((acc, val) => acc * val.totalItems, 1))
      .catch(() => Infinity)
      .then((totalItems) => ({ totalItems }));

    return { type: 'bindings', bindingsStream, metadata, variables };
  }
}
