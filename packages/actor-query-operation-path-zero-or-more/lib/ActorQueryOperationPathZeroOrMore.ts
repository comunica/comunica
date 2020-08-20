import { ActorAbstractPath } from '@comunica/actor-abstract-path';
import {
  Bindings, IActorQueryOperationOutputBindings,
  IActorQueryOperationTypedMediatedArgs,
  ActorQueryOperation,
} from '@comunica/bus-query-operation';
import { ActionContext } from '@comunica/core';
import { MultiTransformIterator, TransformIterator, EmptyIterator, BufferedIterator } from 'asynciterator';
import { Variable } from 'rdf-js';
import { termToString } from 'rdf-string';
import { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Path ZeroOrMore Query Operation Actor.
 */
export class ActorQueryOperationPathZeroOrMore extends ActorAbstractPath {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, Algebra.types.ZERO_OR_MORE_PATH);
  }

  public async runOperation(path: Algebra.Path, context: ActionContext): Promise<IActorQueryOperationOutputBindings> {
    const distinct = await this.isPathArbitraryLengthDistinct(context, path);
    if (distinct.operation) {
      return distinct.operation;
    }

    context = distinct.context;

    const predicate = <Algebra.ZeroOrMorePath> path.predicate;

    const sVar = path.subject.termType === 'Variable';
    const oVar = path.object.termType === 'Variable';
    const gVar = path.graph.termType === 'Variable';

    if (sVar && oVar) {
      // Get all the results of subjects, then fill in first variable for those
      const predVar = this.generateVariable(path);
      const single = ActorAbstractPath.FACTORY.createPattern(path.subject, predVar, path.object, path.graph);
      const results = ActorQueryOperation.getSafeBindings(
        await this.mediatorQueryOperation.mediate({ context, operation: single }),
      );
      const subjectString = termToString(path.subject);
      const objectString = termToString(path.object);

      const entities: Set<string> = new Set();

      const termHashes = {};

      const bindingsStream: MultiTransformIterator<Bindings, Bindings> = new MultiTransformIterator(
        results.bindingsStream,
        {
          autoStart: false,
          multiTransform: (bindings: Bindings) => {
            const subject = bindings.get(subjectString);
            const object = bindings.get(objectString);
            const graph = gVar ? bindings.get(termToString(path.graph)) : path.graph;
            const subjectGraphHash = termToString(subject) + termToString(graph);
            const objectGraphHash = termToString(object) + termToString(graph);
            return new TransformIterator<Bindings>(
              async() => {
                if (entities.has(subjectGraphHash) && entities.has(objectGraphHash)) {
                  return new EmptyIterator();
                }
                const it = new BufferedIterator<Bindings>();
                if (!entities.has(subjectGraphHash)) {
                  entities.add(subjectGraphHash);
                  await this.getSubjectAndObjectBindingsPredicateStar(
                    subjectString,
                    objectString,
                    subject,
                    subject,
                    predicate.path,
                    graph,
                    context,
                    termHashes,
                    {},
                    it,
                    { count: 0 },
                  );
                }
                if (!entities.has(objectGraphHash)) {
                  entities.add(objectGraphHash);
                  await this.getSubjectAndObjectBindingsPredicateStar(
                    subjectString,
                    objectString,
                    object,
                    object,
                    predicate.path,
                    graph,
                    context,
                    termHashes,
                    {},
                    it,
                    { count: 0 },
                  );
                }
                return it.transform<Bindings>({
                  autoStart: false,
                  transform(item, next, push) {
                    if (gVar) {
                      item = item.set(termToString(path.graph), graph);
                    }
                    push(item);
                    next();
                  },
                });
              },
            );
          },
        },
      );
      const variables = gVar ?
        [ subjectString, objectString, termToString(path.graph) ] :
        [ subjectString, objectString ];
      return { type: 'bindings', bindingsStream, variables };
    }
    if (!sVar && !oVar) {
      const variable = this.generateVariable();
      const bindingsStream = (await this.getObjectsPredicateStarEval(
        path.subject,
        variable,
        predicate.path,
        path.graph,
        context,
      ))
        .transform<Bindings>({
        filter: item => item.get(termToString(variable)).equals(path.object),
        transform(item, next, push) {
          const binding = gVar ?
            Bindings({ [termToString(path.graph)]: item.get(termToString(path.graph)) }) :
            Bindings({});
          push(binding);
          next();
        },
      });
      return { type: 'bindings', bindingsStream, variables: gVar ? [ termToString(path.graph) ] : []};
    }
    // If (sVar || oVar)
    const subject = sVar ? path.object : path.subject;
    const value: Variable = <Variable> (sVar ? path.subject : path.object);
    const pred = sVar ? ActorAbstractPath.FACTORY.createInv(predicate.path) : predicate.path;
    const bindingsStream = (await this.getObjectsPredicateStarEval(
      subject,
      value,
      pred,
      path.graph,
      context,
    ))
      .transform<Bindings>({
      transform(item, next, push) {
        push(item);
        next();
      },
    });
    const variables = gVar ? [ termToString(value), termToString(path.graph) ] : [ termToString(value) ];
    return { type: 'bindings', bindingsStream, variables };
  }
}
