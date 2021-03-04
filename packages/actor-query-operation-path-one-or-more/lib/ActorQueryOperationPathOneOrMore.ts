import { ActorAbstractPath } from '@comunica/actor-abstract-path';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperation,
  Bindings,
} from '@comunica/bus-query-operation';
import type { ActionContext } from '@comunica/core';
import type { IActorQueryOperationOutputBindings } from '@comunica/types';
import { BufferedIterator, MultiTransformIterator, TransformIterator } from 'asynciterator';

import type { Term } from 'rdf-js';
import { termToString } from 'rdf-string';
import { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Path OneOrMore Query Operation Actor.
 */
export class ActorQueryOperationPathOneOrMore extends ActorAbstractPath {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, Algebra.types.ONE_OR_MORE_PATH);
  }

  public async runOperation(path: Algebra.Path, context: ActionContext): Promise<IActorQueryOperationOutputBindings> {
    const distinct = await this.isPathArbitraryLengthDistinct(context, path);
    if (distinct.operation) {
      return distinct.operation;
    }

    context = distinct.context;

    const predicate = <Algebra.OneOrMorePath> path.predicate;

    const sVar = path.subject.termType === 'Variable';
    const oVar = path.object.termType === 'Variable';
    const gVar = path.graph.termType === 'Variable';

    if (!sVar && oVar) {
      // Get all the results of applying this once, then do zeroOrMore for those
      const single = ActorAbstractPath.FACTORY.createDistinct(
        ActorAbstractPath.FACTORY.createPath(path.subject, predicate.path, path.object, path.graph),
      );
      const results = ActorQueryOperation.getSafeBindings(
        await this.mediatorQueryOperation.mediate({ context, operation: single }),
      );

      const objectString = termToString(path.object);

      // All branches need to share the same termHashes to prevent duplicates
      const termHashes = {};

      const bindingsStream: MultiTransformIterator<Bindings, Bindings> = new MultiTransformIterator(
        results.bindingsStream,
        {
          multiTransform: (bindings: Bindings) => {
            const val = bindings.get(objectString);
            const graph = gVar ? bindings.get(termToString(path.graph)) : path.graph;
            return new TransformIterator<Bindings>(
              async() => {
                const it = new BufferedIterator<Term>();
                await this.getObjectsPredicateStar(val,
                  predicate.path,
                  path.graph,
                  context,
                  termHashes,
                  it,
                  { count: 0 });
                return it.transform<Bindings>({
                  transform(item, next, push) {
                    let binding = Bindings({ [objectString]: item });
                    if (gVar) {
                      binding = binding.set(termToString(path.graph), graph);
                    }
                    push(binding);
                    next();
                  },
                });
              }, { maxBufferSize: 128 },
            );
          },
          autoStart: false,
        },
      );
      const variables = gVar ? [ objectString, termToString(path.graph) ] : [ objectString ];
      return { type: 'bindings', bindingsStream, variables, canContainUndefs: false };
    }
    if (sVar && oVar) {
      // Get all the results of subjects with same predicate, but once, then fill in first variable for those
      const single = ActorAbstractPath.FACTORY.createDistinct(
        ActorAbstractPath.FACTORY.createPath(path.subject, path.predicate.path, path.object, path.graph),
      );
      const results = ActorQueryOperation.getSafeBindings(
        await this.mediatorQueryOperation.mediate({ context, operation: single }),
      );
      const subjectString = termToString(path.subject);
      const objectString = termToString(path.object);

      const termHashes = {};

      const bindingsStream: MultiTransformIterator<Bindings, Bindings> = new MultiTransformIterator(
        results.bindingsStream,
        {
          multiTransform: (bindings: Bindings) => {
            const subject = bindings.get(subjectString);
            const object = bindings.get(objectString);
            const graph = gVar ? bindings.get(termToString(path.graph)) : path.graph;
            return new TransformIterator<Bindings>(
              async() => {
                const it = new BufferedIterator<Bindings>();
                await this.getSubjectAndObjectBindingsPredicateStar(
                  subjectString,
                  objectString,
                  subject,
                  object,
                  predicate.path,
                  graph,
                  context,
                  termHashes,
                  {},
                  it,
                  { count: 0 },
                );
                return it.transform<Bindings>({
                  transform(item, next, push) {
                    if (gVar) {
                      item = item.set(termToString(path.graph), graph);
                    }
                    push(item);
                    next();
                  },
                });
              }, { maxBufferSize: 128 },
            );
          },
          autoStart: false,
        },
      );
      const variables = gVar ?
        [ subjectString, objectString, termToString(path.graph) ] :
        [ subjectString, objectString ];
      return { type: 'bindings', bindingsStream, variables, canContainUndefs: false };
    }
    if (sVar && !oVar) {
      return <Promise<IActorQueryOperationOutputBindings>> this.mediatorQueryOperation.mediate({
        context,
        operation: ActorAbstractPath.FACTORY.createPath(
          path.object,
          ActorAbstractPath.FACTORY.createOneOrMorePath(
            ActorAbstractPath.FACTORY.createInv(predicate.path),
          ),
          path.subject,
          path.graph,
        ),
      });
    }
    // If (!sVar && !oVar)
    const variable = this.generateVariable();
    const vString = termToString(variable);
    const results = ActorQueryOperation.getSafeBindings(await this.mediatorQueryOperation.mediate({
      context,
      operation: ActorAbstractPath.FACTORY.createPath(path.subject, predicate, variable, path.graph),
    }));
    const bindingsStream = results.bindingsStream.transform<Bindings>({
      filter: item => item.get(vString).equals(path.object),
      transform(item, next, push) {
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
}

