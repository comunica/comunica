import { ActorAbstractPath } from '@comunica/actor-abstract-path';
import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import type { Bindings, IQueryableResult, IActionContext } from '@comunica/types';
import type { Variable } from '@rdfjs/types';
import { MultiTransformIterator, TransformIterator, EmptyIterator, BufferedIterator } from 'asynciterator';
import { termToString } from 'rdf-string';
import { Algebra } from 'sparqlalgebrajs';

const BF = new BindingsFactory();

/**
 * A comunica Path ZeroOrMore Query Operation Actor.
 */
export class ActorQueryOperationPathZeroOrMore extends ActorAbstractPath {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, Algebra.types.ZERO_OR_MORE_PATH);
  }

  public async runOperation(operation: Algebra.Path, context: IActionContext): Promise<IQueryableResult> {
    const distinct = await this.isPathArbitraryLengthDistinct(context, operation);
    if (distinct.operation) {
      return distinct.operation;
    }

    context = distinct.context;

    const predicate = <Algebra.ZeroOrMorePath> operation.predicate;

    const sVar = operation.subject.termType === 'Variable';
    const oVar = operation.object.termType === 'Variable';
    const gVar = operation.graph.termType === 'Variable';

    if (sVar && oVar) {
      // Query ?s ?p ?o, to get all possible namedNodes in de the db
      const predVar = this.generateVariable(operation);
      const single = ActorAbstractPath.FACTORY
        .createPattern(operation.subject, predVar, operation.object, operation.graph);
      const results = ActorQueryOperation.getSafeBindings(
        await this.mediatorQueryOperation.mediate({ context, operation: single }),
      );
      const subjectString = termToString(operation.subject);
      const objectString = termToString(operation.object);

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
            const graph = gVar ? bindings.get(termToString(operation.graph)) : operation.graph;
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
                      item = item.set(termToString(operation.graph), graph);
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
        [ subjectString, objectString, termToString(operation.graph) ] :
        [ subjectString, objectString ];
      return { type: 'bindings', bindingsStream, variables, metadata: results.metadata };
    }
    if (!sVar && !oVar) {
      const variable = this.generateVariable();
      const starEval = await this.getObjectsPredicateStarEval(
        operation.subject,
        variable,
        predicate.path,
        operation.graph,
        context,
      );
      const bindingsStream = starEval.bindingsStream.transform<Bindings>({
        filter: item => item.get(termToString(variable)).equals(operation.object),
        transform(item, next, push) {
          // Return graph binding if graph was a variable, otherwise empty binding
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
        metadata: starEval.metadata,
      };
    }
    // If (sVar || oVar)
    const subject = sVar ? operation.object : operation.subject;
    const value: Variable = <Variable> (sVar ? operation.subject : operation.object);
    const pred = sVar ? ActorAbstractPath.FACTORY.createInv(predicate.path) : predicate.path;
    const starEval = await this.getObjectsPredicateStarEval(
      subject,
      value,
      pred,
      operation.graph,
      context,
    );
    const bindingsStream = starEval.bindingsStream.transform<Bindings>({
      transform(item, next, push) {
        push(item);
        next();
      },
    });
    const variables = gVar ? [ termToString(value), termToString(operation.graph) ] : [ termToString(value) ];
    return { type: 'bindings', bindingsStream, variables, metadata: starEval.metadata };
  }
}
