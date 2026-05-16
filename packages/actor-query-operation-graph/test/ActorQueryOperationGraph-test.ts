import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryOperationResultBindings, IQuerySourceWrapper } from '@comunica/types';
import { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { assignOperationSource } from '@comunica/utils-query-operation';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationGraph } from '../lib/ActorQueryOperationGraph';
import '@comunica/utils-jest';

const DF = new DataFactory();
const AF = new AlgebraFactory();
const BF = new BindingsFactory(DF);

describe('ActorQueryOperationGraph', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let mediatorRdfMetadataAccumulate: any;

  const source1: IQuerySourceWrapper = <any>{
    source: {
      referenceValue: 'source1',
      getSelectorShape: () => ({
        type: 'operation',
        operation: { operationType: 'wildcard' },
      }),
    },
  };

  const source2: IQuerySourceWrapper = <any>{
    source: {
      referenceValue: 'source2',
      getSelectorShape: () => ({
        type: 'operation',
        operation: { operationType: 'wildcard' },
      }),
    },
  };

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: jest.fn((_arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('s'), DF.namedNode('http://example.org/s1') ]]),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 1 },
          variables: [{ variable: DF.variable('s'), canBeUndef: false }],
        }),
        type: 'bindings',
      })),
    };
    mediatorRdfMetadataAccumulate = {
      mediate: jest.fn((arg: any) => {
        if (arg.mode === 'initialize') {
          return Promise.resolve({
            metadata: {
              state: new MetadataValidationState(),
              cardinality: { type: 'exact', value: 0 },
              variables: [],
            },
          });
        }
        return Promise.resolve({
          metadata: {
            state: new MetadataValidationState(),
            cardinality: {
              type: 'estimate',
              value: (arg.accumulatedMetadata.cardinality.value ?? 0) +
                (arg.appendingMetadata.cardinality.value ?? 0),
            },
            variables: arg.appendingMetadata.variables,
          },
        });
      }),
    };
  });

  describe('The ActorQueryOperationGraph module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationGraph).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationGraph constructor', () => {
      expect(new (<any>ActorQueryOperationGraph)({
        name: 'actor',
        bus,
        mediatorQueryOperation,
        mediatorRdfMetadataAccumulate,
      }))
        .toBeInstanceOf(ActorQueryOperationGraph);
      expect(new (<any>ActorQueryOperationGraph)({
        name: 'actor',
        bus,
        mediatorQueryOperation,
        mediatorRdfMetadataAccumulate,
      }))
        .toBeInstanceOf(ActorQueryOperation);
    });
  });

  describe('An ActorQueryOperationGraph instance', () => {
    let actor: ActorQueryOperationGraph;

    beforeEach(() => {
      actor = new ActorQueryOperationGraph({
        name: 'actor',
        bus,
        mediatorQueryOperation,
        mediatorRdfMetadataAccumulate,
      });
    });

    it('should test on GRAPH operations', async() => {
      await expect(actor.test({
        operation: AF.createGraph(
          AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
          DF.namedNode('http://example.org/g'),
        ),
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      })).resolves.toPassTestVoid();
    });

    describe('IRI graph', () => {
      it('should substitute IRI into patterns and delegate', async() => {
        const pattern = AF.createPattern(
          DF.variable('s'),
          DF.namedNode('p'),
          DF.variable('o'),
        );
        const graphOp = AF.createGraph(pattern, DF.namedNode('http://example.org/g'));

        const result = <IQueryOperationResultBindings> await actor.runOperation(
          graphOp,
          new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
        );

        expect(result.type).toBe('bindings');
        // Check that mediator was called with substituted operation
        expect(mediatorQueryOperation.mediate).toHaveBeenCalledTimes(1);
        const mediatedOp = mediatorQueryOperation.mediate.mock.calls[0][0].operation;
        expect(mediatedOp.type).toBe(Algebra.Types.PATTERN);
        expect((<Algebra.Pattern>mediatedOp).graph).toEqual(DF.namedNode('http://example.org/g'));
      });

      it('should return empty for IRI graph with no patterns and non-existent graph', async() => {
        // Mock mediator to return empty results (graph doesn't exist)
        mediatorQueryOperation.mediate.mockResolvedValue({
          bindingsStream: new ArrayIterator([], { autoStart: false }),
          metadata: () => Promise.resolve({
            state: new MetadataValidationState(),
            cardinality: { type: 'exact', value: 0 },
            variables: [],
          }),
          type: 'bindings',
        });

        const graphOp = AF.createGraph(
          AF.createValues([ DF.variable('x') ], [{ x: DF.literal('1') }]),
          DF.namedNode('http://example.org/nonexistent'),
        );

        const result = <IQueryOperationResultBindings> await actor.runOperation(
          graphOp,
          new ActionContext({
            [KeysInitQuery.dataFactory.name]: DF,
            [KeysQueryOperation.querySources.name]: [ source1 ],
          }),
        );

        expect(result.type).toBe('bindings');
        const bindings = await result.bindingsStream.toArray();
        expect(bindings).toHaveLength(0);
      });

      it('should evaluate inner for IRI graph with no patterns but existing graph', async() => {
        // First call: graph existence check (returns result = graph exists)
        // Second call: inner operation evaluation
        let callCount = 0;
        mediatorQueryOperation.mediate.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // Graph existence check returns a result
            return Promise.resolve({
              bindingsStream: new ArrayIterator([
                BF.bindings([]),
              ], { autoStart: false }),
              metadata: () => Promise.resolve({
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 1 },
                variables: [],
              }),
              type: 'bindings',
            });
          }
          // Inner operation evaluation
          return Promise.resolve({
            bindingsStream: new ArrayIterator([
              BF.bindings([[ DF.variable('x'), DF.literal('1') ]]),
            ], { autoStart: false }),
            metadata: () => Promise.resolve({
              state: new MetadataValidationState(),
              cardinality: { type: 'exact', value: 1 },
              variables: [{ variable: DF.variable('x'), canBeUndef: false }],
            }),
            type: 'bindings',
          });
        });

        const graphOp = AF.createGraph(
          AF.createValues([ DF.variable('x') ], [{ x: DF.literal('1') }]),
          DF.namedNode('http://example.org/existing'),
        );

        const result = <IQueryOperationResultBindings> await actor.runOperation(
          graphOp,
          new ActionContext({
            [KeysInitQuery.dataFactory.name]: DF,
            [KeysQueryOperation.querySources.name]: [ source1 ],
          }),
        );

        expect(result.type).toBe('bindings');
        expect(mediatorQueryOperation.mediate).toHaveBeenCalledTimes(2);
      });

      it('should return empty for IRI graph with no patterns and no sources', async() => {
        const graphOp = AF.createGraph(
          AF.createValues([ DF.variable('x') ], [{ x: DF.literal('1') }]),
          DF.namedNode('http://example.org/g'),
        );

        const result = <IQueryOperationResultBindings> await actor.runOperation(
          graphOp,
          new ActionContext({
            [KeysInitQuery.dataFactory.name]: DF,
          }),
        );

        expect(result.type).toBe('bindings');
        const bindings = await result.bindingsStream.toArray();
        expect(bindings).toHaveLength(0);
      });

      it('should handle graph existence check with multiple sources', async() => {
        let callCount = 0;
        mediatorQueryOperation.mediate.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              bindingsStream: new ArrayIterator([
                BF.bindings([]),
              ], { autoStart: false }),
              metadata: () => Promise.resolve({
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 1 },
                variables: [],
              }),
              type: 'bindings',
            });
          }
          return Promise.resolve({
            bindingsStream: new ArrayIterator([
              BF.bindings([[ DF.variable('x'), DF.literal('1') ]]),
            ], { autoStart: false }),
            metadata: () => Promise.resolve({
              state: new MetadataValidationState(),
              cardinality: { type: 'exact', value: 1 },
              variables: [{ variable: DF.variable('x'), canBeUndef: false }],
            }),
            type: 'bindings',
          });
        });

        const graphOp = AF.createGraph(
          AF.createValues([ DF.variable('x') ], [{ x: DF.literal('1') }]),
          DF.namedNode('http://example.org/existing'),
        );

        const result = <IQueryOperationResultBindings> await actor.runOperation(
          graphOp,
          new ActionContext({
            [KeysInitQuery.dataFactory.name]: DF,
            [KeysQueryOperation.querySources.name]: [ source1, source2 ],
          }),
        );

        expect(result.type).toBe('bindings');
        // Should have called mediator: once for existence check (union of 2 sources), once for inner eval
        expect(mediatorQueryOperation.mediate).toHaveBeenCalledTimes(2);
        // The existence check should use a UNION for multiple sources
        const existenceOp = mediatorQueryOperation.mediate.mock.calls[0][0].operation;
        // Slice wraps the union/pattern
        expect(existenceOp.type).toBe(Algebra.Types.SLICE);
      });
    });

    describe('Variable graph', () => {
      it('should return empty when no named graphs exist', async() => {
        // Mock: graph discovery returns empty
        mediatorQueryOperation.mediate.mockResolvedValue({
          bindingsStream: new ArrayIterator([], { autoStart: false }),
          metadata: () => Promise.resolve({
            state: new MetadataValidationState(),
            cardinality: { type: 'exact', value: 0 },
            variables: [],
          }),
          type: 'bindings',
        });

        const graphOp = AF.createGraph(
          AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
          DF.variable('g'),
        );

        const result = <IQueryOperationResultBindings> await actor.runOperation(
          graphOp,
          new ActionContext({
            [KeysInitQuery.dataFactory.name]: DF,
            [KeysQueryOperation.querySources.name]: [ source1 ],
          }),
        );

        expect(result.type).toBe('bindings');
        const bindings = await result.bindingsStream.toArray();
        expect(bindings).toHaveLength(0);
      });

      it('should evaluate per-graph and bind variable', async() => {
        let callCount = 0;
        mediatorQueryOperation.mediate.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // Graph discovery returns two named graphs
            return Promise.resolve({
              bindingsStream: new ArrayIterator([
                BF.bindings([[ DF.variable('g'), DF.namedNode('http://example.org/g1') ]]),
                BF.bindings([[ DF.variable('g'), DF.namedNode('http://example.org/g2') ]]),
              ], { autoStart: false }),
              metadata: () => Promise.resolve({
                state: new MetadataValidationState(),
                cardinality: { type: 'exact', value: 2 },
                variables: [{ variable: DF.variable('g'), canBeUndef: false }],
              }),
              type: 'bindings',
            });
          }
          // Per-graph evaluation returns one result per graph
          return Promise.resolve({
            bindingsStream: new ArrayIterator([
              BF.bindings([[ DF.variable('s'), DF.namedNode('http://example.org/s1') ]]),
            ], { autoStart: false }),
            metadata: () => Promise.resolve({
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 1 },
              variables: [{ variable: DF.variable('s'), canBeUndef: false }],
            }),
            type: 'bindings',
          });
        });

        const graphOp = AF.createGraph(
          AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
          DF.variable('g'),
        );

        const result = <IQueryOperationResultBindings> await actor.runOperation(
          graphOp,
          new ActionContext({
            [KeysInitQuery.dataFactory.name]: DF,
            [KeysQueryOperation.querySources.name]: [ source1 ],
          }),
        );

        expect(result.type).toBe('bindings');
        const bindings = await result.bindingsStream.toArray();
        expect(bindings).toHaveLength(2);
        // Each binding should have the graph variable set
        expect(bindings[0].get(DF.variable('g'))?.value).toBe('http://example.org/g1');
        expect(bindings[1].get(DF.variable('g'))?.value).toBe('http://example.org/g2');
        // Each binding should also have the original variables
        expect(bindings[0].get(DF.variable('s'))?.value).toBe('http://example.org/s1');
      });

      it('should include graph variable in metadata', async() => {
        let callCount = 0;
        mediatorQueryOperation.mediate.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              bindingsStream: new ArrayIterator([
                BF.bindings([[ DF.variable('g'), DF.namedNode('http://example.org/g1') ]]),
              ], { autoStart: false }),
              metadata: () => Promise.resolve({
                state: new MetadataValidationState(),
                cardinality: { type: 'exact', value: 1 },
                variables: [{ variable: DF.variable('g'), canBeUndef: false }],
              }),
              type: 'bindings',
            });
          }
          return Promise.resolve({
            bindingsStream: new ArrayIterator([
              BF.bindings([[ DF.variable('s'), DF.namedNode('http://example.org/s1') ]]),
            ], { autoStart: false }),
            metadata: () => Promise.resolve({
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 1 },
              variables: [{ variable: DF.variable('s'), canBeUndef: false }],
            }),
            type: 'bindings',
          });
        });

        const graphOp = AF.createGraph(
          AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
          DF.variable('g'),
        );

        const result = <IQueryOperationResultBindings> await actor.runOperation(
          graphOp,
          new ActionContext({
            [KeysInitQuery.dataFactory.name]: DF,
            [KeysQueryOperation.querySources.name]: [ source1 ],
          }),
        );

        const metadata = await result.metadata();
        const varNames = metadata.variables.map(v => v.variable.value);
        expect(varNames).toContain('g');
      });

      it('should filter out incompatible bindings when graph variable is already bound', async() => {
        // Simulates: GRAPH ?g { SELECT * WHERE { ?x ?p ?g } }
        // Inner results have ?g bound - only compatible bindings should survive
        let callCount = 0;
        mediatorQueryOperation.mediate.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // Graph discovery returns one named graph
            return Promise.resolve({
              bindingsStream: new ArrayIterator([
                BF.bindings([[ DF.variable('g'), DF.namedNode('http://example.org/g1') ]]),
              ], { autoStart: false }),
              metadata: () => Promise.resolve({
                state: new MetadataValidationState(),
                cardinality: { type: 'exact', value: 1 },
                variables: [{ variable: DF.variable('g'), canBeUndef: false }],
              }),
              type: 'bindings',
            });
          }
          // Inner results: ?g is already bound from SELECT *
          return Promise.resolve({
            bindingsStream: new ArrayIterator([
              // Compatible: ?g matches the graph IRI
              BF.bindings([
                [ DF.variable('x'), DF.namedNode('http://example.org/x1') ],
                [ DF.variable('g'), DF.namedNode('http://example.org/g1') ],
              ]),
              // Incompatible: ?g does NOT match the graph IRI
              BF.bindings([
                [ DF.variable('x'), DF.namedNode('http://example.org/x2') ],
                [ DF.variable('g'), DF.namedNode('http://example.org/other') ],
              ]),
            ], { autoStart: false }),
            metadata: () => Promise.resolve({
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 2 },
              variables: [
                { variable: DF.variable('x'), canBeUndef: false },
                { variable: DF.variable('g'), canBeUndef: false },
              ],
            }),
            type: 'bindings',
          });
        });

        const graphOp = AF.createGraph(
          AF.createProject(
            AF.createPattern(DF.variable('x'), DF.variable('p'), DF.variable('g')),
            [ DF.variable('x'), DF.variable('p'), DF.variable('g') ],
          ),
          DF.variable('g'),
        );

        const result = <IQueryOperationResultBindings> await actor.runOperation(
          graphOp,
          new ActionContext({
            [KeysInitQuery.dataFactory.name]: DF,
            [KeysQueryOperation.querySources.name]: [ source1 ],
          }),
        );

        expect(result.type).toBe('bindings');
        const bindings = await result.bindingsStream.toArray();
        // Only the compatible binding should survive
        expect(bindings).toHaveLength(1);
        expect(bindings[0].get(DF.variable('x'))?.value).toBe('http://example.org/x1');
        expect(bindings[0].get(DF.variable('g'))?.value).toBe('http://example.org/g1');
      });

      it('should handle variable GRAPH with no patterns (VALUES)', async() => {
        let callCount = 0;
        mediatorQueryOperation.mediate.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // Graph discovery returns one named graph
            return Promise.resolve({
              bindingsStream: new ArrayIterator([
                BF.bindings([[ DF.variable('g'), DF.namedNode('http://example.org/g1') ]]),
              ], { autoStart: false }),
              metadata: () => Promise.resolve({
                state: new MetadataValidationState(),
                cardinality: { type: 'exact', value: 1 },
                variables: [{ variable: DF.variable('g'), canBeUndef: false }],
              }),
              type: 'bindings',
            });
          }
          // Inner VALUES evaluation
          return Promise.resolve({
            bindingsStream: new ArrayIterator([
              BF.bindings([[ DF.variable('x'), DF.literal('val') ]]),
            ], { autoStart: false }),
            metadata: () => Promise.resolve({
              state: new MetadataValidationState(),
              cardinality: { type: 'exact', value: 1 },
              variables: [{ variable: DF.variable('x'), canBeUndef: false }],
            }),
            type: 'bindings',
          });
        });

        const graphOp = AF.createGraph(
          AF.createValues([ DF.variable('x') ], [{ x: DF.literal('val') }]),
          DF.variable('g'),
        );

        const result = <IQueryOperationResultBindings> await actor.runOperation(
          graphOp,
          new ActionContext({
            [KeysInitQuery.dataFactory.name]: DF,
            [KeysQueryOperation.querySources.name]: [ source1 ],
          }),
        );

        expect(result.type).toBe('bindings');
        const bindings = await result.bindingsStream.toArray();
        expect(bindings).toHaveLength(1);
        expect(bindings[0].get(DF.variable('g'))?.value).toBe('http://example.org/g1');
        expect(bindings[0].get(DF.variable('x'))?.value).toBe('val');
      });

      it('should return empty when no sources are available for variable graph', async() => {
        const graphOp = AF.createGraph(
          AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
          DF.variable('g'),
        );

        const result = <IQueryOperationResultBindings> await actor.runOperation(
          graphOp,
          new ActionContext({
            [KeysInitQuery.dataFactory.name]: DF,
          }),
        );

        expect(result.type).toBe('bindings');
        const bindings = await result.bindingsStream.toArray();
        expect(bindings).toHaveLength(0);
      });

      it('should handle graph enumeration with multiple sources', async() => {
        let callCount = 0;
        mediatorQueryOperation.mediate.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              bindingsStream: new ArrayIterator([
                BF.bindings([[ DF.variable('g'), DF.namedNode('http://example.org/g1') ]]),
              ], { autoStart: false }),
              metadata: () => Promise.resolve({
                state: new MetadataValidationState(),
                cardinality: { type: 'exact', value: 1 },
                variables: [{ variable: DF.variable('g'), canBeUndef: false }],
              }),
              type: 'bindings',
            });
          }
          return Promise.resolve({
            bindingsStream: new ArrayIterator([
              BF.bindings([[ DF.variable('s'), DF.namedNode('http://example.org/s1') ]]),
            ], { autoStart: false }),
            metadata: () => Promise.resolve({
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 1 },
              variables: [{ variable: DF.variable('s'), canBeUndef: false }],
            }),
            type: 'bindings',
          });
        });

        const graphOp = AF.createGraph(
          AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
          DF.variable('g'),
        );

        const result = <IQueryOperationResultBindings> await actor.runOperation(
          graphOp,
          new ActionContext({
            [KeysInitQuery.dataFactory.name]: DF,
            [KeysQueryOperation.querySources.name]: [ source1, source2 ],
          }),
        );

        expect(result.type).toBe('bindings');
        const bindings = await result.bindingsStream.toArray();
        expect(bindings).toHaveLength(1);
        // The discovery operation should have been a DISTINCT of a PROJECT
        const discoveryOp = mediatorQueryOperation.mediate.mock.calls[0][0].operation;
        expect(discoveryOp.type).toBe(Algebra.Types.DISTINCT);
      });

      it('should not duplicate graph variable in metadata when already present', async() => {
        let callCount = 0;
        mediatorQueryOperation.mediate.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              bindingsStream: new ArrayIterator([
                BF.bindings([[ DF.variable('g'), DF.namedNode('http://example.org/g1') ]]),
              ], { autoStart: false }),
              metadata: () => Promise.resolve({
                state: new MetadataValidationState(),
                cardinality: { type: 'exact', value: 1 },
                variables: [{ variable: DF.variable('g'), canBeUndef: false }],
              }),
              type: 'bindings',
            });
          }
          // Inner result already has ?g in its variables
          return Promise.resolve({
            bindingsStream: new ArrayIterator([
              BF.bindings([
                [ DF.variable('s'), DF.namedNode('http://example.org/s1') ],
                [ DF.variable('g'), DF.namedNode('http://example.org/g1') ],
              ]),
            ], { autoStart: false }),
            metadata: () => Promise.resolve({
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 1 },
              variables: [
                { variable: DF.variable('s'), canBeUndef: false },
                { variable: DF.variable('g'), canBeUndef: false },
              ],
            }),
            type: 'bindings',
          });
        });

        const graphOp = AF.createGraph(
          AF.createProject(
            AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('g')),
            [ DF.variable('s'), DF.variable('g') ],
          ),
          DF.variable('g'),
        );

        const result = <IQueryOperationResultBindings> await actor.runOperation(
          graphOp,
          new ActionContext({
            [KeysInitQuery.dataFactory.name]: DF,
            [KeysQueryOperation.querySources.name]: [ source1 ],
          }),
        );

        const metadata = await result.metadata();
        const gVars = metadata.variables.filter(v => v.variable.value === 'g');
        expect(gVars).toHaveLength(1);
      });

      it('should extract sources from inner patterns with source annotations', async() => {
        let callCount = 0;
        mediatorQueryOperation.mediate.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              bindingsStream: new ArrayIterator([
                BF.bindings([[ DF.variable('g'), DF.namedNode('http://example.org/g1') ]]),
              ], { autoStart: false }),
              metadata: () => Promise.resolve({
                state: new MetadataValidationState(),
                cardinality: { type: 'exact', value: 1 },
                variables: [{ variable: DF.variable('g'), canBeUndef: false }],
              }),
              type: 'bindings',
            });
          }
          return Promise.resolve({
            bindingsStream: new ArrayIterator([
              BF.bindings([[ DF.variable('s'), DF.namedNode('http://example.org/s1') ]]),
            ], { autoStart: false }),
            metadata: () => Promise.resolve({
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 1 },
              variables: [{ variable: DF.variable('s'), canBeUndef: false }],
            }),
            type: 'bindings',
          });
        });

        // Create a pattern with source annotation
        const annotatedPattern = assignOperationSource(
          AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
          source1,
        );

        const graphOp = AF.createGraph(annotatedPattern, DF.variable('g'));

        const result = <IQueryOperationResultBindings> await actor.runOperation(
          graphOp,
          new ActionContext({
            [KeysInitQuery.dataFactory.name]: DF,
          }),
        );

        expect(result.type).toBe('bindings');
        const bindings = await result.bindingsStream.toArray();
        expect(bindings).toHaveLength(1);
      });

      it('should extract sources from inner PATH with source annotations', async() => {
        let callCount = 0;
        mediatorQueryOperation.mediate.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              bindingsStream: new ArrayIterator([
                BF.bindings([[ DF.variable('g'), DF.namedNode('http://example.org/g1') ]]),
              ], { autoStart: false }),
              metadata: () => Promise.resolve({
                state: new MetadataValidationState(),
                cardinality: { type: 'exact', value: 1 },
                variables: [{ variable: DF.variable('g'), canBeUndef: false }],
              }),
              type: 'bindings',
            });
          }
          return Promise.resolve({
            bindingsStream: new ArrayIterator([
              BF.bindings([[ DF.variable('s'), DF.namedNode('http://example.org/s1') ]]),
            ], { autoStart: false }),
            metadata: () => Promise.resolve({
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 1 },
              variables: [{ variable: DF.variable('s'), canBeUndef: false }],
            }),
            type: 'bindings',
          });
        });

        // Create a path with source annotation
        const annotatedPath = assignOperationSource(
          AF.createPath(DF.variable('s'), AF.createLink(DF.namedNode('p')), DF.variable('o')),
          source1,
        );

        const graphOp = AF.createGraph(annotatedPath, DF.variable('g'));

        const result = <IQueryOperationResultBindings> await actor.runOperation(
          graphOp,
          new ActionContext({
            [KeysInitQuery.dataFactory.name]: DF,
          }),
        );

        expect(result.type).toBe('bindings');
        const bindings = await result.bindingsStream.toArray();
        expect(bindings).toHaveLength(1);
      });

      it('should deduplicate sources from inner patterns', async() => {
        let callCount = 0;
        mediatorQueryOperation.mediate.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              bindingsStream: new ArrayIterator([
                BF.bindings([[ DF.variable('g'), DF.namedNode('http://example.org/g1') ]]),
              ], { autoStart: false }),
              metadata: () => Promise.resolve({
                state: new MetadataValidationState(),
                cardinality: { type: 'exact', value: 1 },
                variables: [{ variable: DF.variable('g'), canBeUndef: false }],
              }),
              type: 'bindings',
            });
          }
          return Promise.resolve({
            bindingsStream: new ArrayIterator([
              BF.bindings([[ DF.variable('s'), DF.namedNode('http://example.org/s1') ]]),
            ], { autoStart: false }),
            metadata: () => Promise.resolve({
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 1 },
              variables: [{ variable: DF.variable('s'), canBeUndef: false }],
            }),
            type: 'bindings',
          });
        });

        // Two patterns with the same source - should deduplicate
        const pat1 = assignOperationSource(
          AF.createPattern(DF.variable('s'), DF.namedNode('p1'), DF.variable('o1')),
          source1,
        );
        const pat2 = assignOperationSource(
          AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.variable('o2')),
          source1,
        );

        const graphOp = AF.createGraph(AF.createJoin([ pat1, pat2 ]), DF.variable('g'));

        const result = <IQueryOperationResultBindings> await actor.runOperation(
          graphOp,
          new ActionContext({
            [KeysInitQuery.dataFactory.name]: DF,
          }),
        );

        expect(result.type).toBe('bindings');
        // Graph discovery should use a single source (deduplicated), not a union
        const discoveryOp = mediatorQueryOperation.mediate.mock.calls[0][0].operation;
        expect(discoveryOp.type).toBe(Algebra.Types.DISTINCT);
      });
    });
  });

  describe('hasPatterns', () => {
    it('should return true for PATTERN', () => {
      expect(ActorQueryOperationGraph.hasPatterns(
        AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
      )).toBe(true);
    });

    it('should return true for PATH', () => {
      expect(ActorQueryOperationGraph.hasPatterns(
        AF.createPath(DF.variable('s'), AF.createLink(DF.namedNode('p')), DF.variable('o')),
      )).toBe(true);
    });

    it('should return false for VALUES', () => {
      expect(ActorQueryOperationGraph.hasPatterns(
        AF.createValues([ DF.variable('x') ], [{ x: DF.literal('1') }]),
      )).toBe(false);
    });

    it('should return true for nested patterns in JOIN', () => {
      expect(ActorQueryOperationGraph.hasPatterns(
        AF.createJoin([
          AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
          AF.createValues([ DF.variable('x') ], [{ x: DF.literal('1') }]),
        ]),
      )).toBe(true);
    });

    it('should return true for LINK operations', () => {
      expect(ActorQueryOperationGraph.hasPatterns(
        AF.createLink(DF.namedNode('p')),
      )).toBe(true);
    });

    it('should return true for NPS operations', () => {
      expect(ActorQueryOperationGraph.hasPatterns(
        AF.createNps([ DF.namedNode('p') ]),
      )).toBe(true);
    });
  });

  describe('substituteGraphInOperation', () => {
    it('should substitute default graph in patterns', () => {
      const pattern = AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o'));
      const result = ActorQueryOperationGraph.substituteGraphInOperation(
        AF,
        pattern,
        DF.namedNode('http://example.org/g'),
      );
      expect((<Algebra.Pattern>result).graph).toEqual(DF.namedNode('http://example.org/g'));
    });

    it('should preserve metadata during substitution', () => {
      const pattern = AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o'));
      Object.assign(pattern, { metadata: { scopedSource: { source: 'test' }}});
      const result = ActorQueryOperationGraph.substituteGraphInOperation(
        AF,
        pattern,
        DF.namedNode('http://example.org/g'),
      );
      expect((<Algebra.Pattern>result).metadata).toEqual({ scopedSource: { source: 'test' }});
    });

    it('should not substitute non-default graph', () => {
      const pattern = AF.createPattern(
        DF.variable('s'),
        DF.namedNode('p'),
        DF.variable('o'),
        DF.namedNode('http://example.org/existing'),
      );
      const result = ActorQueryOperationGraph.substituteGraphInOperation(
        AF,
        pattern,
        DF.namedNode('http://example.org/g'),
      );
      expect((<Algebra.Pattern>result).graph).toEqual(DF.namedNode('http://example.org/existing'));
    });

    it('should not recurse into nested GRAPH operations', () => {
      const nestedGraph = AF.createGraph(
        AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
        DF.namedNode('http://example.org/inner'),
      );
      const join = AF.createJoin([
        AF.createPattern(DF.variable('a'), DF.namedNode('q'), DF.variable('b')),
        nestedGraph,
      ]);
      const result = ActorQueryOperationGraph.substituteGraphInOperation(
        AF,
        join,
        DF.namedNode('http://example.org/outer'),
      );
      const joinResult = <Algebra.Join>result;
      // Outer pattern should be substituted
      expect((<Algebra.Pattern>joinResult.input[0]).graph)
        .toEqual(DF.namedNode('http://example.org/outer'));
      // Nested GRAPH should be untouched
      const innerGraph = <Algebra.Graph>joinResult.input[1];
      expect(innerGraph.type).toBe(Algebra.Types.GRAPH);
      expect((<Algebra.Pattern>innerGraph.input).graph.termType).toBe('DefaultGraph');
    });

    it('should substitute default graph in paths', () => {
      const path = AF.createPath(
        DF.variable('s'),
        AF.createLink(DF.namedNode('p')),
        DF.variable('o'),
      );
      const result = ActorQueryOperationGraph.substituteGraphInOperation(
        AF,
        path,
        DF.namedNode('http://example.org/g'),
      );
      expect((<Algebra.Path>result).graph).toEqual(DF.namedNode('http://example.org/g'));
    });

    it('should preserve path metadata during substitution', () => {
      const path = AF.createPath(
        DF.variable('s'),
        AF.createLink(DF.namedNode('p')),
        DF.variable('o'),
      );
      Object.assign(path, { metadata: { scopedSource: { source: 'test' }}});
      const result = ActorQueryOperationGraph.substituteGraphInOperation(
        AF,
        path,
        DF.namedNode('http://example.org/g'),
      );
      expect((<Algebra.Path>result).metadata).toEqual({ scopedSource: { source: 'test' }});
    });

    it('should not substitute path with non-default graph', () => {
      const path = AF.createPath(
        DF.variable('s'),
        AF.createLink(DF.namedNode('p')),
        DF.variable('o'),
        DF.namedNode('http://example.org/existing'),
      );
      const result = ActorQueryOperationGraph.substituteGraphInOperation(
        AF,
        path,
        DF.namedNode('http://example.org/g'),
      );
      expect((<Algebra.Path>result).graph).toEqual(DF.namedNode('http://example.org/existing'));
    });
  });

  describe('emptyBindingsResult', () => {
    it('should return empty bindings stream', async() => {
      const result = ActorQueryOperationGraph.emptyBindingsResult();
      expect(result.type).toBe('bindings');
      const bindings = await result.bindingsStream.toArray();
      expect(bindings).toHaveLength(0);
    });

    it('should return zero cardinality metadata', async() => {
      const result = ActorQueryOperationGraph.emptyBindingsResult();
      const metadata = await result.metadata();
      expect(metadata.cardinality.value).toBe(0);
    });
  });
});
