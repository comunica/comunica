import {ActorAbstractPath} from "@comunica/actor-abstract-path";
import {
  Bindings, IActorQueryOperationOutputBindings,
  IActorQueryOperationTypedMediatedArgs,
} from "@comunica/bus-query-operation";
import {ActionContext} from "@comunica/core";
import {termToString} from "rdf-string";
import {Algebra} from "sparqlalgebrajs";

/**
 * A comunica Path ZeroOrMore Query Operation Actor.
 */
export class ActorQueryOperationPathZeroOrMore extends ActorAbstractPath {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, Algebra.types.ZERO_OR_MORE_PATH);
  }

  public async runOperation(path: Algebra.Path, context: ActionContext)
    : Promise<IActorQueryOperationOutputBindings> {
    const predicate = <Algebra.ZeroOrMorePath> path.predicate;

    const sVar = path.subject.termType === 'Variable';
    const oVar = path.object.termType === 'Variable';

    if (sVar && oVar) {
      throw new Error('ZeroOrMore path expressions with 2 variables not supported yet');
    } else if (!sVar && !oVar) {
      const bindingsStream = (await this.ALPeval(path.subject, predicate.path, context))
        .transform<Bindings>({
          filter: (item) => item.equals(path.object),
          transform: (item, next) => {
            bindingsStream._push(Bindings({ }));
            next(null);
          },
        });
      return { type: 'bindings', bindingsStream, variables: [] };
    } else { // if (sVar || oVar)
      const v = termToString(sVar ? path.subject : path.object);
      const pred = sVar ? ActorAbstractPath.FACTORY.createInv(predicate.path) : predicate.path;
      const bindingsStream = (await this.ALPeval(sVar ? path.object : path.subject, pred, context))
        .transform<Bindings>({
          transform: (item, next) => {
            bindingsStream._push(Bindings({ [v]: item }));
            next(null);
          },
        });
      return { type: 'bindings', bindingsStream, variables: [v] };
    }
  }

}
