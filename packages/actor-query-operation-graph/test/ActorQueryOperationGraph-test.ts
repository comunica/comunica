import type { IActionRdfMetadataAccumulate } from '@comunica/bus-rdf-metadata-accumulate';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { getSafeBindings } from '@comunica/utils-query-operation';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationGraph } from '../lib/ActorQueryOperationGraph';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const AF = new AlgebraFactory(DF);

describe('ActorQueryOperationGraph', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let mediatorRdfMetadataAccumulate: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext({
      [KeysInitQuery.dataFactory.name]: DF,
    });
    mediatorQueryOperation = {
      async mediate(arg: any) {
        // Return the stream/metadata from the operation if provided
        if (arg.operation.stream) {
          return {
            bindingsStream: arg.operation.stream(),
            metadata: arg.operation.metadata,
            type: 'bindings',
          };
        }
        // Default: return empty bindings
        return {
          bindingsStream: new ArrayIterator([], { autoStart: false }),
          metadata: () => Promise.resolve({
            state: new MetadataValidationState(),
            cardinality: { type: 'exact', value: 0 },
            variables: [],
          }),
          type: 'bindings',
        };
      },
    };
    mediatorRdfMetadataAccumulate = {
      async mediate(action: IActionRdfMetadataAccumulate) {
        if (action.mode === 'initialize') {
          return { metadata: { cardinality: { type: 'exact', value: 0 }}};
        }
        const metadata = { ...action.accumulatedMetadata };
        const subMetadata = action.appendingMetadata;
        if (!subMetadata.cardinality || !Number.isFinite(subMetadata.cardinality.value)) {
          metadata.cardinality.type = 'estimate';
          metadata.cardinality.value = Number.POSITIVE_INFINITY;
        } else {
          if (subMetadata.cardinality.type === 'estimate') {
            metadata.cardinality.type = 'estimate';
          }
          metadata.cardinality.value += subMetadata.cardinality.value;
        }
        return { metadata };
      },
    };
  });

  describe('An ActorQueryOperationGraph instance', () => {
    let actor: ActorQueryOperationGraph;

    beforeEach(() => {
      actor = new ActorQueryOperationGraph(<any>{
        name: 'actor',
        bus,
        mediatorQueryOperation,
        mediatorRdfMetadataAccumulate,
      });
    });

    it('should test', async() => {
      await expect(actor.test(<any>{
        operation: { type: Algebra.Types.GRAPH },
        context,
      })).resolves.toPassTestVoid();
    });

    it('should not test on non-graph', async() => {
      await expect(actor.test(<any>{
        operation: { type: 'some-other-type' },
        context,
      })).resolves.toFailTest('Actor actor only supports graph operations, but got some-other-type');
    });

    describe('runOperation with named node graph', () => {
      it('should push down named node and delegate', async() => {
        const mediatedArgs: any[] = [];
        const customMediator = {
          async mediate(arg: any) {
            mediatedArgs.push(arg);
            return {
              bindingsStream: new ArrayIterator([
                BF.bindings([[ DF.variable('s'), DF.namedNode('s1') ]]),
              ], { autoStart: false }),
              metadata: () => Promise.resolve({
                state: new MetadataValidationState(),
                cardinality: { type: 'exact', value: 1 },
                variables: [{ variable: DF.variable('s'), canBeUndef: false }],
              }),
              type: 'bindings',
            };
          },
        };

        const customActor = new ActorQueryOperationGraph(<any>{
          name: 'actor',
          bus,
          mediatorQueryOperation: customMediator,
          mediatorRdfMetadataAccumulate,
        });

        const operation: Algebra.Graph = <Algebra.Graph><unknown>AF.createGraph(
          AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
          DF.namedNode('g1'),
        );

        const result = getSafeBindings(
          await customActor.runOperation(operation, context),
        );
        expect(result.type).toBe('bindings');
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.bindings([[ DF.variable('s'), DF.namedNode('s1') ]]),
        ]);
        // Should have pushed graph into the pattern
        expect(mediatedArgs).toHaveLength(1);
        const rewrittenOp = mediatedArgs[0].operation;
        expect(rewrittenOp.type).toBe(Algebra.Types.PATTERN);
        expect(rewrittenOp.graph).toEqual(DF.namedNode('g1'));
      });
    });

    describe('runOperation with variable graph', () => {
      it('should return empty when no named graphs exist', async() => {
        const customActor = new ActorQueryOperationGraph(<any>{
          name: 'actor',
          bus,
          mediatorQueryOperation,
          mediatorRdfMetadataAccumulate,
        });

        const operation: Algebra.Graph = <Algebra.Graph><unknown>AF.createGraph(
          AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.namedNode('o')),
          DF.variable('g'),
        );

        const ctxWithGraphs = context.set(KeysQueryOperation.datasetNamedGraphs, []);
        const result = getSafeBindings(
          await customActor.runOperation(operation, ctxWithGraphs),
        );
        expect(result.type).toBe('bindings');
        await expect(result.bindingsStream).toEqualBindingsStream([]);
        await expect(result.metadata()).resolves.toMatchObject({
          cardinality: { type: 'exact', value: 0 },
          variables: [],
        });
      });

      it('should evaluate per-graph and add graph variable to bindings', async() => {
        const perGraphResults: Record<string, any> = {
          'http://g1': [
            BF.bindings([[ DF.variable('s'), DF.namedNode('s1') ]]),
          ],
          'http://g2': [
            BF.bindings([[ DF.variable('s'), DF.namedNode('s2') ]]),
          ],
        };

        const customMediator = {
          async mediate(arg: any) {
            // Determine which graph by looking at the pattern
            const pattern = arg.operation;
            const graphIri = pattern.graph?.value;
            const results = perGraphResults[graphIri] ?? [];
            return {
              bindingsStream: new ArrayIterator(results, { autoStart: false }),
              metadata: () => Promise.resolve({
                state: new MetadataValidationState(),
                cardinality: { type: 'exact', value: results.length },
                variables: [{ variable: DF.variable('s'), canBeUndef: false }],
              }),
              type: 'bindings',
            };
          },
        };

        const customActor = new ActorQueryOperationGraph(<any>{
          name: 'actor',
          bus,
          mediatorQueryOperation: customMediator,
          mediatorRdfMetadataAccumulate,
        });

        const operation: Algebra.Graph = <Algebra.Graph><unknown>AF.createGraph(
          AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.namedNode('o')),
          DF.variable('g'),
        );

        const ctxWithGraphs = context.set(
          KeysQueryOperation.datasetNamedGraphs,
          [ DF.namedNode('http://g1'), DF.namedNode('http://g2') ],
        );
        const result = getSafeBindings(
          await customActor.runOperation(operation, ctxWithGraphs),
        );
        const bindings = await result.bindingsStream.toArray();
        expect(bindings).toHaveLength(2);
        // Each binding should have the graph var set
        expect(bindings[0].get(DF.variable('g'))).toEqual(DF.namedNode('http://g1'));
        expect(bindings[0].get(DF.variable('s'))).toEqual(DF.namedNode('s1'));
        expect(bindings[1].get(DF.variable('g'))).toEqual(DF.namedNode('http://g2'));
        expect(bindings[1].get(DF.variable('s'))).toEqual(DF.namedNode('s2'));
      });

      it('should filter out bindings where ?g is bound to a different value', async() => {
        const customMediator = {
          async mediate(_arg: any) {
            return {
              bindingsStream: new ArrayIterator([
                // This binding has ?g bound to a different graph
                BF.bindings([
                  [ DF.variable('s'), DF.namedNode('s1') ],
                  [ DF.variable('g'), DF.namedNode('http://other') ],
                ]),
              ], { autoStart: false }),
              metadata: () => Promise.resolve({
                state: new MetadataValidationState(),
                cardinality: { type: 'exact', value: 1 },
                variables: [
                  { variable: DF.variable('s'), canBeUndef: false },
                  { variable: DF.variable('g'), canBeUndef: false },
                ],
              }),
              type: 'bindings',
            };
          },
        };

        const customActor = new ActorQueryOperationGraph(<any>{
          name: 'actor',
          bus,
          mediatorQueryOperation: customMediator,
          mediatorRdfMetadataAccumulate,
        });

        const operation: Algebra.Graph = <Algebra.Graph><unknown>AF.createGraph(
          AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.namedNode('o')),
          DF.variable('g'),
        );

        const ctxWithGraphs = context.set(
          KeysQueryOperation.datasetNamedGraphs,
          [ DF.namedNode('http://g1') ],
        );
        const result = getSafeBindings(
          await customActor.runOperation(operation, ctxWithGraphs),
        );
        const bindings = await result.bindingsStream.toArray();
        expect(bindings).toHaveLength(0);
      });

      it('should keep bindings where ?g is already bound to the same value', async() => {
        const customMediator = {
          async mediate(_arg: any) {
            return {
              bindingsStream: new ArrayIterator([
                BF.bindings([
                  [ DF.variable('s'), DF.namedNode('s1') ],
                  [ DF.variable('g'), DF.namedNode('http://g1') ],
                ]),
              ], { autoStart: false }),
              metadata: () => Promise.resolve({
                state: new MetadataValidationState(),
                cardinality: { type: 'exact', value: 1 },
                variables: [
                  { variable: DF.variable('s'), canBeUndef: false },
                  { variable: DF.variable('g'), canBeUndef: false },
                ],
              }),
              type: 'bindings',
            };
          },
        };

        const customActor = new ActorQueryOperationGraph(<any>{
          name: 'actor',
          bus,
          mediatorQueryOperation: customMediator,
          mediatorRdfMetadataAccumulate,
        });

        const operation: Algebra.Graph = <Algebra.Graph><unknown>AF.createGraph(
          AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.namedNode('o')),
          DF.variable('g'),
        );

        const ctxWithGraphs = context.set(
          KeysQueryOperation.datasetNamedGraphs,
          [ DF.namedNode('http://g1') ],
        );
        const result = getSafeBindings(
          await customActor.runOperation(operation, ctxWithGraphs),
        );
        const bindings = await result.bindingsStream.toArray();
        expect(bindings).toHaveLength(1);
        // Should keep the original binding (not set again)
        expect(bindings[0].get(DF.variable('g'))).toEqual(DF.namedNode('http://g1'));
        expect(bindings[0].get(DF.variable('s'))).toEqual(DF.namedNode('s1'));
      });

      it('should add graphVar to metadata variables if not already present', async() => {
        const customMediator = {
          async mediate(_arg: any) {
            return {
              bindingsStream: new ArrayIterator([
                BF.bindings([[ DF.variable('s'), DF.namedNode('s1') ]]),
              ], { autoStart: false }),
              metadata: () => Promise.resolve({
                state: new MetadataValidationState(),
                cardinality: { type: 'exact', value: 1 },
                variables: [{ variable: DF.variable('s'), canBeUndef: false }],
              }),
              type: 'bindings',
            };
          },
        };

        const customActor = new ActorQueryOperationGraph(<any>{
          name: 'actor',
          bus,
          mediatorQueryOperation: customMediator,
          mediatorRdfMetadataAccumulate,
        });

        const operation: Algebra.Graph = <Algebra.Graph><unknown>AF.createGraph(
          AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.namedNode('o')),
          DF.variable('g'),
        );

        const ctxWithGraphs = context.set(
          KeysQueryOperation.datasetNamedGraphs,
          [ DF.namedNode('http://g1') ],
        );
        const result = getSafeBindings(
          await customActor.runOperation(operation, ctxWithGraphs),
        );
        const metadata = await result.metadata();
        expect(metadata.variables).toContainEqual({ variable: DF.variable('g'), canBeUndef: true });
        expect(metadata.variables).toContainEqual({ variable: DF.variable('s'), canBeUndef: true });
      });

      it('should not duplicate graphVar in metadata if already present', async() => {
        const customMediator = {
          async mediate(_arg: any) {
            return {
              bindingsStream: new ArrayIterator([
                BF.bindings([
                  [ DF.variable('s'), DF.namedNode('s1') ],
                  [ DF.variable('g'), DF.namedNode('http://g1') ],
                ]),
              ], { autoStart: false }),
              metadata: () => Promise.resolve({
                state: new MetadataValidationState(),
                cardinality: { type: 'exact', value: 1 },
                variables: [
                  { variable: DF.variable('s'), canBeUndef: false },
                  { variable: DF.variable('g'), canBeUndef: false },
                ],
              }),
              type: 'bindings',
            };
          },
        };

        const customActor = new ActorQueryOperationGraph(<any>{
          name: 'actor',
          bus,
          mediatorQueryOperation: customMediator,
          mediatorRdfMetadataAccumulate,
        });

        const operation: Algebra.Graph = <Algebra.Graph><unknown>AF.createGraph(
          AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.namedNode('o')),
          DF.variable('g'),
        );

        const ctxWithGraphs = context.set(
          KeysQueryOperation.datasetNamedGraphs,
          [ DF.namedNode('http://g1') ],
        );
        const result = getSafeBindings(
          await customActor.runOperation(operation, ctxWithGraphs),
        );
        const metadata = await result.metadata();
        const gVars = metadata.variables.filter(
          (v: any) => v.variable.equals(DF.variable('g')),
        );
        expect(gVars).toHaveLength(1);
      });

      it('should discover named graphs when no explicit graphs are in context', async() => {
        let mediatorCallCount = 0;
        const customMediator = {
          async mediate(arg: any) {
            mediatorCallCount++;
            if (mediatorCallCount === 1) {
              // First call: the discovery query (distinct project of ?g)
              return {
                bindingsStream: new ArrayIterator([
                  BF.bindings([[ DF.variable('g'), DF.namedNode('http://discovered1') ]]),
                  BF.bindings([[ DF.variable('g'), DF.namedNode('http://discovered2') ]]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'exact', value: 2 },
                  variables: [{ variable: DF.variable('g'), canBeUndef: false }],
                }),
                type: 'bindings',
              };
            }
            // Subsequent calls: per-graph evaluation
            return {
              bindingsStream: new ArrayIterator([
                BF.bindings([[ DF.variable('s'), DF.namedNode(`s-from-${arg.operation.graph?.value}`) ]]),
              ], { autoStart: false }),
              metadata: () => Promise.resolve({
                state: new MetadataValidationState(),
                cardinality: { type: 'exact', value: 1 },
                variables: [{ variable: DF.variable('s'), canBeUndef: false }],
              }),
              type: 'bindings',
            };
          },
        };

        const customActor = new ActorQueryOperationGraph(<any>{
          name: 'actor',
          bus,
          mediatorQueryOperation: customMediator,
          mediatorRdfMetadataAccumulate,
        });

        const operation: Algebra.Graph = <Algebra.Graph><unknown>AF.createGraph(
          AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.namedNode('o')),
          DF.variable('g'),
        );

        // Provide querySources but no datasetNamedGraphs
        const ctxWithSources = context.set(KeysQueryOperation.querySources, <any>[
          { source: { referenceValue: 'http://source1' }},
        ]);
        const result = getSafeBindings(
          await customActor.runOperation(operation, ctxWithSources),
        );
        const bindings = await result.bindingsStream.toArray();
        expect(bindings).toHaveLength(2);
      });

      it('should return empty when no sources exist for discovery', async() => {
        const customActor = new ActorQueryOperationGraph(<any>{
          name: 'actor',
          bus,
          mediatorQueryOperation,
          mediatorRdfMetadataAccumulate,
        });

        const operation: Algebra.Graph = <Algebra.Graph><unknown>AF.createGraph(
          AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.namedNode('o')),
          DF.variable('g'),
        );

        // No querySources and no datasetNamedGraphs
        const result = getSafeBindings(
          await customActor.runOperation(operation, context),
        );
        await expect(result.bindingsStream).toEqualBindingsStream([]);
      });

      it('should discover named graphs from multiple sources via union', async() => {
        let mediatorCallCount = 0;
        const customMediator = {
          async mediate(_arg: any) {
            mediatorCallCount++;
            if (mediatorCallCount === 1) {
              // Discovery query
              return {
                bindingsStream: new ArrayIterator([
                  BF.bindings([[ DF.variable('g'), DF.namedNode('http://disc') ]]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'exact', value: 1 },
                  variables: [{ variable: DF.variable('g'), canBeUndef: false }],
                }),
                type: 'bindings',
              };
            }
            return {
              bindingsStream: new ArrayIterator([
                BF.bindings([[ DF.variable('s'), DF.namedNode('result') ]]),
              ], { autoStart: false }),
              metadata: () => Promise.resolve({
                state: new MetadataValidationState(),
                cardinality: { type: 'exact', value: 1 },
                variables: [{ variable: DF.variable('s'), canBeUndef: false }],
              }),
              type: 'bindings',
            };
          },
        };

        const customActor = new ActorQueryOperationGraph(<any>{
          name: 'actor',
          bus,
          mediatorQueryOperation: customMediator,
          mediatorRdfMetadataAccumulate,
        });

        const operation: Algebra.Graph = <Algebra.Graph><unknown>AF.createGraph(
          AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.namedNode('o')),
          DF.variable('g'),
        );

        const ctxWithSources = context.set(KeysQueryOperation.querySources, <any>[
          { source: { referenceValue: 'http://source1' }},
          { source: { referenceValue: 'http://source2' }},
        ]);
        const result = getSafeBindings(
          await customActor.runOperation(operation, ctxWithSources),
        );
        const bindings = await result.bindingsStream.toArray();
        expect(bindings).toHaveLength(1);
        expect(bindings[0].get(DF.variable('g'))).toEqual(DF.namedNode('http://disc'));
      });

      it('should filter non-NamedNode terms during graph discovery', async() => {
        let mediatorCallCount = 0;
        const customMediator = {
          async mediate(_arg: any) {
            mediatorCallCount++;
            if (mediatorCallCount === 1) {
              // Discovery: return a mix of NamedNode and non-NamedNode
              return {
                bindingsStream: new ArrayIterator([
                  BF.bindings([[ DF.variable('g'), DF.namedNode('http://good') ]]),
                  BF.bindings([[ DF.variable('g'), DF.blankNode('bad') ]]),
                  BF.bindings([[ DF.variable('g'), DF.literal('also-bad') ]]),
                  BF.bindings([]), // No ?g binding at all
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'exact', value: 4 },
                  variables: [{ variable: DF.variable('g'), canBeUndef: false }],
                }),
                type: 'bindings',
              };
            }
            return {
              bindingsStream: new ArrayIterator([
                BF.bindings([[ DF.variable('s'), DF.namedNode('result') ]]),
              ], { autoStart: false }),
              metadata: () => Promise.resolve({
                state: new MetadataValidationState(),
                cardinality: { type: 'exact', value: 1 },
                variables: [{ variable: DF.variable('s'), canBeUndef: false }],
              }),
              type: 'bindings',
            };
          },
        };

        const customActor = new ActorQueryOperationGraph(<any>{
          name: 'actor',
          bus,
          mediatorQueryOperation: customMediator,
          mediatorRdfMetadataAccumulate,
        });

        const operation: Algebra.Graph = <Algebra.Graph><unknown>AF.createGraph(
          AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.namedNode('o')),
          DF.variable('g'),
        );

        const ctxWithSources = context.set(KeysQueryOperation.querySources, <any>[
          { source: { referenceValue: 'http://source1' }},
        ]);
        const result = getSafeBindings(
          await customActor.runOperation(operation, ctxWithSources),
        );
        const bindings = await result.bindingsStream.toArray();
        // Only 1 graph (http://good) should produce results
        expect(bindings).toHaveLength(1);
        expect(bindings[0].get(DF.variable('g'))).toEqual(DF.namedNode('http://good'));
      });

      it('should support GRAPH as a graph-existence check with empty inner pattern', async() => {
        // Per the SPARQL spec, GRAPH <iri> { } can be used to test whether a named graph exists
        // in the dataset. If the graph exists, it should produce a single empty binding.
        // If not, it should produce no bindings.
        // E.g. SELECT * { VALUES ?hasG1 { true } . GRAPH <ex:g1> { } }
        const customMediator = {
          async mediate(_arg: any) {
            // An empty graph pattern (NOP) produces one empty binding
            return {
              bindingsStream: new ArrayIterator([
                BF.bindings(),
              ], { autoStart: false }),
              metadata: () => Promise.resolve({
                state: new MetadataValidationState(),
                cardinality: { type: 'exact', value: 1 },
                variables: [],
              }),
              type: 'bindings',
            };
          },
        };

        const customActor = new ActorQueryOperationGraph(<any>{
          name: 'actor',
          bus,
          mediatorQueryOperation: customMediator,
          mediatorRdfMetadataAccumulate,
        });

        // GRAPH <ex:g1> { } — named node with an empty inner pattern
        const operation: Algebra.Graph = <Algebra.Graph><unknown>AF.createGraph(
          AF.createNop(),
          DF.namedNode('ex:g1'),
        );

        const ctxWithGraphs = context.set(
          KeysQueryOperation.datasetNamedGraphs,
          [ DF.namedNode('ex:g1') ],
        );
        const result = getSafeBindings(
          await customActor.runOperation(operation, ctxWithGraphs),
        );
        const bindings = await result.bindingsStream.toArray();
        // The graph exists, so we should get one result
        expect(bindings).toHaveLength(1);
      });

      it('should return empty for GRAPH <iri> when graph has no data', async() => {
        // When GRAPH <iri> { ?s ?p ?o } is evaluated and the graph has no triples,
        // the mediator returns no bindings — effectively a graph-existence check.
        const customActor = new ActorQueryOperationGraph(<any>{
          name: 'actor',
          bus,
          mediatorQueryOperation,
          mediatorRdfMetadataAccumulate,
        });

        const operation: Algebra.Graph = <Algebra.Graph><unknown>AF.createGraph(
          AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
          DF.namedNode('ex:absent'),
        );

        const result = getSafeBindings(
          await customActor.runOperation(operation, context),
        );
        const bindings = await result.bindingsStream.toArray();
        // The default mediator returns empty results — no data in that graph
        expect(bindings).toHaveLength(0);
      });

      it('should support GRAPH ?var existence check across multiple graphs', async() => {
        // GRAPH ?g { } should enumerate all named graphs, producing one binding per graph
        const customMediator = {
          async mediate(_arg: any) {
            return {
              bindingsStream: new ArrayIterator([
                BF.bindings(),
              ], { autoStart: false }),
              metadata: () => Promise.resolve({
                state: new MetadataValidationState(),
                cardinality: { type: 'exact', value: 1 },
                variables: [],
              }),
              type: 'bindings',
            };
          },
        };

        const customActor = new ActorQueryOperationGraph(<any>{
          name: 'actor',
          bus,
          mediatorQueryOperation: customMediator,
          mediatorRdfMetadataAccumulate,
        });

        const operation: Algebra.Graph = <Algebra.Graph><unknown>AF.createGraph(
          AF.createNop(),
          DF.variable('g'),
        );

        const ctxWithGraphs = context.set(
          KeysQueryOperation.datasetNamedGraphs,
          [ DF.namedNode('ex:g1'), DF.namedNode('ex:g2'), DF.namedNode('ex:g3') ],
        );
        const result = getSafeBindings(
          await customActor.runOperation(operation, ctxWithGraphs),
        );
        const bindings = await result.bindingsStream.toArray();
        // One binding per named graph, each with ?g bound
        expect(bindings).toHaveLength(3);
        expect(bindings[0].get(DF.variable('g'))).toEqual(DF.namedNode('ex:g1'));
        expect(bindings[1].get(DF.variable('g'))).toEqual(DF.namedNode('ex:g2'));
        expect(bindings[2].get(DF.variable('g'))).toEqual(DF.namedNode('ex:g3'));
      });
    });
  });

  describe('pushDownGraph', () => {
    it('should replace default graph in patterns', () => {
      const op = AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o'));
      const result = ActorQueryOperationGraph.pushDownGraph(AF, op, DF.namedNode('g1'));
      expect((<Algebra.Pattern>result).graph).toEqual(DF.namedNode('g1'));
    });

    it('should not replace non-default graph in patterns', () => {
      const op = AF.createPattern(
        DF.namedNode('s'),
        DF.namedNode('p'),
        DF.namedNode('o'),
        DF.namedNode('existing'),
      );
      const result = ActorQueryOperationGraph.pushDownGraph(AF, op, DF.namedNode('g1'));
      expect((<Algebra.Pattern>result).graph).toEqual(DF.namedNode('existing'));
    });

    it('should replace default graph in paths', () => {
      const op = AF.createPath(
        DF.namedNode('s'),
        AF.createLink(DF.namedNode('p')),
        DF.namedNode('o'),
      );
      const result = ActorQueryOperationGraph.pushDownGraph(AF, op, DF.namedNode('g1'));
      expect((<Algebra.Path>result).graph).toEqual(DF.namedNode('g1'));
    });

    it('should not replace non-default graph in paths', () => {
      const op = AF.createPath(
        DF.namedNode('s'),
        AF.createLink(DF.namedNode('p')),
        DF.namedNode('o'),
        DF.namedNode('existing'),
      );
      const result = ActorQueryOperationGraph.pushDownGraph(AF, op, DF.namedNode('g1'));
      expect((<Algebra.Path>result).graph).toEqual(DF.namedNode('existing'));
    });

    it('should not recurse into nested GRAPH operations', () => {
      const op = AF.createJoin([
        AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
        AF.createGraph(
          AF.createPattern(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
          DF.namedNode('inner'),
        ),
      ]);
      const result = ActorQueryOperationGraph.pushDownGraph(AF, op, DF.namedNode('g1'));
      const join = <Algebra.Join>result;
      expect((<Algebra.Pattern>join.input[0]).graph).toEqual(DF.namedNode('g1'));
      const innerGraph = <Algebra.Graph>join.input[1];
      expect(innerGraph.type).toBe(Algebra.Types.GRAPH);
    });

    it('should not recurse into SERVICE operations', () => {
      const op = AF.createJoin([
        AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
        AF.createService(
          AF.createPattern(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
          DF.namedNode('http://service'),
        ),
      ]);
      const result = ActorQueryOperationGraph.pushDownGraph(AF, op, DF.namedNode('g1'));
      const join = <Algebra.Join>result;
      expect((<Algebra.Pattern>join.input[0]).graph).toEqual(DF.namedNode('g1'));
      expect((<Algebra.Service>join.input[1]).type).toBe(Algebra.Types.SERVICE);
    });

    it('should push down variable graph terms', () => {
      const op = AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o'));
      const result = ActorQueryOperationGraph.pushDownGraph(AF, op, DF.variable('g'));
      expect((<Algebra.Pattern>result).graph).toEqual(DF.variable('g'));
    });

    it('should preserve pattern metadata', () => {
      const op = AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o'));
      (<any>op).metadata = { scopedSource: 'test' };
      const result = ActorQueryOperationGraph.pushDownGraph(AF, op, DF.namedNode('g1'));
      expect((<any>result).metadata).toEqual({ scopedSource: 'test' });
    });

    it('should preserve path metadata', () => {
      const op = AF.createPath(
        DF.namedNode('s'),
        AF.createLink(DF.namedNode('p')),
        DF.namedNode('o'),
      );
      (<any>op).metadata = { scopedSource: 'test' };
      const result = ActorQueryOperationGraph.pushDownGraph(AF, op, DF.namedNode('g1'));
      expect((<any>result).metadata).toEqual({ scopedSource: 'test' });
    });
  });

  describe('unionMetadata', () => {
    it('should return initialized metadata for empty input', async() => {
      const result = await ActorQueryOperationGraph.unionMetadata(
        [],
        context,
        mediatorRdfMetadataAccumulate,
      );
      expect(result.cardinality).toEqual({ type: 'exact', value: 0 });
      expect(result.variables).toEqual([]);
      expect(result.state).toBeInstanceOf(MetadataValidationState);
    });

    it('should accumulate metadata from multiple inputs', async() => {
      const metadatas = [
        {
          state: new MetadataValidationState(),
          cardinality: { type: <const>'exact', value: 2 },
          variables: [{ variable: DF.variable('a'), canBeUndef: false }],
        },
        {
          state: new MetadataValidationState(),
          cardinality: { type: <const>'exact', value: 3 },
          variables: [{ variable: DF.variable('b'), canBeUndef: false }],
        },
      ];
      const result = await ActorQueryOperationGraph.unionMetadata(
        metadatas,
        context,
        mediatorRdfMetadataAccumulate,
      );
      expect(result.cardinality).toEqual({ type: 'exact', value: 5 });
      // All variables should be canBeUndef: true
      expect(result.variables).toEqual([
        { variable: DF.variable('a'), canBeUndef: true },
        { variable: DF.variable('b'), canBeUndef: true },
      ]);
    });

    it('should union variables with deduplication', async() => {
      const metadatas = [
        {
          state: new MetadataValidationState(),
          cardinality: { type: <const>'exact', value: 1 },
          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('b'), canBeUndef: false },
          ],
        },
        {
          state: new MetadataValidationState(),
          cardinality: { type: <const>'exact', value: 1 },
          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('c'), canBeUndef: false },
          ],
        },
      ];
      const result = await ActorQueryOperationGraph.unionMetadata(
        metadatas,
        context,
        mediatorRdfMetadataAccumulate,
      );
      expect(result.variables).toHaveLength(3);
      expect(result.variables).toContainEqual({ variable: DF.variable('a'), canBeUndef: true });
      expect(result.variables).toContainEqual({ variable: DF.variable('b'), canBeUndef: true });
      expect(result.variables).toContainEqual({ variable: DF.variable('c'), canBeUndef: true });
    });

    it('should propagate invalidation from sub-metadata', async() => {
      const metadatas = [
        {
          state: new MetadataValidationState(),
          cardinality: { type: <const>'exact', value: 1 },
          variables: [{ variable: DF.variable('a'), canBeUndef: false }],
        },
        {
          state: new MetadataValidationState(),
          cardinality: { type: <const>'exact', value: 2 },
          variables: [{ variable: DF.variable('b'), canBeUndef: false }],
        },
      ];
      const result = await ActorQueryOperationGraph.unionMetadata(
        metadatas,
        context,
        mediatorRdfMetadataAccumulate,
      );
      const invalidListener = jest.fn();
      result.state.addInvalidateListener(invalidListener);
      expect(result.state.valid).toBeTruthy();

      metadatas[0].state.invalidate();
      expect(result.state.valid).toBeFalsy();
      expect(invalidListener).toHaveBeenCalledTimes(1);
    });

    it('should propagate invalidation from any sub-metadata', async() => {
      const metadatas = [
        {
          state: new MetadataValidationState(),
          cardinality: { type: <const>'exact', value: 1 },
          variables: [{ variable: DF.variable('a'), canBeUndef: false }],
        },
        {
          state: new MetadataValidationState(),
          cardinality: { type: <const>'exact', value: 2 },
          variables: [{ variable: DF.variable('b'), canBeUndef: false }],
        },
      ];
      const result = await ActorQueryOperationGraph.unionMetadata(
        metadatas,
        context,
        mediatorRdfMetadataAccumulate,
      );
      expect(result.state.valid).toBeTruthy();

      metadatas[1].state.invalidate();
      expect(result.state.valid).toBeFalsy();
    });
  });
});
