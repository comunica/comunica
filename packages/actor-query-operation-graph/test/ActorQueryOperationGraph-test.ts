import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryOperationResultBindings, IQuerySourceWrapper } from '@comunica/types';
import { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
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
