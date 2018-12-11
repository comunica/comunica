import {ActorAbstractPath} from "@comunica/actor-abstract-path";
import {
  ActorQueryOperation,
  Bindings, IActorQueryOperationOutputBindings,
  IActorQueryOperationTypedMediatedArgs,
} from "@comunica/bus-query-operation";
import {ActionContext} from "@comunica/core";
import {BufferedIterator, MultiTransformIterator} from "asynciterator";
import {PromiseProxyIterator} from "asynciterator-promiseproxy";
import {Term} from "rdf-js";
import {termToString} from "rdf-string";
import {Algebra} from "sparqlalgebrajs";

/**
 * A comunica Path OneOrMore Query Operation Actor.
 */
export class ActorQueryOperationPathOneOrMore extends ActorAbstractPath {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, Algebra.types.ONE_OR_MORE_PATH);
  }

  public async runOperation(path: Algebra.Path, context: ActionContext)
    : Promise<IActorQueryOperationOutputBindings> {
    const predicate = <Algebra.OneOrMorePath> path.predicate;

    const sVar = path.subject.termType === 'Variable';
    const oVar = path.object.termType === 'Variable';

    if (!sVar && oVar) {
      // get all the results of applying this once, then do zeroOrMore for those
      const single = ActorAbstractPath.FACTORY.createPath(path.subject, predicate.path, path.object, path.graph);
      const results = ActorQueryOperation.getSafeBindings(
        await this.mediatorQueryOperation.mediate({context, operation: single}));
      const o = termToString(path.object);

      // all branches need to share the same V to prevent duplicates
      const V = {};

      const bindingsStream
        : MultiTransformIterator<Bindings, Bindings> = new MultiTransformIterator(results.bindingsStream);
      bindingsStream._createTransformer = (bindings: Bindings) => {
        const val = bindings.get(o);

        return new PromiseProxyIterator<Bindings>(
          async () => {
            const it = new BufferedIterator<Term>();
            await this.ALP(val, predicate.path, context, V, it, { count: 0 });
            return it.transform<Bindings>({
              transform: (item, next) => {
                bindingsStream._push(Bindings({ [o]: item }));
                next(null);
              },
            });
          }, { autoStart: true, maxBufferSize: 128 });
      };
      return { type: 'bindings', bindingsStream, variables: [o] };
    } else if (sVar && oVar) {
      throw new Error('ZeroOrMore path expressions with 2 variables not supported yet');
    } else if (sVar && !oVar) {
      return <Promise<IActorQueryOperationOutputBindings>> this.mediatorQueryOperation.mediate({
        context,
        operation: ActorAbstractPath.FACTORY.createPath(
          path.object,
          ActorAbstractPath.FACTORY.createOneOrMorePath(
            ActorAbstractPath.FACTORY.createInv(predicate.path)),
          path.subject,
          path.graph),
      });
    } else { // if (!sVar && !oVar)
      const b = this.generateBlankNode();
      const bString = termToString(b);
      const results = ActorQueryOperation.getSafeBindings(await this.mediatorQueryOperation.mediate({
        context,
        operation: ActorAbstractPath.FACTORY.createPath(path.subject, predicate, b, path.graph),
      }));
      const bindingsStream = results.bindingsStream.transform<Bindings>({
        filter: (item) => item.get(bString).equals(path.object),
        transform: (item, next) => {
          bindingsStream._push(Bindings({ }));
          next(null);
        },
      });
      return { type: 'bindings', bindingsStream, variables: [] };
    }
  }

}
