import { ActorAbstractPath } from '@comunica/actor-abstract-path';
import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import type { Bindings, IQueryOperationResult, IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
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

  public async runOperation(operation: Algebra.Path, context: IActionContext): Promise<IQueryOperationResult> {
    const distinct = await this.isPathArbitraryLengthDistinct(context, operation);
    if (distinct.operation) {
      return distinct.operation;
    }

    context = distinct.context;

    const predicate = <Algebra.ZeroOrMorePath> operation.predicate;

    const sVar = operation.subject.termType === 'Variable';
    const oVar = operation.object.termType === 'Variable';

    if (operation.subject.termType === 'Variable' && operation.object.termType === 'Variable') {
      // Query ?s ?p ?o, to get all possible namedNodes in de the db
      const predVar = this.generateVariable(operation);
      const single = ActorAbstractPath.FACTORY
        .createPattern(operation.subject, predVar, operation.object, operation.graph);
      const results = ActorQueryOperation.getSafeBindings(
        await this.mediatorQueryOperation.mediate({ context, operation: single }),
      );
      const subjectVar = operation.subject;
      const objectVar = operation.object;

      // Set with all namedNodes we have already started a predicate* search from
      const entities: Set<string> = new Set();

      const termHashes = {};

      const bindingsStream: MultiTransformIterator<Bindings, Bindings> = new MultiTransformIterator(
        results.bindingsStream,
        {
          multiTransform: (bindings: Bindings) => {
            // Get the subject and object of the triples (?s ?p ?o) and extract graph if it was a variable
            const subject: RDF.Term = bindings.get(subjectVar)!;
            const object: RDF.Term = bindings.get(objectVar)!;
            const graph: RDF.Term = operation.graph.termType === 'Variable' ?
              bindings.get(operation.graph)! :
              operation.graph;
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
                    subjectVar,
                    objectVar,
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
                    subjectVar,
                    objectVar,
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
                    if (operation.graph.termType === 'Variable') {
                      item = item.set(operation.graph, graph);
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
      const variables: RDF.Variable[] = operation.graph.termType === 'Variable' ?
        [ subjectVar, operation.object, operation.graph ] :
        [ subjectVar, operation.object ];
      return {
        type: 'bindings',
        bindingsStream,
        metadata: async() => ({ ...await results.metadata(), variables }),
      };
    }
    if (!sVar && !oVar) {
      const variable = this.generateVariable();
      const starEval = await this.getObjectsPredicateStarEval(
        operation.subject,
        predicate.path,
        variable,
        operation.graph,
        context,
        true,
      );
      const bindingsStream = starEval.bindingsStream.transform<Bindings>({
        filter: item => operation.object.equals(item.get(variable)),
        transform(item, next, push) {
          // Return graph binding if graph was a variable, otherwise empty binding
          const binding = operation.graph.termType === 'Variable' ?
            BF.bindings([[ operation.graph, item.get(operation.graph)! ]]) :
            BF.bindings();
          push(binding);
          next();
        },
      });
      return {
        type: 'bindings',
        bindingsStream,
        metadata: async() => ({
          ...await starEval.metadata(),
          variables: operation.graph.termType === 'Variable' ? [ operation.graph ] : [],
        }),
      };
    }
    // If (sVar || oVar)
    const subject = sVar ? operation.object : operation.subject;
    const value: RDF.Variable = <RDF.Variable> (sVar ? operation.subject : operation.object);
    const pred = sVar ? ActorAbstractPath.FACTORY.createInv(predicate.path) : predicate.path;
    const starEval = await this.getObjectsPredicateStarEval(
      subject,
      pred,
      value,
      operation.graph,
      context,
      true,
    );
    const variables: RDF.Variable[] = operation.graph.termType === 'Variable' ? [ value, operation.graph ] : [ value ];
    return {
      type: 'bindings',
      bindingsStream: starEval.bindingsStream,
      metadata: async() => ({ ...await starEval.metadata(), variables }),
    };
  }
}
