import { ActorAbstractPath } from '@comunica/actor-abstract-path';
import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import type { IQueryableResultBindings, Bindings, IQueryableResult, IActionContext } from '@comunica/types';
import type { Term } from '@rdfjs/types';
import { BufferedIterator, MultiTransformIterator, TransformIterator } from 'asynciterator';

import { termToString } from 'rdf-string';
import { Algebra } from 'sparqlalgebrajs';

const BF = new BindingsFactory();

/**
 * A comunica Path OneOrMore Query Operation Actor.
 */
export class ActorQueryOperationPathOneOrMore extends ActorAbstractPath {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, Algebra.types.ONE_OR_MORE_PATH);
  }

  public async runOperation(operation: Algebra.Path, context: IActionContext): Promise<IQueryableResult> {
    const distinct = await this.isPathArbitraryLengthDistinct(context, operation);
    if (distinct.operation) {
      return distinct.operation;
    }

    context = distinct.context;

    const predicate = <Algebra.OneOrMorePath> operation.predicate;

    const sVar = operation.subject.termType === 'Variable';
    const oVar = operation.object.termType === 'Variable';
    const gVar = operation.graph.termType === 'Variable';

    if (!sVar && oVar) {
      // Get all the results of applying this once, then do zeroOrMore for those
      const single = ActorAbstractPath.FACTORY.createDistinct(
        ActorAbstractPath.FACTORY.createPath(operation.subject, predicate.path, operation.object, operation.graph),
      );
      const results = ActorQueryOperation.getSafeBindings(
        await this.mediatorQueryOperation.mediate({ context, operation: single }),
      );

      const objectString = termToString(operation.object);

      // All branches need to share the same termHashes to prevent duplicates
      const termHashes = {};

      const bindingsStream: MultiTransformIterator<Bindings, Bindings> = new MultiTransformIterator(
        results.bindingsStream,
        {
          multiTransform: (bindings: Bindings) => {
            const val = bindings.get(objectString);
            const graph = gVar ? bindings.get(termToString(operation.graph)) : operation.graph;
            return new TransformIterator<Bindings>(
              async() => {
                const it = new BufferedIterator<Term>();
                await this.getObjectsPredicateStar(val,
                  predicate.path,
                  operation.graph,
                  context,
                  termHashes,
                  it,
                  { count: 0 });
                return it.transform<Bindings>({
                  transform(item, next, push) {
                    let binding = BF.bindings({ [objectString]: item });
                    if (gVar) {
                      binding = binding.set(termToString(operation.graph), graph);
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
      const variables = gVar ? [ objectString, termToString(operation.graph) ] : [ objectString ];
      return { type: 'bindings', bindingsStream, variables, metadata: results.metadata };
    }
    if (sVar && oVar) {
      // Get all the results of subjects with same predicate, but once, then fill in first variable for those
      const single = ActorAbstractPath.FACTORY.createDistinct(
        ActorAbstractPath.FACTORY
          .createPath(operation.subject, operation.predicate.path, operation.object, operation.graph),
      );
      const results = ActorQueryOperation.getSafeBindings(
        await this.mediatorQueryOperation.mediate({ context, operation: single }),
      );
      const subjectString = termToString(operation.subject);
      const objectString = termToString(operation.object);

      const termHashes = {};

      const bindingsStream: MultiTransformIterator<Bindings, Bindings> = new MultiTransformIterator(
        results.bindingsStream,
        {
          multiTransform: (bindings: Bindings) => {
            const subject = bindings.get(subjectString);
            const object = bindings.get(objectString);
            const graph = gVar ? bindings.get(termToString(operation.graph)) : operation.graph;
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
                      item = item.set(termToString(operation.graph), graph);
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
        [ subjectString, objectString, termToString(operation.graph) ] :
        [ subjectString, objectString ];
      return { type: 'bindings', bindingsStream, variables, metadata: results.metadata };
    }
    if (sVar && !oVar) {
      return <Promise<IQueryableResultBindings>> this.mediatorQueryOperation.mediate({
        context,
        operation: ActorAbstractPath.FACTORY.createPath(
          operation.object,
          ActorAbstractPath.FACTORY.createOneOrMorePath(
            ActorAbstractPath.FACTORY.createInv(predicate.path),
          ),
          operation.subject,
          operation.graph,
        ),
      });
    }
    // If (!sVar && !oVar)
    const variable = this.generateVariable();
    const vString = termToString(variable);
    const results = ActorQueryOperation.getSafeBindings(await this.mediatorQueryOperation.mediate({
      context,
      operation: ActorAbstractPath.FACTORY.createPath(operation.subject, predicate, variable, operation.graph),
    }));
    const bindingsStream = results.bindingsStream.transform<Bindings>({
      filter: item => item.get(vString).equals(operation.object),
      transform(item, next, push) {
        const binding = gVar ?
          BF.bindings({ [termToString(operation.graph)]: item.get(termToString(operation.graph)) }) :
          BF.bindings({});
        push(binding);
        next();
      },
    });
    return {
      type: 'bindings',
      bindingsStream,
      variables: gVar ? [ termToString(operation.graph) ] : [],
      metadata: results.metadata,
    };
  }
}

