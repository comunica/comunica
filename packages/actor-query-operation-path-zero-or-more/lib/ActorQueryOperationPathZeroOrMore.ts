import { ActorAbstractPath } from '@comunica/actor-abstract-path';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  Bindings,
  ActorQueryOperation,
} from '@comunica/bus-query-operation';
import type { ActionContext } from '@comunica/core';
import type { IActorQueryOperationOutputBindings } from '@comunica/types';
import { MultiTransformIterator, TransformIterator, EmptyIterator, BufferedIterator } from 'asynciterator';
import type { Variable } from 'rdf-js';
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
      // Query ?s ?p ?o, to get all possible namedNodes in de the db
      const predVar = this.generateVariable(path);
      const single = ActorAbstractPath.FACTORY.createPattern(path.subject, predVar, path.object, path.graph);
      const results = ActorQueryOperation.getSafeBindings(
        await this.mediatorQueryOperation.mediate({ context, operation: single }),
      );
      const subjectString = termToString(path.subject);
      const objectString = termToString(path.object);

      // Set with all namedNodes we have already started a predicate* search from
      const entities: Set<string> = new Set();

      const termHashes = {};

      const bindingsStream: MultiTransformIterator<Bindings, Bindings> = new MultiTransformIterator(
        results.bindingsStream,
        {
          multiTransform: (bindings: Bindings) => {
            // Get the subject and object of the triples (?s ?p ?o) and extract graph if it was a variable
            const subject = bindings.get(subjectString);
            const object = bindings.get(objectString);
            const graph = gVar ? bindings.get(termToString(path.graph)) : path.graph;
            // Make a hash of namedNode + graph to remember from where we already started a search
            const subjectGraphHash = termToString(subject) + termToString(graph);
            const objectGraphHash = termToString(object) + termToString(graph);
            return new TransformIterator<Bindings>(
              async() => {
                // If no new namedNodes in this triple, return nothing
                if (entities.has(subjectGraphHash) && entities.has(objectGraphHash)) {
                  return new EmptyIterator();
                }
                // Set up an iterator to which getSubjectAndObjectBindingsPredicateStar will push solutions
                const it = new BufferedIterator<Bindings>();
                const counter = { count: 0 };
                // If not started from this namedNode (subject in triple) in this graph, start a search
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
                    counter,
                  );
                }
                // If not started from this namedNode (object in triple) in this graph, start a search
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
                    counter,
                  );
                }
                return it.transform<Bindings>({
                  transform(item, next, push) {
                    // If the graph was a variable, fill in it's binding (we got it from the ?s ?p ?o binding)
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
      return { type: 'bindings', bindingsStream, variables, canContainUndefs: false };
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
          // Return graph binding if graph was a variable, otherwise empty binding
          const binding = gVar ?
            Bindings({ [termToString(path.graph)]: item.get(termToString(path.graph)) }) :
            Bindings({});
          push(binding);
          next();
        },
      });
      return {
        type: 'bindings',
        bindingsStream,
        variables: gVar ? [ termToString(path.graph) ] : [],
        canContainUndefs: false,
      };
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
    return { type: 'bindings', bindingsStream, variables, canContainUndefs: false };
  }
}
