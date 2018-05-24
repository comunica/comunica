import {
  ActorQueryOperation, ActorQueryOperationTypedMediated, Bindings,
  IActorQueryOperationOutputBindings,
  IActorQueryOperationTypedMediatedArgs,
} from "@comunica/bus-query-operation";
import { BindingsStream } from "@comunica/bus-query-operation";
import { IActorTest } from "@comunica/core";
import { termToString } from "rdf-string";
import { Algebra } from "sparqlalgebrajs";
import { AsyncEvaluator, ExpressionError } from "sparqlee";

/**
 * A comunica Extend Query Operation Actor.
 */
export class ActorQueryOperationExtend extends ActorQueryOperationTypedMediated<Algebra.Extend> {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'extend');
  }

  public async testOperation(pattern: Algebra.Extend, context?: { [id: string]: any }): Promise<IActorTest> {
    // will throw error for unsupported operators
    const _ = new AsyncEvaluator(pattern.expression);
    return true;
  }

  public async runOperation(pattern: Algebra.Extend, context?: { [id: string]: any })
    : Promise<IActorQueryOperationOutputBindings> {

    const { expression, input, variable } = pattern;

    // Resolve the input
    const output: IActorQueryOperationOutputBindings = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: pattern.input, context }));
    const bindingKey = termToString(variable);
    const evaluator = new AsyncEvaluator(expression);
    const throwIfHardError = (err: any) => {
      if (!(err instanceof ExpressionError)) {
        bindingsStream.emit('error', err);
        throw err;
      }
    };

    const transform = (item: Bindings, next: any) => {
      evaluator.evaluate(item)
        .then((result) => {
          const newBindings = Bindings({ [bindingKey]: result });
          bindingsStream._push(newBindings);
        })

        // Leave the value unbound if it's the expression that Errors
        .catch((err) => {
          throwIfHardError(err);
          bindingsStream._push(Bindings({}));
        })
        .then(next);
    };

    const variables = [bindingKey];
    const bindingsStream = output.bindingsStream.transform<Bindings>({ transform });

    // TODO check if metadata can be kept
    return { type: 'bindings', bindingsStream, metadata: output.metadata, variables };
  }

}
