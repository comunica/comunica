import {ActorQueryOperationTypedMediated, Bindings, IActorQueryOperationOutput,
  IActorQueryOperationTypedMediatedArgs} from "@comunica/bus-query-operation";
import {ActorQueryOperation, IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {ActorRdfJoin, IActionRdfJoin} from "@comunica/bus-rdf-join";
import {ActionContext, IActorTest, Mediator} from "@comunica/core";
import {IMediatorTypeIterations} from "@comunica/mediatortype-iterations";
import {AsyncIterator, BufferedIterator, MultiTransformIterator, SingletonIterator} from "asynciterator";
import {PromiseProxyIterator} from "asynciterator-promiseproxy";
import {RoundRobinUnionIterator} from "asynciterator-union";
import {blankNode} from "rdf-data-model";
import {BlankNode, Term} from "rdf-js";
import {termToString} from "rdf-string";
import {Algebra, Factory} from "sparqlalgebrajs";

/**
 * A comunica Path Query Operation Actor.
 */
export class ActorQueryOperationPath extends ActorQueryOperationTypedMediated<Algebra.Path> {

  protected static readonly FACTORY: Factory = new Factory();

  public readonly mediatorJoin: Mediator<ActorRdfJoin,
    IActionRdfJoin, IMediatorTypeIterations, IActorQueryOperationOutput>;

  constructor(args: IActorQueryOperationPath) {
    super(args, 'path');
  }

  public async testOperation(pattern: Algebra.Path, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  // generates a blank node that does not yet occur in the path
  public generateBlankNode(path?: Algebra.Path, name?: string): BlankNode {
    if (!name) {
      return this.generateBlankNode(path, 'b');
    }

    // path predicates can't contain variables/blank nodes
    if (path && (path.subject.value === name || path.object.value === name)) {
      return this.generateBlankNode(path, name + 'b');
    }

    return blankNode(name);
  }

  public handlePath(path: Algebra.Path, context: ActionContext): Promise<IActorQueryOperationOutput> {
    switch (path.predicate.type) {
    case Algebra.types.ALT: return this.handleAlt(path, context);
    case Algebra.types.INV: return this.handleInv(path, context);
    case Algebra.types.LINK: return this.handleLink(path, context);
    case Algebra.types.NPS: return this.handleNps(path, context);
    case Algebra.types.SEQ: return this.handleSeq(path, context);
    case Algebra.types.ONE_OR_MORE_PATH: return this.handleOneOrMore(path, context);
    case Algebra.types.ZERO_OR_MORE_PATH: return this.handleZeroOrMore(path, context);
    case Algebra.types.ZERO_OR_ONE_PATH: return this.handleZeroOrOne(path, context);
    }
    throw new Error('Unknown path predicate.');
  }

  public async handleAlt(path: Algebra.Path, context: ActionContext)
    : Promise<IActorQueryOperationOutputBindings> {
    const predicate = <Algebra.Alt> path.predicate;

    // TODO: parallelize
    const left = ActorQueryOperation.getSafeBindings(await this.handlePath(
      ActorQueryOperationPath.FACTORY.createPath(path.subject, predicate.left, path.object, path.graph), context));
    const right = ActorQueryOperation.getSafeBindings(await this.handlePath(
      ActorQueryOperationPath.FACTORY.createPath(path.subject, predicate.right, path.object, path.graph), context));

    const bindingsStream = new RoundRobinUnionIterator([left.bindingsStream, right.bindingsStream]);
    const variables = require('lodash.uniq')(left.variables.concat(right.variables));

    return { type: 'bindings', bindingsStream, variables };
  }

  public handleInv(path: Algebra.Path, context: ActionContext): Promise<IActorQueryOperationOutput> {
    const predicate = <Algebra.Inv> path.predicate;
    const invPath = ActorQueryOperationPath.FACTORY.createPath(path.object, predicate.path, path.subject, path.graph);
    return this.handlePath(invPath, context);
  }

  public handleLink(path: Algebra.Path, context: ActionContext): Promise<IActorQueryOperationOutput> {
    const predicate = <Algebra.Link> path.predicate;
    const operation = ActorQueryOperationPath.FACTORY.createPattern(
      path.subject, predicate.iri, path.object, path.graph);
    return this.mediatorQueryOperation.mediate({ operation, context });
  }

  public async handleNps(path: Algebra.Path, context: ActionContext)
    : Promise<IActorQueryOperationOutputBindings> {
    const predicate = <Algebra.Nps> path.predicate;
    const blank = this.generateBlankNode(path);
    const blankName = termToString(blank);

    const pattern = ActorQueryOperationPath.FACTORY.createPattern(path.subject, blank, path.object, path.graph);
    const output = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: pattern, context }));

    // remove the generated blank nodes from the bindings
    const bindingsStream = output.bindingsStream.transform<Bindings>({
      filter: (bindings) => {
        return !predicate.iris.some((iri) => iri.equals(bindings.get(blankName)));
      },
      transform: (item, next) => {
        bindingsStream._push(item.delete(blankName));
        next(null);
      },
    });

    return { type: 'bindings', bindingsStream, variables: output.variables };
  }

  public async handleSeq(path: Algebra.Path, context: ActionContext)
    : Promise<IActorQueryOperationOutputBindings> {
    const predicate = <Algebra.Seq> path.predicate;
    const blank = this.generateBlankNode(path);
    const blankName = termToString(blank);

    const left = ActorQueryOperation.getSafeBindings(await this.handlePath(
      ActorQueryOperationPath.FACTORY.createPath(path.subject, predicate.left, blank, path.graph), context));
    const right = ActorQueryOperation.getSafeBindings(await this.handlePath(
      ActorQueryOperationPath.FACTORY.createPath(blank, predicate.right, path.object, path.graph), context));

    const join = ActorQueryOperation.getSafeBindings(await this.mediatorJoin.mediate({ entries: [left, right] }));
    // remove the generated blank nodes from the bindings
    const bindingsStream = join.bindingsStream.transform<Bindings>({
      transform: (item, next) => {
        bindingsStream._push(item.delete(blankName));
        next(null);
      },
    });

    return { type: 'bindings', bindingsStream, variables: join.variables };
  }

  // based on definition in spec https://www.w3.org/TR/sparql11-query/
  // returns all nodes visited by infinitely repeating the given predicate, starting from x
  public async ALPeval(x: Term, predicate: Algebra.PropertyPathSymbol, context: ActionContext)
    : Promise<AsyncIterator<Term>> {
    const it = new BufferedIterator<Term>();
    await this.ALP(x, predicate, context, {}, it, { count: 0 });

    return it;
  }

  public async ALP(x: Term, predicate: Algebra.PropertyPathSymbol, context: ActionContext,
                   V: {[id: string]: Term}, it: BufferedIterator<Term>, counter: any): Promise<void> {
    const s = termToString(x);
    if (V[s]) {
      return;
    }

    it._push(x);
    V[s] = x;

    const b = this.generateBlankNode();
    const bString = termToString(b);
    const path = ActorQueryOperationPath.FACTORY.createPath(x, predicate, b);
    const results = ActorQueryOperation.getSafeBindings(await this.handlePath(path, context));
    counter.count++;
    results.bindingsStream.on('data', async (bindings) => {
      const result = bindings.get(bString);
      await this.ALP(result, predicate, context, V, it, counter);
    });
    results.bindingsStream.on('end', () => {
      if (--counter.count === 0) {
        it.close();
      }
    });
  }

  public async handleOneOrMore(path: Algebra.Path, context: ActionContext)
    : Promise<IActorQueryOperationOutputBindings> {
    const predicate = <Algebra.OneOrMorePath> path.predicate;

    const sVar = path.subject.termType === 'Variable' || path.subject.termType === 'BlankNode';
    const oVar = path.object.termType === 'Variable' || path.object.termType === 'BlankNode';

    if (!sVar && oVar) {
      // get all the results of applying this once, then do zeroOrMore for those
      const single = ActorQueryOperationPath.FACTORY.createPath(path.subject, predicate.path, path.object, path.graph);
      const results = ActorQueryOperation.getSafeBindings(await this.handlePath(single, context));
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
      return <Promise<IActorQueryOperationOutputBindings>> this.handlePath(
        ActorQueryOperationPath.FACTORY.createPath(
          path.object,
          ActorQueryOperationPath.FACTORY.createOneOrMorePath(
            ActorQueryOperationPath.FACTORY.createInv(predicate.path)),
          path.subject,
          path.graph),
        context);
    } else { // if (!sVar && !oVar)
      const b = this.generateBlankNode();
      const bString = termToString(b);
      const results = ActorQueryOperation.getSafeBindings(await this.handlePath(
        ActorQueryOperationPath.FACTORY.createPath(path.subject, predicate, b, path.graph), context));
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

  public async handleZeroOrMore(path: Algebra.Path, context: ActionContext)
    : Promise<IActorQueryOperationOutputBindings> {
    const predicate = <Algebra.ZeroOrMorePath> path.predicate;

    const sVar = path.subject.termType === 'Variable' || path.subject.termType === 'BlankNode';
    const oVar = path.object.termType === 'Variable' || path.object.termType === 'BlankNode';

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
    } else {
      const v = termToString(sVar ? path.subject : path.object);
      const pred = sVar ? ActorQueryOperationPath.FACTORY.createInv(predicate.path) : predicate.path;
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

  public async handleZeroOrOne(path: Algebra.Path, context: ActionContext)
    : Promise<IActorQueryOperationOutputBindings> {
    const predicate = <Algebra.ZeroOrOnePath> path.predicate;

    const sVar = path.subject.termType === 'Variable' || path.subject.termType === 'BlankNode';
    const oVar = path.object.termType === 'Variable' || path.object.termType === 'BlankNode';

    const extra: Bindings[] = [];

    // both subject and object non-variables
    if (!sVar && !oVar) {
      if (path.subject.equals(path.object)) {
        return { type: 'bindings', bindingsStream: new SingletonIterator(Bindings({})), variables: [] };
      }
    }

    if (sVar && oVar) {
      throw new Error('ZeroOrOne path expressions with 2 variables not supported yet');
    }

    if (sVar) {
      extra.push(Bindings({ [termToString(path.subject)]: path.object}));
    }

    if (oVar) {
      extra.push(Bindings({ [termToString(path.object)]: path.subject}));
    }

    const single = ActorQueryOperation.getSafeBindings(await this.handlePath(
      ActorQueryOperationPath.FACTORY.createPath(path.subject, predicate.path, path.object, path.graph), context));

    const bindingsStream = single.bindingsStream.prepend(extra);

    return { type: 'bindings', bindingsStream, variables: single.variables };
  }

  public async runOperation(pattern: Algebra.Path, context: ActionContext)
    : Promise<IActorQueryOperationOutput> {

    return this.handlePath(pattern, context);
  }

}

export interface IActorQueryOperationPath extends IActorQueryOperationTypedMediatedArgs {
  mediatorJoin: Mediator<ActorRdfJoin, IActionRdfJoin, IMediatorTypeIterations, IActorQueryOperationOutput>;
}
