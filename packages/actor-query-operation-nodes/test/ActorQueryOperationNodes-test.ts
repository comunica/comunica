import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { assignOperationSource } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationNodes } from '../lib/ActorQueryOperationNodes';
import '@comunica/utils-jest';

const DF = new DataFactory();
const AF = new AlgebraFactory(DF);

describe('ActorQueryOperationNodes', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: jest.fn(async() => ({
        type: 'bindings',
        bindingsStream: new ArrayIterator([], { autoStart: false }),
        metadata: async() => ({ variables: []}),
      })),
    };
  });

  describe('An ActorQueryOperationNodes instance', () => {
    let actor: ActorQueryOperationNodes;

    beforeEach(() => {
      actor = new ActorQueryOperationNodes({ name: 'actor', bus, mediatorQueryOperation });
    });

    describe('test', () => {
      it('should handle operations with top-level source', async() => {
        await expect(actor.test({
          context: new ActionContext(),
          operation: assignOperationSource(AF.createNodes(DF.defaultGraph(), DF.variable('x')), <any>{}),
        })).resolves.toPassTestVoid();
      });

      it('should not handle operations without top-level source', async() => {
        await expect(actor.test({
          context: new ActionContext(),
          operation: AF.createNodes(DF.defaultGraph(), DF.variable('x')),
        })).resolves.toFailTest(`Actor actor requires an operation with source annotation.`);
      });
    });

    describe('run', () => {
      const source = <any>{};

      /**
       * Run the actor on a nodes operation binding ?x in the given graph.
       * @param graph The graph of the nodes operation.
       */
      async function runNodes(graph: RDF.Term): Promise<void> {
        await actor.runOperation(
          assignOperationSource(AF.createNodes(graph, DF.variable('x')), source),
          new ActionContext().set(KeysInitQuery.dataFactory, DF),
        );
      }

      /**
       * Create the union of the patterns having ?x as subject or object in the given graph.
       * @param graph The graph of the patterns.
       * @return The union, with its patterns annotated with the source.
       */
      function createUnion(graph: RDF.Term): Algebra.Union {
        return AF.createUnion([
          assignOperationSource(AF
            .createPattern(DF.variable('x'), DF.variable('__p'), DF.variable('__x'), graph), source),
          assignOperationSource(AF
            .createPattern(DF.variable('__x'), DF.variable('__p'), DF.variable('x'), graph), source),
        ]);
      }

      it('should rewrite operations into distinct-project-union-pattern', async() => {
        await runNodes(DF.defaultGraph());

        expect(mediatorQueryOperation.mediate).toHaveBeenCalledWith({
          context: expect.any(ActionContext),
          operation: AF.createDistinct(AF.createProject(createUnion(DF.defaultGraph()), [ DF.variable('x') ])),
        });
      });

      it('should project the graph variable', async() => {
        await runNodes(DF.variable('g'));

        expect(mediatorQueryOperation.mediate).toHaveBeenCalledWith({
          context: expect.any(ActionContext),
          operation: AF.createDistinct(
            AF.createProject(createUnion(DF.variable('g')), [ DF.variable('g'), DF.variable('x') ]),
          ),
        });
      });
    });
  });
});
