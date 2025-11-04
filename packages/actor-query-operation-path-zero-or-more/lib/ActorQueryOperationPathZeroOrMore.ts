import { ActorAbstractPath } from '@comunica/actor-abstract-path';
import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type {
  Bindings,
  IQueryOperationResult,
  IActionContext,
  ComunicaDataFactory,
  MetadataVariable,
} from '@comunica/types';
import { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { getSafeBindings } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import { MultiTransformIterator, TransformIterator, EmptyIterator, BufferedIterator } from 'asynciterator';
import { termToString } from 'rdf-string';

/**
 * A comunica Path ZeroOrMore Query Operation Actor.
 */
export class ActorQueryOperationPathZeroOrMore extends ActorAbstractPath {
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;

  public constructor(args: IActorQueryOperationPathZeroOrMoreArgs) {
    super(args, Algebra.Types.ZERO_OR_MORE_PATH);
    this.mediatorMergeBindingsContext = args.mediatorMergeBindingsContext;
  }

  public async runOperation(operation: Algebra.Path, context: IActionContext): Promise<IQueryOperationResult> {
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);
    const bindingsFactory = await BindingsFactory.create(this.mediatorMergeBindingsContext, context, dataFactory);

    const distinct = await this.isPathArbitraryLengthDistinct(algebraFactory, context, operation);
    if (distinct.operation) {
      return distinct.operation;
    }

    context = distinct.context;

    const predicate = <Algebra.ZeroOrMorePath> operation.predicate;
    const sources = this.getPathSources(predicate);

    const sVar = operation.subject.termType === 'Variable';
    const oVar = operation.object.termType === 'Variable';

    if (operation.subject.termType === 'Variable' && operation.object.termType === 'Variable') {
      // Query ?s ?p ?o, to get all possible namedNodes in de the db
      const predVar = this.generateVariable(dataFactory, operation);
      const single = this.assignPatternSources(algebraFactory, algebraFactory
        .createPattern(operation.subject, predVar, operation.object, operation.graph), sources);
      const results = getSafeBindings(
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
                    algebraFactory,
                    bindingsFactory,
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
                    algebraFactory,
                    bindingsFactory,
                  );
                }
                return it.map<Bindings>((item) => {
                  // If the graph was a variable, fill in it's binding (we got it from the ?s ?p ?o binding)
                  if (operation.graph.termType === 'Variable') {
                    item = item.set(operation.graph, graph);
                  }
                  return item;
                });
              },
              { autoStart: false, maxBufferSize: 128 },
            );
          },
          autoStart: false,
        },
      );
      const variables: MetadataVariable[] = (operation.graph.termType === 'Variable' ?
          [ subjectVar, operation.object, operation.graph ] :
          [ subjectVar, operation.object ])
        .map(variable => ({ variable, canBeUndef: false }));
      return {
        type: 'bindings',
        bindingsStream,
        metadata: async() => ({ ...await results.metadata(), variables }),
      };
    }
    if (!sVar && !oVar) {
      const variable = this.generateVariable(dataFactory);
      const starEval = await this.getObjectsPredicateStarEval(
        operation.subject,
        predicate.path,
        variable,
        operation.graph,
        context,
        true,
        algebraFactory,
        bindingsFactory,
      );
      const bindingsStream = starEval.bindingsStream.map<Bindings>((item) => {
        if (operation.object.equals(item.get(variable))) {
          return operation.graph.termType === 'Variable' ?
            bindingsFactory.bindings([[ operation.graph, item.get(operation.graph)! ]]) :
            bindingsFactory.bindings();
        }
        return null;
      });
      return {
        type: 'bindings',
        bindingsStream,
        metadata: async() => ({
          ...await starEval.metadata(),
          variables: (operation.graph.termType === 'Variable' ? [ operation.graph ] : [])
            .map(variable => ({ variable, canBeUndef: false })),
        }),
      };
    }
    // If (sVar || oVar)
    const subject = sVar ? operation.object : operation.subject;
    const value: RDF.Variable = <RDF.Variable> (sVar ? operation.subject : operation.object);
    const pred = sVar ? algebraFactory.createInv(predicate.path) : predicate.path;
    const starEval = await this.getObjectsPredicateStarEval(
      subject,
      pred,
      value,
      operation.graph,
      context,
      true,
      algebraFactory,
      bindingsFactory,
    );
    const variables = (operation.graph.termType === 'Variable' ? [ value, operation.graph ] : [ value ])
      .map(variable => ({ variable, canBeUndef: false }));
    return {
      type: 'bindings',
      bindingsStream: starEval.bindingsStream,
      metadata: async() => ({ ...await starEval.metadata(), variables }),
    };
  }
}

export interface IActorQueryOperationPathZeroOrMoreArgs extends IActorQueryOperationTypedMediatedArgs {
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;
}
